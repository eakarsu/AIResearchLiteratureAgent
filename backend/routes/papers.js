const router=require('express').Router();const pool=require('../models/db');const auth=require('../middleware/auth');router.use(auth);
router.get('/',async(req,res)=>{
const{source,status,search,page=1,limit=20}=req.query;
const p=[];const c=[];let q='SELECT * FROM papers';
if(source){c.push(`source=$${p.length+1}`);p.push(source);}
if(status){c.push(`status=$${p.length+1}`);p.push(status);}
if(search){c.push(`(title ILIKE $${p.length+1} OR authors ILIKE $${p.length+1} OR abstract ILIKE $${p.length+1})`);p.push(`%${search}%`);}
if(c.length)q+=' WHERE '+c.join(' AND ');
const countQ=q.replace('SELECT *','SELECT COUNT(*)');
q+=` ORDER BY relevance_score DESC NULLS LAST LIMIT $${p.length+1} OFFSET $${p.length+2}`;
const pg=Math.max(1,parseInt(page));const lm=Math.min(100,parseInt(limit));
p.push(lm,(pg-1)*lm);
try{
const[r,ct]=await Promise.all([pool.query(q,p),pool.query(countQ,p.slice(0,-2))]);
const total=parseInt(ct.rows[0].count);
res.json({data:r.rows,pagination:{page:pg,limit:lm,total,totalPages:Math.ceil(total/lm)}});
}catch(e){res.status(500).json({error:e.message});}
});
router.get('/:id',async(req,res)=>{
try{const r=await pool.query('SELECT * FROM papers WHERE id=$1',[req.params.id]);
if(!r.rows.length)return res.status(404).json({error:'Not found'});res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
router.post('/',async(req,res)=>{
try{const{title,authors,abstract,source,year,doi,tags}=req.body;
const r=await pool.query('INSERT INTO papers (title,authors,abstract,source,year,doi,tags,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[title,authors,abstract,source,year,doi,tags,req.user.id]);
res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
// Import paper from DOI lookup result
router.post('/import',async(req,res)=>{
try{const{title,authors,abstract,source,year,doi,tags,url,citations}=req.body;
const r=await pool.query('INSERT INTO papers (title,authors,abstract,source,year,doi,tags,url,citations,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[title,authors,abstract,source,year,doi,tags||'imported',url,citations||0,req.user.id]);
res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
router.put('/:id',async(req,res)=>{
try{const{title,authors,abstract,source,year,status,tags,relevance_score}=req.body;
const r=await pool.query('UPDATE papers SET title=$1,authors=$2,abstract=$3,source=$4,year=$5,status=$6,tags=$7,relevance_score=$8 WHERE id=$9 RETURNING *',[title,authors,abstract,source,year,status,tags,relevance_score,req.params.id]);
res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
router.delete('/:id',async(req,res)=>{
try{await pool.query('DELETE FROM papers WHERE id=$1',[req.params.id]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});}
});
module.exports=router;
