import React, { useRef, useState } from 'react';
import { aiSynthesize, aiGaps, aiReview, aiPipeline, doiLookup, aiCitations, importPaper } from '../services/api';
import ResearchExamples, { useOwnedPapers } from '../components/ResearchExamples';
import FormattedAIReport from '../components/FormattedAIReport';
import ResearchHistory from '../components/ResearchHistory';
const tools={
 pipeline:{title:'Pipeline',action:'Run Full Pipeline with OpenRouter',run:aiPipeline,fields:[['topic','Research topic'],['field','Research field (optional)'],['scope','Scope (optional)']]},
 synthesize:{title:'Synthesize',action:'Synthesize with OpenRouter',run:aiSynthesize,fields:[['topic','Topic']]},
 gaps:{title:'Find Gaps',action:'Find Gaps with OpenRouter',run:aiGaps,fields:[['field','Field'],['existing','Existing research or practice scenario','textarea']]},
 review:{title:'Review',action:'Generate Review with OpenRouter',run:aiReview,fields:[['topic','Topic'],['papersSummary','Papers summary or practice scenario','textarea'],['scope','Scope (optional)']]},
 citations:{title:'Citations',action:'Track Citations',run:aiCitations,fields:[['paperTitle','Saved paper title'],['doi','Saved DOI (optional)']]},
 doi:{title:'DOI Lookup',action:'Lookup DOI',run:doiLookup,fields:[['doi','Saved DOI']]},
};
const initial={topic:'',field:'',scope:'',existing:'',papersSummary:'',paperTitle:'',doi:''};
function ExternalResult({value}){if(value==null)return <span>Not provided</span>;if(Array.isArray(value))return <ul>{value.map((item,index)=><li key={index}><ExternalResult value={item}/></li>)}</ul>;if(typeof value==='object')return <dl>{Object.entries(value).map(([key,item])=><div key={key}><dt>{key.replace(/_/g,' ')}</dt><dd><ExternalResult value={item}/></dd></div>)}</dl>;return <p>{typeof value==='boolean'?(value?'Yes':'No'):String(value)}</p>;}
export default function AgentsPage(){
 const [tab,setTab]=useState('pipeline'),[values,setValues]=useState(initial),[loading,setLoading]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[lastRequest,setLastRequest]=useState(null);
 const sources=useOwnedPapers(),pending=useRef(false),controller=useRef(null),tool=tools[tab],external=tab==='citations'||tab==='doi',hasSession=Boolean(localStorage.getItem('token'));
 const fill=(sample,index)=>{
   const doiRows=sources.papers.filter(row=>row.doi),paper=(external?doiRows[index%doiRows.length]:sources.papers[index%sources.papers.length]);
   setValues(current=>{
     if(tab==='pipeline')return {...current,topic:sample.topic,field:sample.field,scope:sample.scope};
     if(tab==='synthesize')return {...current,topic:sample.topic};
     if(tab==='gaps')return {...current,field:sample.field,existing:sample.text};
     if(tab==='review')return {...current,topic:sample.topic,papersSummary:paper?.abstract||sample.text,scope:sample.scope};
     const genuine=sources.papers.find(row=>row.title===current.paperTitle&&(!current.doi||row.doi===current.doi))||sources.papers.find(row=>row.doi&&row.doi===current.doi)||paper;
     return {...current,paperTitle:genuine?.title||'',doi:genuine?.doi||''};
   });
   setNotice(external?'Reference fields use saved papers only. A missing DOI must be supplied from a genuine source; no DOI is invented.':'All required and optional drafting fields filled. Practice context is fictional and does not assert research findings.');
 };
 const runRequest=async request=>{
   if(pending.current)return;
   const activeTool=tools[request.tab],activeExternal=request.tab==='citations'||request.tab==='doi';
   pending.current=true;setLoading(true);setResult(null);setError('');setLastRequest(request);
   const currentController=new AbortController();controller.current=currentController;
   try{setResult(await activeTool.run(request.payload,{signal:currentController.signal}));}
   catch(err){if(err.name==='AbortError')setNotice('Request canceled. No completion was saved by this page.');else setError(err.message||'Request failed');}
   finally{if(controller.current===currentController)controller.current=null;pending.current=false;setLoading(false);if(activeExternal&&request.tab!==tab)setResult(null);}
 };
 const execute=async event=>{
   event.preventDefault();if(pending.current)return;setError('');
   try{
     if(!hasSession)throw Error('Sign in before executing.');
     if(external){if(sources.loading||sources.error)throw Error('Load saved papers before using references.');if(tab==='doi'&&!sources.papers.some(p=>p.doi&&p.doi===values.doi.trim()))throw Error('Select a genuine DOI from your saved papers.');if(tab==='citations'&&!sources.papers.some(p=>p.title===values.paperTitle&&(!values.doi||p.doi===values.doi)))throw Error('Select a genuine saved paper title and its DOI.');}
     let payload;
     if(tab==='pipeline')payload={topic:values.topic,field:values.field,scope:values.scope};
     if(tab==='synthesize')payload={topic:values.topic};
     if(tab==='gaps')payload={field:values.field,existing_research:values.existing};
     if(tab==='review')payload={topic:values.topic,papers_summary:values.papersSummary,scope:values.scope};
     if(tab==='citations')payload={title:values.paperTitle,doi:values.doi};
     if(tab==='doi')payload={doi:values.doi};
     if(!external&&!String(payload.topic||payload.field||'').trim())throw Error('Fill the research topic or field.');
     await runRequest({tab,payload});
   }catch(err){setError(err.message||'Request failed');}
 };
 const cancel=()=>controller.current?.abort();
 return <div><h1>AI Research Agents</h1><nav className="research-tool-nav">{Object.entries(tools).map(([key,item])=><button key={key} type="button" disabled={loading} onClick={()=>{setTab(key);setResult(null);setError('');setNotice('');setLastRequest(null);}}>{item.title}</button>)}</nav>
   <form className="research-tool-form" onSubmit={execute} style={{background:'#16213e',padding:24,borderRadius:12,marginTop:16}}><h2>{tool.title}</h2><ResearchExamples onFill={fill} disabled={loading} sources={sources} notice={notice}/>
   {external&&<p>{tab==='doi'?'Crossref metadata lookup':'Citation tracking service'}: an external reference lookup, separate from AI generation.</p>}
   {tool.fields.map(([key,label,type])=><div key={key}><label htmlFor={`research-${key}`}>{label}</label>{type==='textarea'?<textarea id={`research-${key}`} name={key} value={values[key]} rows={5} onChange={e=>setValues({...values,[key]:e.target.value})}/>:<input id={`research-${key}`} name={key} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>}</div>)}
   {error&&<p role="alert">{error}{lastRequest?.tab===tab&&<button className="research-retry" type="button" onClick={()=>runRequest(lastRequest)}>Retry</button>}</p>}
   <div className="research-request-actions"><button className="research-generate" type="submit" disabled={loading||!hasSession||(external&&(sources.loading||Boolean(sources.error)||!sources.papers.length))}>{external?tool.action:'Generate with OpenRouter'}</button><button className="research-cancel" type="button" disabled={!loading} onClick={cancel}>Cancel request</button></div>
   </form>
   {loading&&(external?<p role="status">Loading reference data… You can cancel this request.</p>:<FormattedAIReport loading title={tool.title+' report'}/>)}
   {result!==null&&(external?<article className="ai-report"><div className="ai-report-header"><div><span className="ai-eyebrow">Verified external lookup response</span><h2>{tool.title} result</h2></div></div><div className="ai-report-body"><ExternalResult value={result}/>{tab==='doi'&&result?.paper&&<button type="button" disabled={loading} onClick={async()=>{try{setLoading(true);await importPaper(result.paper);setNotice('Paper imported.');sources.retry();}catch(err){setError(err.message);}finally{setLoading(false);}}}>Import to Papers</button>}</div></article>:<FormattedAIReport response={result} title={tool.title+' report'}/>)}
   {notice&&result!==null&&<p role="status">{notice}</p>}<ResearchHistory/>
 </div>;
}
