# DNS records: what has to survive the move to Cloudflare

The zone is at **livedns.co.il** (`park1.livedns.co.il`, `park2.livedns.co.il`) and mail is
hosted there too (`MX waldorf.co.il -> mail.waldorf.co.il`). Moving the nameservers to
Cloudflare means recreating **every** record in the zone: Cloudflare's import scan catches
most of them, but it works from public queries, so anything that does not currently resolve
will not be imported, and anything it misses fails silently until somebody notices mail
bouncing.

**Export the full zone file from livedns before touching the nameservers**, and diff it
against Cloudflare's imported zone afterwards.

The two things most easily lost:

1. **`MX waldorf.co.il -> mail.waldorf.co.il`**, plus whatever A record `mail.waldorf.co.il`
   resolves to. Moving DNS does not move the mailbox, and it does not have to: keep these
   pointing at livedns and mail keeps working exactly as it does now.
2. **The ActiveTrail authentication records below.**

## The zone as livedns shows it (2026-11-05)

Copied from the livedns zone editor by Oren on 2026-11-05, before the nameserver move:

| Host | Type | Value | TTL | On Cloudflare |
|---|---|---|---|---|
| `waldorf.co.il` | A | `62.219.78.151` | 3600 | copy, DNS only |
| `www.waldorf.co.il` | A | `62.219.78.151` | 3600 | copy, DNS only |
| `mail.waldorf.co.il` | A | `62.219.78.151` | 3600 | copy, DNS only, always |
| `teach.waldorf.co.il` | A | `45.33.80.14` | 3600 | delete (Oren, 2026-11-05: old, can go) |
| `waldorf.co.il` | MX | `0 mail.waldorf.co.il` | 3600 | copy |
| `_acme-challenge.waldorf.co.il` | TXT | Let's Encrypt token | 1800 | skip |
| `_acme-challenge.www.waldorf.co.il` | TXT | Let's Encrypt token | 1800 | skip |
| `waldorf.co.il` | NS | `park1/park2.livedns.co.il` | 14400 | replaced by Cloudflare's pair |

`teach.waldorf.co.il` points at a different server (45.33.80.14), not livedns. Port 443
accepts connections there but answered no HTTP request on 2026-11-05. Oren: old, can go.

The nameservers moved to `karina.ns.cloudflare.com` and `terin.ns.cloudflare.com` on
2026-11-05 (ISOC whois shows them the same day).

The `_acme-challenge` records are the proof livedns used to get the old site's Let's
Encrypt certificate, which covers the apex, `www` **and `mail`** and expires **2027-01-08**.
The mail server presents the same certificate (`CN=www.waldorf.co.il`) on ports 993, 465
and 587, so mail clients depend on it.
If livedns renews it through those DNS records, renewal fails once the zone is on Cloudflare.
The web side stops mattering when the new site goes live; `mail.waldorf.co.il` does not.
Check in mid-December that the certificate renewed:

    echo | openssl s_client -connect mail.waldorf.co.il:443 -servername mail.waldorf.co.il 2>/dev/null | openssl x509 -noout -enddate

## Google Search Console (2026-11-06)

`TXT waldorf.co.il "google-site-verification=lAfiJRAb-…"`, added by Cloudflare when Oren
verified the Domain property through "Domain name provider". Google re-checks it; deleting
it removes the Search Console access. Keep it when adding the SPF record (B6.iii): both are
TXT records on the apex, which is allowed, but there must be only one `v=spf1` among them.

## ActiveTrail records

Supplied by Oren on 2026-08-24, as ActiveTrail specifies them:

| Type | Name (host) | Value |
|---|---|---|
| CNAME | `at.waldorf.co.il` | `at.activetrail.com` |
| CNAME | `at._domainkey.waldorf.co.il` | `key1.activetrail.com` |
| CNAME | `at2._domainkey.waldorf.co.il` | `key2.activetrail.com` |
| TXT | `_dmarc.waldorf.co.il` | `v=DMARC1; p=none` |

What each one does:

- `at.waldorf.co.il` is ActiveTrail's **return-path / bounce subdomain**. ActiveTrail labels
  it "SPF Record", which is a little misleading: it is a CNAME delegation, not an SPF TXT
  record. The actual `v=spf1` string lives on `at.activetrail.com` and is inherited through
  the CNAME. **Do not "correct" this into a TXT record**, and do not expect to see an SPF
  string when querying it directly.
- The two `_domainkey` CNAMEs are **DKIM**, delegating the signing keys to ActiveTrail so
  they can rotate them without touching this zone.
- `_dmarc` at `p=none` is **monitoring only**: it asks receivers to report, and instructs
  them to do nothing when a message fails. Worth tightening to `quarantine` once the SPF and
  DKIM records above are actually in place and reports come back clean.

## Status: published 2026-11-07

Added on Cloudflare on 2026-11-07 (DNS only); Google's public resolver returns all four,
and the DKIM chain ends in ActiveTrail's `v=DKIM1` key. The section below is the earlier state.

## Earlier status: not published (verified 2026-08-24)

None of the four resolve. Checked against Google's public resolver rather than a local one,
for `CNAME`, `A` and `ANY`:

    dig @8.8.8.8 +short CNAME at.waldorf.co.il             # empty
    dig @8.8.8.8 +short CNAME at._domainkey.waldorf.co.il  # empty
    dig @8.8.8.8 +short CNAME at2._domainkey.waldorf.co.il # empty
    dig @8.8.8.8 +short TXT   _dmarc.waldorf.co.il         # empty

There is also **no SPF TXT record on the apex at all** (`dig @8.8.8.8 +short TXT
waldorf.co.il` is empty).

So these are records ActiveTrail asked for, not records already in place. That the forum
sends and receives mail today does not contradict it: ordinary mail from a desktop client
goes through livedns's own servers, which is a separate path from ActiveTrail sending on the
domain's behalf.

**What it does and does not block:**

- It does **not** block the newsletter signup. Adding a contact to a group does not send
  anything from `waldorf.co.il`, and the double opt-in confirmation goes out from
  ActiveTrail's own infrastructure.
- It **does** matter for the newsletter campaigns themselves, and for the contact-form
  notification if that is sent via ActiveTrail with a `From` on `waldorf.co.il`. Without
  DKIM and SPF alignment those land in spam folders, and the damage compounds: a domain
  that gets marked as a spam source stays marked.

Add them at livedns now (they are valid regardless of where the zone lives later), then
re-run the four `dig` commands above to confirm before sending any campaign.
