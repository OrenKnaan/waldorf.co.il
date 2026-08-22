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

-- No user is seeded here on purpose. This repository is public, so a row in it
-- publishes both the address of a super_admin account and the PBKDF2 hash of
-- its password, which is then offline-crackable by anyone at their leisure.
-- A migration is the wrong place for a credential.
--
-- Create the first super_admin out of band instead, against the deployed
-- database, with a password from a generator rather than a keyboard:
--
--   node content-api/make-user.mjs "Full Name" you@example.com super_admin
--
-- It prints the INSERT with a freshly salted hash; pipe it to wrangler:
--
--   npx wrangler d1 execute waldorf-content --remote --command "<the INSERT>"
--
-- Note that git history still carries the hash this file used to hold. Rotating
-- that account's password is what actually retires it; deleting the line only
-- stops it spreading further.
