import React, { useState } from 'react';
import { getAgentLogs } from '../services/api';
import FormattedAIReport from './FormattedAIReport';

function decodedResult(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch (_) { return value; }
}

export default function ResearchHistory() {
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[rows,setRows]=useState([]),[page,setPage]=useState(1),[pages,setPages]=useState(1),[selected,setSelected]=useState(null);
  const load=async(nextPage=1)=>{
    setLoading(true);setError('');
    try{const data=await getAgentLogs(nextPage);if(!Array.isArray(data.data))throw Error('History returned an invalid response.');setRows(data.data);setPage(nextPage);setPages(Math.max(1,data.pagination?.totalPages||1));setOpen(true);}
    catch(err){setError(err.message||'Could not load report history.');setOpen(true);}finally{setLoading(false);}
  };
  if(!open)return <button type="button" className="research-history-button" onClick={()=>load(1)}>Report history</button>;
  return <section className="research-history" aria-label="Report history">
    <div className="research-history-heading"><div><span className="ai-eyebrow">Persisted for this research account</span><h2>Report history</h2></div><button type="button" onClick={()=>{setOpen(false);setSelected(null);}}>Close history</button></div>
    {loading&&<p role="status">Loading report history…</p>}
    {error&&<p role="alert">{error} <button type="button" onClick={()=>load(page)}>Retry history</button></p>}
    {!loading&&!error&&!rows.length&&<p>No persisted agent reports are available for this account.</p>}
    {!loading&&!error&&rows.map(row=><button type="button" className="research-history-row" key={row.id} onClick={()=>setSelected(row)}><span><strong>{row.agent||'Research agent'}</strong><small>{row.message||'Saved report'}</small></span><time>{row.created_at?new Date(row.created_at).toLocaleString():'Time unavailable'}</time></button>)}
    {!loading&&!error&&rows.length>0&&<div className="research-history-pagination"><button type="button" disabled={page<=1} onClick={()=>load(page-1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page>=pages} onClick={()=>load(page+1)}>Next</button></div>}
    {selected&&<div className="ai-center-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null);}}><section className="ai-center-dialog" role="dialog" aria-modal="true" aria-label="Saved report details"><header><div><span className="ai-eyebrow">Saved {selected.created_at?new Date(selected.created_at).toLocaleString():''}</span><h2>{selected.agent||'Research report'}</h2></div><button type="button" onClick={()=>setSelected(null)}>Close</button></header><div className="ai-dialog-body"><p className="research-history-message">{selected.message}</p><FormattedAIReport response={decodedResult(selected.result)} title="Saved report"/></div><footer style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button type="button" onClick={()=>setSelected(null)}>Edit</button><button type="button" onClick={()=>{setRows(rows.filter(r=>r.id!==selected.id));setSelected(null);}}>Delete</button><button type="button" onClick={()=>setSelected(null)}>Cancel</button></footer></section></div>}
  </section>;
}
