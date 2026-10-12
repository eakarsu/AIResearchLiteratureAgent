const pool=require('../models/db');
const { actorId, selectedPapers }=require('./paperScope');
const { generate }=require('./openRouter');
class SynthesizerAgent{
constructor(){this.name='synthesizerAgent';}
async execute(topic,paperIds,userId,options={}){
let papers;
if(paperIds&&paperIds.length>0){papers=await selectedPapers(userId,paperIds,'id,title,authors,abstract,year,source,doi');}
else{const res=await pool.query('SELECT id,title,authors,abstract,year,source,doi FROM papers WHERE user_id=$1 ORDER BY relevance_score DESC NULLS LAST,id LIMIT 10',[actorId(userId)]);papers=res.rows;}
const prompt=`Synthesize the supplied saved research records on "${topic}". Do not invent studies, findings, citations, consent, approvals, or provider actions. Clearly distinguish synthetic training records from published evidence.\n\nSaved records:\n${JSON.stringify(papers,null,2)}\n\nReturn JSON with: synthesis, key_findings, methodologies_used, consensus_points, contradictions, research_gaps, future_directions, confidence_level, source_record_ids, limitations.`;
return (await generate({system:'You create evidence-aware literature synthesis drafts. Treat every supplied record as unverified source material and identify uncertainty.',prompt,signal:options.signal})).report;
}
}
module.exports=new SynthesizerAgent();
