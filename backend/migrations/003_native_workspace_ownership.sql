-- Preserve all legacy rows as unclaimed. Ownership is assigned only by explicit
-- actor-scoped writes and the targeted synthetic planning seed.
ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS collections_owner_name ON collections(user_id,name,id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS reviews_owner_created ON reviews(user_id,created_at DESC,id);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS notes_owner_created ON notes(user_id,created_at DESC,id);

CREATE TABLE IF NOT EXISTS paper_filter_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK(type IN ('inclusion','exclusion')),
  field VARCHAR(100) NOT NULL,
  pattern TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS paper_filter_rules_owner_created
  ON paper_filter_rules(user_id,created_at DESC,id);
