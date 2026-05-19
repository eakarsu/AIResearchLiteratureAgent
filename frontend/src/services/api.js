const API='http://localhost:3022/api';
const h=()=>({'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`});
const req=async(url,opts={})=>{const r=await fetch(`${API}${url}`,{...opts,headers:h()});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;};
export const login=(e,p)=>fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:p})}).then(r=>r.json());
export const getStats=()=>req('/stats');
// Papers
export const getPapers=(params={})=>{const qs=new URLSearchParams(params).toString();return req(`/papers${qs?'?'+qs:''}`);};
export const getPaper=(id)=>req(`/papers/${id}`);
export const createPaper=d=>req('/papers',{method:'POST',body:JSON.stringify(d)});
export const importPaper=d=>req('/papers/import',{method:'POST',body:JSON.stringify(d)});
export const updatePaper=(id,d)=>req(`/papers/${id}`,{method:'PUT',body:JSON.stringify(d)});
export const deletePaper=id=>req(`/papers/${id}`,{method:'DELETE'});
// Collections
export const getCollections=()=>req('/collections');
export const createCollection=d=>req('/collections',{method:'POST',body:JSON.stringify(d)});
export const addToCollection=(collId,paperId)=>req(`/collections/${collId}/papers`,{method:'POST',body:JSON.stringify({paper_id:paperId})});
export const deleteCollection=id=>req(`/collections/${id}`,{method:'DELETE'});
// Reviews
export const getReviews=()=>req('/reviews');
export const createReview=d=>req('/reviews',{method:'POST',body:JSON.stringify(d)});
export const updateReview=(id,d)=>req(`/reviews/${id}`,{method:'PUT',body:JSON.stringify(d)});
export const deleteReview=id=>req(`/reviews/${id}`,{method:'DELETE'});
// Notes
export const getNotes=(paperId)=>req(`/notes${paperId?'?paper_id='+paperId:''}`);
export const createNote=d=>req('/notes',{method:'POST',body:JSON.stringify(d)});
export const updateNote=(id,d)=>req(`/notes/${id}`,{method:'PUT',body:JSON.stringify(d)});
export const deleteNote=id=>req(`/notes/${id}`,{method:'DELETE'});
// Agents
export const aiSynthesize=d=>req('/agents/synthesize-findings',{method:'POST',body:JSON.stringify(d)});
export const aiGaps=d=>req('/agents/identify-gaps',{method:'POST',body:JSON.stringify(d)});
export const aiReview=d=>req('/agents/generate-review',{method:'POST',body:JSON.stringify(d)});
export const aiSearch=d=>req('/agents/search',{method:'POST',body:JSON.stringify(d)});
export const aiCitations=d=>req('/agents/track-citations',{method:'POST',body:JSON.stringify(d)});
export const aiPipeline=d=>req('/agents/pipeline',{method:'POST',body:JSON.stringify(d)});
export const doiLookup=d=>req('/agents/doi-lookup',{method:'POST',body:JSON.stringify(d)});
export const getAgentLogs=(page=1)=>req(`/agents/logs?page=${page}`);
