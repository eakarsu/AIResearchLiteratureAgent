'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../models/db');

async function main() {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== 'true') throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'models', 'schema.sql'), 'utf8'));
  const migrationDir = path.join(__dirname, '..', 'migrations');
  for (const file of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
    await pool.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_results(
    id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id),endpoint VARCHAR(120) NOT NULL,
    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,result JSONB NOT NULL,created_at TIMESTAMP DEFAULT NOW())`);
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  const name = process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator';
  if (!email || !password) throw new Error('Provisioned administrator credentials are required');
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users(email,password,name) VALUES($1,$2,$3)
     ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password,name=EXCLUDED.name`,
    [email, hash, name]
  );
}

main().then(() => pool.end()).catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
