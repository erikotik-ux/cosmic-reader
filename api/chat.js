// /api/chat.js — Cosmic Reader AI Operator
//
// Receives a chat conversation from the client and proxies it to whichever
// LLM provider's OpenAI-compatible endpoint is configured via env vars.
// Default target: Google Gemini Flash 2.0 (free tier friendly).
//
// Env vars required:
//   LLM_API_KEY    — provider API key
//   LLM_BASE_URL   — e.g. https://generativelanguage.googleapis.com/v1beta/openai/
//   LLM_MODEL      — e.g. gemini-2.0-flash
//
// Request body (JSON):
//   {
//     messages: [{ role: 'user' | 'assistant', content: '...' }, ...],
//     articleContext?: '...'   // optional: compact summary of today's feed
//   }
//
// Response (JSON):
//   { message: '...response text...', usage?: { ... } }
//   { error: '...' }   on failure

const SYSTEM_PROMPT = `You are the Cosmic Reader AI Operator, an assistant embedded in a space-news aggregator dashboard.

Your role:
- Help users discover and understand articles from today's space news feed.
- Summarize headlines or specific articles on request.
- Explain space concepts (astronomy, missions, planetary science, physics).
- Answer follow-up questions concisely.

Guidelines:
- Be concise. Aim for 2-4 sentences unless explicitly asked for more detail.
- Stay on topic: space, astronomy, missions, related tech and science.
- If asked something clearly off-topic, gently redirect: "I'm focused on space news — but..."
- Never invent article titles, sources, or facts. If asked about something not in today's feed, say so and suggest searching Transmissions.
- Use plain text only (no markdown headers, no asterisks, no bullet points) — your replies render in a chat bubble.
- Personality: knowledgeable, mission-control crisp, occasionally cosmic-themed but never corny.

Today's feed is provided to you below (if available). Reference it when relevant.`;

export default async function handler(req, res) {
  // CORS / method gating
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify configuration
  const apiKey  = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model   = process.env.LLM_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return res.status(500).json({
      error: 'Chat backend not configured. Missing LLM_API_KEY / LLM_BASE_URL / LLM_MODEL env vars.'
    });
  }

  // Parse body (Vercel auto-parses JSON but defensively re-parse if string)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  body = body || {};

  // Validate messages
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty `messages` array' });
  }
  if (messages.length > 30) {
    return res.status(400).json({ error: 'Conversation too long. Clear it and start over.' });
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object' || !m.role || typeof m.content !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    if (m.content.length > 2000) {
      return res.status(400).json({ error: 'A message is too long. Keep each turn under 2000 characters.' });
    }
    if (!['user', 'assistant', 'system'].includes(m.role)) {
      return res.status(400).json({ error: 'Invalid message role' });
    }
  }

  // Build the final system prompt: base prompt + optional today's-articles context.
  let systemPrompt = SYSTEM_PROMPT;
  if (typeof body.articleContext === 'string' && body.articleContext.length > 0) {
    // Cap context size to avoid blowing past free-tier token limits
    const ctx = body.articleContext.slice(0, 8000);
    systemPrompt += '\n\n--- Today\'s feed (article index) ---\n' + ctx;
  }

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    // Drop any 'system' roles the client tried to send — only ours counts
    ...messages.filter(m => m.role !== 'system')
  ];

  // Compose endpoint URL safely (handle trailing slash)
  const endpoint = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  try {
    const llmRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        max_tokens: 600,
        temperature: 0.7
      }),
      // Vercel Hobby tier serverless functions cap at 10s by default, 30s on
      // the Edge runtime / higher tiers. Stay safely under 10s.
      signal: AbortSignal.timeout(9000)
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => '');
      console.error('[/api/chat] Upstream error:', llmRes.status, errText.slice(0, 300));
      // Surface a friendlier status to the user but log details server-side
      const status = llmRes.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: status === 429
          ? 'Hitting rate limits — try again in a moment.'
          : 'Upstream AI service unavailable. Try again shortly.'
      });
    }

    const data = await llmRes.json();
    const text = (data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content) || '';
    if (!text) {
      console.warn('[/api/chat] Empty completion', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'No response from AI. Try again.' });
    }

    return res.status(200).json({
      message: text.trim(),
      usage: data.usage || null
    });
  } catch (err) {
    console.error('[/api/chat] Fetch error:', err && err.message);
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return res.status(504).json({ error: 'AI took too long to respond. Try a shorter question.' });
    }
    return res.status(500).json({ error: 'Chat error. Try again.' });
  }
}
