-- When each file in the waldorf-uploads bucket was last downloaded.
--
-- The site Worker writes it as it serves /files/… and /wp-content/uploads/…, at
-- most once a day per file. The quarterly cleanup in content-api (cleanFiles)
-- reads it: an uploaded file that nothing on the site links to and nobody has
-- downloaded for FILE_IDLE_DAYS goes to the bucket's trash/. A file with no row
-- has not been downloaded since tracking began (2026-11-10), and its own upload
-- date stands in.
CREATE TABLE IF NOT EXISTS file_hits (
  key      TEXT PRIMARY KEY,     -- the bucket key: files/2026/11/…, wp-content/uploads/…
  last_hit INTEGER NOT NULL      -- unix seconds
);
