import React, { useState, useEffect } from 'react';
import { getPapers, createPaper, updatePaper, deletePaper } from '../services/api';
import Modal from '../components/Modal'; import DetailPanel from '../components/DetailPanel';
export default function PapersPage() {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', authors: '', abstract: '', source: 'arXiv', year: 2024, doi: '', tags: '' });
  const load = () => getPapers().then(setItems).catch(()=>{});
  useEffect(() => { load(); }, []);
  const handleSave = async () => { if (editing) await updatePaper(editing.id, form); else await createPaper(form); setShowModal(false); setEditing(null); load(); };
  const statusColor = { unread: '#e94560', reading: '#f39c12', read: '#2ecc71' };
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ color: '#fff', margin: 0 }}>Papers</h1>
      <button onClick={() => { setEditing(null); setForm({ title: '', authors: '', abstract: '', source: 'arXiv', year: 2024, doi: '', tags: '' }); setShowModal(true); }} style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Add Paper</button></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map(p => (<div key={p.id} onClick={() => setSelected(p)} style={{ background: '#16213e', padding: 20, borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${statusColor[p.status] || '#888'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15, flex: 1 }}>{p.title}</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 16 }}>
            <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 16 }}>{p.relevance_score}</span>
            <span style={{ background: (statusColor[p.status]||'#888')+'20', color: statusColor[p.status], padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{p.status}</span>
          </div>
        </div>
        <div style={{ color: '#3498db', fontSize: 13, marginBottom: 4 }}>{p.authors}</div>
        <p style={{ color: '#888', fontSize: 12, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.abstract}</p>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ color: '#9b59b6' }}>{p.source}</span><span style={{ color: '#888' }}>{p.year}</span>
          <span style={{ color: '#f39c12' }}>📖 {p.citations?.toLocaleString()} citations</span>
          {p.tags && p.tags.split(',').slice(0,3).map(t => <span key={t} style={{ background: '#0f3460', color: '#ccc', padding: '1px 6px', borderRadius: 6 }}>{t.trim()}</span>)}
        </div>
      </div>))}
    </div>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setForm(selected); setShowModal(true); }} onDelete={() => { deletePaper(selected.id); setSelected(null); load(); }}
      fields={[{key:'title',label:'Title'},{key:'authors',label:'Authors'},{key:'abstract',label:'Abstract'},{key:'source',label:'Source'},{key:'year',label:'Year'},{key:'citations',label:'Citations'},{key:'doi',label:'DOI'},{key:'tags',label:'Tags'},{key:'status',label:'Status'},{key:'relevance_score',label:'Relevance'}]} />}
    {showModal && <Modal title={editing ? 'Edit Paper' : 'Add Paper'} onClose={() => setShowModal(false)} onSave={handleSave}>
      {[{key:'title',label:'Title'},{key:'authors',label:'Authors'},{key:'abstract',label:'Abstract'},{key:'doi',label:'DOI'},{key:'tags',label:'Tags (comma-separated)'}].map(f => (<div key={f.key} style={{marginBottom:14}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:4}}>{f.label}</label><input value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',boxSizing:'border-box'}} /></div>))}
      <div style={{display:'flex',gap:12}}>
        <div><label style={{color:'#ccc',fontSize:13}}>Source</label><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} style={{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',marginTop:4}}>{['arXiv','NeurIPS','ICML','ICLR','CVPR','Nature','Science','ACL','PubMed'].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={{color:'#ccc',fontSize:13}}>Year</label><input type="number" value={form.year} onChange={e=>setForm({...form,year:+e.target.value})} style={{width:100,padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',marginTop:4}} /></div>
      </div>
    </Modal>}
  </div>);
}
