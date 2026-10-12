'use strict';
const axios = require('axios');
const { failure } = require('./paperScope');

function parseContent(content) {
  const text = String(content || '').trim();
  if (!text) throw failure(502, 'OpenRouter returned an empty response.');
  try { return JSON.parse(text); } catch (_) { /* prose is still a valid report */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch (_) { /* preserve prose */ } }
  return text;
}

function runtime() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  if (!apiKey || !model) throw failure(503, 'AI service unavailable: OpenRouter is not configured.');
  if (!/^https?:\/\//i.test(baseUrl)) throw failure(503, 'AI service unavailable: OpenRouter endpoint is invalid.');
  return { apiKey, model, baseUrl };
}

async function generate({ system, prompt, signal, temperature = 0.2 }) {
  const { apiKey, model, baseUrl } = runtime();
  try {
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      temperature,
    }, {
      signal,
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'AIResearchLiteratureAgent',
      },
    });
    const message = response.data?.choices?.[0]?.message?.content;
    return { report: parseContent(message), model: response.data?.model || model, usage: response.data?.usage || null };
  } catch (error) {
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') throw failure(499, 'OpenRouter request canceled.');
    if (error.status) throw error;
    const status = error.response?.status;
    if (status === 401 || status === 403) throw failure(503, 'AI service authentication failed.');
    if (status === 429) throw failure(503, 'AI service is rate limited. Retry later.');
    if (status) throw failure(502, `OpenRouter request failed with HTTP ${status}.`);
    throw failure(502, 'OpenRouter could not be reached.');
  }
}

module.exports = { generate, parseContent, runtime };
