const pool=require('../models/db');
const { actorId }=require('./paperScope');
const { generate }=require('./openRouter');
class ReviewGeneratorAgent{
constructor(){this.name='reviewGeneratorAgent';}
async execute(topic,papersSummary,scope,userId,options={}){
let summary=papersSummary;
if(!summary){const res=await pool.query('SELECT id,title,authors,abstract,year,source FROM papers WHERE user_id=$2 AND (title ILIKE $1 OR tags ILIKE $1) ORDER BY relevance_score DESC NULLS LAST,id LIMIT 10',[`%${topic}%`,actorId(userId)]);summary=res.rows.map(p=>`[Saved record ${p.id}; ${p.source||'source unspecified'}] ${p.title} (${p.year||'year unavailable'}) by ${p.authors||'authors unavailable'}: ${p.abstract||'No abstract saved.'}`).join('\n');}
const prompt=`Generate a literature review draft on "${topic}".\n\nSource summaries:\n${summary}\n\nScope: ${scope||'comprehensive'}. Do not invent publications, findings, citations, approvals, or evidence. Label synthetic or incomplete source material and expose uncertainty. Return JSON with: title, abstract, sections, methodology, key_themes, critical_analysis, conclusion, limitations, source_record_ids, word_count_estimate.`;
return (await generate({system:'You create evidence-aware literature review drafts for human review, never final clinical or production decisions.',prompt,signal:options.signal})).report;
}
}
module.exports=new ReviewGeneratorAgent();
