-- ספריית תוכן היא ארכיון, ולארכיון צריך מטא-דאטה שאפשר לסנן ולמיין לפיו.
-- שתי עמודות: מי כתב ובאיזו שנה. ALTER TABLE ב-SQLite אינו ניתן להרצה חוזרת,
-- ולכן המיגרציה הזאת קטנה ונפרדת מכל דבר אחר — ראו migrations/README.md.
ALTER TABLE library ADD COLUMN author TEXT;
ALTER TABLE library ADD COLUMN date TEXT;
