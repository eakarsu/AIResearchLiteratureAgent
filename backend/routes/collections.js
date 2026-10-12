const router=require('express').Router();
const pool=require('../models/db');
router.use(require('../middleware/auth'));
router.use(require('../middleware/researchActor'));

function clean(value){return String(value||'').trim();}
async function ownedCollection(id,userId,client=pool){
  const result=await client.query('SELECT id FROM collections WHERE id=$1 AND user_id=$2',[id,userId]);
  return result.rows[0];
}

router.get('/',async(req,res)=>{
  try{const r=await pool.query('SELECT * FROM collections WHERE user_id=$1 ORDER BY name,id',[req.user.id]);return res.json(r.rows);}
  catch(_error){return res.status(500).json({error:'Could not load collections'});}
});
router.get('/:id',async(req,res)=>{
  try{const r=await pool.query('SELECT * FROM collections WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});return res.json(r.rows[0]);}
  catch(_error){return res.status(500).json({error:'Could not load the collection'});}
});
router.post('/',async(req,res)=>{
  try{const name=clean(req.body?.name),description=clean(req.body?.description);if(!name)return res.status(400).json({error:'Collection name is required'});
    const r=await pool.query('INSERT INTO collections (name,description,user_id) VALUES ($1,$2,$3) RETURNING *',[name,description,req.user.id]);return res.status(201).json(r.rows[0]);}
  catch(_error){return res.status(500).json({error:'Could not create the collection'});}
});
router.put('/:id',async(req,res)=>{
  try{const name=clean(req.body?.name),description=clean(req.body?.description);if(!name)return res.status(400).json({error:'Collection name is required'});
    const r=await pool.query('UPDATE collections SET name=$1,description=$2 WHERE id=$3 AND user_id=$4 RETURNING *',[name,description,req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});return res.json(r.rows[0]);}
  catch(_error){return res.status(500).json({error:'Could not update the collection'});}
});
router.post('/:id/papers',async(req,res)=>{
  const client=await pool.connect();
  try{await client.query('BEGIN');if(!await ownedCollection(req.params.id,req.user.id,client)){await client.query('ROLLBACK');return res.status(404).json({error:'Not found'});}
    const paper=(await client.query('SELECT id FROM papers WHERE id=$1 AND user_id=$2',[req.body?.paper_id,req.user.id])).rows[0];if(!paper){await client.query('ROLLBACK');return res.status(404).json({error:'Saved paper not found'});}
    await client.query('INSERT INTO paper_collections (paper_id,collection_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[paper.id,req.params.id]);
    await client.query('UPDATE collections SET paper_count=(SELECT count(*) FROM paper_collections WHERE collection_id=$1) WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
    await client.query('COMMIT');return res.json({success:true});
  }catch(_error){await client.query('ROLLBACK').catch(()=>{});return res.status(500).json({error:'Could not add the paper to the collection'});}finally{client.release();}
});
router.delete('/:id/papers/:paperId',async(req,res)=>{
  const client=await pool.connect();
  try{await client.query('BEGIN');if(!await ownedCollection(req.params.id,req.user.id,client)){await client.query('ROLLBACK');return res.status(404).json({error:'Not found'});}
    await client.query('DELETE FROM paper_collections WHERE paper_id=$1 AND collection_id=$2 AND EXISTS(SELECT 1 FROM papers WHERE id=$1 AND user_id=$3)',[req.params.paperId,req.params.id,req.user.id]);
    await client.query('UPDATE collections SET paper_count=(SELECT count(*) FROM paper_collections WHERE collection_id=$1) WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
    await client.query('COMMIT');return res.json({success:true});
  }catch(_error){await client.query('ROLLBACK').catch(()=>{});return res.status(500).json({error:'Could not remove the paper from the collection'});}finally{client.release();}
});
router.delete('/:id',async(req,res)=>{
  try{const r=await pool.query('DELETE FROM collections WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});return res.json({success:true});}
  catch(_error){return res.status(500).json({error:'Could not delete the collection'});}
});
module.exports=router;
