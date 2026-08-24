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

## Status: not published (verified 2026-08-24)

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
