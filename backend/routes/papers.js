const router = require('express').Router(); const pool = require('../models/db'); const auth = require('../middleware/auth'); router.use(auth);
router.get('/', async (req, res) => { const { source, status } = req.query; let q = 'SELECT * FROM papers'; const p = []; const c = [];
  if (source) { c.push(`source=$${p.length+1}`); p.push(source); } if (status) { c.push(`status=$${p.length+1}`); p.push(status); }
  if (c.length) q += ' WHERE ' + c.join(' AND '); q += ' ORDER BY relevance_score DESC NULLS LAST';
  const r = await pool.query(q, p); res.json(r.rows); });
router.post('/', async (req, res) => { const { title, authors, abstract, source, year, doi, tags } = req.body; const r = await pool.query('INSERT INTO papers (title,authors,abstract,source,year,doi,tags) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [title, authors, abstract, source, year, doi, tags]); res.json(r.rows[0]); });
router.put('/:id', async (req, res) => { const { title, authors, abstract, source, year, status, tags, relevance_score } = req.body; const r = await pool.query('UPDATE papers SET title=$1,authors=$2,abstract=$3,source=$4,year=$5,status=$6,tags=$7,relevance_score=$8 WHERE id=$9 RETURNING *', [title, authors, abstract, source, year, status, tags, relevance_score, req.params.id]); res.json(r.rows[0]); });
router.delete('/:id', async (req, res) => { await pool.query('DELETE FROM papers WHERE id=$1', [req.params.id]); res.json({ success: true }); });
module.exports = router;
