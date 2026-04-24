const router = require('express').Router(); const pool = require('../models/db'); const auth = require('../middleware/auth'); router.use(auth);
router.get('/', async (req, res) => { const r = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC'); res.json(r.rows); });
router.post('/', async (req, res) => { const { title, topic, content } = req.body; const r = await pool.query('INSERT INTO reviews (title,topic,content) VALUES ($1,$2,$3) RETURNING *', [title, topic, content]); res.json(r.rows[0]); });
router.put('/:id', async (req, res) => { const { title, topic, status, content, gaps_identified } = req.body; const r = await pool.query('UPDATE reviews SET title=$1,topic=$2,status=$3,content=$4,gaps_identified=$5 WHERE id=$6 RETURNING *', [title, topic, status, content, gaps_identified, req.params.id]); res.json(r.rows[0]); });
router.delete('/:id', async (req, res) => { await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]); res.json({ success: true }); });
module.exports = router;
