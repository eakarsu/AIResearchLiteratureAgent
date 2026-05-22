import React, { useState, useEffect } from 'react';

export default function PublicationsPerYearChart() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ range: '', totalPapers: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('http://localhost:3022/api/custom-views/publications-per-year', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(j => { setData(j.data || []); setMeta({ range: j.range, totalPapers: j.totalPapers }); setLoading(false); })
      .catch(e => { setErr(String(e)); setLoading(false); });
  }, []);

  if (loading) return <div style={{ color: '#888' }}>Loading publications-per-year…</div>;
  if (err) return <div style={{ color: '#e94560' }}>{err}</div>;
  const maxC = Math.max(1, ...data.map(d => d.count));

  return (
    <div style={{ background: '#16213e', padding: 20, borderRadius: 8, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Publications Per Year</h3>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Range: {meta.range} · Total: {meta.totalPapers} papers</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, padding: '10px 0' }}>
        {data.map(d => (
          <div key={d.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div title={`${d.count} papers, ${d.total_citations} citations`} style={{ width: '100%', background: '#e94560', height: `${(d.count / maxC) * 160}px`, borderRadius: '4px 4px 0 0', transition: 'all 0.3s' }} />
            <div style={{ color: '#ccc', fontSize: 10, marginTop: 4 }}>{d.year}</div>
            <div style={{ color: '#888', fontSize: 9 }}>{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
