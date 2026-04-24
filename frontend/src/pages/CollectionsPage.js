import React, { useState, useEffect } from 'react';
import { getCollections, createCollection, deleteCollection } from '../services/api';
import Modal from '../components/Modal';
export default function CollectionsPage() {
  const [items, setItems] = useState([]); const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const load = () => getCollections().then(setItems).catch(()=>{});
  useEffect(() => { load(); }, []);
  const colors = ['#3498db', '#2ecc71', '#e94560', '#f39c12', '#9b59b6'];
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ color: '#fff', margin: 0 }}>Collections</h1>
      <button onClick={() => { setForm({ name: '', description: '' }); setShowModal(true); }} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ New Collection</button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {items.map((c, i) => (<div key={c.id} style={{ background: '#16213e', padding: 24, borderRadius: 12, borderTop: `4px solid ${colors[i % colors.length]}` }}>
        <h3 style={{ color: '#fff', margin: '0 0 8px' }}>{c.name}</h3>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>{c.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#3498db', fontSize: 14 }}>{c.paper_count} papers</span>
          <button onClick={() => deleteCollection(c.id).then(load)} style={{ padding: '4px 10px', background: '#e9456020', color: '#e94560', border: '1px solid #e94560', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
        </div>
      </div>))}
    </div>
    {showModal && <Modal title="New Collection" onClose={() => setShowModal(false)} onSave={() => { createCollection(form).then(load); setShowModal(false); }}>
      {[{key:'name',label:'Name'},{key:'description',label:'Description'}].map(f => (<div key={f.key} style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>{f.label}</label><input value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',boxSizing:'border-box'}} /></div>))}
    </Modal>}
  </div>);
}
