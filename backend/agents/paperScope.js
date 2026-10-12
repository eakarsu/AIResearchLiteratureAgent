'use strict';
const pool = require('../models/db');
function failure(status, message) { return Object.assign(new Error(message), { status }); }
function actorId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw failure(401, 'Research account is required');
  return id;
}
function paperIds(value) {
  if (!Array.isArray(value) || value.length > 100) throw failure(400, 'paper_ids must be an array of at most 100 paper IDs');
  const ids = value.map(item => {
    if ((typeof item !== 'number' && typeof item !== 'string') || !String(item).trim()) throw failure(400, 'Paper IDs must be positive integers');
    const id = Number(item);
    if (!Number.isSafeInteger(id) || id < 1) throw failure(400, 'Paper IDs must be positive integers');
    return id;
  });
  return [...new Set(ids)];
}
async function selectedPapers(userId, value, columns = '*') {
  const ids = paperIds(value);
  if (!ids.length) return [];
  // All callers provide a fixed native projection, never request-supplied SQL.
  const result = await pool.query(`SELECT ${columns} FROM papers WHERE user_id=$1 AND id=ANY($2::int[]) ORDER BY id`, [actorId(userId), ids]);
  if (result.rows.length !== ids.length) throw failure(404, 'One or more papers were not found in this account');
  return result.rows;
}
async function selectedPaper(userId, id, columns = '*') {
  return (await selectedPapers(userId, [id], columns))[0];
}
module.exports = { actorId, paperIds, selectedPaper, selectedPapers, failure };
