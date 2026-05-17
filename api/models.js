// /api/models.js — Diagnostic endpoint.
// Calls Gemini's ListModels API and returns the models THIS api key can use,
// filtered to those that support `generateContent` (i.e. usable for chat).
// Visit /api/models in a browser to see the list. Useful when you don't know
// which model name to put in the LLM_MODEL env var.

export default async function handler(req, res) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'LLM_API_KEY not set in env vars' });
  }
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: 'Upstream error', status: r.status, detail: data });
    }
    const models = (data.models || [])
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => ({
        name: m.name,                       // e.g. "models/gemini-2.5-flash"
        useAs: (m.name || '').replace(/^models\//, ''),   // strip prefix for OpenAI-compat endpoint
        displayName: m.displayName,
        description: (m.description || '').slice(0, 200),
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
        version: m.version
      }))
      // Prioritise lighter/cheaper "flash" models near the top
      .sort((a, b) => {
        const af = /flash/i.test(a.useAs) ? 0 : 1;
        const bf = /flash/i.test(b.useAs) ? 0 : 1;
        return af - bf;
      });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      total: models.length,
      models,
      hint: 'Put one of the `useAs` values into your LLM_MODEL env var, then redeploy.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
