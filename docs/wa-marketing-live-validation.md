# WA Marketing live delivery — validation record

This implementation separates provider acceptance from confirmed recipient delivery.
It does not activate existing drafts or simulated delivery plans.

## Verified provider contracts

Official documentation retrieved on 14 October 2026:

| Destination | Method and URL | Body | Acceptance evidence |
| --- | --- | --- | --- |
| Group | `POST https://api-zawa.azickri.com/message` | `{group: "...@g.us", type: "text", text: "..."}` | `messageId` |
| Owned Channel | `POST https://api-zawa.azickri.com/message` | `{newsletter: "...@newsletter", type: "text", text: "..."}` | `messageId` |
| Story | `POST https://api-zawa.azickri.com/status` | `{type: "text", text: "..."}` | `statusId` |

All use `id`, `session-id`, and `Content-Type: application/json`. Session readiness
is only the documented `isConnected === true` from `GET /session`. Catalogs use
`GET /group` and `GET /channel`, with `docs[]`; Channel sending requires `isOwner`.
There are no guessed routes, payload fields, delivery-status APIs, or webhooks.

Sources:

- <https://zawa.azickri.com/api/send/send-message.md>
- <https://zawa.azickri.com/api/send/send-status.md>
- <https://zawa.azickri.com/api/session/get-session.md>
- <https://zawa.azickri.com/api/group/get-group.md>
- <https://zawa.azickri.com/api/channel/get-channel.md>
- <https://zawa.azickri.com/guide/concepts.md>
- <https://zawa.azickri.com/api/webhook/index.md>

The current engine has no delivery-receipt webhook. `messageId` means acceptance
by WhatsApp's server, not verified arrival at the destination. Successful delivery
therefore needs recipient observation recorded by an active Owner/Super Admin.

## Implementation and controls

- Additive `wa_marketing_live_*` tables preserve legacy drafts, plans, and dispatch
  history. New sending, testing, and scheduler gates default to false.
- `badai-wa-send` introspects the real bearer through Supabase Auth and requires
  an active Owner/Super Admin role. Secure Zawa credentials stay server-side.
- The bootstrap test has a separate button and an explicit backend destination
  allowlist. Ordinary sending is gated per destination/message type and session
  fingerprint, based on a test with actual recipient-confirmation evidence.
- Group text is required before testing other destinations or media. Each kind
  needs a text verification before its media can be tested. Story does not accept
  PDF documents. Videos require measured duration metadata.
- Editing the compose form locks sending until saved. Confirmation shows saved
  text and selected recipients. Request keys and snapshot uniqueness deduplicate
  repeated requests. Saving a draft never creates a live run.
- A global database claim and durable dispatch marker permit at most one worker
  attempt. A lost response, ambiguous success, server error or expired dispatch
  becomes `unknown`, pauses the run, and is never retried automatically.
- States distinguish queued, preparation, dispatch in progress, `api_accepted`,
  `delivered` with recipient evidence, failed, unknown, and cancelled.
- Server-side jobs snapshot content/recipients and sample bounded gaps. A global
  gap is enforced after completion. Slow provider responses and worker polling can
  extend actual elapsed time; the chosen maximum is not a delivery-time promise.
- Pause blocks future dispatch authorization. An already authorized provider POST
  can still complete. Draft/target edits invalidate pending snapshots.
- Media remains private in `wa-marketing-media`. Temporary signed URLs are sent
  to the provider only; they are not stored in delivery history or logged.

## Worker security

Supabase's managed `pg_net` HTTP queue/response tables were found to grant PUBLIC
access. The managed `postgres` role cannot change their ownership or RLS. Do not
put a reusable worker credential, provider credential, or account-data response
in those tables. The one diagnostic session-response row was removed, polling
was stopped during remediation, and the worker signing key was rotated.

The worker now uses a 30-second HMAC proof bound to timestamp and nonce, backed by
an atomic one-use database token. The master signing key exists only in Vault and
the Edge environment. A copied proof can wake the worker only once and cannot
enqueue jobs, change recipients, record delivery evidence, or call owner actions.
Cron responses contain only a processing boolean, without delivery or account
data. Replay and expiration are tested.

## Validation completed

- 58 local tests pass: PostgreSQL transactions/concurrent workers, backend auth,
  provider contracts, ambiguous outcomes, frontend gating, sync/QR contracts, and
  worker proof verification/replay. These are not real WhatsApp delivery tests.
