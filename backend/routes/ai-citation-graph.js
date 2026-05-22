// AI Citation graph visualization — mechanical follow-up over track-citations data.
// Builds a force-directed-graph-friendly payload (nodes/edges/clusters) plus
// key_papers + suggested_reading_order from either a single paper_id (fetched
// from the local corpus via track-citations style enrichment) or a caller-supplied
// papers[] array with citing_ids / cited_ids edge lists.
//
// House style: mirrors backend/routes/ai-literature-review.js — POST /, auth,
// OpenRouter call via fetch, loose JSON parse, append-only mount in server.js.
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../models/db');
const citationTracker = require('../agents/citationTracker');

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
// TODO: configure credentials — set process.env.OPENROUTER_API_KEY

async function callLLM(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { success: false, error: 'OPENROUTER_API_KEY not configured' };
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
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
      max_tokens: 2500,
      temperature: 0.3
    })
  });
  if (!response.ok) return { success: false, error: `LLM error ${response.status}` };
  const data = await response.json();
  return { success: true, content: data.choices?.[0]?.message?.content || '' };
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

// Deterministic graph builder used when caller supplies papers[] with edge lists.
// Computes a simple degree-based centrality so the endpoint stays useful even
// if the LLM is unreachable / unconfigured.
function buildGraphFromPapers(papers) {
  const nodes = [];
  const edges = [];
  const degree = new Map();
  const idSet = new Set(papers.map(p => String(p.id)));
  for (const p of papers) {
    const id = String(p.id);
    degree.set(id, degree.get(id) || 0);
    const citing = Array.isArray(p.citing_ids) ? p.citing_ids : [];
    const cited = Array.isArray(p.cited_ids) ? p.cited_ids : [];
    for (const c of citing) {
      const cId = String(c);
      edges.push({ from: id, to: cId, type: 'cites' });
      degree.set(id, (degree.get(id) || 0) + 1);
      degree.set(cId, (degree.get(cId) || 0) + 1);
    }
    for (const c of cited) {
      const cId = String(c);
      edges.push({ from: cId, to: id, type: 'cited_by' });
      degree.set(id, (degree.get(id) || 0) + 1);
      degree.set(cId, (degree.get(cId) || 0) + 1);
    }
  }
  const maxDeg = Math.max(1, ...Array.from(degree.values()));
  for (const p of papers) {
    const id = String(p.id);
    nodes.push({
      id,
      title: p.title || '',
      centrality: +((degree.get(id) || 0) / maxDeg).toFixed(3)
    });
  }
  // Also surface any referenced ids that weren't in the input list as stub nodes.
  for (const e of edges) {
    for (const endpoint of [e.from, e.to]) {
      if (!idSet.has(endpoint)) {
        idSet.add(endpoint);
        nodes.push({
          id: endpoint,
          title: '',
          centrality: +((degree.get(endpoint) || 0) / maxDeg).toFixed(3)
        });
      }
    }
  }
  return { nodes, edges };
}

router.use(auth);

