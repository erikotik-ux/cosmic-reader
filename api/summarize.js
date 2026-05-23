// /api/summarize.js — AI TL;DR for individual articles.
//
// Client posts an article's title + body + url; we ask Gemini for a
// tight 2-3 sentence summary. The response is cached aggressively at
// the edge (s-maxage 24h) because article content rarely changes after
// publication.
//
// Edge runtime for fast cold starts. Uses the same OpenAI-compatible
// Gemini endpoint as /api/chat — same env vars.

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You write tight, factual TL;DR summaries of space-news articles.

Output rules — follow exactly:
- 2 to 3 sentences, max ~50 words total.
- Lead with the most important fact (the headline finding, the launch outcome, the discovery).
- Plain text only. No headers, no bullets, no markdown, no quotes.
- Neutral journalistic tone. No hype, no commentary, no "researchers say" filler.
- Never invent details not in the source. If the source is too thin to summarize, return a single sentence that names the topic without claims.
- If the source is non-English, summarize in English anyway.`;

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  const apiKey  = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model   = process.env.LLM_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return jsonError(500, 'Summarize backend not configured (LLM env vars missing).');
  }

  let body;
  try { body = await req.json(); }
  catch (e) { return jsonError(400, 'Invalid JSON body'); }
  body = body || {};

  const title   = (body.title   || '').toString().slice(0, 300);
  const article = (body.body    || '').toString().slice(0, 6000);
  const source  = (body.source  || '').toString().slice(0, 80);
  if (!title || !article) return jsonError(400, 'Missing title or body.');

  const userPrompt =
    `Title: ${title}\n` +
    (source ? `Source: ${source}\n` : '') +
    `\nArticle:\n${article}\n\n` +
    `Write the TL;DR.`;

  const endpoint = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  let llmRes;
  try {
    llmRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt }
        ],
        max_tokens: 140,
        temperature: 0.3,
        stream: true
      }),
      signal: AbortSignal.timeout(12000)
    });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return jsonError(504, 'Summary took too long.');
    }
    return jsonError(500, 'Summarize error.');
  }

  if (!llmRes.ok || !llmRes.body) {
    const errText = await llmRes.text().catch(() => '');
    let detail = errText.slice(0, 200);
    try {
      const j = JSON.parse(errText);
      if (j.error && j.error.message) detail = j.error.message;
    } catch (e) {}
    return jsonError(502, 'AI service returned ' + llmRes.status + ': ' + detail);
  }

  // Stream the summary back as plain-text deltas so the reader sees words
  // appear almost immediately instead of waiting for the whole completion.
  // We parse the upstream OpenAI-style SSE ("data: {…delta.content}") and
  // forward just the text. The client accumulates the full text and caches
  // it in sessionStorage, so re-opening an article is still instant.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = llmRes.body.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') { controller.close(); return; }
            try {
              const json = JSON.parse(payload);
              const delta = json.choices && json.choices[0] && json.choices[0].delta
                && json.choices[0].delta.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch (e) { /* ignore keep-alives / partial frames */ }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
