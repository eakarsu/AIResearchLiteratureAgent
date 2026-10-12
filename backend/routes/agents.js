const router=require('express').Router();const auth=require('../middleware/auth');const pool=require('../models/db');
const{aiRateLimiter}=require('../middleware/rateLimiter');
const searchAgent=require('../agents/searchAgent');const synthesizerAgent=require('../agents/synthesizerAgent');
const gapFinderAgent=require('../agents/gapFinderAgent');const reviewGeneratorAgent=require('../agents/reviewGeneratorAgent');
const citationTracker=require('../agents/citationTracker');
const axios=require('axios');
const freshActor = require('../middleware/researchActor');
const { selectedPaper, selectedPapers, paperIds, failure } = require('../agents/paperScope');
const { generate } = require('../agents/openRouter');
router.use(auth);router.use(freshActor);router.use(aiRateLimiter);
async function logAgent(userId,agent,message,result){
await pool.query('INSERT INTO research_logs (level,agent,message,user_id,result) VALUES ($1,$2,$3,$4,$5)',['info',agent,message,userId,JSON.stringify(result)]);
}
function providerOptions(req){
 const controller=new AbortController(),abort=()=>controller.abort();
 req.once('aborted',abort);
 req.res?.once('close',()=>{if(!req.res.writableEnded)abort();});
 return{signal:controller.signal};
}
// Synthesize findings
router.post('/synthesize-findings',async(req,res)=>{
try{const{topic,paper_ids}=req.body;
if(paper_ids!==undefined)paperIds(paper_ids);
let result;
if(paper_ids&&paper_ids.length>0)result=await synthesizerAgent.execute(topic||'research',paper_ids,req.user.id,providerOptions(req));
else result=await synthesizerAgent.execute(topic||'research',null,req.user.id,providerOptions(req));
await logAgent(req.user.id,'synthesizer',`Synthesize: ${topic}`,result);
res.json(result);}catch(e){res.status(e.status || 500).json({error:e.message});}
});
// Identify gaps
router.post('/identify-gaps',async(req,res)=>{
try{const{field,existing_research}=req.body;
const result=await gapFinderAgent.execute(field,existing_research,req.user.id,providerOptions(req));
await logAgent(req.user.id,'gapFinder',`Gap find: ${field}`,result);
res.json(result);}catch(e){res.status(e.status || 500).json({error:e.message});}
});
// Generate review
router.post('/generate-review',async(req,res)=>{
try{const{topic,papers_summary,scope}=req.body;
const result=await reviewGeneratorAgent.execute(topic,papers_summary,scope,req.user.id,providerOptions(req));
await logAgent(req.user.id,'reviewGenerator',`Review: ${topic}`,result);
res.json(result);}catch(e){res.status(e.status || 500).json({error:e.message});}
});
// Citation tracking
router.post('/track-citations',async(req,res)=>{
try{const{title,doi}=req.body;if(!title&&!doi)return res.status(400).json({error:'title or doi required'});
const result=await citationTracker.execute(title,doi);
await logAgent(req.user.id,'citationTracker',`Track: ${title||doi}`,result);
res.json(result);}catch(e){res.status(e.status || 500).json({error:e.message});}
});
// Search papers
router.post('/search',async(req,res)=>{
try{const{query}=req.body;if(!query)return res.status(400).json({error:'query required'});
const result=await searchAgent.execute(query,req.user.id);
await logAgent(req.user.id,'searchAgent',`Search: ${query}`,result);
res.json(result);}catch(e){res.status(e.status || 500).json({error:e.message});}
});
// Full multi-agent pipeline
router.post('/pipeline',async(req,res)=>{
try{const{topic,field,scope}=req.body;if(!topic)return res.status(400).json({error:'topic required'});
const steps=[];
// Step 1: Search
const searchResult=await searchAgent.execute(topic,req.user.id);steps.push({step:'search',result:searchResult});
// Step 2: Synthesize
const options=providerOptions(req);
const synth=await synthesizerAgent.execute(topic,searchResult.results?.map(p=>p.id)||null,req.user.id,options);steps.push({step:'synthesize',result:synth});
// Step 3: Find gaps
const gapField=field||topic;const existing=searchResult.results?.map(p=>`${p.title}: ${p.abstract||''}`).join('\n').substring(0,3000);
const gaps=await gapFinderAgent.execute(gapField,existing,req.user.id,options);steps.push({step:'gap_finding',result:gaps});
// Step 4: Generate review
const review=await reviewGeneratorAgent.execute(topic,null,scope||'comprehensive',req.user.id,options);steps.push({step:'review_generation',result:review});
// Persist pipeline run
await pool.query('INSERT INTO research_logs (level,agent,message,user_id,result) VALUES ($1,$2,$3,$4,$5)',['info','pipeline',`Pipeline: ${topic}`,req.user.id,JSON.stringify({topic,steps_count:steps.length})]);
res.json({pipeline_topic:topic,steps,papers_found:searchResult.count,completed_at:new Date().toISOString()});
}catch(e){res.status(e.status || 500).json({error:e.message});}
});
// DOI Lookup via Crossref
router.post('/doi-lookup',async(req,res)=>{
try{const{doi}=req.body;if(!doi)return res.status(400).json({error:'doi required'});
const url=`https://api.crossref.org/works/${encodeURIComponent(doi)}`;
const r=await axios.get(url,{headers:{'User-Agent':'AIResearchAgent/1.0 (mailto:user@example.com)'},timeout:10000});
const w=r.data.message;
const paper={title:(w.title||[])[0]||'',authors:(w.author||[]).map(a=>`${a.given||''} ${a.family||''}`.trim()).join(', '),year:(w.published||w['published-print']||w['published-online'])?.['date-parts']?.[0]?.[0],doi:w.DOI,source:w['container-title']?.[0]||w.publisher||'',abstract:(w.abstract||'').replace(/<[^>]+>/g,''),citations:w['is-referenced-by-count']||0,url:w.URL};
res.json({paper,raw:w});
}catch(e){res.status(500).json({error:e.response?.data?.message||e.message});}
});
// Helper: direct AI call for ad-hoc endpoints
async function callAI(prompt,signal){
  return (await generate({system:'You are an evidence-aware research assistant. Return structured JSON when requested and expose uncertainty.',prompt,signal,temperature:0.3})).report;
}

