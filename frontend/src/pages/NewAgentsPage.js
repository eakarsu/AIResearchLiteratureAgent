import React, { useState } from 'react';

const API = 'http://localhost:3022/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });
const callAgent = async (path, body) => {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
};

const s = {
  input: { width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', marginTop: 4, boxSizing: 'border-box' },
  btn: { padding: '12px 30px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 8 },
  card: { background: '#16213e', padding: 24, borderRadius: 12, marginBottom: 16 },
  label: { color: '#ccc', fontSize: 13, marginTop: 8, display: 'block' },
};

function renderVal(obj, depth = 0) {
  if (!obj) return null;
  if (typeof obj === 'string') return <p style={{ color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{obj}</p>;
  if (typeof obj === 'number') return <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{obj}</span>;
  if (typeof obj === 'boolean') return <span style={{ color: obj ? '#2ecc71' : '#e94560' }}>{obj ? 'Yes' : 'No'}</span>;
  if (Array.isArray(obj)) return (
    <div style={{ marginLeft: depth * 10 }}>
      {obj.map((item, i) => (
        <div key={i} style={{ background: '#1a1a2e', padding: 10, borderRadius: 6, marginBottom: 6, borderLeft: '3px solid #e94560' }}>
          {typeof item === 'object' ? renderVal(item, depth + 1) : <span style={{ color: '#e0e0e0' }}>{String(item)}</span>}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ marginLeft: depth * 10 }}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ color: '#e94560', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 3 }}>{k.replace(/_/g, ' ')}</div>
          {typeof v === 'object' && v !== null ? renderVal(v, depth + 1) : <div style={{ color: '#e0e0e0', background: '#1a1a2e', padding: '6px 10px', borderRadius: 4 }}>{String(v)}</div>}
        </div>
      ))}
    </div>
  );
}

