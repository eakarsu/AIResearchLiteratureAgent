const axios=require('axios');
const{parseAIJson}=require('./searchAgent');
const pool=require('../models/db');
async function callAI(prompt){
const r=await axios.post('https://openrouter.ai/api/v1/chat/completions',
{model:'anthropic/claude-3-5-sonnet-20241022',messages:[{role:'user',content:prompt}],temperature:0.3},
{headers:{'Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json'}});
return parseAIJson(r.data.choices[0].message.content);
}
class SynthesizerAgent{
constructor(){this.name='synthesizerAgent';}
async execute(topic,paperIds,userId){
let papers;
if(paperIds&&paperIds.length>0){const res=await pool.query('SELECT title,authors,abstract,year,source FROM papers WHERE id=ANY($1::int[])',[paperIds]);papers=res.rows;}
else{const res=await pool.query('SELECT title,authors,abstract,year,source FROM papers ORDER BY relevance_score DESC NULLS LAST LIMIT 10');papers=res.rows;}
const prompt=`Synthesize findings from these research papers on "${topic}". Papers:\n${JSON.stringify(papers,null,2)}\nReturn JSON with: synthesis, key_findings (array), methodologies_used (array), consensus_points (array), contradictions (array), research_gaps (array), future_directions (array), confidence_level.`;
return callAI(prompt);
}
}
module.exports=new SynthesizerAgent();
