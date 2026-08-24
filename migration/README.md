# Old-site URL map

Every URL the current waldorf.co.il publishes, with the page on the new site it should
redirect to. This exists because the PRD requires a **permanent redirect for every old
URL whose path changes**, and a blanket redirect to the homepage is not that: it throws
away the search ranking each of those 431 URLs has accumulated.

`url-map.csv` is the reviewed artefact. `build-redirects.mjs` only reformats it.

## Where the list came from

The old site is WordPress and publishes a complete sitemap, so the inventory is its own
rather than a guess from crawling:

    curl -s https://www.waldorf.co.il/robots.txt                    # points at wp-sitemap.xml
    curl -s https://www.waldorf.co.il/wp-sitemap.xml                # index of five sitemaps
    curl -s https://www.waldorf.co.il/wp-sitemap-posts-page-1.xml   # 63 pages
    curl -s https://www.waldorf.co.il/wp-sitemap-posts-post-1.xml   # 331 posts
    curl -s https://www.waldorf.co.il/wp-sitemap-taxonomies-category-1.xml
    curl -s https://www.waldorf.co.il/wp-sitemap-taxonomies-program_category-1.xml
    curl -s https://www.waldorf.co.il/wp-sitemap-posts-calendar-1.xml

Titles and category assignments came from the REST API, which the site leaves open:

    curl -s 'https://www.waldorf.co.il/wp-json/wp/v2/posts?per_page=100&page=N&_fields=id,slug,link,date,title,categories'
    curl -s 'https://www.waldorf.co.il/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link,title,parent'
    curl -s 'https://www.waldorf.co.il/wp-json/wp/v2/categories?per_page=100&_fields=id,slug,link,name,count'

**All 427 sitemap URLs are covered**, plus four category pages that resolve but are
absent from the sitemap because they hold no posts. Re-run the checks above before
launch: the forum keeps publishing, so the post count will have moved.

## Columns

| column | meaning |
|---|---|
| `old_path` | path on the old site, decoded for reading. The redirect file re-encodes it. |
| `type` | `page`, `post`, `category`, `calendar` |
| `title` | the old page's title, so the mapping can be reviewed without opening 431 tabs |
| `new_path` | target on the new site |
| `status` | see below |
| `note` | for posts, the publication date and the old categories |

### `status`

- **`mapped`** (72). The old URL has a real counterpart and the redirect is a like-for-like
  replacement. All 63 structural pages and the subject categories are here.
- **`mapped-section`** (352). The redirect points at the right *section*, but the old page's
  own content does not exist on the new site. Correct as a redirect and honest about what
  it is: someone following an old link to one of the 331 articles lands on the page that
  covers its subject, not on that article.
- **`review`** (7). Needs an answer before launch. Listed below.

## The seven that need a decision

| old URL | proposed | question |
|---|---|---|
| `/db/` | `/school-list.html` | What is this page? The name suggests an old database view. |
| `/calendar/1789/` | `/events.html` | The only URL of its post type. Worth keeping at all? |
| `/category/bells/` ("פעמונים") | `/content-library.html` | One post. What was this category for? |
| `/category/uncategorized/` | `/news.html` | Two posts landed here by accident. |
| 3 posts in those two categories | as above | Same question as their category. |

## The larger question this table raises

169 of the 431 URLs point at `/news.html` and 52 at `/curriculum-capstone.html`, because
the old site's two biggest categories are מודעות ופרסומים (155 posts) and עבודות גמר
(51 posts), and **the new site has no per-article page**. The redirects are correct either
way, but the forum should decide whether those 206 articles are migrated as content into
D1 (in which case many of these rows get a more specific target) or retired. That decision
belongs with the content-library and news scope, not with this file.

## Generating the redirects

    node migration/build-redirects.mjs           # preview
    node migration/build-redirects.mjs --write   # writes public/_redirects

861 rules from 431 URLs: each path is emitted with and without its trailing slash, because
WordPress serves them with one and inbound links in the wild often drop it. Cloudflare
Pages allows 2,100 static rules, so there is room.

Two things the file deliberately does not cover:

1. **`www.waldorf.co.il` to the apex.** Host canonicalisation is a Redirect Rule on the
   zone in the Cloudflare dashboard, not a Pages `_redirects` entry.
2. **`/wp-admin/`, `/wp-content/`, `/wp-json/`, `/feed/`.** WordPress internals with no
   counterpart. Let them 404 rather than sending people somewhere misleading. Note that
   `/wp-content/uploads/...` covers every PDF and image the old site ever linked; if the
   forum wants those to keep resolving, they need to be copied to R2 and mapped
   separately, which is its own task.

## Before this ships

`new_path` currently holds the **mockup's filenames** (`/home.html`, `/school-list.html`),
because that is what exists today. If the production build moves to clean routes
(`/`, `/schools`), this column needs one pass to match, and the `_redirects` file has to be
regenerated. Doing it now would be guessing at routes nobody has settled.
