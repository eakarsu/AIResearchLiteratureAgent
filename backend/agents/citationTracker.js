const axios=require('axios');
class CitationTracker{
constructor(){this.name='citationTracker';}
async execute(paperTitle,doi){
try{
let url;
if(doi){url=`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(doi)}?fields=title,year,citationCount,authors,references,citations`;}
else{const searchRes=await axios.get(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(paperTitle)}&fields=title,year,citationCount,authors&limit=1`);
if(!searchRes.data.data?.length)return{agent:'citationTracker',error:'Paper not found in Semantic Scholar',paper_title:paperTitle};
url=`https://api.semanticscholar.org/graph/v1/paper/${searchRes.data.data[0].paperId}?fields=title,year,citationCount,authors,references,citations`;}
const res=await axios.get(url);
const d=res.data;
return{agent:'citationTracker',title:d.title,year:d.year,citation_count:d.citationCount,authors:d.authors?.map(a=>a.name)||[],references_count:d.references?.length||0,key_citations:(d.citations||[]).slice(0,10).map(c=>({title:c.title,year:c.year,citationCount:c.citationCount}))};
}catch(e){return{agent:'citationTracker',error:e.message,paper_title:paperTitle};}
}
}
module.exports=new CitationTracker();
