# Page loading performance

Implemented on `feat/page-loading-performance` (2026-09-06).

## Data access

`20260906111737_page_loading_rpcs.sql` is applied to the Readiary Supabase project
(`piqlggyuhhicnjywombg`). The migration version matches the live migration history.
`20260906112509_rpc_quote_whitespace.sql` is also applied, preserving JavaScript
Unicode whitespace semantics in quote counts and previews.
Deploy the application after this migration. All nine RPCs are read-only,
`security invoker`, have an empty search path, and permit execution only for
`authenticated` (not `PUBLIC`/`anon`). Existing RLS and write APIs are unchanged.

| Area | Previous application queries | Current application queries |
| --- | --- | --- |
| Dashboard core | Books, unused today entry, weekly entries, unused all-date streak, latest book, profile name, 50 recent entries, plus one request per missing book text | One `get_dashboard_core` RPC; six recent entries, seven activity flags, weekly count, reading books and their latest texts |
| Recall | Earliest date, anniversary candidates or count/offset fallback, then book lookup | One `get_recall_entry` RPC, one selected entry |
| Social feed | Two friendship lists, friend books, entries with all like/comment identifiers, profiles | One paginated `get_social_feed` RPC, counts and current-user like status |
| Reading stats | Books then source entries; susceptible to the API row cap | One `get_reading_stats` RPC, four counts, no source rows |
| Book shelf | Books and all entry dates for stats | One `get_books_page` RPC, books and per-book summaries |
| Monthly recap | All previous-month entries | One `get_monthly_recap` RPC only on the first day of the month |
| Profile retrospect | All books and all entries, aggregate in JavaScript | One `get_profile_retrospect` RPC, six months with bounded book/quote previews and finished-book counts |
| Featured bookmark | Book plus all quoted entries | One `get_featured_bookmark` RPC, quote count and at most three quotes |

`get_book_reading_stats` is also used by the profile and by `get_books_page` inside
Postgres. Dashboard data access is four RPCs normally, five on the first of the
month, excluding authentication and the separate client notification badge. Core
content waits for only the core RPC; auxiliary results stream independently.

The four new indexes support user-book lookup, latest entries per book, entry
date ranges, and received friendship lookup. Full aggregates still do DB work
proportional to the relevant dataset; RPC reduces round trips and transfer, not
the fundamental cost of counting records. Visible book lists remain complete.

## Authentication and proxy

Read-only server components/helpers use `getServerUser`, memoized with React
`cache()` for one render request. There is no cross-request user/session cache.
Mutation handlers keep fresh authentication checks.

Proxy keeps `getUser()` on every request so session revocation/deletion is checked
with Auth. Only positive profile existence is cached in the server process:

- Key: the verified user ID; TTL: 60 seconds; maximum: 1,000 entries.
- No browser cookie or editable user metadata is trusted.
- Onboarding bypasses the cache. Missing profiles and errors are never cached.
- DB failure returns a non-cacheable 503 rather than a false onboarding redirect.
- Refreshed authentication cookies survive redirects and failure responses.
- A profile deletion alone may take up to 60 seconds to affect routing on a warm
  instance. The cached bit grants no data/write permissions; Auth and RLS remain
  authoritative. A cold or different instance simply reads the DB again.

A distributed cache or new signing secret is not needed. `getClaims()` was not
substituted for the proxy Auth check, preserving server-side revocation behavior.

## Rendering

The dashboard starts independent RPCs together and uses Suspense for recall,
recap, feed, and stats. The source data needed to select a book/write a note is
available before these optional widgets. Optional sections can change the page
height when they resolve; a monthly recap appears only when applicable.

Root layout no longer waits for an unread notification count. The badge resolves
after hydration and reads at most one unread row; its existing focus/read-event
refresh behavior remains. The badge may appear after the initial paint.

The whole-page opacity animation is removed, so rendered content does not remain
invisible until framer-motion hydrates. Page skeletons support reduced motion.
Failed core loads expose a retry boundary; failed infinite-feed loads retain the
current page and offer explicit retry instead of staying in a loading state.

## Verification and release

- `npm test`: 606 tests passed, including proxy auth/cookie/cache regression tests.
- `npx tsc --noEmit` and `npm run build` passed.
- `npm run lint`: no errors; existing hook dependency warnings in comment components.
- Local PostgreSQL contract: run `node supabase/tests/run-performance-contract.mjs`
  with `@electric-sql/pglite` available, or set `PGLITE_MODULE` to its module path.
  It uses an isolated database, no remote credentials or persisted fixtures.
- SQL contract checks more than 1,000 entries, inclusive page counts, Sunday-based
  weeks, ISO timestamps, deterministic recall parity with the JS seed, pagination,
  aggregate bounds, Unicode whitespace parity, owner/friend/stranger isolation, and anonymous execution denial.
- Live Supabase readback verified all nine functions as invoker-only with correct
  grants and all four indexes present.
- Local browser fixture: composer and weekly activity were visible while recall
  was artificially delayed by eight seconds; the card then rendered. Dashboard
  skeleton checked at desktop and 390px mobile width. Test route was removed.

Application deployment and real authenticated end-to-end before/after latency
measurement are separate release steps; no production speedup percentage is
claimed. Compare cold login and warm tab transitions in a production build using
the same account, region, network and dataset (TTFB, first usable composer, and
complete rendering), and separately measure Auth/proxy, RPC, and browser timings.

Rollback: deploy the previous application first. The additive RPCs/indexes can
remain without changing old application behavior; do not remove RPCs while this
application revision still uses them.
