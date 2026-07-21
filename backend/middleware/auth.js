const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });
module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    if ((process.env.JWT_SECRET || '').length < 32) return res.status(503).json({ error: 'Secure authentication is not configured' });
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!req.user.tenantId || !req.user.role) throw new Error('missing authorization context');
    next();
  }
  catch (err) { res.status(401).json({ error: 'Invalid token' }); }
};
