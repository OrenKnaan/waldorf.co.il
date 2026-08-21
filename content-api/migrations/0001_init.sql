-- Content store for the Waldorf forum mockup.
--
-- One table per collection with real columns rather than a single blob table:
-- the shapes are genuinely different, and the production build is meant to grow
-- out of this schema rather than replace it (docs/PRD, section on D1).
--
-- Conventions shared by every table:
--   id        text primary key, carried over from the seed so existing links keep working
--   position  integer, explicit display order — the admin reorders without touching content
--   demo      0/1, marks the invented records that must not migrate to production
--   status    where a workflow exists: draft/published, or pending/approved for public boards
--   created_at/updated_at  unix epoch seconds, set by the API

CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  date         TEXT,               -- ISO yyyy-mm-dd; text so SQLite sorts it lexicographically
  time         TEXT,
  location     TEXT,
  description  TEXT,
  register_url TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  demo         INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  date        TEXT,
  section     TEXT,
  summary     TEXT,
  link        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Community noticeboard. Public submissions land as 'pending' and an admin approves.
CREATE TABLE IF NOT EXISTS board (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  region      TEXT,
  contact     TEXT,
  date        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL,
  institution TEXT,
  category    TEXT,
  region      TEXT,
  scope       TEXT,
  contact     TEXT,
  description TEXT,
  date        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS library (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  kind        TEXT,               -- article / book / research …
  description TEXT,
  url         TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teaching (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  grp         TEXT,               -- "group" is reserved in SQL, so grp
  url         TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS forms (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  url         TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS map_points (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  town        TEXT,
  count       INTEGER NOT NULL DEFAULT 1,
  lat         REAL,
  lng         REAL,
  url         TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  youtube_id  TEXT,
  description TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS podcast (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  num         INTEGER,
  date        TEXT,
  duration    TEXT,
  description TEXT,
  url         TEXT,
  demo        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- "אודות הפורום" is a single editable document, not a list. Key/value keeps it
-- open to new sections without a migration each time.
CREATE TABLE IF NOT EXISTS singletons (
  key         TEXT PRIMARY KEY,   -- e.g. 'about'
  value       TEXT NOT NULL,      -- JSON object
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_status  ON events(status, date);
CREATE INDEX IF NOT EXISTS idx_news_status    ON news(status, date);
CREATE INDEX IF NOT EXISTS idx_board_status   ON board(status, date);
CREATE INDEX IF NOT EXISTS idx_jobs_status    ON jobs(status, date);
