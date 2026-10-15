# Channel Automation

Admin → WA Marketing → Channel now contains schedule settings, a calendar in
30-day pages, and a reusable content bank. Connection, Groups and Reports retain
their existing behavior. The target catalog is available below the editor.

## Data and authorization

- `wa_channel_settings`: one schedule per Channel, OFF by default; duration,
  start date, timezone, daily times, looping and optimistic version.
- `wa_channel_contents`: independent draft masters, caption and private image path.
- `wa_channel_calendar_slots`: content assignments by day number and send time.
- `wa_channel_delivery_logs`: immutable message/destination snapshots, cycle,
  occurrence, claim, normalized provider response and optional receipt evidence.

All four tables have RLS. Only active Owner/Super Admin accounts can read or edit
Channel automation, matching the existing live send service. Browser users cannot
write settings, slots or delivery outcomes directly; RPCs enforce validation,
version checks, confirmation and server-side authorization. Worker RPCs are
service-role only. Private definer functions use an empty search path.

The migration depends on the existing WA live connection, settings, verification
tables and helper functions (`wa_live_owner`, `wa_live_assert_owner`,
`wa_live_verified`, `wa_live_issue_worker_token`, `wa_live_consume_worker_token`).
It does not enable or modify the global sending/scheduler flags.

## Worker and provider

The `badai-wa-channel` Edge Function uses the existing stored Zawa credentials and
the documented provider adapter. Database cron invokes it every 15 seconds with
the existing HMAC worker proof, valid for 30 seconds and consumed exactly once.
The endpoint intentionally has `verify_jwt=false`: it accepts only this custom
worker authentication for POST. A read-only GET separately validates a Supabase
user bearer and active Owner/Super Admin membership before checking live
connection, Channel ownership and session-specific receipt verification.

For normal publication, before enqueue and again before dispatch the server checks the global live
flags, Channel verification for the current pairing fingerprint, target and
administrator validity, saved schedule version and slot assignment. The worker
also checks the live connection and Channel ownership before calling Zawa.
Images are downloaded with a 20 MB bound and passed via a short-lived signed URL.

The worker shares the existing global throttle and will not begin while an
existing campaign job is active. Each scheduled occurrence is unique by schedule,
local date and send time; manual sends use an independent UUID request key.
Repeated ticks and retries cannot create duplicate occurrences. Looping creates
new dated occurrences and cycle numbers; previous logs remain unchanged.

Automatic slots more than five minutes late are skipped rather than publishing
a backlog. Loop OFF stops at the end of the final day. Saving a schedule cancels
queued/preparing work from its previous version; a provider request already in
flight can finish. Removing a master detaches its slots and cancels pending work,
while retaining history and private image objects needed by old snapshots.

No provider POST is retried. A provider timeout, ambiguous response, or expired
dispatch lease becomes `unknown`. A failed result stays failed. API acceptance
is displayed as **Diterima API**, not recipient delivery. **Terkirim** requires
an administrator to confirm that the message is visible in the Channel and enter
receipt evidence in the history dialog. Raw provider responses and temporary
signed URLs are not persisted; the log retains HTTP status, message ID and a
normalized error code.

## Deployment and activation

1. Apply the checked-in `channel_automation` and `channel_verification_flow`
   migrations to the existing project.
2. Deploy `supabase/functions/badai-wa-channel/index.ts` plus `_shared` imports.
   It uses existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
   `WA_MARKETING_WORKER_SECRET` bindings. No new client secret is required.
3. Deploy the repository to the existing Vercel project `badai`.
4. Select an active Channel, create drafts and calendar slots, and save with
   Otomatis OFF. Use **Uji & verifikasi Channel** to send one selected draft with
   explicit confirmation. The server checks connection, ownership and pairing
   before this controlled test, without enabling normal publication.
5. After the message is visible in the actual Channel, confirm receipt with
   evidence in **Riwayat pengiriman**. Receipt verification applies only to that
   Channel, message type and pairing generation. API acceptance alone never
   verifies a Channel. Test text and image separately when both are used.
6. Turn Otomatis ON and save with confirmation. Once verified, this action can
   enable the existing global publication flags, provided no older campaign
   backlog exists. Turning a Channel schedule OFF cancels its pending work.
   Kirim Sekarang has a separate confirmation, and request keys survive browser
   reloads after uncertain enqueue acknowledgements.

The latest supplied screenshot is implemented as a compact light/green Channel
panel with top settings, duration chips, a progress strip, six-column calendar,
30-day range selection and an independent content bank. Other Admin sections
retain their existing theme. New schedules default to 365 days, 06:00 WIB, loop
ON, with actual automatic publication OFF until configured and confirmed.

## Verification

Requires Node 24 for native TypeScript stripping in worker tests.

```sh
npm ci
# Install Chromium once, or set CHROMIUM_PATH to a system Chromium binary.
npx playwright install chromium
npm test
npm run netlify:build
```

Tests cover complete Admin rendering and script syntax, RLS and RPC authorization,
atomic saves, optimistic concurrency, looping and idempotency, OFF cancellation,
immutable history, signed worker authorization/replay prevention, provider
readiness and ownership gates, acceptance vs delivery, timeout uncertainty and
persistence failures. Browser tests exercise image upload, formatting, bank
drafts, native drag/drop, moving/copying/detaching, day editing, 1000-day paging,
multi-time schedules and mobile overflow. All provider requests in tests are
mocked; no WhatsApp message is published by the test suite.
