import React, { useState, useEffect } from 'react';
import { getReviews, createReview, deleteReview } from '../services/api';
import Modal from '../components/Modal'; import DetailPanel from '../components/DetailPanel';
export default function ReviewsPage() {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', topic: '', content: '' });
  const load = () => getReviews().then(setItems).catch(()=>{});
  useEffect(() => { load(); }, []);
  const statusColor = { draft: '#888', in_progress: '#f39c12', published: '#2ecc71' };
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ color: '#fff', margin: 0 }}>Literature Reviews</h1>
      <button onClick={() => { setForm({ title: '', topic: '', content: '' }); setShowModal(true); }} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ New Review</button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
      {items.map(r => (<div key={r.id} onClick={() => setSelected(r)} style={{ background: '#16213e', padding: 20, borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${statusColor[r.status]||'#888'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ background: (statusColor[r.status]||'#888')+'20', color: statusColor[r.status], padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{r.status}</span><span style={{ color: '#888', fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</span></div>
        <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 16 }}>{r.title}</h3>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 8px' }}>{r.topic}</p>
        <span style={{ color: '#3498db', fontSize: 12 }}>{r.papers_included} papers included</span>
      </div>))}
    </div>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => {}} onDelete={() => { deleteReview(selected.id); setSelected(null); load(); }}
      fields={[{key:'title',label:'Title'},{key:'topic',label:'Topic'},{key:'status',label:'Status'},{key:'papers_included',label:'Papers'},{key:'content',label:'Content'},{key:'gaps_identified',label:'Gaps'}]} />}
    {showModal && <Modal title="New Review" onClose={() => setShowModal(false)} onSave={() => { createReview(form).then(load); setShowModal(false); }}>
      {[{key:'title',label:'Title'},{key:'topic',label:'Topic'}].map(f => (<div key={f.key} style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>{f.label}</label><input value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',boxSizing:'border-box'}} /></div>))}
    </Modal>}
  </div>);
}
