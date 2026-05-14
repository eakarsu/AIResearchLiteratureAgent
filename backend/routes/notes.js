const router=require('express').Router();const pool=require('../models/db');const auth=require('../middleware/auth');router.use(auth);
router.get('/',async(req,res)=>{
try{const{paper_id}=req.query;
let q='SELECT n.*,p.title as paper_title FROM notes n LEFT JOIN papers p ON n.paper_id=p.id WHERE n.user_id=$1';const params=[req.user.id];
if(paper_id){q+=' AND n.paper_id=$2';params.push(paper_id);}
q+=' ORDER BY n.created_at DESC';
const r=await pool.query(q,params);res.json(r.rows);}catch(e){res.status(500).json({error:e.message});}
});
router.post('/',async(req,res)=>{
try{const{paper_id,content,highlights}=req.body;
const r=await pool.query('INSERT INTO notes (paper_id,content,highlights,user_id) VALUES ($1,$2,$3,$4) RETURNING *',[paper_id,content,highlights,req.user.id]);
res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
router.put('/:id',async(req,res)=>{
try{const{content,highlights}=req.body;
const r=await pool.query('UPDATE notes SET content=$1,highlights=$2 WHERE id=$3 AND user_id=$4 RETURNING *',[content,highlights,req.params.id,req.user.id]);
if(!r.rows.length)return res.status(404).json({error:'Not found'});res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
router.delete('/:id',async(req,res)=>{
try{await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});}
});
module.exports=router;
