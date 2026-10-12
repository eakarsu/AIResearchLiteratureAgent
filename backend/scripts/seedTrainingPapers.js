'use strict';
const fs = require('fs');
const path = require('path');
const topics = ['Search strategy', 'Abstract structure', 'Question framing', 'Method comparison', 'Evidence limitations', 'Citation verification', 'Study selection', 'Reproducibility checklist', 'Bias review', 'Terminology mapping', 'Dataset documentation', 'Review outline', 'Research gap framing', 'Source quality checklist', 'Future study planning'];
async function seedTrainingPapers(pool, { userId, expectedEmail, minimum = 15, dryRun = false } = {}) {
  if (!Number.isSafeInteger(Number(userId)) || Number(userId) < 1) throw new Error('An explicit existing user ID is required');
  if (!Number.isSafeInteger(minimum) || minimum < 15 || minimum > 100) throw new Error('minimum must be an integer from 15 to 100');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1,$2)', [23872, Number(userId)]);
    const actor = (await client.query('SELECT id,email FROM users WHERE id=$1 FOR UPDATE', [Number(userId)])).rows[0];
    if (!actor || (expectedEmail !== undefined && actor.email !== expectedEmail)) throw new Error('The selected existing account identity is not current');
    if (!dryRun) await client.query(fs.readFileSync(path.join(__dirname, '../migrations/002_native_paper_ownership.sql'), 'utf8'));
    const hasOwnership = (await client.query("SELECT 1 FROM pg_attribute WHERE attrelid='papers'::regclass AND attname='user_id' AND NOT attisdropped")).rows.length > 0;
    const before = hasOwnership ? Number((await client.query('SELECT count(*) FROM papers WHERE user_id=$1', [actor.id])).rows[0].count) : 0;
    let inserted = 0;
    if (!dryRun) {
      const existingTitles = new Set((await client.query('SELECT title FROM papers WHERE user_id=$1', [actor.id])).rows.map(row => row.title));
      for (let ordinal = 1; before + inserted < minimum; ordinal++) {
        const topic = topics[(ordinal - 1) % topics.length];
        const title = `[Synthetic training example ${String(ordinal).padStart(2, '0')}] ${topic}`;
        if (existingTitles.has(title)) continue;
        await client.query(`INSERT INTO papers(title,abstract,source,tags,status,user_id,citations)
          VALUES($1,$2,'synthetic-training','synthetic,training-example','draft',$3,0)`,
          [title, `Fictional training draft for practicing ${topic.toLowerCase()}. This is not a published paper, a verified study, a clinical observation, or evidence of an actual research finding. Use it only to review the application controls; verify real sources separately.`, actor.id]);
        existingTitles.add(title); inserted++;
      }
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { userId: actor.id, before, inserted, after: before + inserted, minimum, migrationPending: !hasOwnership, plannedInsert: Math.max(0, minimum - before), syntheticSource: 'synthetic-training', accountsChanged: 0, providerCalls: 0, dryRun };
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); }
}
module.exports = { seedTrainingPapers };
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  const args = process.argv.slice(2), index = args.indexOf('--user-id');
  if (index < 0 || !args[index + 1]) { console.error('Usage: node scripts/seedTrainingPapers.js --user-id EXISTING_USER_ID [--dry-run]'); process.exitCode = 1; }
  else {
    const pool = require('../models/db');
    seedTrainingPapers(pool, { userId: Number(args[index + 1]), dryRun: args.includes('--dry-run') })
      .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
  }
}