export default function NewAgentsPage() {
  const [tab, setTab] = useState('summarizer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Summarizer inputs
  const [paperText, setPaperText] = useState('');
  const [paperTitle, setPaperTitle] = useState('');

  // Methodology comparison inputs
  const [paperIds, setPaperIds] = useState('');
  const [methodFocus, setMethodFocus] = useState('experimental design and evaluation');

  // Recommender inputs
  const [seed, setSeed] = useState('');
  const [topN, setTopN] = useState(5);

  // Citation graph inputs
  const [graphSeedId, setGraphSeedId] = useState('');
  const [graphSeedDoi, setGraphSeedDoi] = useState('');
  const [graphDepth, setGraphDepth] = useState(2);

  // Keyword taxonomy inputs
  const [taxonomyTopic, setTaxonomyTopic] = useState('');
  const [taxonomyPaperIds, setTaxonomyPaperIds] = useState('');
  const [taxonomySeedKeywords, setTaxonomySeedKeywords] = useState('');

  const run = async (fn) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await fn();
      setResult(data);
    } catch (e) {
      const msg = e.message || 'Agent error';
      if (/503/.test(msg) || /OPENROUTER_API_KEY/i.test(msg)) {
        setError('AI service unavailable — OPENROUTER_API_KEY is not configured on the backend.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const runSummarizer = () => {
    if (!paperText.trim()) {
      setError('Paper text or abstract is required.');
      return;
    }
    return run(() => callAgent('/agents/paper-summarizer', { title: paperTitle, text: paperText }));
  };

  const runMethodologyComparison = () => {
    const ids = paperIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length < 2) {
      setError('Provide at least 2 paper IDs (comma-separated).');
      return;
    }
    return run(() => callAgent('/agents/methodology-comparison', { paper_ids: ids, focus: methodFocus }));
  };

  const runRecommender = () => {
    if (!seed.trim()) {
      setError('Seed query or paper title required.');
      return;
    }
    return run(() => callAgent('/agents/paper-recommender', { seed, top_n: Number(topN) }));
  };

  const runCitationGraph = () => {
    if (!graphSeedId.trim() && !graphSeedDoi.trim()) {
      setError('Provide a seed paper ID or DOI.');
      return;
    }
    return run(() => callAgent('/agents/citation-graph', {
      seed_paper_id: graphSeedId ? Number(graphSeedId) : undefined,
      seed_doi: graphSeedDoi || undefined,
      depth: Number(graphDepth) || 2,
    }));
  };

  const runKeywordTaxonomy = () => {
    const ids = taxonomyPaperIds.split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n));
    const seedKeywords = taxonomySeedKeywords.split(',').map(s => s.trim()).filter(Boolean);
    if (!taxonomyTopic.trim() && ids.length === 0 && seedKeywords.length === 0) {
      setError('Provide a topic, paper IDs, or seed keywords.');
      return;
    }
    return run(() => callAgent('/agents/keyword-taxonomy', {
      topic: taxonomyTopic || undefined,
      paper_ids: ids.length ? ids : undefined,
      seed_keywords: seedKeywords.length ? seedKeywords : undefined,
    }));
  };

  const tabs = [
    { key: 'summarizer', label: '📄 Paper Summarizer' },
    { key: 'methodology', label: '🔬 Methodology Comparison' },
    { key: 'recommender', label: '✨ Paper Recommender' },
    { key: 'graph', label: '🕸️ Citation Graph' },
    { key: 'taxonomy', label: '🔤 Keyword Taxonomy' },
  ];

  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 16 }}>New AI Research Agents</h1>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResult(null); setError(''); }}
            style={{
              padding: '8px 16px',
              background: tab === t.key ? '#e94560' : '#16213e',
              color: tab === t.key ? '#fff' : '#ccc',
              border: '1px solid #0f3460',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.card}>
        {tab === 'summarizer' && (
          <>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Paper Summarizer</h3>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 13 }}>
              Structured summary with key findings, methods, limitations, and glossary.
            </p>
            <label style={s.label}>Paper title (optional)</label>
            <input value={paperTitle} onChange={e => setPaperTitle(e.target.value)} style={s.input} />
            <label style={s.label}>Paper text or abstract</label>
            <textarea value={paperText} onChange={e => setPaperText(e.target.value)} rows={8} style={s.input} />
            <button onClick={runSummarizer} disabled={loading} style={s.btn}>
              {loading ? '⏳ Summarizing...' : '📄 Summarize'}
            </button>
          </>
        )}

        {tab === 'methodology' && (
          <>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Methodology Comparison</h3>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 13 }}>
              Compare research methodologies across selected papers.
            </p>
            <label style={s.label}>Paper IDs (comma separated)</label>
            <input value={paperIds} onChange={e => setPaperIds(e.target.value)} placeholder="e.g. 1,3,7" style={s.input} />
            <label style={s.label}>Focus</label>
            <input value={methodFocus} onChange={e => setMethodFocus(e.target.value)} style={s.input} />
            <button onClick={runMethodologyComparison} disabled={loading} style={s.btn}>
              {loading ? '⏳ Comparing...' : '🔬 Compare Methodologies'}
            </button>
          </>
        )}

        {tab === 'recommender' && (
          <>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Paper Recommender</h3>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 13 }}>
              Recommend top-N related papers from your corpus given a seed query or title.
            </p>
            <label style={s.label}>Seed (query or paper title)</label>
            <textarea value={seed} onChange={e => setSeed(e.target.value)} rows={3} style={s.input} />
            <label style={s.label}>How many recommendations</label>
            <input
              type="number" min="1" max="20"
              value={topN}
              onChange={e => setTopN(e.target.value)}
              style={s.input}
            />
            <button onClick={runRecommender} disabled={loading} style={s.btn}>
              {loading ? '⏳ Recommending...' : '✨ Recommend Papers'}
            </button>
          </>
        )}

        {tab === 'graph' && (
          <>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Citation Graph</h3>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 13 }}>
              Build a citation network (forward + backward) around a seed paper. Returns nodes,
              edges, clusters, central papers, and emerging subfields — ready to visualize.
            </p>
            <label style={s.label}>Seed paper ID (optional if DOI given)</label>
            <input value={graphSeedId} onChange={e => setGraphSeedId(e.target.value)} style={s.input} />
            <label style={s.label}>Seed DOI (optional if paper ID given)</label>
            <input value={graphSeedDoi} onChange={e => setGraphSeedDoi(e.target.value)} style={s.input} />
            <label style={s.label}>Depth (1–3)</label>
            <input
              type="number" min="1" max="3"
              value={graphDepth}
              onChange={e => setGraphDepth(e.target.value)}
              style={s.input}
            />
            <button onClick={runCitationGraph} disabled={loading} style={s.btn}>
              {loading ? '⏳ Building graph...' : '🕸️ Build Citation Graph'}
            </button>
          </>
        )}

        {tab === 'taxonomy' && (
          <>
            <h3 style={{ color: '#e94560', marginTop: 0 }}>Keyword Taxonomy & Hypothesis Generator</h3>
            <p style={{ color: '#888', marginBottom: 12, fontSize: 13 }}>
              Build a structured keyword taxonomy and propose testable hypotheses for a topic.
            </p>
            <label style={s.label}>Topic (optional)</label>
            <input value={taxonomyTopic} onChange={e => setTaxonomyTopic(e.target.value)} style={s.input} />
            <label style={s.label}>Paper IDs (comma separated, optional)</label>
            <input value={taxonomyPaperIds} onChange={e => setTaxonomyPaperIds(e.target.value)} placeholder="e.g. 1,3,7" style={s.input} />
            <label style={s.label}>Seed keywords (comma separated, optional)</label>
            <input value={taxonomySeedKeywords} onChange={e => setTaxonomySeedKeywords(e.target.value)} placeholder="e.g. RAG, vector store, retrieval" style={s.input} />
            <button onClick={runKeywordTaxonomy} disabled={loading} style={s.btn}>
              {loading ? '⏳ Building taxonomy...' : '🔤 Build Taxonomy'}
            </button>
          </>
        )}

        {error && (
          <div style={{ color: '#fff', background: '#e94560', padding: 10, borderRadius: 6, marginTop: 12 }}>{error}</div>
        )}
      </div>

      {result && (
        <div style={s.card}>
          <h3 style={{ color: '#e94560', marginTop: 0 }}>Results</h3>
          {renderVal(result)}
        </div>
      )}
    </div>
  );
}
