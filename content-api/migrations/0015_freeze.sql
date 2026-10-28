-- Freeze: hide an item from the site without deleting it, and bring it back
-- later exactly as it was. The admin offers it on every collection the site
-- renders.
--
-- It is a status value, 'frozen', not a separate flag, because five tables
-- already have a status the public read filters on (events, news, board,
-- jobs, institutions): there 'frozen' needs no schema change at all, since
-- status is free text and anything outside publicStatus is withheld from
-- visitors. The six tables below had no status, so every row was public.
-- They gain one, defaulting to 'published' so every existing row stays
-- exactly as visible as it is now, and the Worker gives them
-- publicStatus ['published'].
--
-- Order matters on deploy: apply this before deploying the Worker that reads
-- it. The old Worker ignores the new column, but the new one filters on it and
-- would fail against a table without it.
ALTER TABLE library    ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE teaching   ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE forms      ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE map_points ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE videos     ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE podcast    ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
