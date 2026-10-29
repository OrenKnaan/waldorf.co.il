-- Recycle bin, board expiry, and works served from D1.
--
-- The archive of 0016 becomes a recycle bin: what is removed waits 30 days and
-- is then purged by the Worker's daily cron. The status that marks it is now
-- 'deleted' rather than 'archived', on every collection, since the bin now
-- covers all of them and "archive" has a second meaning below.
--
-- `expires` on the three boards is the last day a post shows. After it the site
-- drops the post and the admin files it under past posts, which are kept.
--
-- `library.page_html` holds a work's full text, previously baked into its static
-- lib-<id>.html page, where hiding the work in D1 hid nothing: the file stayed
-- public. The page is now a shell that asks the Worker for the text, and the
-- Worker answers only while the work is published. The text itself is loaded by
-- content-api/seed/library-pages.sql, which mockup/library-shells.mjs writes;
-- see that script.
--
-- preview_tokens are short-lived passes an admin mints to see a hidden work on
-- the real site. Hashed at rest, like sessions.
--
-- Apply before deploying the Worker that reads these columns.
UPDATE events       SET status = 'deleted' WHERE status = 'archived';
UPDATE news         SET status = 'deleted' WHERE status = 'archived';
UPDATE board        SET status = 'deleted' WHERE status = 'archived';
UPDATE jobs         SET status = 'deleted' WHERE status = 'archived';
UPDATE library      SET status = 'deleted' WHERE status = 'archived';
UPDATE teaching     SET status = 'deleted' WHERE status = 'archived';
UPDATE forms        SET status = 'deleted' WHERE status = 'archived';
UPDATE map_points   SET status = 'deleted' WHERE status = 'archived';
UPDATE institutions SET status = 'deleted' WHERE status = 'archived';
UPDATE videos       SET status = 'deleted' WHERE status = 'archived';
UPDATE podcast      SET status = 'deleted' WHERE status = 'archived';

ALTER TABLE news  ADD COLUMN expires TEXT;
ALTER TABLE board ADD COLUMN expires TEXT;
ALTER TABLE jobs  ADD COLUMN expires TEXT;

ALTER TABLE library ADD COLUMN page_html TEXT;

CREATE TABLE IF NOT EXISTS preview_tokens (
  token_hash  TEXT PRIMARY KEY,
  collection  TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);