// POST /api/ai/citation-graph
// Body: { paper_id?, papers?: [{id,title,citing_ids,cited_ids}] }
// Returns: { nodes:[{id,title,centrality}], edges:[{from,to,type}],
//            clusters:[...], key_papers, suggested_reading_order }
router.post('/', async (req, res) => {
  try {
    const { paper_id, papers } = req.body || {};
    let workingPapers = Array.isArray(papers) ? papers.slice() : [];
    let seed = null;

    if (paper_id && !workingPapers.length) {
      // Hydrate from local corpus + citationTracker (Crossref) so we have something to graph.
      try {
        const r = await pool.query(
          'SELECT id,title,authors,doi,year FROM papers WHERE id=$1',
          [paper_id]
        );
        if (r.rows.length) seed = r.rows[0];
      } catch {}
      let trackerOut = null;
      if (seed) {
        try {
          trackerOut = await citationTracker.execute(seed.title, seed.doi);
        } catch {}
      }
      // Pull a candidate corpus to act as graph nodes.
      let corpus = { rows: [] };
      try {
        corpus = await pool.query(
          'SELECT id,title,authors,doi,year FROM papers ORDER BY relevance_score DESC NULLS LAST LIMIT 40'
        );
      } catch {}
      workingPapers = (seed ? [seed] : []).concat(
        corpus.rows.filter(r => !seed || r.id !== seed.id)
      ).map(p => ({
        id: p.id,
        title: p.title,
        citing_ids: [],
        cited_ids: []
      }));
      // If we got Crossref data, leave it for the LLM to weave in.
      req._trackerOut = trackerOut;
    }

    if (!workingPapers.length) {
      return res.status(400).json({
        error: 'paper_id (with seeded corpus) or papers[] required'
      });
    }

    // Deterministic baseline graph from supplied edge lists.
    const baseline = buildGraphFromPapers(workingPapers);

    // Ask the LLM to enrich with clusters, key_papers, suggested_reading_order.
    const systemPrompt = 'You are a citation-network analyst for AIResearchLiteratureAgent. Respond ONLY with valid JSON (no markdown fences).';
    const userPrompt = `Task: Build a citation graph visualization payload.

Input papers (id, title, citing_ids, cited_ids):
${JSON.stringify(workingPapers, null, 2)}

Pre-computed baseline graph (use as-is when sensible, refine centrality / add missing edges if you can infer them):
${JSON.stringify(baseline, null, 2)}

External citation tracker hints (may be null):
${JSON.stringify(req._trackerOut || null, null, 2)}

Return strict JSON with this exact shape:
{
  "nodes": [{ "id": "string", "title": "string", "centrality": 0 }],
  "edges": [{ "from": "string", "to": "string", "type": "cites|cited_by|co_cited|similar_topic" }],
  "clusters": [{ "id": "string", "label": "string", "paper_ids": ["string"], "theme": "string" }],
  "key_papers": [{ "id": "string", "title": "string", "why": "string", "centrality": 0 }],
  "suggested_reading_order": [{ "id": "string", "title": "string", "rank": 1, "rationale": "string" }]
}`;

    const llm = await callLLM(systemPrompt, userPrompt);
    let parsed = null;
    if (llm.success) parsed = parseJsonLoose(llm.content);

    // Fallback: if LLM unavailable or unparsable, return the deterministic
    // baseline graph with empty enrichment fields so the endpoint is still useful.
    if (!parsed) {
      parsed = {
        nodes: baseline.nodes,
        edges: baseline.edges,
        clusters: [],
        key_papers: baseline.nodes
          .slice()
          .sort((a, b) => b.centrality - a.centrality)
          .slice(0, 5)
          .map(n => ({ id: n.id, title: n.title, why: 'highest degree centrality', centrality: n.centrality })),
        suggested_reading_order: baseline.nodes
          .slice()
          .sort((a, b) => b.centrality - a.centrality)
          .map((n, i) => ({ id: n.id, title: n.title, rank: i + 1, rationale: 'ranked by degree centrality' }))
      };
    }

    // Persist a research log entry (best-effort).
    try {
      await pool.query(
        'INSERT INTO research_logs (level,agent,message,user_id,result) VALUES ($1,$2,$3,$4,$5)',
        ['info', 'citationGraph', `Citation graph (${workingPapers.length} papers)`, req.user?.id || null, JSON.stringify({ paper_id, count: workingPapers.length })]
      );
    } catch {}

    res.json({ feature: 'citation-graph', model: MODEL, result: parsed });
  } catch (err) {
    console.error('[citation-graph]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /history — recent results for current user (parity with ai-literature-review).
router.get('/history', async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, message, result, created_at FROM research_logs WHERE user_id=$1 AND agent='citationGraph' ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    res.json({ items: r.rows });
  } catch (err) {
    res.json({ items: [], error: err.message });
  }
});

module.exports = router;
