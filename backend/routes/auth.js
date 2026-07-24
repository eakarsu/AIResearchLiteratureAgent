const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), pool = require('../models/db'), authenticateToken = require('../middleware/auth'), router = express.Router();
router.post('/login', async (req, res) => {
  try { const { email, password } = req.body; const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!r.rows.length || !await bcrypt.compare(password, r.rows[0].password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: r.rows[0].id, email, name: r.rows[0].name, role: 'researcher', tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`actor:user:${r.rows[0].id}`] }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
    res.json({ token, user: { id: r.rows[0].id, email, name: r.rows[0].name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/register', async (req, res) => {
  try { const { email, password, name } = req.body;
    if (!email || !name || typeof password !== 'string' || password.length < 12) return res.status(400).json({ error: 'Email, name, and a password of at least 12 characters are required' });
    const h = await bcrypt.hash(password, 10);
    const r = await pool.query('INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name', [email, h, name]);
    const token = jwt.sign({ id: r.rows[0].id, email, name, role: 'researcher', tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`actor:user:${r.rows[0].id}`] }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
    res.status(201).json({ token, user: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id,email,name FROM users WHERE id=$1', [req.user.id]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Identity is no longer active' });
    return res.json({ user: { ...result.rows[0], role: req.user.role } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
module.exports = router;
