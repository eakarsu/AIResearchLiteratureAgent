// AI Automated literature review generation
// Input research question, AI finds papers and synthesizes narrative
const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

const MODEL = process.env.OPENROUTER_MODEL;
// TODO: configure credentials — set process.env.OPENROUTER_API_KEY

async function callLLM(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
  if (!apiKey || !MODEL || !baseUrl) throw new Error('OpenRouter runtime configuration is required');
  const response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AIResearchLiteratureAgent'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.4
    })
  });
  if (!response.ok) throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
  const data = await response.json();
  const content = String(data.choices?.[0]?.message?.content || '').trim();
  if (!content) throw new Error('OpenRouter returned empty content');
  return { success: true, content };
}

function parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  const a = text.search(/[{\[]/);
  const b = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (a !== -1 && b !== -1) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  return null;
}

async function persistResult(userId, endpoint, inputData, result) {
  await pool.query(
    'INSERT INTO ai_results(user_id,endpoint,input_data,result) VALUES($1,$2,$3,$4)',
    [userId || null, endpoint, inputData || {}, result || {}]
  );
}

router.use(auth);
// POST /
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const context = payload.context || payload.data || payload;
    const systemPrompt = `You are an expert AI assistant for AIResearchLiteratureAgent. Focus area: Automated literature review generation. ${`Input research question, AI finds papers and synthesizes narrative`}. Respond ONLY with valid JSON (no markdown fences).`;
    const userPrompt = `Task: Automated literature review generation.\n${`Input research question, AI finds papers and synthesizes narrative`}\n\nInput payload (JSON):\n${JSON.stringify(context, null, 2)}\n\nReturn JSON with the shape:\n{\n  "summary": "...",\n  "findings": ["..."],\n  "recommendations": ["..."],\n  "score": 0,\n  "confidence": 0\n}`;
    const llm = await callLLM(systemPrompt, userPrompt);
    if (!llm.success) return res.status(503).json({ error: llm.error });
    const parsed = parseJsonLoose(llm.content) || { raw: llm.content };
    await persistResult(req.user?.id, 'literature-review', context, parsed);
    res.json({ feature: 'literature-review', model: MODEL, result: parsed });
  } catch (err) {
    console.error('[literature-review]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /history — recent results for current user
router.get('/history', async (req, res) => {
  try {
    return res.json({ items: [] });
  } catch (err) {
    res.json({ items: [], error: err.message });
  }
});

module.exports = router;
