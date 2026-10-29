-- Archive, per-user read marks, and what moderation needs to answer a submitter.
--
-- The archive is two status values, not a table: 'archived' (an editor removed
-- the item) and 'rejected' (a moderator turned a submission down). Status is
-- free text and anything outside publicStatus is withheld from visitors, so
-- neither needs a schema change; the Worker only learns the names. An archived
-- item can be restored or deleted for good from the admin.
--
-- news gains `contact`: the public form and the admin form both collect it, but
-- the table never had the column, so the Worker dropped it on every save.
--
-- submitter_email is where a rejection notice goes. It is collected by the public
-- forms, labelled as not published, and the Worker strips it from every
-- non-admin read. reject_note keeps the text that was sent, so a moderator can
-- see later what the submitter was told.
--
-- Apply before deploying the Worker that reads these columns.
ALTER TABLE news  ADD COLUMN contact TEXT;
ALTER TABLE news  ADD COLUMN submitter_email TEXT;
ALTER TABLE news  ADD COLUMN reject_note TEXT;
ALTER TABLE board ADD COLUMN submitter_email TEXT;
ALTER TABLE board ADD COLUMN reject_note TEXT;
ALTER TABLE jobs  ADD COLUMN submitter_email TEXT;
ALTER TABLE jobs  ADD COLUMN reject_note TEXT;

-- Which submissions each admin user has opened. Per user, because the boards are
-- moderated by several people and "new to me" differs between them. The
-- management key is one shared user, id 'key'.
CREATE TABLE IF NOT EXISTS item_reads (
  user_id     TEXT NOT NULL,
  collection  TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  read_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, collection, item_id)
);

-- History rows in which all three about fields are empty record nothing an
-- editor could restore. The Worker stops writing them; these are the ones
-- already there.
DELETE FROM singleton_versions
 WHERE key = 'about'
   AND COALESCE(TRIM(json_extract(value, '$.intro')), '') = ''
   AND COALESCE(TRIM(json_extract(value, '$.activities')), '') = ''
   AND COALESCE(TRIM(json_extract(value, '$.admission')), '') = '';
