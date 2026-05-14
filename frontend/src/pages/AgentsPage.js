import React,{useState,useEffect} from 'react';
import{aiSynthesize,aiGaps,aiReview,aiPipeline,doiLookup,aiCitations,getAgentLogs,importPaper} from'../services/api';
function renderVal(obj,depth=0){
if(!obj)return null;if(typeof obj==='string')return<p style={{color:'#e0e0e0',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{obj}</p>;
if(typeof obj==='number')return<span style={{color:'#2ecc71',fontWeight:'bold'}}>{obj}</span>;
if(typeof obj==='boolean')return<span style={{color:obj?'#2ecc71':'#e94560'}}>{obj?'Yes':'No'}</span>;
if(Array.isArray(obj))return<div style={{marginLeft:depth*10}}>{obj.map((item,i)=><div key={i} style={{background:'#1a1a2e',padding:10,borderRadius:6,marginBottom:6,borderLeft:'3px solid #e94560'}}>{typeof item==='object'?renderVal(item,depth+1):<span style={{color:'#e0e0e0'}}>{String(item)}</span>}</div>)}</div>;
return<div style={{marginLeft:depth*10}}>{Object.entries(obj).map(([k,v])=><div key={k} style={{marginBottom:10}}><div style={{color:'#e94560',fontSize:12,fontWeight:'bold',textTransform:'uppercase',marginBottom:3}}>{k.replace(/_/g,' ')}</div>{typeof v==='object'&&v!==null?renderVal(v,depth+1):<div style={{color:'#e0e0e0',background:'#1a1a2e',padding:'6px 10px',borderRadius:4}}>{String(v)}</div>}</div>)}</div>;
}
const s={input:{width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',marginTop:4,boxSizing:'border-box'},btn:{padding:'12px 30px',background:'#e94560',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',marginTop:8},card:{background:'#16213e',padding:24,borderRadius:12,marginBottom:16}};
export default function AgentsPage(){
const[tab,setTab]=useState('pipeline');const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);const[logs,setLogs]=useState([]);const[logsPage,setLogsPage]=useState(1);const[logsTotalPages,setLogsTotalPages]=useState(1);const[showLogs,setShowLogs]=useState(false);
const[inputs,setInputs]=useState({topic:'Evolution of Transformer-based Language Models',field:'Large Language Models',existing:'Current research covers in-context learning, chain-of-thought, RLHF.',review_topic:'Efficient Fine-tuning for LLMs',papers_summary:'LoRA, QLoRA, Adapter layers, Prefix tuning - 15 papers',scope:'comprehensive',doi:'10.48550/arXiv.1706.03762',paper_title:'Attention Is All You Need',synth_topic:'Attention Mechanisms'});
const inp=k=><input value={inputs[k]} onChange={e=>setInputs({...inputs,[k]:e.target.value})} style={s.input}/>;
const ta=k=><textarea value={inputs[k]} onChange={e=>setInputs({...inputs,[k]:e.target.value})} rows={3} style={s.input}/>;
const run=async(fn,payload)=>{setLoading(true);setResult(null);try{setResult(await fn(payload));}catch(e){setResult({error:e.message});}setLoading(false);};
const loadLogs=async(page=1)=>{try{const d=await getAgentLogs(page);setLogs(d.data||[]);setLogsTotalPages(d.pagination?.totalPages||1);setLogsPage(page);setShowLogs(true);}catch(e){alert(e.message);}};
const tabs=[{key:'pipeline',label:'🚀 Pipeline'},{key:'synthesize',label:'🔬 Synthesize'},{key:'gaps',label:'🔍 Find Gaps'},{key:'review',label:'📝 Review'},{key:'citations',label:'📊 Citations'},{key:'doi',label:'🔗 DOI Lookup'}];
return(<div>
<h1 style={{color:'#fff',marginBottom:16}}>AI Research Agents</h1>
<div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
{tabs.map(t=><button key={t.key} onClick={()=>{setTab(t.key);setResult(null);}} style={{padding:'8px 16px',background:tab===t.key?'#e94560':'#16213e',color:tab===t.key?'#fff':'#ccc',border:'1px solid #0f3460',borderRadius:6,cursor:'pointer'}}>{t.label}</button>)}
<button onClick={()=>loadLogs(1)} style={{...{padding:'8px 16px',background:'#0f3460',color:'#ccc',border:'1px solid #0f3460',borderRadius:6,cursor:'pointer'}}}>📋 Logs</button>
</div>
<div style={s.card}>
{tab==='pipeline'&&<><h3 style={{color:'#e94560',marginTop:0}}>Full Research Pipeline</h3><p style={{color:'#888',marginBottom:12,fontSize:13}}>Runs: Search → Synthesize → Gap Finding → Review Generation</p><label style={{color:'#ccc',fontSize:13}}>Research Topic</label>{inp('topic')}<button onClick={()=>run(aiPipeline,{topic:inputs.topic,field:inputs.field,scope:inputs.scope})} disabled={loading} style={s.btn}>{loading?'⏳ Running Pipeline...':'🚀 Run Full Pipeline'}</button></>}
{tab==='synthesize'&&<><h3 style={{color:'#e94560',marginTop:0}}>Synthesize Findings</h3><label style={{color:'#ccc',fontSize:13}}>Topic</label>{inp('synth_topic')}<button onClick={()=>run(aiSynthesize,{topic:inputs.synth_topic})} disabled={loading} style={s.btn}>{loading?'⏳ Synthesizing...':'🔬 Synthesize'}</button></>}
{tab==='gaps'&&<><h3 style={{color:'#e94560',marginTop:0}}>Find Research Gaps</h3><label style={{color:'#ccc',fontSize:13}}>Field</label>{inp('field')}<label style={{color:'#ccc',fontSize:13,marginTop:8,display:'block'}}>Existing Research</label>{ta('existing')}<button onClick={()=>run(aiGaps,{field:inputs.field,existing_research:inputs.existing})} disabled={loading} style={s.btn}>{loading?'⏳ Finding...':'🔍 Find Gaps'}</button></>}
{tab==='review'&&<><h3 style={{color:'#e94560',marginTop:0}}>Generate Literature Review</h3><label style={{color:'#ccc',fontSize:13}}>Topic</label>{inp('review_topic')}<label style={{color:'#ccc',fontSize:13,marginTop:8,display:'block'}}>Papers Summary</label>{ta('papers_summary')}<button onClick={()=>run(aiReview,{topic:inputs.review_topic,papers_summary:inputs.papers_summary,scope:inputs.scope})} disabled={loading} style={s.btn}>{loading?'⏳ Generating...':'📝 Generate Review'}</button></>}
{tab==='citations'&&<><h3 style={{color:'#e94560',marginTop:0}}>Track Citations (Semantic Scholar)</h3><label style={{color:'#ccc',fontSize:13}}>Paper Title</label>{inp('paper_title')}<label style={{color:'#ccc',fontSize:13,marginTop:8,display:'block'}}>DOI (optional)</label>{inp('doi')}<button onClick={()=>run(aiCitations,{title:inputs.paper_title,doi:inputs.doi})} disabled={loading} style={s.btn}>{loading?'⏳ Tracking...':'📊 Track Citations'}</button></>}
{tab==='doi'&&<><h3 style={{color:'#e94560',marginTop:0}}>DOI Lookup (Crossref)</h3><label style={{color:'#ccc',fontSize:13}}>DOI</label>{inp('doi')}
<div style={{display:'flex',gap:8,marginTop:8}}>
<button onClick={()=>run(doiLookup,{doi:inputs.doi})} disabled={loading} style={s.btn}>{loading?'⏳ Looking up...':'🔗 Lookup DOI'}</button>
{result?.paper&&<button onClick={async()=>{try{await importPaper(result.paper);alert('Paper imported to database!');}catch(e){alert(e.message);}}} style={{...s.btn,background:'#2ecc71'}}>Import to Papers</button>}
</div></>}
</div>
{result&&<div style={s.card}><h3 style={{color:'#e94560',marginTop:0}}>Results</h3>{renderVal(result)}</div>}
{showLogs&&<div style={s.card}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<h3 style={{color:'#e94560',margin:0}}>Agent Logs</h3><button onClick={()=>setShowLogs(false)} style={{background:'#1a1a2e',color:'#ccc',border:'1px solid #0f3460',borderRadius:4,padding:'4px 10px',cursor:'pointer'}}>Close</button>
</div>
{logs.map(l=><div key={l.id} style={{borderLeft:'3px solid #0f3460',paddingLeft:10,marginBottom:8}}>
<div style={{color:'#e94560',fontSize:11,marginBottom:2}}>{l.agent} — {new Date(l.created_at).toLocaleString()}</div>
<div style={{color:'#e0e0e0',fontSize:13}}>{l.message}</div>
</div>)}
<div style={{display:'flex',justifyContent:'center',gap:8,marginTop:12}}>
<button disabled={logsPage<=1} onClick={()=>loadLogs(logsPage-1)} style={{...s.btn,padding:'6px 14px',background:'#0f3460'}}>Prev</button>
<span style={{color:'#ccc',lineHeight:'32px'}}>{logsPage}/{logsTotalPages}</span>
<button disabled={logsPage>=logsTotalPages} onClick={()=>loadLogs(logsPage+1)} style={{...s.btn,padding:'6px 14px',background:'#0f3460'}}>Next</button>
</div>
</div>}
</div>);
}
