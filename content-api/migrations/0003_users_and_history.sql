-- Admin users, and version history for the editable singleton documents.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role          TEXT NOT NULL DEFAULT 'editor',   -- super_admin | admin | editor
  password_hash TEXT NOT NULL,                    -- pbkdf2$iterations$salt$hash — never plaintext
  active        INTEGER NOT NULL DEFAULT 1,
  last_login    INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- Sessions issued by /api/auth/login. Bearer tokens, hashed at rest for the same
-- reason passwords are: a leaked database row should not be a usable credential.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Every save of an editable document, newest last. 'draft' rows are work in
-- progress; 'published' rows are what the public site renders. Restoring is
-- just writing an old row's value back out as a new version, so history is
-- append-only and nothing is ever lost.
CREATE TABLE IF NOT EXISTS singleton_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  status     TEXT NOT NULL,              -- draft | published
  note       TEXT,                       -- e.g. 'שוחזר מגרסה 3'
  author     TEXT,                       -- user name at time of save
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sv_key ON singleton_versions(key, id DESC);

-- The working copy lives alongside the published one.
ALTER TABLE singletons ADD COLUMN draft_value TEXT;

INSERT OR REPLACE INTO users (id,name,email,role,password_hash,active,created_at,updated_at)
VALUES ('u-oren','אורן כנען','orenknaan@gmail.com','super_admin','REDACTED-CREDENTIAL-REMOVED-FROM-HISTORY',1,
        strftime('%s','now'),strftime('%s','now'));