// Paper summarizer (abstract + key findings from a single paper)
router.post('/paper-summarizer',async(req,res)=>{
  try{
    const{paper_id,paper}=req.body;
    let p=paper;
    const reference=paper_id ?? paper?.id;
    if(reference!==undefined && reference!==null){
      if(paper_id!==undefined && paper?.id!==undefined && Number(paper_id)!==Number(paper.id))throw failure(400,'Paper references do not match');
      p=await selectedPaper(req.user.id,reference,'id,title,authors,abstract,year,source,doi');
    }
    if(!p || typeof p!=='object' || Array.isArray(p))return res.status(400).json({error:'paper or paper_id required'});
    const prompt=`Summarize this paper. Return JSON: {one_sentence_summary, abstract_paraphrase, key_findings:[], methods_used, sample_or_dataset, limitations:[], practical_implications:[], glossary:[{term,plain_definition}]}.\n\nPaper: ${JSON.stringify(p)}`;
    const result=await callAI(prompt,providerOptions(req).signal);
    await logAgent(req.user.id,'paperSummarizer',`Summarize paper ${p.id||p.title||''}`,result);
    res.json(result);
  }catch(e){res.status(e.status || 500).json({error:e.message});}
});

// Methodology comparison across papers
router.post('/methodology-comparison',async(req,res)=>{
  try{
    const{paper_ids,topic}=req.body;
    let papers=[];
    if(paper_ids!==undefined)paperIds(paper_ids);
    if(paper_ids?.length){
      papers=await selectedPapers(req.user.id,paper_ids,'id,title,authors,abstract,year');
    }else{
      const r=await pool.query('SELECT id,title,authors,abstract,year FROM papers WHERE user_id=$1 ORDER BY relevance_score DESC NULLS LAST,id LIMIT 8',[req.user.id]);
      papers=r.rows;
    }
    const prompt=`Compare the methodologies used across these papers${topic?` on "${topic}"`:''}. Return JSON: {paper_methods:[{paper_id,title,design,sample_size,analysis_methods,strengths,weaknesses}], common_methods:[], divergent_choices:[], methodological_gaps:[], recommended_method_for_future_work, summary}.\n\nPapers: ${JSON.stringify(papers)}`;
    const result=await callAI(prompt,providerOptions(req).signal);
    await logAgent(req.user.id,'methodologyComparison',`Compare ${papers.length} papers`,result);
    res.json(result);
  }catch(e){res.status(e.status || 500).json({error:e.message});}
});

