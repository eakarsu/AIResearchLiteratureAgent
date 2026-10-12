const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), pool = require('../models/db'), authenticateToken = require('../middleware/auth'), router = express.Router();
function sessionFor(user) {
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: 'researcher', tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`actor:user:${user.id}`] }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}
router.post('/login', async (req, res) => {
  try { const { email, password } = req.body; const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!r.rows.length || !await bcrypt.compare(password, r.rows[0].password)) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(sessionFor(r.rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/demo', async (_req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_LOGIN !== 'true') return res.status(404).json({ error: 'Demo login is unavailable' });
    const email = String(process.env.DEMO_EMAIL || '').trim();
    if (!email) return res.status(503).json({ error: 'Demo account is not configured' });
    const result = await pool.query('SELECT id,email,name FROM users WHERE lower(email)=lower($1)', [email]);
    if (!result.rows[0]) return res.status(503).json({ error: 'Configured demo account is unavailable' });
    return res.json(sessionFor(result.rows[0]));
  } catch (err) { return res.status(500).json({ error: 'Demo login could not be completed' }); }
});
router.post('/register', async (req, res) => {
  try { const { email, password, name } = req.body;
    if (!email || !name || typeof password !== 'string' || password.length < 12) return res.status(400).json({ error: 'Email, name, and a password of at least 12 characters are required' });
    const h = await bcrypt.hash(password, 10);
    const r = await pool.query('INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name', [email, h, name]);
    res.status(201).json(sessionFor(r.rows[0]));
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
