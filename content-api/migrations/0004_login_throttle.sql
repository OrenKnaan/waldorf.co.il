-- Failed-login bookkeeping, so /api/auth/login cannot be guessed at indefinitely.
--
-- One row per (email, ip) pair rather than per attempt: the endpoint only needs
-- a count and a window, and a row per attempt would grow without bound and
-- need its own sweeping. Successful logins delete the row.
--
-- Keyed on the pair, not on either alone. Keying on email only would let anyone
-- lock a known account out by guessing at it from anywhere; keying on IP only
-- would let one address spray many accounts. The pair throttles the actual
-- attack shape while leaving the real owner a way in from somewhere else.
CREATE TABLE IF NOT EXISTS login_attempts (
  email       TEXT NOT NULL COLLATE NOCASE,
  ip          TEXT NOT NULL,
  fails       INTEGER NOT NULL DEFAULT 0,
  first_fail  INTEGER NOT NULL,   -- unix seconds, start of the current window
  last_fail   INTEGER NOT NULL,
  PRIMARY KEY (email, ip)
);

-- Lets the sweep in the Worker drop expired windows cheaply.
CREATE INDEX IF NOT EXISTS idx_login_attempts_last ON login_attempts(last_fail);
