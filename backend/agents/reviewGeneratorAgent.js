const axios=require('axios');
const{parseAIJson}=require('./searchAgent');
const pool=require('../models/db');
async function callAI(prompt){
const r=await axios.post('https://openrouter.ai/api/v1/chat/completions',
{model:'anthropic/claude-3-5-sonnet-20241022',messages:[{role:'user',content:prompt}],temperature:0.3},
{headers:{'Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json'}});
return parseAIJson(r.data.choices[0].message.content);
}
class ReviewGeneratorAgent{
constructor(){this.name='reviewGeneratorAgent';}
async execute(topic,papersSummary,scope,userId){
let summary=papersSummary;
if(!summary){const res=await pool.query('SELECT title,authors,abstract,year FROM papers WHERE title ILIKE $1 OR tags ILIKE $1 ORDER BY relevance_score DESC NULLS LAST LIMIT 10',[`%${topic}%`]);summary=res.rows.map(p=>`${p.title} (${p.year}) by ${p.authors}`).join('\n');}
const prompt=`Generate a literature review outline on "${topic}". Papers summary:\n${summary}\nScope: ${scope||'comprehensive'}. Return JSON with: title, abstract, sections (array with title, key_points, papers_referenced), methodology, key_themes (array), critical_analysis, conclusion, word_count_estimate.`;
return callAI(prompt);
}
}
module.exports=new ReviewGeneratorAgent();