// Paper recommender (suggest related papers)
router.post('/paper-recommender',async(req,res)=>{
  try{
    const{seed_paper_id,query,limit=10}=req.body;
    let seed=null;
    if(seed_paper_id!==undefined && seed_paper_id!==null)seed=await selectedPaper(req.user.id,seed_paper_id,'id,title,authors,abstract');
    if(!Number.isSafeInteger(Number(limit)) || Number(limit)<1 || Number(limit)>50)throw failure(400,'limit must be an integer from 1 to 50');
    const corpus=await pool.query('SELECT id,title,authors,abstract,year FROM papers WHERE user_id=$1 AND id<>COALESCE($2,-1) ORDER BY relevance_score DESC NULLS LAST,id LIMIT 50',[req.user.id,seed?.id||null]);
    const prompt=`Recommend the top ${limit} most related papers from the candidate set, given the seed/query. Return JSON: {recommendations:[{paper_id,title,relevance_score:0-1,why}], rationale}.\n\nSeed paper: ${JSON.stringify(seed)}\nQuery: ${query||''}\nCandidates: ${JSON.stringify(corpus.rows)}`;
    const result=await callAI(prompt,providerOptions(req).signal);
    await logAgent(req.user.id,'paperRecommender',`Recommend for ${seed_paper_id||query}`,result);
    res.json(result);
  }catch(e){res.status(e.status || 500).json({error:e.message});}
});

// Apply pass 4: Citation graph / network analysis follow-up over track-citations.
// Returns nodes + edges suitable for a force-directed graph plus a structured analysis.
router.post('/citation-graph',async(req,res)=>{
  try{
    if(!process.env.OPENROUTER_API_KEY){
      return res.status(503).json({error:'AI service unavailable: OPENROUTER_API_KEY not configured.'});
    }
    const{seed_paper_id,seed_doi,depth=2}=req.body;
    let seed=null;
    if(seed_paper_id!==undefined && seed_paper_id!==null)seed=await selectedPaper(req.user.id,seed_paper_id,'id,title,authors,doi,abstract,year');
    // Pull a candidate corpus to use as graph nodes (simple co-citation / shared keyword heuristic)
    const corpus=await pool.query('SELECT id,title,authors,doi,year FROM papers WHERE user_id=$1 ORDER BY relevance_score DESC NULLS LAST,id LIMIT 30',[req.user.id]);
    const prompt=`You are a citation-network analyst. Given a seed paper and a candidate corpus, infer a citation graph (forward + backward) and clusters. Return strict JSON: {nodes:[{id,title,year,cluster:int,is_seed:bool}], edges:[{source,target,kind:"cites"|"co_cited"|"similar_topic",weight:0-1}], clusters:[{id,label,paper_ids:[],theme}], central_papers:[{id,centrality_score:0-1,why}], emerging_subfields:[<string>], summary}.\n\nSeed: ${JSON.stringify(seed||{doi:seed_doi})}\nDepth requested: ${depth}\nCandidate corpus: ${JSON.stringify(corpus.rows)}`;
    const result=await callAI(prompt,providerOptions(req).signal);
    await logAgent(req.user.id,'citationGraph',`Citation graph for ${seed_paper_id||seed_doi}`,result);
    res.json(result);
  }catch(e){res.status(e.status || 500).json({error:e.message});}
});

