'use strict';
const pool = require('../models/db');

// Native users have no role/tenant columns: bind the native researcher claim to
// the current configured tenant and re-read the actual account identity.
module.exports = async function researchActor(req, res, next) {
  const id = Number(req.user?.id);
  if (!Number.isSafeInteger(id) || id < 1 || !req.user?.email) {
    return res.status(401).json({ error: 'Identity is no longer active' });
  }
  if (req.user.role !== 'researcher' || req.user.tenantId !== process.env.GOVERNANCE_TENANT_ID) {
    return res.status(403).json({ error: 'Research account authorization is not current' });
  }
  try {
    const result = await pool.query('SELECT id,email,name FROM users WHERE id=$1', [id]);
    const user = result.rows[0];
    if (!user || user.email !== req.user.email) return res.status(401).json({ error: 'Identity is no longer active' });
    req.user = { ...req.user, ...user };
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Could not verify the research account' });
  }
};
