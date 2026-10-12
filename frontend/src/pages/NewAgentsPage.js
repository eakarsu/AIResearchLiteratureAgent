import React, { useRef, useState } from 'react';
import ResearchExamples, { useOwnedPapers, selectedPaperIds } from '../components/ResearchExamples';
import FormattedAIReport from '../components/FormattedAIReport';
import ResearchHistory from '../components/ResearchHistory';

const tools = {
  summarizer: { title: 'Paper Summarizer', path: 'paper-summarizer', action: 'Summarize', fields: [['paperId','Saved paper ID'],['paperTitle','Saved paper title'],['paperText','Saved abstract or text','textarea']] },
  methodology: { title: 'Methodology Comparison', path: 'methodology-comparison', action: 'Compare Methodologies', fields: [['paperIds','Saved paper IDs (comma separated)'],['methodFocus','Focus']] },
  recommender: { title: 'Paper Recommender', path: 'paper-recommender', action: 'Recommend Papers', fields: [['seed','Query or paper title','textarea'],['topN','How many recommendations','number',1,20]] },
  graph: { title: 'Citation Graph', path: 'citation-graph', action: 'Build Citation Graph', fields: [['graphSeedId','Saved seed paper ID'],['graphDepth','Depth','number',1,3]] },
  taxonomy: { title: 'Keyword Taxonomy', path: 'keyword-taxonomy', action: 'Build Taxonomy', fields: [['taxonomyTopic','Topic (optional)'],['taxonomyPaperIds','Saved paper IDs (optional, comma separated)'],['taxonomySeedKeywords','Seed keywords (optional, comma separated)']] },
};
const initial = {paperId:'',paperTitle:'',paperText:'',paperIds:'',methodFocus:'',seed:'',topN:5,graphSeedId:'',graphDepth:2,taxonomyTopic:'',taxonomyPaperIds:'',taxonomySeedKeywords:''};
const style = {width:'100%',padding:10,background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:6,color:'#fff',margin:'4px 0 12px',boxSizing:'border-box'};
export default function NewAgentsPage() {
  const [tab,setTab]=useState('summarizer'), [values,setValues]=useState(initial), [loading,setLoading]=useState(false), [error,setError]=useState(''), [result,setResult]=useState(null), [notice,setNotice]=useState(''), [lastRequest,setLastRequest]=useState(null);
  const sources=useOwnedPapers(), pending=useRef(false), controller=useRef(null), tool=tools[tab];
  const hasSession=Boolean(localStorage.getItem('token'));
  const referenceGate=((tab==='summarizer'||tab==='graph') && (sources.loading || sources.error || !sources.papers.length)) || (tab==='methodology' && (sources.loading || sources.error || sources.papers.length<2));
  const fill=(sample,index)=>{
    const paper=sources.papers[index%sources.papers.length];
    const preserveIds=(text,minimum=1)=>{try{const ids=selectedPaperIds(text,sources.papers);if(ids.length>=minimum)return ids.join(',');}catch{}return sources.papers.slice(index).concat(sources.papers.slice(0,index)).slice(0,Math.max(minimum,2)).map(row=>row.id).join(',');};
    setValues(current=>{
      if(tab==='summarizer')return {...current,paperId:paper?String(paper.id):'',paperTitle:paper?.title || 'Fictional practice: '+sample.topic,paperText:paper?.abstract || sample.text};
      if(tab==='methodology')return {...current,paperIds:preserveIds(current.paperIds,2),methodFocus:sample.scope};
      if(tab==='recommender')return {...current,seed:sample.topic,topN:sample.count};
      if(tab==='graph'){
        const selected=sources.papers.find(row=>String(row.id)===current.graphSeedId), genuine=selected || paper;
        return {...current,graphSeedId:genuine?String(genuine.id):'',graphDepth:sample.depth};
      }
      return {...current,taxonomyTopic:sample.topic,taxonomyPaperIds:preserveIds(current.taxonomyPaperIds),taxonomySeedKeywords:sample.keywords};
    });
    setNotice('All fields filled. Existing valid saved IDs were preserved; practice abstracts remain explicitly fictional. Generate is a separate action.');
  };
  const runRequest=async(request)=>{
    if(pending.current)return;
    const activeTool=tools[request.tab];
    pending.current=true;setLoading(true);setError('');setResult(null);setLastRequest(request);
    const currentController=new AbortController();controller.current=currentController;
    try{
      const response=await fetch(`/api/agents/${activeTool.path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`},body:JSON.stringify(request.body),signal:currentController.signal});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Agent request failed');setResult(data);
    }catch(err){if(err.name==='AbortError')setNotice('Request canceled. No completion was saved by this page.');else setError(err.message||'Agent request failed');}
    finally{if(controller.current===currentController)controller.current=null;pending.current=false;setLoading(false);}
  };
  const execute=async event=>{
    event.preventDefault();if(pending.current)return;setError('');
    try{
      if(!hasSession)throw Error('Sign in before running an agent.');
      if(referenceGate)throw Error('Load the required saved papers before running this agent.');
      let body;
      if(tab==='summarizer'){const ids=selectedPaperIds(values.paperId,sources.papers);if(ids.length!==1)throw Error('Select one saved paper.');const paper=sources.papers.find(row=>row.id===ids[0]);if(!paper||values.paperTitle!==paper.title||values.paperText!==(paper.abstract||''))throw Error('The title or text changed. Reload a saved-paper example before summarizing.');body={paper_id:ids[0]};}
      if(tab==='methodology'){const ids=selectedPaperIds(values.paperIds,sources.papers);if(ids.length<2)throw Error('Select at least two saved papers.');body={paper_ids:ids,topic:values.methodFocus};}
      if(tab==='recommender'){const count=Number(values.topN);if(!values.seed.trim()||!Number.isInteger(count)||count<1||count>20)throw Error('Enter a query and a recommendation count from 1 to 20.');body={query:values.seed,limit:count};}
      if(tab==='graph'){
        const ids=selectedPaperIds(values.graphSeedId,sources.papers), depth=Number(values.graphDepth);
        if(!ids.length)throw Error('Select a saved seed paper.');
        if(!Number.isInteger(depth)||depth<1||depth>3)throw Error('Depth must be from 1 to 3.');
        body={seed_paper_id:ids[0],depth};
      }
      if(tab==='taxonomy'){const ids=selectedPaperIds(values.taxonomyPaperIds,sources.papers),keywords=values.taxonomySeedKeywords.split(',').map(v=>v.trim()).filter(Boolean);if(!values.taxonomyTopic.trim()&&!ids.length&&!keywords.length)throw Error('Enter a topic, saved papers or keywords.');body={topic:values.taxonomyTopic||undefined,paper_ids:ids.length?ids:undefined,seed_keywords:keywords.length?keywords:undefined};}
      await runRequest({tab,body});
    }catch(err){setError(err.message||'Agent request failed');}
  };
  const cancel=()=>controller.current?.abort();
  return <div><h1>Research Agents</h1><nav className="research-tool-nav">{Object.entries(tools).map(([key,item])=><button key={key} type="button" disabled={loading} onClick={()=>{setTab(key);setResult(null);setError('');setNotice('');setLastRequest(null);}}>{item.title}</button>)}</nav>
    <form className="research-tool-form" onSubmit={execute} style={{background:'#16213e',padding:24,borderRadius:12,marginTop:16}}>
      <h2>{tool.title}</h2><ResearchExamples onFill={fill} disabled={loading} sources={sources} notice={notice}/>
      {tab==='graph'&&<p>AI proposes relationships for review. These are inferred connections, not verified citation records.</p>}
      {tool.fields.map(([key,label,type='text',min,max])=><div key={key}><label htmlFor={`agent-${key}`}>{label}</label>{type==='textarea'?<textarea id={`agent-${key}`} name={key} rows={6} style={style} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>:<input id={`agent-${key}`} name={key} type={type} min={min} max={max} style={style} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>}</div>)}
      {!hasSession&&<p role="alert">Sign in before running an agent.</p>}{error&&<p role="alert">{error}{lastRequest?.tab===tab&&<button className="research-retry" type="button" onClick={()=>runRequest(lastRequest)}>Retry</button>}</p>}
      <div className="research-request-actions"><button className="research-generate" type="submit" disabled={loading||!hasSession||Boolean(referenceGate)}>Generate with OpenRouter</button><button className="research-cancel" type="button" disabled={!loading} onClick={cancel}>Cancel request</button></div>
    </form>
    {loading&&<FormattedAIReport loading title={tool.title+' report'}/>} {result!==null&&<FormattedAIReport response={result} title={tool.title+' report'}/>}<ResearchHistory/></div>;
}
