-- ספרים אלקטרוניים: a showcase of e-books, separate from the open archive on
-- content-library.html. Most will link out to a store; the forum's one fully
-- open book stays hardcoded on the page itself (see mockup/pages/ebooks.html),
-- so purchase_url and this kind exist for every OTHER e-book, present or future.
--
-- purchase_url is nullable on purpose: an open e-book (read on our own site)
-- has a url but no purchase_url; a store-bought one has a purchase_url and no
-- url. A row with neither or both is a data error, not a valid state, but the
-- column itself does not enforce that: there are only two rows to check by hand.
ALTER TABLE library ADD COLUMN purchase_url TEXT;

-- "22 שאלות ותשובות על חינוך ולדורף" reads as one self-contained booklet, not
-- a one-off article, so it moves out of the 'מאמר' kind into the e-book
-- showcase. It already has a page (lib-p2323.html, migration 0006), so it
-- stays open/free there: url carries the existing page, purchase_url is NULL.
UPDATE library SET kind = 'ספר אלקטרוני', updated_at = strftime('%s','now') WHERE id = 'lb-p2323';
