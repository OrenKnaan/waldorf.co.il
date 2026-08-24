-- Per-IP throttle for the public, unauthenticated write endpoints.
--
-- login_attempts (0004) keys on (email, ip) because a login has an account to
-- protect. The endpoints here have no account: the newsletter signup takes an
-- address nobody has proved they own, and the contact form will take even less.
-- What needs limiting is the caller, so the key is (bucket, ip) and the bucket
-- name keeps one endpoint's flood from locking a visitor out of another.
--
-- One row per (bucket, ip) rather than per request: the check only needs a
-- count and a window start, and a row per request would grow without bound.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT NOT NULL,      -- 'newsletter', later 'contact', …
  ip           TEXT NOT NULL,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,   -- unix seconds
  PRIMARY KEY (bucket, ip)
);

-- Lets a future sweep drop expired windows cheaply.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
