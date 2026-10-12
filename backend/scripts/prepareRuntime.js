'use strict';

const fs = require('fs');
const path = require('path');
const pool = require('../models/db');

async function main() {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== 'true') throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'models', 'schema.sql'), 'utf8'));
  const migrationDir = path.join(__dirname, '..', 'migrations');
  for (const file of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
    await pool.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
  }
  const demoEmail = String(process.env.DEMO_EMAIL || '').trim();
  if (!demoEmail) throw new Error('DEMO_EMAIL must identify an existing account');
  const account = await pool.query('SELECT id FROM users WHERE lower(email)=lower($1)', [demoEmail]);
  if (!account.rows[0]) throw new Error('The configured demo account does not exist; runtime setup will not create or overwrite accounts');
}

main().then(() => pool.end()).catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
