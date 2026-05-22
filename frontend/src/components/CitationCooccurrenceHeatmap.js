import React, { useState, useEffect } from 'react';

export default function CitationCooccurrenceHeatmap() {
  const [topics, setTopics] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('http://localhost:3022/api/custom-views/citation-cooccurrence', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(j => { setTopics(j.topics || []); setMatrix(j.matrix || []); setLoading(false); })
      .catch(e => { setErr(String(e)); setLoading(false); });
  }, []);

  if (loading) return <div style={{ color: '#888' }}>Loading heatmap…</div>;
  if (err) return <div style={{ color: '#e94560' }}>{err}</div>;
  const maxV = Math.max(1, ...matrix.flat());
  const color = v => {
    const t = v / maxV;
    const r = Math.round(15 + 218 * t), g = Math.round(33 + 36 * t), b = Math.round(62 + 34 * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={{ background: '#16213e', padding: 20, borderRadius: 8, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Citation Co-occurrence (Topic × Topic)</h3>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Weighted by log10(citations); top {topics.length} topics</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr><th style={{ padding: 6 }} /> {topics.map(t => <th key={t} style={{ color: '#ccc', padding: 6, transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}>{t}</th>)}</tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td style={{ color: '#ccc', padding: 6, textAlign: 'right', whiteSpace: 'nowrap' }}>{topics[i]}</td>
                {row.map((v, j) => (
                  <td key={j} title={`${topics[i]} × ${topics[j]} = ${v}`} style={{ background: color(v), padding: 6, color: '#fff', textAlign: 'center', minWidth: 38, border: '1px solid #0f3460' }}>
                    {v.toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
