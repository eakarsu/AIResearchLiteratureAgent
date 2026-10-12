const pool=require('../models/db');
const { actorId }=require('./paperScope');
const { generate }=require('./openRouter');
class GapFinderAgent{
constructor(){this.name='gapFinderAgent';}
async execute(field,existingResearch,userId,options={}){
let existing=existingResearch;
if(!existing){const res=await pool.query('SELECT id,title,abstract,source FROM papers WHERE user_id=$1 ORDER BY relevance_score DESC NULLS LAST,id LIMIT 15',[actorId(userId)]);existing=res.rows.map(p=>`[Saved record ${p.id}; source ${p.source||'unspecified'}] ${p.title}: ${p.abstract||'No abstract saved.'}`).join('\n');}
const prompt=`Identify research gaps in "${field}" using only the supplied context. Do not present absent measurements or fictional training material as findings.\n\nExisting research or practice context:\n${existing}\n\nReturn JSON with: identified_gaps, underexplored_areas, methodology_gaps, suggested_research_questions, priority_ranking, estimated_feasibility, assumptions, limitations.`;
return (await generate({system:'You draft cautious research-gap analyses. Unsupported conclusions must be labeled as hypotheses.',prompt,signal:options.signal})).report;
}
}
module.exports=new GapFinderAgent();
