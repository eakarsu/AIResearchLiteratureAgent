const router=require('express').Router();const pool=require('../models/db');const auth=require('../middleware/auth');router.use(auth);
router.get('/',async(req,res)=>{
try{const r=await pool.query('SELECT * FROM collections ORDER BY name');res.json(r.rows);}catch(e){res.status(500).json({error:e.message});}
});
router.post('/',async(req,res)=>{
try{const{name,description}=req.body;
const r=await pool.query('INSERT INTO collections (name,description,user_id) VALUES ($1,$2,$3) RETURNING *',[name,description,req.user.id]);
res.json(r.rows[0]);}catch(e){res.status(500).json({error:e.message});}
});
// Add paper to collection
router.post('/:id/papers',async(req,res)=>{
try{const{paper_id}=req.body;
await pool.query('INSERT INTO paper_collections (paper_id,collection_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[paper_id,req.params.id]);
await pool.query('UPDATE collections SET paper_count=paper_count+1 WHERE id=$1',[req.params.id]);
res.json({success:true});}catch(e){res.status(500).json({error:e.message});}
});
// Remove paper from collection
router.delete('/:id/papers/:paperId',async(req,res)=>{
try{await pool.query('DELETE FROM paper_collections WHERE paper_id=$1 AND collection_id=$2',[req.params.paperId,req.params.id]);
await pool.query('UPDATE collections SET paper_count=GREATEST(0,paper_count-1) WHERE id=$1',[req.params.id]);
res.json({success:true});}catch(e){res.status(500).json({error:e.message});}
});
router.delete('/:id',async(req,res)=>{
try{await pool.query('DELETE FROM collections WHERE id=$1',[req.params.id]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});}
});
module.exports=router;