- Deno type checks pass for all three Edge Functions. Netlify asset build passes.
- The live Zawa session returned HTTP 200 with `isConnected: true`; no session
  credentials were printed or copied into repository files.
- Live schema, constraints, RLS and existing Edge Function source were audited.
  Existing `badai-wa-send` unconditionally disabled every send.
- Live migrations and the Edge candidate are installed with ordinary sending and
  scheduler disabled. The prepared trial is only the user-approved `#22 IMAGO`.
- A Vercel preview was built. It requires the project's native Vercel SSO before
  Admin login; anonymous HTTP redirects are not application-readiness evidence.
- Live worker authorization was exercised with two concurrent HTTP calls using
  the same operation proof: one returned 200 (`processed:false`, empty queue),
  the replay returned 403. No provider message was sent by this check. The public
  REST API also rejects the `net` schema with HTTP 406 (`PGRST106`).
- The first Admin trial returned `wa_operation_failed` (HTTP 503) after about
  ten seconds. Live jobs and runs were both empty: no provider send was attempted.
  Enqueue was separately exercised inside a rolled-back live transaction. The
  timing points to the former ten-second session preflight limit, rather than a
  successful or ambiguous message submission. Preflight now allows thirty seconds
  and distinguishes transport, invalid-response, and database failures safely.
- A one-use authenticated worker health check exercised the Edge-to-Zawa session
  read after this update: HTTP 200, connected true, about 2.7 seconds. It cannot
  claim/enqueue jobs or submit a message. Actual Admin retry and receipt remain
  required. Database diagnostic logs include only fixed routes/status/SQLSTATE,
  never raw messages, payloads, queries, credentials, or signed URLs.
- The subsequent Admin trial created job `29beeca0-687c-446b-8cc2-eb21b03193a2`
  with exactly one provider attempt. Zawa returned HTTP 200 and message ID
  `3EB0E897951283E065BEEC`; API acceptance was recorded at
  `2026-10-14 06:40:54.725291 UTC` (13:40:54 WIB). Its status is `api_accepted`,
  until recipient evidence is recorded.
- The user subsequently confirmed in chat: “sip berhasil terkirim ke grup nya”.
  This confirms reception of the approved Admin trial in `#22 IMAGO`. The job
  was marked `delivered` with that exact evidence and one attempt. The timestamp
  `2026-10-14 06:43:29.399348 UTC` records confirmation; the exact WhatsApp arrival
  time was not supplied. Group/text ordinary sending is now enabled for this
  session. Old drafts remain inactive.
- The Admin image trial `BADAI-MEDIA-32955A8A` returned HTTP 200 with Zawa ID
  `3EB0F5F5EA1857385B59A2`. The user confirmed the image arrived in `#22 IMAGO`;
  job `5f0fcb45-3423-42ec-92bc-6daa73114ac8` is delivered, with one attempt.
- The explicitly approved Channel trial `BADAI-CHANNEL-EEA998E0` returned HTTP 200
  with ID `3EB0C693FD9FCC0F250C16`. The user confirmed reception in
  `Pebisnis.Digital`; job `acca0bdf-629a-4a7e-93d0-5e0d6deff86d` is delivered.
  This trial used the authenticated backend queue after explicit chat approval,
  rather than another browser send. Ordinary Channel/text sending is now gated
  by this recorded evidence. Both receipt timestamps record chat confirmation.
