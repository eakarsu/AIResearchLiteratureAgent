import React from 'react';
const items = [
  {key:'dashboard',icon:'📊',label:'Dashboard'},
  {key:'papers',icon:'📄',label:'Papers'},
  {key:'collections',icon:'📁',label:'Collections'},
  {key:'reviews',icon:'📝',label:'Reviews'},
  {key:'agents',icon:'🤖',label:'AI Agents'},
  {key:'new-agents',icon:'✨',label:'New Agents'},
  {key:'custom-views',icon:'📈',label:'Lit Views'},
  {key:'gap-arxiv',icon:'🔍',label:'arXiv/PubMed Search'},
  {key:'gap-bibtex',icon:'📑',label:'BibTeX Export'},
  {key:'gap-citation-network',icon:'🕸️',label:'Citation Network'},
  {key:'gap-gapfinder',icon:'❓',label:'Gap Finder'},
  {key:'gap-highlight',icon:'🖊️',label:'Highlight & Annotate'},
  {key:'gap-lit-review',icon:'📚',label:'Multi-Paper Review'},
  {key:'gap-methodology',icon:'🔬',label:'Methodology Compare'},
  {key:'gap-notifications',icon:'🔔',label:'Paper Alerts'},
  {key:'gap-recommender',icon:'💡',label:'Paper Recommender'},
  {key:'gap-summarizer',icon:'📋',label:'Paper Summarizer'},
  {key:'gap-pdf',icon:'📂',label:'PDF Ingestion'},
  {key:'gap-quality',icon:'⭐',label:'Quality Scoring'},
  {key:'gap-collab',icon:'👥',label:'Collab Editing'},
];
export default function Sidebar({ active, onNavigate }) {
  return (<div style={{ width: 240, background: '#16213e', height: '100vh', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0 }}>
    <div style={{ padding: '20px 20px 20px', borderBottom: '1px solid #0f3460', flexShrink: 0 }}><h2 style={{ color: '#e94560', margin: 0, fontSize: 18 }}>📚 Research Agent</h2><p style={{ color: '#888', fontSize: 12, margin: '5px 0 0' }}>AI Literature Review Platform</p></div>
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
      {items.map(it => (<div key={it.key} onClick={() => onNavigate(it.key)} style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: active === it.key ? '#0f3460' : 'transparent', color: active === it.key ? '#e94560' : '#ccc', borderLeft: active === it.key ? '3px solid #e94560' : '3px solid transparent' }}><span>{it.icon}</span><span style={{ fontSize: 13 }}>{it.label}</span></div>))}
    </div>
    <div style={{ padding: '12px 20px', borderTop: '1px solid #0f3460', flexShrink: 0 }}><button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} style={{ width: '100%', padding: 10, background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Logout</button></div>
  </div>);
}
