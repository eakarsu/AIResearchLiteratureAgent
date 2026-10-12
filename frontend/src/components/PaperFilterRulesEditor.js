import React, { useEffect, useState } from 'react';
import DetailPanel from './DetailPanel';

const BASE = '/api/custom-views/filter-rules';

export default function PaperFilterRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ type: 'inclusion', field: 'tags', pattern: '', note: '' });
  const [editingId, setEditingId] = useState(null);
  const [selected,setSelected]=useState(null);
  const [status, setStatus] = useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = () => {
    setLoading(true);setError('');
    fetch(BASE, { headers: headers() })
      .then(async r => {const j=await r.json();if(!r.ok)throw Error(j.error||`Request failed with HTTP ${r.status}`);return j;})
      .then(j => {if(!Array.isArray(j.rules))throw Error('Filter rules returned an invalid response.');setRules(j.rules);})
      .catch(e => setError(e.message||'Could not load filter rules.'))
      .finally(()=>setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    try {
      if (editingId) {
        const response=await fetch(`${BASE}/${editingId}`, { method: 'PUT', headers: headers(), body: JSON.stringify(form) });if(!response.ok)throw Error(`Update failed with HTTP ${response.status}`);
        setStatus(`Updated rule #${editingId}`);
      } else {
        const response=await fetch(BASE, { method: 'POST', headers: headers(), body: JSON.stringify(form) });if(!response.ok)throw Error(`Create failed with HTTP ${response.status}`);
        setStatus('Created new rule');
      }
      setForm({ type: 'inclusion', field: 'tags', pattern: '', note: '' });
      setEditingId(null);
      load();
    } catch (e) { setStatus('Save error: ' + e.message); }
  };

  const edit = (r) => { setSelected(null);setEditingId(r.id); setForm({ type: r.type, field: r.field, pattern: r.pattern, note: r.note }); };

  const del = async (id) => {
    const response=await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: headers() });if(!response.ok){setStatus(`Delete failed with HTTP ${response.status}`);return;}
    setStatus(`Deleted rule #${id}`);
    setSelected(null);
    load();
  };

  const input = { padding: 8, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 4, color: '#fff', fontSize: 13 };

  return (
    <div style={{ background: '#16213e', padding: 20, borderRadius: 8, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Paper Filter Rules (Inclusion / Exclusion)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={input}>
          <option value="inclusion">inclusion</option>
          <option value="exclusion">exclusion</option>
        </select>
        <input value={form.field} onChange={e => setForm({ ...form, field: e.target.value })} placeholder="field" style={input} />
        <input value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })} placeholder="pattern" style={input} />
        <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="note" style={input} />
        <button type="button" onClick={save} style={{ padding: '8px 16px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {editingId ? 'Update' : 'Add'}
        </button>
      </div>
      {editingId&&<button type="button" onClick={()=>{setEditingId(null);setForm({type:'inclusion',field:'tags',pattern:'',note:''});}} style={{marginBottom:10,padding:'6px 12px',background:'#23324b',border:'1px solid #475569',borderRadius:4,color:'#fff'}}>Cancel edit</button>}
      {status && <div style={{ color: '#ccc', fontSize: 11, marginBottom: 10 }}>{status}</div>}
      {loading&&<p role="status">Loading filter rules…</p>}
      {error&&<p role="alert" style={{color:'#fecdd3'}}>{error} <button type="button" onClick={load}>Retry rules</button></p>}
      {!loading&&!error&&!rules.length&&<p>No persisted filter rules are available for this account.</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ccc', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #0f3460' }}>
            <th style={{ textAlign: 'left', padding: 6 }}>ID</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Type</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Field</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Pattern</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Note</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} onClick={()=>setSelected(r)} style={{ borderBottom: '1px solid #0f3460',cursor:'pointer' }}>
              <td style={{ padding: 6 }}>{r.id}</td>
              <td style={{ padding: 6, color: r.type === 'exclusion' ? '#e94560' : '#4caf50' }}>{r.type}</td>
              <td style={{ padding: 6 }}>{r.field}</td>
              <td style={{ padding: 6 }}>{r.pattern}</td>
              <td style={{ padding: 6 }}>{r.note}</td>
              <td style={{ padding: 6 }}>
                <button type="button" onClick={event => {event.stopPropagation();edit(r);}} style={{ padding: '4px 8px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 6 }}>Edit</button>
                <button type="button" onClick={event => {event.stopPropagation();del(r.id);}} style={{ padding: '4px 8px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected&&<DetailPanel item={{...selected,title:`Filter rule #${selected.id}`}} onClose={()=>setSelected(null)} onEdit={()=>edit(selected)} onDelete={()=>del(selected.id)} fields={[{key:'type',label:'Type'},{key:'field',label:'Field'},{key:'pattern',label:'Pattern'},{key:'note',label:'Note'},{key:'created_at',label:'Created'}]}/>}
    </div>
  );
}