- Story trial `BADAI-STORY-6A7407A1` returned HTTP 504, with no status ID.
  Job `480d0cf3-6e63-49bf-a20f-e016fb70dc3a` remains unknown, with one attempt and
  a paused run. The user reports the Story is not visible. It is not retried;
  Story has no verification proof and remains locked for ordinary sending.
  The documented payload/header contract was followed. A 504 does not establish
  the cause or prove non-delivery; no guessed route, session reset, or privacy
  change was attempted.
  The user confirms the sender uses "Kontak saya" and requires Story proof before
  Production. The official Status documentation says this audience depends on
  synchronized contacts. There is no documented contact-sync/delivery diagnostic
  API. A test with "Hanya bagikan dengan..." and one selected mutual contact was
  proposed; it requires the user to change phone privacy and explicitly authorize
  a new test. This is a diagnostic step, not a proven explanation of HTTP 504.
  The handler now preserves only allowlisted error codes for the documented
  contacts/audience/240-second errors and gateway timeouts. All 5xx outcomes remain
  unknown, with no automatic retry. The historical 504 record is not rewritten.
  The user then confirmed the one-contact privacy change and authorized one new
  Story. Trial `BADAI-STORY-EBD7E8CF`, job `8c768580-6cd5-4055-b437-9455b620a231`,
  also returned HTTP 504 after about 60.1 seconds, with one attempt, no status ID,
  and a paused run. The original trial took about 60.3 seconds. The current
  65-second BADAI timeout did not expire before these HTTP responses arrived.
  This locates the observed timeout on the HTTP path to Zawa but does not identify
  the gateway or engine cause. See [provider diagnostic record](zawa-story-provider-diagnostics.md).
  A read-only Edge session check after this trial returned HTTP 200, connected
  true, in about 2.5 seconds. No additional Story or session reset is authorized
  automatically. The user subsequently confirmed Story is still not visible.
  A one-use authenticated operator probe sent the documented invalid empty-text
  payload to `/status`: HTTP 400 with the expected validation message, in about
  three seconds. It uses no caller-controlled text, exposes no provider data,
  and cannot record delivery proof or dispatch queue jobs. This verifies the
  validation response, not Story publication. Provider engine/gateway logs are
  required to diagnose the timeout; no further publishing request was made.
  Both stopped Story test runs were then explicitly cancelled by the operator
  after the user confirmed Story remains unseen. The jobs remain unknown, with
  one attempt and HTTP 504; they are not relabelled failed or delivered. This
  removes resume controls on the existing preview while preserving all evidence
  and allowing a later genuine recipient confirmation.
- Scheduler activation is available only for verified destination/message types.
  A new group/text schedule trial is prepared; no legacy campaign was activated.
  Local UI checks cover pause/resume confirmation and recovery of the control
  after an HTTP failure. Actual scheduled dispatch remains under validation.
  The user's first "sudah pause" reply was checked against live data: there was
  no run for the schedule trial, so it was not counted as a successful pause test.
  The operator then atomically created its new scheduled run and paused it before
  any claim could occur. Job `e3a2cf76-f098-4e8b-bc7b-0b763b35cc7f` remained queued
  with zero attempts at `06:58:11 UTC`, more than 30 seconds after its `06:57:32 UTC`
  due time. Its sampled gap is 50 seconds. Actual Admin resume and reception are
  checked separately; no old campaign was activated by this test.
  The job was then resumed from Admin and dispatched by the cron worker at
  `07:01:44 UTC`, returning HTTP 200 and ID `3EB0009CC6D22BD887BC19` at `07:01:51 UTC`.
  It has one attempt and a finished run; recipient observation remains pending.
  The user later reported the scheduled message is not visible in `#22 IMAGO`.
  Its job remains `api_accepted`, without fabricated delivery evidence, and it
  is not retried. Backend pause/resume/dispatch is tested; actual scheduled
  recipient delivery is not proven.
  A subsequent resume error was investigated: this schedule run was already
  finished, while the original Story run still had an unknown outcome. UI now
  disables resume on an unknown run and labels each result with its campaign;
  the server's review guard remains in place.
- Publishing the latest preview UI was rejected by Vercel with HTTP 402,
  `payment_required`, quota `api-deployments-free-per-day` (more than 100; retry
  after 24 hours). Existing deployments remain available. The last READY Git
  preview uses commit `ea25573`; it does not contain the latest unknown-run UI
  lock. That fix is committed and locally tested. No new UI deployment or
  Production publication is claimed. Production is still held for Story proof
  as explicitly requested by the user.
  Later, native Git deployments were found to be working despite the earlier
  direct API quota rejection. Commit `840a36e` is READY as preview
  `https://badai-ff4u94ld5-cuanify25-2175s-projects.vercel.app` (deployment
  `dpl_E5VA9ogb456skCZYwcsagYzYGcME`). Its origin was added alongside the original
  trial origin; CORS preflight returned HTTP 204 with the exact approved origin.
  Anonymous Admin requests still redirect to Vercel SSO, not an authenticated
  application readiness result. Production remains unchanged.
  The user reported the post-pairing test button stayed disabled. Live checks
  confirmed connected=true, testing enabled, one selected enabled/approved group,
  and a text/draft campaign, with no new dispatch. The preview now displays the
  actual frontend reason (selection, unsaved changes, auth/capability failure,
  pending check, or prerequisite test) and provides an explicit read-only
  readiness refresh. Errors are not silently hidden; an older asynchronous check
  cannot overwrite a newer one. UI verification covers failed readiness and
  recovery, leaving ordinary sending locked without current delivery evidence.
  The user has been asked for the displayed reason and actual receipt result;
  no specific browser-state cause or successful post-pairing send is assumed.

