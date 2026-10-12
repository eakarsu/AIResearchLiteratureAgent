import React, { useEffect, useState } from 'react';
import { getPapers } from '../services/api';
import './ResearchExamples.css';

export const researchExamples = [
  { label: 'Evaluation design', topic: 'Reliable evaluation of language model assistants', field: 'AI evaluation', scope: 'methods and limitations', text: 'Fictional practice abstract: compare two evaluation rubrics on a synthetic question set. No measured findings are supplied. Identify the design, missing measurements and threats to validity.', keywords: 'evaluation, rubric, reliability', count: 5, depth: 1 },
  { label: 'Retrieval methods', topic: 'Retrieval methods for technical documentation', field: 'Information retrieval', scope: 'comparison and future work', text: 'Fictional practice abstract: plan a comparison of sparse and dense retrieval using a synthetic document collection. Describe evaluation requirements without asserting experimental results.', keywords: 'retrieval, ranking, documentation', count: 8, depth: 2 },
  { label: 'Reproducibility', topic: 'Reproducibility of small research workflows', field: 'Research methodology', scope: 'reproducibility and reporting', text: 'Fictional practice abstract: propose a reproducibility checklist for a synthetic workflow. No real study, data, authors or verified findings are claimed.', keywords: 'reproducibility, reporting, workflow', count: 10, depth: 3 },
];

export function useOwnedPapers() {
  const [papers, setPapers] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    getPapers({ limit: 100 }).then(response => {
      const rows = Array.isArray(response) ? response : response?.data;
      if (!Array.isArray(rows)) throw new Error('Saved papers returned an invalid response.');
      if (active) setPapers(rows);
    }).catch(err => { if (active) { setPapers([]); setError(err.message || 'Could not load saved papers.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  return { papers, error, loading, retry: () => setReload(value => value + 1) };
}

export function selectedPaperIds(text, papers) {
  const values = String(text).split(',').map(value => value.trim()).filter(Boolean);
  if (values.some(value => !/^[1-9]\d*$/.test(value) || !papers.some(paper => String(paper.id) === value))) throw new Error('Select paper IDs from your loaded saved papers.');
  return [...new Set(values.map(Number))];
}

export default function ResearchExamples({ onFill, disabled, sources, notice }) {
  return <div className="ai-preset-bar">
    <strong>Complete research examples</strong><p>Each choice fills required and optional drafting fields. Saved references come from your papers. Generate is a separate action.</p>
    <div className="ai-actions">{researchExamples.map((sample, index) => <button type="button" key={sample.label} disabled={disabled} onClick={() => onFill(sample, index)}>{sample.label}</button>)}</div>
    {notice && <p role="status">{notice}</p>}
    {sources.loading && <p role="status">Loading saved papers…</p>}
    {sources.error && <p role="alert">{sources.error} <button type="button" onClick={sources.retry}>Retry saved papers</button></p>}
    {!sources.loading && !sources.error && (sources.papers.length ? <details><summary>{sources.papers.length} saved papers available · View references</summary><ul>{sources.papers.map(paper=><li key={paper.id}>{paper.id}: {paper.title}{paper.doi ? ` · ${paper.doi}` : ''}</li>)}</ul></details> : <p>No saved papers. Add papers to use tools that require saved references.</p>)}
  </div>;
}
