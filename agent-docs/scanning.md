# Scanning for bugs and violations

Moved out of the root `CLAUDE.md` (2026-10-28) so it loads only when a task needs it. The root file keeps the rules; this is the detail behind them.

## Scanning for bugs and violations

There is no test suite and no linter in `package.json`, and adding one is not the point: the tools below are run on demand, from a sandbox outside the repo so `package-lock.json` is never touched. Installing a linter into this project is what broke CI once already (see the note in Commands).

    mkdir -p /tmp/scan && cd /tmp/scan && npm init -y
    npm install eslint@9 html-validate@9 axe-core@4

Nine layers, in rough order of how much they find here:

1. **Server-side review by hand.** Every real security finding so far came from reading `content-api/src/index.js`, not from a tool: an authorisation check that had drifted from its own comment, a credential in a migration, a login endpoint with no throttle. Read the auth and the write paths whenever they change.
2. **Dependency CVEs.** `npm audit`. Everything flagged so far is transitive through astro/vite and build-time only.
3. **Secrets.** Grep the tracked files for key/token/password patterns. The repo is public, so anything committed is published, and deleting it later does not unpublish it.
4. **JS static analysis.** ESLint with correctness rules only, no style rules. Roughly 6,000 lines of vanilla JS across `mockup/pages/`, `mockup/*.mjs` and both Workers. It has found nothing but dead variables, which is a useful thing to know.
5. **HTML validity.** `html-validate` over `mockup/pages/*.html`. This is what caught an unclosed `<form>` in the admin and 42 unnamed nav landmarks. Ignore its `doctype-style` rule: the repo is consistently `<!doctype html>`, and HTML5 defines the doctype as case-insensitive.
6. **Link, anchor and asset integrity.** Walk every `href` and `src` in the 50 pages, resolve relative paths on disk, and check that each `#fragment` matches an `id` on the page it points at. Cheap, and it guards the search index's deep links.
7. **Runtime health.** Drive Chrome over CDP across all 50 pages and collect console errors and failed requests. Filter the Cloudflare beacon, which cannot pass CORS from localhost and fails on every page.
8. **Accessibility.** axe-core, covered in `agent-docs/accessibility.md`.
9. **Live endpoint probing.** Unauthenticated requests against the deployed API, checking that protected routes 401 and that an arbitrary `Origin` is not reflected.

Two things that decide whether a scan finds anything:

- **Scan at more than one viewport width.** Both violations that sat unfixed on `kinder-list.html` were invisible at 1280px.
- **Let the content settle first.** The pages fill from D1 after load. A scan that races the fetch measures an empty page, and an axe run that races the render reported an open search panel as clean when six of its elements were failing.

Headless Chrome has two traps worth knowing. Changing `Emulation.setDeviceMetricsOverride`, navigating, then changing it again resizes the viewport without dispatching `resize` or `ResizeObserver` at all, so resize behaviour has to be tested one override and one navigation at a time. And with no network, requests to Google Fonts and unpkg hang, so `readyState` never reaches `complete`; wait for `interactive` and carry on.