// Apply pass 4: Keyword taxonomy + hypothesis generator. Mechanical single-step LLM call,
// reuses callAI / auth / aiRateLimiter / research_logs.
router.post('/keyword-taxonomy',async(req,res)=>{
  try{
    if(!process.env.OPENROUTER_API_KEY){
      return res.status(503).json({error:'AI service unavailable: OPENROUTER_API_KEY not configured.'});
    }
    const{topic,paper_ids,seed_keywords}=req.body;
    if(!topic&&!paper_ids&&!seed_keywords){
      return res.status(400).json({error:'topic, paper_ids, or seed_keywords required'});
    }
    let papers=[];
    if(paper_ids!==undefined)paperIds(paper_ids);
    if(paper_ids?.length)papers=await selectedPapers(req.user.id,paper_ids,'id,title,abstract,year');
    const prompt=`Build a structured keyword taxonomy and propose research hypotheses for this topic. Return strict JSON: {taxonomy:[{group,terms:[]}], synonyms:[{canonical,variants:[]}], suggested_search_queries:[], hypotheses:[{statement,rationale,test_design,risk_of_bias}], gaps_for_future_work:[], summary}.\n\nTopic: ${topic||''}\nSeed keywords: ${JSON.stringify(seed_keywords||[])}\nPapers in scope: ${JSON.stringify(papers)}`;
    const result=await callAI(prompt,providerOptions(req).signal);
    await logAgent(req.user.id,'keywordTaxonomy',`Taxonomy for ${topic||'(papers)'}`,result);
    res.json(result);
  }catch(e){res.status(e.status || 500).json({error:e.message});}
});

const workspaceFeatures = Object.freeze({
  'arxiv-search': 'Draft a search strategy and candidate-query plan; never claim that external databases were searched.',
  'bibtex-export': 'Draft citation-export preparation guidance; never claim that a file was exported or a citation was verified.',
  'citation-network': 'Draft a citation-network interpretation using saved records; inferred links are hypotheses, not verified citations.',
  'gap-finder': 'Draft unanswered research questions and a validation plan.',
  'highlight-annotation': 'Draft annotation and highlighting guidance without altering source documents.',
  'literature-review': 'Draft a multi-record literature review outline with explicit evidence limitations.',
  methodology: 'Compare described methodologies without inventing missing designs, samples, or results.',
  notifications: 'Draft a monitoring and alert policy; never claim an alert or notification was sent.',
  recommender: 'Rank only the supplied saved records as candidates and explain uncertainty.',
  summarizer: 'Summarize only text present in the supplied saved records.',
  'pdf-ingestion': 'Draft a PDF ingestion and verification checklist; never claim that a file was parsed or stored.',
  'quality-scoring': 'Draft a transparent quality rubric and provisional assessment; never present it as peer review.',
  collaboration: 'Draft a collaboration and review workflow; never claim edits, invitations, or approvals occurred.',
});
router.post('/workspace', async (req,res) => {
  try {
    const feature=String(req.body?.feature||'').trim(), input=String(req.body?.input||'').trim();
    const purpose=workspaceFeatures[feature];
    if(!purpose)throw failure(400,'Unsupported research workspace feature.');
    if(!input || input.length>12000)throw failure(400,'A research brief from 1 to 12000 characters is required.');
    const ids=paperIds(req.body?.paper_ids);
    if(!ids.length)throw failure(400,'Select at least one saved source record.');
    const papers=await selectedPapers(req.user.id,ids,'id,title,authors,abstract,source,year,doi,status,tags');
    const provider=await generate({
      system:`You create advisory research drafts for human review. ${purpose} Use only supplied records. Synthetic training records are practice context, not published evidence. Do not invent publications, findings, citations, consent, approvals, external actions, provider receipts, or delivery success. Return readable JSON with summary, source_assessment, findings, recommendations, assumptions, uncertainties, and next_steps.`,
      prompt:`Research brief:\n${input}\n\nSaved source records:\n${JSON.stringify(papers,null,2)}`,
      signal:providerOptions(req).signal,
    });
    const result={feature,source_record_ids:ids,report:provider.report,model:provider.model,usage:provider.usage};
    await logAgent(req.user.id,`workspace:${feature}`,`Draft report using saved records ${ids.join(', ')}`,result);
    return res.json(result);
  } catch(e) { return res.status(e.status || 500).json({error:e.message||'Research workspace request failed'}); }
});

// Research logs
router.get('/logs',async(req,res)=>{
try{const page=Math.max(1,parseInt(req.query.page)||1);const limit=20;const offset=(page-1)*limit;
const[r,c]=await Promise.all([pool.query('SELECT * FROM research_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',[req.user.id,limit,offset]),pool.query('SELECT COUNT(*) FROM research_logs WHERE user_id=$1',[req.user.id])]);
const total=parseInt(c.rows[0].count);
res.json({data:r.rows,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
}catch(e){res.status(e.status || 500).json({error:e.message});}
});
module.exports=router;
