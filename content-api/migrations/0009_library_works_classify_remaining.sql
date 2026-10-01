-- 0008 left 10 works marked kind='עבודה' because their own title page named no
-- framework. The forum has now supplied the classification directly, so this
-- is not a guess: 8 are עבודה סמינריונית, 2 (יעל הרן, עפר גן אור) are עבודה
-- לתואר שני. UPDATE rather than a new INSERT OR REPLACE, so a partial replay
-- cannot reintroduce 'עבודה' over a value a later migration has since changed.

UPDATE library SET kind = 'עבודה לתואר שני', updated_at = strftime('%s','now') WHERE id = 'lb-p2847'; -- יעל הרן
UPDATE library SET kind = 'עבודה לתואר שני', updated_at = strftime('%s','now') WHERE id = 'lb-p2833'; -- עפר גן אור

UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p3045'; -- יעל גלמונד מנדל
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2940'; -- חנה טל אליאן
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2911'; -- מישל איבל
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2841'; -- שגית סגל
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2700'; -- אומר אהרון
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2545'; -- ליאת אדלר
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2522'; -- רעות אתרוגי
UPDATE library SET kind = 'עבודה סמינריונית', updated_at = strftime('%s','now') WHERE id = 'lb-p2320'; -- ניצן פריימן
