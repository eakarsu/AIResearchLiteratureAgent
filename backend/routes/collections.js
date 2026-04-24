const router = require('express').Router(); const pool = require('../models/db'); const auth = require('../middleware/auth'); router.use(auth);
router.get('/', async (req, res) => { const r = await pool.query('SELECT * FROM collections ORDER BY name'); res.json(r.rows); });
router.post('/', async (req, res) => { const { name, description } = req.body; const r = await pool.query('INSERT INTO collections (name,description) VALUES ($1,$2) RETURNING *', [name, description]); res.json(r.rows[0]); });
router.delete('/:id', async (req, res) => { await pool.query('DELETE FROM collections WHERE id=$1', [req.params.id]); res.json({ success: true }); });
module.exports = router;
