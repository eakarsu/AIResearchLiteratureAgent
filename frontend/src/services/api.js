const API='/api';
const h=()=>({'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')||''}`});
const decode=async response=>{const text=await response.text();if(!text)return{};try{return JSON.parse(text);}catch{throw new Error(`Server returned an unreadable response (HTTP ${response.status}).`);}};
const req=async(url,opts={})=>{let response;try{response=await fetch(`${API}${url}`,{...opts,headers:{...h(),...(opts.headers||{})}});}catch(error){if(error.name==='AbortError')throw error;throw new Error('Could not reach the research service.');}const data=await decode(response);if(!response.ok)throw new Error(data.error||`Request failed with HTTP ${response.status}.`);return data;};
const authRequest=async(path,body)=>{let response;try{response=await fetch(`${API}/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});}catch{throw new Error('Could not reach the research service.');}const data=await decode(response);if(!response.ok)throw new Error(data.error||'Authentication failed.');return data;};
export const login=(email,password)=>authRequest('login',{email,password});
export const loginDemo=()=>authRequest('demo',{});
export const getMe=()=>req('/auth/me');
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
export const updateCollection=(id,d)=>req(`/collections/${id}`,{method:'PUT',body:JSON.stringify(d)});
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
// Agents. Request options carry AbortSignal without changing native payloads.
export const aiSynthesize=(d,options={})=>req('/agents/synthesize-findings',{...options,method:'POST',body:JSON.stringify(d)});
export const aiGaps=(d,options={})=>req('/agents/identify-gaps',{...options,method:'POST',body:JSON.stringify(d)});
export const aiReview=(d,options={})=>req('/agents/generate-review',{...options,method:'POST',body:JSON.stringify(d)});
export const aiSearch=(d,options={})=>req('/agents/search',{...options,method:'POST',body:JSON.stringify(d)});
export const aiCitations=(d,options={})=>req('/agents/track-citations',{...options,method:'POST',body:JSON.stringify(d)});
export const aiPipeline=(d,options={})=>req('/agents/pipeline',{...options,method:'POST',body:JSON.stringify(d)});
export const doiLookup=(d,options={})=>req('/agents/doi-lookup',{...options,method:'POST',body:JSON.stringify(d)});
export const runResearchWorkspace=(d,options={})=>req('/agents/workspace',{...options,method:'POST',body:JSON.stringify(d)});
export const getAgentLogs=(page=1)=>req(`/agents/logs?page=${page}`);
