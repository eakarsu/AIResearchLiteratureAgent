const axios=require('axios');
const{parseAIJson}=require('./searchAgent');
const pool=require('../models/db');
async function callAI(prompt){
const r=await axios.post('https://openrouter.ai/api/v1/chat/completions',
{model:'anthropic/claude-3-5-sonnet-20241022',messages:[{role:'user',content:prompt}],temperature:0.3},
{headers:{'Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json'}});
return parseAIJson(r.data.choices[0].message.content);
}
class GapFinderAgent{
constructor(){this.name='gapFinderAgent';}
async execute(field,existingResearch,userId){
let existing=existingResearch;
if(!existing){const res=await pool.query('SELECT title,abstract FROM papers ORDER BY relevance_score DESC NULLS LAST LIMIT 15');existing=res.rows.map(p=>`${p.title}: ${p.abstract}`).join('\n');}
const prompt=`Identify research gaps in "${field}". Existing research:\n${existing}\nReturn JSON with: identified_gaps (array with gap, importance, potential_impact), underexplored_areas (array), methodology_gaps (array), suggested_research_questions (array), priority_ranking (array), estimated_feasibility.`;
return callAI(prompt);
}
}
module.exports=new GapFinderAgent();
