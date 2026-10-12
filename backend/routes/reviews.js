const router=require('express').Router();
const pool=require('../models/db');
router.use(require('../middleware/auth'));
router.use(require('../middleware/researchActor'));
const statuses=new Set(['draft','in_progress','published']);
const text=value=>String(value||'').trim();
const count=value=>{const parsed=Number(value??0);return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;};

router.get('/',async(req,res)=>{try{const r=await pool.query('SELECT * FROM reviews WHERE user_id=$1 ORDER BY created_at DESC,id DESC',[req.user.id]);return res.json(r.rows);}catch(_error){return res.status(500).json({error:'Could not load literature reviews'});}});
router.get('/:id',async(req,res)=>{try{const r=await pool.query('SELECT * FROM reviews WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});return res.json(r.rows[0]);}catch(_error){return res.status(500).json({error:'Could not load the literature review'});}});
router.post('/',async(req,res)=>{
  try{const title=text(req.body?.title),topic=text(req.body?.topic),content=text(req.body?.content),gaps=text(req.body?.gaps_identified),status=statuses.has(req.body?.status)?req.body.status:'draft',papers=count(req.body?.papers_included);if(!title)return res.status(400).json({error:'Review title is required'});if(papers===null)return res.status(400).json({error:'Papers included must be a non-negative integer'});
    const r=await pool.query('INSERT INTO reviews (title,topic,status,papers_included,content,gaps_identified,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',[title,topic,status,papers,content,gaps,req.user.id]);return res.status(201).json(r.rows[0]);}
  catch(_error){return res.status(500).json({error:'Could not create the literature review'});}
});
router.put('/:id',async(req,res)=>{
  try{const title=text(req.body?.title),topic=text(req.body?.topic),content=text(req.body?.content),gaps=text(req.body?.gaps_identified),status=req.body?.status,papers=count(req.body?.papers_included);if(!title)return res.status(400).json({error:'Review title is required'});if(!statuses.has(status))return res.status(400).json({error:'Review status is invalid'});if(papers===null)return res.status(400).json({error:'Papers included must be a non-negative integer'});
    const r=await pool.query('UPDATE reviews SET title=$1,topic=$2,status=$3,papers_included=$4,content=$5,gaps_identified=$6 WHERE id=$7 AND user_id=$8 RETURNING *',[title,topic,status,papers,content,gaps,req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});return res.json(r.rows[0]);}
  catch(_error){return res.status(500).json({error:'Could not update the literature review'});}
});
router.delete('/:id',async(req,res)=>{try{const r=await pool.query('DELETE FROM reviews WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Not found'});return res.json({success:true});}catch(_error){return res.status(500).json({error:'Could not delete the literature review'});}});
module.exports=router;
