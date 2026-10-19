-- "אמנות הדיבור": the forum (Gilad) asked for this subject to join the
-- e-books showcase rather than get a curriculum page. It did not have one
-- before (see migration 0013's comment and CLAUDE.md, "The triage section"):
-- the five old-site pieces it combines (an intro, a curriculum summary, and
-- three age-group chapters) came from the triage archive, combined by hand
-- into mockup/pages/lib-speech-arts.html, same as every other library item's
-- page. Open and free, like "22 שאלות ותשובות": url set, purchase_url NULL.
-- position 2020: after the book's last chapter (2013, migration 0008), so it
-- sorts to the end of the library collection rather than colliding with an
-- existing position.
INSERT OR REPLACE INTO library (id,title,kind,description,url,author,date,demo,position,created_at,updated_at)
VALUES ('lb-speech-arts', 'אמנות הדיבור', 'ספר אלקטרוני',
  'חמישה פרקים על אמנות הדיבור בבית הספר היסודי: מבוא, תוכנית הלימודים ודגשיה, והמילה כתמונה, כפעימה ריתמית וכמחווה בשלוש השלשות של כיתות א׳ עד ח׳.',
  './lib-speech-arts.html', NULL, NULL, 0, 2020, strftime('%s','now'), strftime('%s','now'));
