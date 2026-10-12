'use strict';
const router = require('express').Router();
const pool = require('../models/db');
router.use(require('../middleware/auth'));
router.use(require('../middleware/researchActor'));
router.get('/', async (req, res) => {
  try {
    const papers = (await pool.query(`SELECT count(*)::int AS papers,
      count(*) FILTER(WHERE status='unread')::int AS unread FROM papers WHERE user_id=$1`, [req.user.id])).rows[0];
    const result = { ...papers, collections: null, reviews: null, unavailable: {} };
    for (const table of ['collections', 'reviews']) {
      const scoped = (await pool.query(`SELECT 1 FROM pg_attribute
        WHERE attrelid=$1::regclass AND attname='user_id' AND NOT attisdropped`, [table])).rows.length > 0;
      if (scoped) result[table] = Number((await pool.query(`SELECT count(*) FROM ${table} WHERE user_id=$1`, [req.user.id])).rows[0].count);
      else result.unavailable[table] = 'Existing records have no verified account ownership; an account count is unavailable.';
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Could not load account research counts' });
  }
});
module.exports = router;
