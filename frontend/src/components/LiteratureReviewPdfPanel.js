import React, { useState } from 'react';

export default function LiteratureReviewPdfPanel() {
  const [status, setStatus] = useState('');

  const onDownload = async () => {
    setStatus('Generating…');
    try {
      const r = await fetch('/api/custom-views/literature-review-pdf', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!r.ok) { let message='';try{message=(await r.json()).error||'';}catch{}throw Error(message||`Request failed with HTTP ${r.status}`); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'literature-review.pdf'; a.click();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  };

  return (
    <div style={{ background: '#16213e', padding: 20, borderRadius: 8, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Literature Planning PDF</h3>
      <p style={{ color: '#888', fontSize: 13 }}>Download an account-scoped planning draft from saved records. It is not a verified literature review.</p>
      <button onClick={onDownload} disabled={status==='Generating…'} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor:'pointer', fontSize: 14 }}>Download Planning PDF</button>
      {status && <div role={status.startsWith('Error:')?'alert':'status'} style={{ color:status.startsWith('Error:')?'#fecdd3':'#ccc', marginTop: 12, fontSize: 12 }}>{status}</div>}
    </div>
  );
}
