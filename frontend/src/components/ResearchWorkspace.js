import React, { useRef, useState } from 'react';
import { runResearchWorkspace } from '../services/api';
import ResearchExamples, { researchExamples, selectedPaperIds, useOwnedPapers } from './ResearchExamples';
import FormattedAIReport from './FormattedAIReport';
import ResearchHistory from './ResearchHistory';

export const researchWorkspaceFeatures={
  'arxiv-search':{title:'Database Search Strategy',description:'Draft query strings and screening criteria. This does not claim that arXiv, PubMed, or Scholar was searched.'},
  'bibtex-export':{title:'Citation Export Preparation',description:'Prepare and validate citation-export requirements. This does not create a verified BibTeX or Zotero export.'},
  'citation-network':{title:'Citation Network Analysis',description:'Draft an inferred network analysis for human verification; inferred links are not verified citations.'},
  'gap-finder':{title:'Research Gap Finder',description:'Draft unanswered questions, assumptions, and a validation plan from selected records.'},
  'highlight-annotation':{title:'Highlight & Annotation Plan',description:'Draft annotations without modifying the underlying source records.'},
  'literature-review':{title:'Multi-Paper Review',description:'Draft an evidence-aware review outline from selected saved records.'},
  methodology:{title:'Methodology Comparison',description:'Compare reported methods while leaving missing study details explicitly unknown.'},
  notifications:{title:'Paper Monitoring Plan',description:'Draft monitoring criteria. No alert, subscription, or notification is sent.'},
  recommender:{title:'Saved Paper Recommender',description:'Rank only selected saved records; this does not search an external catalog.'},
  summarizer:{title:'Paper Summarizer',description:'Summarize the selected saved records without adding unsupported findings.'},
  'pdf-ingestion':{title:'PDF Ingestion Checklist',description:'Draft parsing and verification steps. No file is uploaded, parsed, or stored.'},
  'quality-scoring':{title:'Methodology Quality Review',description:'Draft a transparent provisional rubric, not peer review or clinical evidence grading.'},
  collaboration:{title:'Collaborative Review Plan',description:'Draft roles and review steps. No collaborator is invited and no approval is recorded.'},
};

function validPreservedIds(value,papers){
  try{const ids=selectedPaperIds(value,papers);return ids.length?ids:[];}catch{return[];}
}

export default function ResearchWorkspace({feature}){
  const config=researchWorkspaceFeatures[feature];
  const sources=useOwnedPapers();
  const[input,setInput]=useState(''),[paperIdsText,setPaperIdsText]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[result,setResult]=useState(null),[lastRequest,setLastRequest]=useState(null);
  const controller=useRef(null),pending=useRef(false);
  const fill=(sample,index)=>{
    const preserved=validPreservedIds(paperIdsText,sources.papers);
    const rotated=sources.papers.slice(index).concat(sources.papers.slice(0,index));
    const ids=preserved.length?preserved:rotated.slice(0,Math.min(2,rotated.length)).map(row=>row.id);
    setInput(`${sample.topic}\n\nObjective: ${sample.scope}.\nContext: ${sample.text}\nRequested report: cite saved record IDs, separate supported observations from assumptions, list uncertainty, and propose verification steps.`);
    setPaperIdsText(ids.join(','));
    setError('');setNotice(ids.length?'Complete example loaded. Existing valid source selections were preserved; Generate is a separate action.':'The brief was filled, but saved source records must load before generation.');
  };
  const run=async request=>{
    if(pending.current)return;
    pending.current=true;setLoading(true);setError('');setResult(null);setLastRequest(request);
    const active=new AbortController();controller.current=active;
    try{setResult(await runResearchWorkspace(request,{signal:active.signal}));}
    catch(err){if(err.name==='AbortError')setNotice('Request canceled. No completed report was returned to this page.');else setError(err.message||'Research report generation failed.');}
    finally{if(controller.current===active)controller.current=null;pending.current=false;setLoading(false);}
  };
  const submit=async event=>{event.preventDefault();try{if(!input.trim())throw Error('Enter a research brief.');if(sources.loading||sources.error)throw Error('Load saved source records before generating.');const ids=selectedPaperIds(paperIdsText,sources.papers);if(!ids.length)throw Error('Select at least one saved source record.');await run({feature,input:input.trim(),paper_ids:ids});}catch(err){setError(err.message||'Check the research inputs.');}};
  if(!config)return <p role="alert">This research workspace is not configured.</p>;
  return <div><header style={{maxWidth:1040}}><span className="ai-eyebrow">Advisory AI workspace</span><h1>{config.title}</h1><p style={{color:'#aab5c8',lineHeight:1.6}}>{config.description}</p></header>
    <form className="research-tool-form" onSubmit={submit} style={{background:'#16213e',padding:24,borderRadius:12,marginTop:16}}>
      <ResearchExamples onFill={fill} disabled={loading||sources.loading||!sources.papers.length} sources={sources} notice={notice}/>
      <label htmlFor={`workspace-${feature}-brief`}>Research brief</label><textarea id={`workspace-${feature}-brief`} rows={7} value={input} onChange={event=>setInput(event.target.value)} placeholder="Describe the question, limits, and expected report."/>
      <label htmlFor={`workspace-${feature}-sources`}>Saved source record IDs</label><input id={`workspace-${feature}-sources`} value={paperIdsText} onChange={event=>setPaperIdsText(event.target.value)} placeholder="Example: 81,82"/><p style={{color:'#aab5c8',fontSize:12}}>Only records visible in the saved-reference list are accepted. Selected sources are preserved when loading another example.</p>
      {error&&<p role="alert">{error}{lastRequest&&<button type="button" className="research-retry" onClick={()=>run(lastRequest)}>Retry</button>}</p>}
      <div className="research-request-actions"><button type="submit" className="research-generate" disabled={loading||sources.loading||Boolean(sources.error)||!sources.papers.length}>Generate with OpenRouter</button><button type="button" className="research-cancel" disabled={!loading} onClick={()=>controller.current?.abort()}>Cancel request</button></div>
    </form>
    {loading&&<FormattedAIReport loading title={`${config.title} report`}/>} {result!==null&&<FormattedAIReport response={result} title={`${config.title} report`}/>}<ResearchHistory/>
  </div>;
}

export { researchExamples };
