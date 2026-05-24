// /api/chat.js — Cosmic Reader AI Operator (Edge runtime, streaming SSE)
//
// Receives a chat conversation from the client and proxies it to whichever
// LLM provider's OpenAI-compatible endpoint is configured via env vars.
// Streams tokens back to the client as Server-Sent Events for a low-latency,
// ChatGPT-like typing effect.
// Default target: Google Gemini Flash (free tier friendly).
//
// Env vars required:
//   LLM_API_KEY    — provider API key
//   LLM_BASE_URL   — e.g. https://generativelanguage.googleapis.com/v1beta/openai/
//   LLM_MODEL      — e.g. gemini-2.5-flash-lite
//
// Request body (JSON):
//   {
//     messages: [{ role: 'user' | 'assistant', content: '...' }, ...],
//     articleContext?: '...'   // optional: compact summary of today's feed
//   }
//
// Response: text/event-stream with OpenAI-style `data: {...}` chunks.

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are the Cosmic Reader AI Operator, an assistant embedded in a space-news aggregator dashboard.

Your role:
- Help users discover and understand articles from today's space news feed.
- Identify trending / top / latest articles when asked (you DO have this info — see below).
- Summarize headlines or specific articles on request.
- Explain space concepts (astronomy, missions, planetary science, physics).
- Answer follow-up questions concisely.

How to read the feed below:
- The feed is sorted by recency, newest first. This IS the same trending order shown on the Trending Signals page.
- Index [1] = the top trending / most recent article right now.
- Index [2] = #2 trending, and so on.
- "Top story", "top trending", "latest headline", "what's #1" → answer with article [1].
- "Top 3" → articles [1] [2] [3]. Always reference real titles and sources from the list.

Referencing articles (important — this powers clickable actions in the app):
- Whenever you mention a specific article from the feed, include its [n] index marker right after it, e.g. ...the new lunar findings [3]....
- The app turns each [n] into clickable Open / Save / View original buttons, so always cite the index for any article you recommend, summarize, or mention.
- Always pair the [n] with the article's real title and source from the list. Never invent a title, source, or [n] that isn't in the list.

Reading-order requests ("what should I read first", "in 5 minutes", "reading order"):
- Recommend specific feed articles by [n] and title, in a sensible order, each with a one-line reason.
- Prefer the most important / most recent signals first; keep the whole answer skimmable.

Guidelines:
- Be concise. Aim for 2-4 sentences unless explicitly asked for more detail.
- Stay on topic: space, astronomy, missions, related tech and science.
- If asked something clearly off-topic, gently redirect: "I'm focused on space news — but..."
- Never invent article titles, sources, or facts. If a requested topic, mission, or story is NOT in the feed list below, say plainly that it isn't in the current feed / today's signals and suggest searching Transmissions or checking back later — do NOT fabricate details to fill the gap.
- Never say you "can't track trending" or "don't have access to the feed" — you do, it's right below.
- If the user refers to "this article", "this", or "it", they mean the article they currently have open (see the current view note, when present).
- Use plain text only (no markdown headers, no asterisks, no bullet points), except the [n] markers described above — your replies render in a chat bubble.
- Personality: knowledgeable, mission-control crisp, occasionally cosmic-themed but never corny.`;

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
    return jsonError(500, 'Chat backend not configured. Missing LLM_API_KEY / LLM_BASE_URL / LLM_MODEL env vars.');
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return jsonError(400, 'Invalid JSON body');
  }
  body = body || {};

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(400, 'Missing or empty `messages` array');
  }
  if (messages.length > 30) {
    return jsonError(400, 'Conversation too long. Clear it and start over.');
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !m.role || typeof m.content !== 'string') {
      return jsonError(400, 'Invalid message format');
    }
    if (m.content.length > 2000) {
      return jsonError(400, 'A message is too long. Keep each turn under 2000 characters.');
    }
    if (!['user', 'assistant', 'system'].includes(m.role)) {
      return jsonError(400, 'Invalid message role');
    }
  }

  // Build system prompt + optional article context
  let systemPrompt = SYSTEM_PROMPT;
  if (typeof body.articleContext === 'string' && body.articleContext.length > 0) {
    const ctx = body.articleContext.slice(0, 8000);
    systemPrompt += '\n\n--- Today\'s feed (sorted by recency = trending order; [1] is the top trending article) ---\n' + ctx;
  }
  // Optional: what the user is currently looking at (view + open article), so
  // the assistant can resolve "this article" and tailor recommendations.
  if (typeof body.currentContext === 'string' && body.currentContext.length > 0) {
    systemPrompt += '\n\n--- What the user is currently viewing ---\n' + body.currentContext.slice(0, 600);
  }

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m.role !== 'system')
  ];

  const endpoint = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        max_tokens: 600,
        temperature: 0.7,
        stream: true
      }),
      signal: AbortSignal.timeout(25000)
    });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return jsonError(504, 'AI took too long to respond. Try a shorter question.');
    }
    return jsonError(500, 'Chat error. Try again.');
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    let errDetail = errText.slice(0, 400);
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error && errJson.error.message) errDetail = errJson.error.message;
      else if (errJson.message) errDetail = errJson.message;
    } catch (e) {}
    return jsonError(502, 'AI service returned ' + upstream.status + ': ' + errDetail);
  }

  // Pass the SSE stream straight through to the client.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
