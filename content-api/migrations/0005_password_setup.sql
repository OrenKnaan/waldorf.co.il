-- One-time links for setting a password: the invite a new user gets, and the
-- reset an existing one asks for. Both are the same mechanism, told apart by
-- `kind` only so the wording of the page can differ.
--
-- Tokens are hashed at rest for the reason sessions are: a leaked database row
-- should not be a usable credential. Rows are consumed rather than deleted, so
-- a second click on the same link says "already used" instead of "unknown
-- token", which is the difference between a clear message and a support call.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,              -- invite | reset
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- A user with no password yet is password_hash = ''. The column stays NOT NULL,
-- so this needs no DDL: '' simply never parses as a pbkdf2 string, and
-- verifyPassword already rejects anything whose scheme is not 'pbkdf2'. That
-- means an account awaiting its invite cannot be logged into by any password,
-- including the empty one, without a separate check having to remember to
-- exist.
--
-- Kept as a note rather than a constraint because SQLite cannot add a CHECK to
-- an existing table without rebuilding it, and the invariant is enforced in the
-- Worker at the one place that writes the column.