## Prepared documented session reset

The user supplied <https://zawa.azickri.com/guide/errors.html>. Both its HTML and
Markdown were retrieved again; it documents reset/re-pairing or a selected Status
audience for `contacts not synced`. That message has not been observed: our two
requests returned HTTP 504. Narrowing the audience did not resolve it. Reset is
a proposed diagnostic/remediation step, not an established fix for HTTP 504.

<https://zawa.azickri.com/api/session/reset-session.md> documents `PUT /session`,
headers `id` and `session-id`, with no body. It disconnects the linked device,
clears stored keys/contacts, and creates a new QR. Provider credentials stay the
same. Therefore a private `session_epoch` column and fingerprint generation are
implemented so old link tests cannot unlock a reset/re-paired link. Existing null
epochs preserve current fingerprints; prior evidence is never deleted.

The migration and Edge change are installed without rotating the epoch or
resetting the provider. The new fingerprint test passes. The operator procedure
in `supabase/operations/reset-zawa-session.mjs` was exercised with
`--verify-guards`: its actual database preparation transaction rolled back and
no provider reset occurred. Default `--check` is read-only. Reset requires the
explicit `--reset-approved` mode and an exclusive private attempt-state file
to prevent repeating an ambiguous reset. It rejects queued/in-flight messages,
freezes all sending gates, rotates the epoch, calls the documented PUT once,
and leaves gates disabled until pairing and new real delivery tests. Credential
values remain in trusted operator memory and are not printed or saved.

The user explicitly approved one reset and readiness to scan QR. The operator
ran it once at about `14:43 WIB` on 14 October 2026: documented PUT returned HTTP
200 and the expected session ID. All sending gates were disabled first; the
pairing epoch rotated, while credentials and previous receipt records were
preserved. The exclusive attempt file records `reset_accepted` without secrets.
A read-only check showed disconnected with QR ready. The user then scanned the
QR and reported TERHUBUNG; a read-only backend check confirmed HTTP 200, connected
true, no pending QR, and the new pairing generation. Only testing is now enabled.
Ordinary sending and scheduler remain off. Fresh Group/Story trial drafts are
prepared; no message from an old campaign was activated. A real Group/text test
from Admin must be received before Story can be tested on this generation.
Reset does not establish that Story was fixed. QRIS/member code is unchanged.

## Remaining acceptance work

Real group/text, group/image, and Channel/text reception are confirmed, with the
provider IDs and user evidence recorded above. Video/PDF and Channel media remain
locked because they have not been tested with actual reception evidence.

Story's current privacy audience is explicitly authorized, but its trial is
blocked by the provider's HTTP 504 and missing receipt evidence. A real scheduled delivery is still
required before claiming scheduler delivery works; no existing campaign is migrated
into an active run. Final production frontend publication follows
the relevant successful real tests and verification of the active website.

## Reproduce local checks

Use Node.js 24+, Docker, npm, and Deno. The application itself retains its existing
Node.js >=20 runtime requirement. Start an isolated test database with no host
port and no production credentials:

```sh
docker --host=unix:///var/run/docker.sock run -d --name badai-wa-test-db \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
npm install --package-lock=false
npm run test:wa
npm exec --package=deno -- deno check supabase/functions/badai-wa-send/index.ts \
  supabase/functions/badai-zawa-connect/index.ts supabase/functions/badai-zawa-sync/index.ts
```

The SQL test runner creates and drops its own unique database. It does not reset
the container's other databases. Select a different container with
`WA_TEST_DB_CONTAINER` if needed. Do not apply the fixture schema to production.

For a new deployment, audit the live schema, apply the migrations in order, deploy
the three checked-in functions, configure the same generated private signing key
in Edge `WA_MARKETING_WORKER_SECRET` and Vault `badai_wa_worker_secret`, and register
`supabase/operations/wa-worker-cron.sql`. Preserve the existing session and all
unrelated functions/secrets. Keep gates closed until the corresponding tests pass.
