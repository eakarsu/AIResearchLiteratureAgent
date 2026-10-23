'use strict';
// Authenticated tasks, papers export, and deterministic AI fallbacks.
// Mounted in server.js before the 404 handler. The AI endpoints never call
// a provider: they always return the labelled deterministic fallback
// computed from the caller's own records, so they behave identically with
// provider keys unset (offline verification).

const express = require('express');
const pool = require('../models/db');
const auth = require('../middleware/auth');
const {
  TASKS_TABLE_SQL,
  normalizeTaskInput,
  serializeExport,
  readingQueueSummary,
  citationGapSummary,
  reviewProgressSummary,
} = require('../services/featurePack');

const router = express.Router();
router.use(auth);
let tasksReady = null;

function ensureTasks() {
  if (!tasksReady) {
    tasksReady = pool.query(TASKS_TABLE_SQL).catch((err) => {
      tasksReady = null;
      throw err;
    });
  }
  return tasksReady;
}

async function listTasks(req) {
  await ensureTasks();
  const params = [req.user.id];
  const clauses = ['user_id = $1'];
  const search = String(req.query.search || '').trim();
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  const status = String(req.query.status || '').trim();
  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  const priority = String(req.query.priority || '').trim();
  if (priority) {
    params.push(priority);
    clauses.push(`priority = $${params.length}`);
  }
  const result = await pool.query(`SELECT * FROM tasks WHERE ${clauses.join(' AND ')} ORDER BY id DESC`, params);
  return result.rows;
}

router.get('/tasks/export', async (req, res) => {
  try {
    const exported = serializeExport(await listTasks(req), req.query.format || 'json');
    if (!exported) return res.status(400).json({ error: 'format must be csv or json' });
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="tasks.${req.query.format === 'csv' ? 'csv' : 'json'}"`);
    return res.send(exported.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    return res.json(await listTasks(req));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { task, errors } = normalizeTaskInput(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    await ensureTasks();
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, related_type, related_id, user_id, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [task.title, task.description, task.status, task.priority, task.due_date, task.related_type, task.related_id,
        req.user.id, req.user.tenantId ? String(req.user.tenantId) : null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const { task, errors } = normalizeTaskInput(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    await ensureTasks();
    const current = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!current.rows.length) return res.status(404).json({ error: 'task not found' });
    const next = { ...current.rows[0], ...task };
    const result = await pool.query(
      `UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, due_date=$5, related_type=$6, related_id=$7, updated_at=NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [next.title, next.description, next.status, next.priority, next.due_date, next.related_type, next.related_id, req.params.id, req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// CSV/JSON export of the caller's papers list, honouring the same
// search/source/status filters as GET /api/papers.
router.get('/feature-pack/export', async (req, res) => {
  try {
    const params = [req.user.id];
    const clauses = ['user_id = $1'];
    const search = String(req.query.search || '').trim();
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(title ILIKE $${params.length} OR authors ILIKE $${params.length} OR abstract ILIKE $${params.length})`);
    }
    for (const key of ['source', 'status']) {
      const value = String(req.query[key] || '').trim();
      if (value) {
        params.push(value);
        clauses.push(`${key} = $${params.length}`);
      }
    }
    const result = await pool.query(`SELECT * FROM papers WHERE ${clauses.join(' AND ')} ORDER BY id DESC`, params);
    const exported = serializeExport(result.rows, req.query.format || 'json');
    if (!exported) return res.status(400).json({ error: 'format must be csv or json' });
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="papers.${req.query.format === 'csv' ? 'csv' : 'json'}"`);
    return res.send(exported.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function ownRows(sql, params) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (_) {
    return [];
  }
}

router.post('/feature-pack/ai/reading-queue-summary', async (req, res) => {
  const papers = await ownRows('SELECT * FROM papers WHERE user_id = $1 ORDER BY id DESC LIMIT 200', [req.user.id]);
  return res.json(readingQueueSummary({ papers }));
});

router.post('/feature-pack/ai/citation-gap-summary', async (req, res) => {
  const papers = await ownRows('SELECT * FROM papers WHERE user_id = $1 ORDER BY id DESC LIMIT 200', [req.user.id]);
  return res.json(citationGapSummary({ papers }));
});

router.post('/feature-pack/ai/review-progress-summary', async (req, res) => {
  const [reviews, papers] = await Promise.all([
    ownRows('SELECT * FROM reviews WHERE user_id = $1 ORDER BY id DESC LIMIT 200', [req.user.id]),
    ownRows('SELECT * FROM papers WHERE user_id = $1 ORDER BY id DESC LIMIT 200', [req.user.id]),
  ]);
  return res.json(reviewProgressSummary({ reviews, papers }));
});

module.exports = router;
