-- Preserve every legacy record. Unclaimed legacy papers remain unclaimed;
-- only explicit native writes and targeted synthetic training rows have owners.
ALTER TABLE papers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS papers_owner_relevance ON papers(user_id, relevance_score DESC, id);
ALTER TABLE research_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE research_logs ADD COLUMN IF NOT EXISTS result JSONB;
CREATE INDEX IF NOT EXISTS research_logs_owner_created ON research_logs(user_id, created_at DESC, id);
