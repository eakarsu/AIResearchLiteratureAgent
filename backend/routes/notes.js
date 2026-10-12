const router=require('express').Router();const pool=require('../models/db');const auth=require('../middleware/auth');router.use(auth);router.use(require('../middleware/researchActor'));
router.get('/',async(req,res)=>{
try{const{paper_id}=req.query;
let q='SELECT n.*,p.title as paper_title FROM notes n JOIN papers p ON n.paper_id=p.id AND p.user_id=$1 WHERE n.user_id=$1';const params=[req.user.id];
if(paper_id){q+=' AND n.paper_id=$2';params.push(paper_id);}
q+=' ORDER BY n.created_at DESC';
const r=await pool.query(q,params);res.json(r.rows);}catch(e){res.status(500).json({error:e.message});}
});
router.post('/',async(req,res)=>{
try{const{paper_id,content,highlights}=req.body;
const r=await pool.query('INSERT INTO notes (paper_id,content,highlights,user_id) SELECT id,$2,$3,$4 FROM papers WHERE id=$1 AND user_id=$4 RETURNING *',[paper_id,content,highlights,req.user.id]);
if(!r.rows[0])return res.status(404).json({error:'Saved paper not found'});res.status(201).json(r.rows[0]);}catch(_e){res.status(500).json({error:'Could not create the note'});}
});
router.put('/:id',async(req,res)=>{
try{const{content,highlights}=req.body;
const r=await pool.query('UPDATE notes SET content=$1,highlights=$2 WHERE id=$3 AND user_id=$4 RETURNING *',[content,highlights,req.params.id,req.user.id]);
if(!r.rows.length)return res.status(404).json({error:'Not found'});res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
router.delete('/:id',async(req,res)=>{
try{const r=await pool.query('DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});res.json({success:true});}catch(_e){res.status(500).json({error:'Could not delete the note'});}
});
module.exports=router;
