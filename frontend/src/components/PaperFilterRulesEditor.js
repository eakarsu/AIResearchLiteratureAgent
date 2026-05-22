import React, { useEffect, useState } from 'react';

const BASE = 'http://localhost:3022/api/custom-views/filter-rules';

export default function PaperFilterRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ type: 'inclusion', field: 'tags', pattern: '', note: '' });
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');

  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = () => {
    fetch(BASE, { headers: headers() })
      .then(r => r.json())
      .then(j => setRules(j.rules || []))
      .catch(e => setStatus('Load error: ' + e.message));
  };

  useEffect(load, []);

  const save = async () => {
    try {
      if (editingId) {
        await fetch(`${BASE}/${editingId}`, { method: 'PUT', headers: headers(), body: JSON.stringify(form) });
        setStatus(`Updated rule #${editingId}`);
      } else {
        await fetch(BASE, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
        setStatus('Created new rule');
      }
      setForm({ type: 'inclusion', field: 'tags', pattern: '', note: '' });
      setEditingId(null);
      load();
    } catch (e) { setStatus('Save error: ' + e.message); }
  };

  const edit = (r) => { setEditingId(r.id); setForm({ type: r.type, field: r.field, pattern: r.pattern, note: r.note }); };

  const del = async (id) => {
    await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: headers() });
    setStatus(`Deleted rule #${id}`);
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
        <button onClick={save} style={{ padding: '8px 16px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {editingId ? 'Update' : 'Add'}
        </button>
      </div>
      {status && <div style={{ color: '#ccc', fontSize: 11, marginBottom: 10 }}>{status}</div>}
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
            <tr key={r.id} style={{ borderBottom: '1px solid #0f3460' }}>
              <td style={{ padding: 6 }}>{r.id}</td>
              <td style={{ padding: 6, color: r.type === 'exclusion' ? '#e94560' : '#4caf50' }}>{r.type}</td>
              <td style={{ padding: 6 }}>{r.field}</td>
              <td style={{ padding: 6 }}>{r.pattern}</td>
              <td style={{ padding: 6 }}>{r.note}</td>
              <td style={{ padding: 6 }}>
                <button onClick={() => edit(r)} style={{ padding: '4px 8px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 6 }}>Edit</button>
                <button onClick={() => del(r.id)} style={{ padding: '4px 8px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
