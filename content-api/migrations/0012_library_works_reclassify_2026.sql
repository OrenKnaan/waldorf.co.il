-- The forum reviewed the works 0009 classified and corrected three of them.
-- Not a guess this time either, so UPDATE as 0009 does, never a fresh INSERT.
--
-- lb-p2847 (יעל הרן) and lb-p2833 (עפר גן אור): 0009 filed both as
-- 'עבודה לתואר שני'. The forum places them with the seminar papers instead.
--
-- lb-p2940 (חנה טל אליאן): 0009 left it 'עבודה סמינריונית', inconsistent with
-- its own 2023 cohort: lb-p2938 and lb-p2939 are both 'עבודה של מורי ולדורף'.
-- The forum's instruction was "everything from 2023", which includes it.
--
-- lb-p2536 ("חינוך לאורינות מדיה בחינוך ולדורף"): 0008 read this one as a
-- thesis from its own title page (no author line, an academic English
-- subtitle). The forum's instruction was a blanket "all of 2019" with no
-- exceptions named, which disagrees with that documented reading. Applied as
-- instructed; worth confirming with the forum before relying on it further.
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2847';
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2833';
UPDATE library SET kind = 'עבודה של מורי ולדורף', updated_at = strftime('%s','now') WHERE id = 'lb-p2940';
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2536';
