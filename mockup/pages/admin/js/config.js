/* Where the admin finds the public site.
 *
 * The admin has an origin of its own (admin-site/), so a link to a site page,
 * or the about editor's read of forum.html, needs the site's full address. On
 * localhost both are served together for testing, and the site is one level up.
 * Changes at cutover: see agent-docs/launch-cutover.md. Loaded by the dashboard
 * and by the triage pages (sorting.js).
 */
window.WAdminConfig = {
  site: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '..' : 'https://orenknaan.github.io/waldorf.co.il'
};
