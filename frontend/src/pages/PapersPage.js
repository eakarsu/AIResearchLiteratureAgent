import React,{useState,useEffect} from 'react';
import{getPapers,createPaper,updatePaper,deletePaper,getNotes,createNote,deleteNote,doiLookup,importPaper,aiCitations} from'../services/api';
import Modal from'../components/Modal';import DetailPanel from'../components/DetailPanel';
const s={btn:(bg='#e94560')=>({padding:'8px 16px',background:bg,color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}),input:{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',marginTop:4,boxSizing:'border-box'}};
export default function PapersPage(){
const[items,setItems]=useState([]);const[page,setPage]=useState(1);const[totalPages,setTotalPages]=useState(1);const[total,setTotal]=useState(0);const[search,setSearch]=useState('');const[filterSrc,setFilterSrc]=useState('');const[filterStatus,setFilterStatus]=useState('');
const[selected,setSelected]=useState(null);const[showModal,setShowModal]=useState(false);const[editing,setEditing]=useState(null);const[notes,setNotes]=useState([]);const[noteText,setNoteText]=useState('');const[showDOI,setShowDOI]=useState(false);const[doi,setDoi]=useState('');const[doiResult,setDoiResult]=useState(null);const[citResult,setCitResult]=useState(null);const[loading,setLoading]=useState(false);
const[form,setForm]=useState({title:'',authors:'',abstract:'',source:'arXiv',year:2024,doi:'',tags:''});
const load=(p=1,q=search,src=filterSrc,st=filterStatus)=>getPapers({page:p,limit:20,search:q,source:src,status:st}).then(r=>{setItems(r.data||r);setTotalPages(r.pagination?.totalPages||1);setTotal(r.pagination?.total||0);}).catch(()=>{});
useEffect(()=>{load(1);},[]);
const handleSave=async()=>{if(editing)await updatePaper(editing.id,form);else await createPaper(form);setShowModal(false);setEditing(null);load(page);};
const statusColor={unread:'#e94560',reading:'#f39c12',read:'#2ecc71'};
const loadNotes=async(paperId)=>{try{const n=await getNotes(paperId);setNotes(n);}catch{}};
const addNote=async()=>{if(!noteText.trim())return;try{await createNote({paper_id:selected.id,content:noteText});setNoteText('');loadNotes(selected.id);}catch(e){alert(e.message);}};
const doLookup=async()=>{if(!doi.trim())return;setLoading(true);try{const r=await doiLookup({doi});setDoiResult(r.paper);}catch(e){alert(e.message);}setLoading(false);};
const doImport=async()=>{if(!doiResult)return;try{await importPaper(doiResult);alert('Imported!');load(page);setShowDOI(false);setDoiResult(null);}catch(e){alert(e.message);}};
const trackCitations=async(paper)=>{setLoading(true);try{const r=await aiCitations({title:paper.title,doi:paper.doi});setCitResult(r);}catch(e){alert(e.message);}setLoading(false);};
return(<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<h1 style={{color:'#fff',margin:0}}>Papers ({total})</h1>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>setShowDOI(true)} style={s.btn('#0f3460')}>🔗 DOI Lookup</button>
<button onClick={()=>{setEditing(null);setForm({title:'',authors:'',abstract:'',source:'arXiv',year:2024,doi:'',tags:''});setShowModal(true);}} style={s.btn()}>+ Add Paper</button>
</div></div>
<div style={{display:'flex',gap:8,marginBottom:12}}>
<input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(1)} placeholder="Search papers..." style={{...s.input,marginTop:0,flex:1}}/>
<select value={filterSrc} onChange={e=>{setFilterSrc(e.target.value);load(1,search,e.target.value,filterStatus);}} style={{...s.input,marginTop:0,width:120}}>
<option value="">All Sources</option>{['arXiv','NeurIPS','ICML','ICLR','CVPR','Nature','Science','ACL','PubMed'].map(x=><option key={x}>{x}</option>)}</select>
<select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);load(1,search,filterSrc,e.target.value);}} style={{...s.input,marginTop:0,width:110}}>
<option value="">All Status</option>{['unread','reading','read'].map(x=><option key={x}>{x}</option>)}</select>
<button onClick={()=>load(1)} style={s.btn('#0f3460')}>Search</button>
</div>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{items.map(p=>(<div key={p.id} onClick={()=>{setSelected(p);loadNotes(p.id);setCitResult(null);}} style={{background:'#16213e',padding:16,borderRadius:10,cursor:'pointer',borderLeft:`4px solid ${statusColor[p.status]||'#888'}`}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
<h3 style={{color:'#fff',margin:0,fontSize:14,flex:1}}>{p.title}</h3>
<div style={{display:'flex',gap:6,marginLeft:12}}>
<span style={{color:'#2ecc71',fontWeight:'bold'}}>{p.relevance_score}</span>
<span style={{background:(statusColor[p.status]||'#888')+'20',color:statusColor[p.status]||'#888',padding:'2px 8px',borderRadius:10,fontSize:10}}>{p.status}</span>
</div></div>
<div style={{color:'#3498db',fontSize:12,marginBottom:4}}>{p.authors}</div>
<p style={{color:'#888',fontSize:11,margin:'0 0 6px',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.abstract}</p>
<div style={{display:'flex',gap:10,fontSize:11}}><span style={{color:'#9b59b6'}}>{p.source}</span><span style={{color:'#888'}}>{p.year}</span><span style={{color:'#f39c12'}}>📖 {p.citations?.toLocaleString()} citations</span></div>
</div>))}
</div>
<div style={{display:'flex',justifyContent:'center',gap:8,marginTop:16}}>
<button disabled={page<=1} onClick={()=>{const np=page-1;setPage(np);load(np);}} style={s.btn('#0f3460')}>Prev</button>
<span style={{color:'#ccc',lineHeight:'34px'}}>Page {page} of {totalPages}</span>
<button disabled={page>=totalPages} onClick={()=>{const np=page+1;setPage(np);load(np);}} style={s.btn('#0f3460')}>Next</button>
</div>
{selected&&<DetailPanel item={selected} onClose={()=>{setSelected(null);setNotes([]);setCitResult(null);}}
onEdit={()=>{setEditing(selected);setForm(selected);setShowModal(true);}}
onDelete={()=>{deletePaper(selected.id);setSelected(null);load(page);}}
fields={[{key:'title',label:'Title'},{key:'authors',label:'Authors'},{key:'abstract',label:'Abstract'},{key:'source',label:'Source'},{key:'year',label:'Year'},{key:'citations',label:'Citations'},{key:'doi',label:'DOI'},{key:'tags',label:'Tags'},{key:'status',label:'Status'},{key:'relevance_score',label:'Relevance'}]}>
<div style={{marginTop:16,borderTop:'1px solid #0f3460',paddingTop:16}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
<h4 style={{color:'#e94560',margin:0}}>Notes ({notes.length})</h4>
<button onClick={()=>trackCitations(selected)} disabled={loading} style={s.btn('#9b59b6')}>{loading?'...':'📊 Track Citations'}</button>
</div>
{citResult&&<div style={{background:'#0f3460',padding:12,borderRadius:6,marginBottom:12,fontSize:12,color:'#e0e0e0'}}><strong>Citations: {citResult.citation_count}</strong> | Refs: {citResult.references_count}<br/>{citResult.error&&<span style={{color:'#e94560'}}>{citResult.error}</span>}</div>}
<div style={{display:'flex',gap:6,marginBottom:8}}>
<input value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add note..." style={{...s.input,marginTop:0,flex:1}}/>
<button onClick={addNote} style={s.btn()}>Add</button>
</div>
{notes.map(n=><div key={n.id} style={{background:'#0f3460',padding:10,borderRadius:6,marginBottom:6,display:'flex',justifyContent:'space-between'}}>
<span style={{color:'#e0e0e0',fontSize:13}}>{n.content}</span>
<button onClick={()=>deleteNote(n.id).then(()=>loadNotes(selected.id))} style={{background:'none',border:'none',color:'#e94560',cursor:'pointer'}}>✕</button>
</div>)}
</div>
</DetailPanel>}
{showModal&&<Modal title={editing?'Edit Paper':'Add Paper'} onClose={()=>setShowModal(false)} onSave={handleSave}>
{[{key:'title',label:'Title'},{key:'authors',label:'Authors'},{key:'abstract',label:'Abstract'},{key:'doi',label:'DOI'},{key:'tags',label:'Tags'}].map(f=>(<div key={f.key} style={{marginBottom:12}}><label style={{color:'#ccc',fontSize:13,display:'block',marginBottom:3}}>{f.label}</label><input value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={s.input}/></div>))}
<div style={{display:'flex',gap:12}}>
<div style={{flex:1}}><label style={{color:'#ccc',fontSize:13}}>Source</label><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} style={s.input}>{['arXiv','NeurIPS','ICML','ICLR','CVPR','Nature','Science','ACL','PubMed'].map(x=><option key={x}>{x}</option>)}</select></div>
<div><label style={{color:'#ccc',fontSize:13}}>Year</label><input type="number" value={form.year} onChange={e=>setForm({...form,year:+e.target.value})} style={{...s.input,width:90}}/></div>
</div>
</Modal>}
{showDOI&&<Modal title="DOI Lookup (Crossref)" onClose={()=>{setShowDOI(false);setDoiResult(null);}} onSave={doiResult?doImport:doLookup}>
<div style={{marginBottom:12}}><label style={{color:'#ccc',fontSize:13}}>DOI</label><input value={doi} onChange={e=>setDoi(e.target.value)} placeholder="10.48550/arXiv.1706.03762" style={s.input}/></div>
{doiResult&&<div style={{background:'#0f3460',padding:12,borderRadius:6,color:'#e0e0e0',fontSize:12}}><strong>{doiResult.title}</strong><br/>{doiResult.authors} ({doiResult.year})<br/>Source: {doiResult.source}</div>}
</Modal>}
</div>);
}
