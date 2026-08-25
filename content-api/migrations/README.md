# Migrations

Applied with:

    cd content-api
    npx wrangler d1 migrations apply waldorf-content --local    # dev database
    npx wrangler d1 migrations apply waldorf-content --remote   # production

## This database predates its own migration tracking

`0001` through `0004` were applied to the production database by hand before
anyone ran `d1 migrations apply` against it, so the `d1_migrations` table did
not know about them. The first `--remote` run therefore tried to replay the
whole history, and on 2026-08-25 it got as far as:

    ✘ [ERROR] Migration 0003_users_and_history.sql failed:
      duplicate column name: draft_value: SQLITE_ERROR [code: 7500]

`0001` and `0002` survived the replay because everything in them is
`CREATE TABLE IF NOT EXISTS` or an idempotent seed, which is also why **no
content was lost or duplicated**: verified afterwards by diffing every
collection from `/api/content` against a snapshot taken before the run, ids
included. `0003` failed because `ALTER TABLE singletons ADD COLUMN draft_value`
has no `IF NOT EXISTS` form in SQLite and is not repeatable.

The repair was to record the already-applied migrations rather than to make
them re-runnable, since the schema they describe was verifiably present:

    npx wrangler d1 execute waldorf-content --remote --command \
      "INSERT OR IGNORE INTO d1_migrations (name) VALUES
       ('0003_users_and_history.sql'),('0004_login_throttle.sql'),('0005_password_setup.sql')"

Then `apply --remote` had one genuine migration left (`0005_rate_limits.sql`)
and ran it cleanly.

**Before ever backfilling a row like that, prove the objects exist**, or the
tracking table starts lying and the next person inherits a schema that does not
match its own history:

    SELECT name FROM sqlite_master WHERE type='table' AND name IN (...);
    SELECT name FROM pragma_table_info('singletons');

## Writing a new one

- Numbers must be unique. `0005_rate_limits.sql` and `0005_password_setup.sql`
  currently collide, because two people added a migration the same week. It
  happens to work, since wrangler orders by filename and the two are
  independent, but the next collision may not be independent. Take the next
  free number, and check the directory rather than assuming.
- Prefer `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so a
  partial replay is survivable.
- `ALTER TABLE ... ADD COLUMN` cannot be made idempotent in SQLite. It is still
  the right tool, but it is the statement that will break a replay, so keep such
  a migration small and separate from anything else.
- Apply `--local` first and run the Worker against it before going near
  `--remote`.
