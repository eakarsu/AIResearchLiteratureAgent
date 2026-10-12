import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';
export default function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const load = () => { setError(''); return getStats().then(setStats).catch(error => setError(error.message || 'Could not load research counts')); };
  useEffect(() => { load(); }, []);
  const cards = [
    {key:'papers',field:'papers',label:'Papers',icon:'📄',color:'#3498db'},
    {key:'papers',field:'unread',label:'Unread',icon:'📬',color:'#e94560'},
    {key:'collections',field:'collections',label:'Collections',icon:'📁',color:'#2ecc71'},
    {key:'reviews',field:'reviews',label:'Reviews',icon:'📝',color:'#f39c12'},
  ];
  return <div>
    <h1 style={{ color: '#fff', marginBottom: 30 }}>Research Dashboard</h1>
    {error && <div role="alert" style={{color:'#ffb4b4',marginBottom:16}}>{error} <button onClick={load}>Retry</button></div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
      {cards.map(card => <div key={card.field} onClick={() => onNavigate(card.key)} style={{ background: '#16213e', padding: 24, borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${card.color}` }}>
        <div style={{fontSize:32,marginBottom:8}}>{card.icon}</div>
        <div style={{color:'#888',fontSize:13,marginBottom:4}}>{card.label}</div>
        <div data-stat={card.field} style={{color:card.color,fontSize:28,fontWeight:'bold'}}>{error ? 'Unavailable' : !stats ? 'Loading…' : stats[card.field] == null ? 'Unavailable' : stats[card.field]}</div>
        {stats?.unavailable?.[card.field] && <p style={{color:'#bbb',fontSize:12,lineHeight:1.5}}>{stats.unavailable[card.field]}</p>}
      </div>)}
    </div>
  </div>;
}
