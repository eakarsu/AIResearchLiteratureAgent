const pool=require('../models/db');
function parseAIJson(content){
try{return JSON.parse(content);}catch{}
const md=content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);if(md){try{return JSON.parse(md[1]);}catch{}}
const obj=content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);if(obj){try{return JSON.parse(obj[1]);}catch{}}
return{raw:content};
}
class SearchAgent{
constructor(){this.name='searchAgent';}
async execute(query,userId){
const q=`%${query}%`;
const res=await pool.query(
`SELECT * FROM papers WHERE (title ILIKE $1 OR authors ILIKE $1 OR abstract ILIKE $1 OR tags ILIKE $1) ORDER BY relevance_score DESC NULLS LAST LIMIT 20`,
[q]
);
return{agent:'searchAgent',query,results:res.rows,count:res.rows.length};
}
}
module.exports=new SearchAgent();
module.exports.parseAIJson=parseAIJson;
