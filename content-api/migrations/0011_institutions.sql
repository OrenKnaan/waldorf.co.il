-- Educational institutions (kindergartens, schools, high schools) managed from the
-- admin's "מוסדות חינוך" view. Until now that view was a hard-coded table of four
-- invented rows with a disabled add button, because the API had no collection for it.
--
-- Deliberately created EMPTY. The four rows that used to sit in the admin were a
-- hand-written demonstration, not forum data, and nothing here may look real until
-- the forum supplies the list (see the open question in the admin report).
--
-- `stage` is the same vocabulary the admin's filter chips use: gan | elementary | high.
-- `status` follows the events/news convention: active institutions are public,
-- pending ones wait for approval, inactive ones are kept but hidden.
CREATE TABLE IF NOT EXISTS institutions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  town        TEXT,
  stage       TEXT NOT NULL DEFAULT 'gan',
  status      TEXT NOT NULL DEFAULT 'pending',
  url         TEXT,
  contact     TEXT,
  description TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
