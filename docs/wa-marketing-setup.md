# BADAI — WA Marketing Automation (internal)

The sections below are historical deployment notes. Current dispatch implementation,
verified provider contracts, security controls, test evidence and outstanding real
delivery checks are recorded in [wa-marketing-live-validation.md](wa-marketing-live-validation.md).

## Scope
Internal marketing only; **NOT SaaS**. Planned destinations:
- WhatsApp Channel BADAI
- BADAI-owned WhatsApp groups
- WhatsApp Status/Story from a marketing number

Destination of promotions: existing BADAI landing page and checkout. Do not automate bulk messaging before a successful opt-in/compliance and connection test.

## What is built
- `/admin` includes a new WA Marketing tab (owner, super_admin, admin, marketing roles), without replacing existing Marketing.
- Internal tabs: Koneksi, Channel, Grup, Status WA, Kalender, Kampanye, Laporan.
- `GET /api/wa-marketing` is routed to the **existing** `api/admin-v5.js` function, with backend auth verification against Supabase Auth + `admin_team_members`. No public device credential exposure.
- `lib/admin-v6.js` and `lib/wa-marketing.js` are supporting modules, **not** new Vercel functions.
- Existing checkout/member code remains untouched.
- All delivery and scheduling features are disabled intentionally until Zawa API session QR/status endpoints are verified.

## Vercel constraint
BADAI project on the Hobby plan can use at most 12 Serverless Functions. Creating extra files under `/api` caused `exceeded_serverless_functions_per_deployment`; fixed by moving new code into `/lib` and sharing `api/admin-v5.js` for the WA status API. Current repo uses the same 12 API function files as before.
Deployment may be blocked by a separate daily deployment quota, `api-deployments-free-per-day`. If this happens, wait for quota availability or use plan/billing options in Vercel; do not create more /api functions.

## Setup after successful deployment
1. Open https://zawa.azickri.com/ and create a dedicated BADAI session; scan QR according to Zawa's official directions.
2. In Vercel > project `badai` > Settings > Environment Variables, create server-only `ZAWA_ID` and `ZAWA_SESSION_ID` according to the session credentials returned by Zawa. Do not paste either value into chats or public source files.
3. Redeploy to apply environment variables.
4. Log in at `/admin` and open `WA Marketing`; click **PERIKSA KONEKSI**. This currently verifies credential configuration only, **not** connection health.
5. Implement/validate the actual Zawa QR/status connector, then a single controlled publishing test with a dedicated WhatsApp number and private test channel/group. Do not enable automatic scheduler yet.

## Important
Zawa is a third-party unofficial WhatsApp integration. Session breaks, message failures, privacy concerns, and WhatsApp account restrictions are possible. Do not describe `configured` as `connected`.


## Tahap 2 — Pengelolaan draft per kampanye (14 Oktober 2026)

Added:
- `wa-marketing-admin.js` (static asset; **not a Vercel Function**)
- `lib/admin-v6.js` now embeds the editor script in the existing `/admin` page
- `vercel.json` explicitly serves that asset before the single-segment landing catch-all.
- Three Supabase tables with RLS for active owner/super_admin/admin/marketing roles:
  `wa_marketing_targets`, `wa_marketing_campaigns`, `wa_marketing_campaign_targets`.

Current draft controls:
- Manually register managed WhatsApp group/channel **name + external ID**; enable/disable or remove it.
- Create/edit/delete draft campaigns; store text and tentative schedule in **WIB**.
- Select campaign-specific target subset.
- Set default delay (30–3600 seconds) and optional target-specific override (30–3600 seconds).
- Set planned jitter (0–120 seconds); preview earliest–latest intervals without sending.
- Store state only as `draft` or `paused` at the DB layer.
- No automatic target discovery; the public Zawa docs reviewed did not document a list groups / list channels endpoint. Do not claim automatic detection until an endpoint is verified.
- No message delivery, no scheduler, no direct WhatsApp connection sync. No new serverless functions.

The Supabase migration `wa_marketing_campaign_targets_and_delays` was applied successfully. All three tables have RLS and four per-operation policies each; anonymous grants are absent.

**Deployment caveat:** The last production deployment check was blocked by Vercel daily deployment quota; GitHub commits are not proof that the live admin contains the new UI. Once Vercel allows a new deployment, confirm it is READY and smoke-test admin after login.

Before enabling delivery:
1. Verify session connection and reachable destination IDs using Zawa's actual supported endpoints.
2. Authorize only BADAI-controlled Channel/groups, with permission to publish.
3. Add bounded rate limits, idempotent queue jobs, retry policy, pause, logs, and failure alerts.
4. Enable only after one private test group + one test Channel + Story have succeeded.


## Tahap 3 — Antrean simulasi dan dukungan Story (14 Oktober 2026)

Deployed production commit: `a63d88503e4d2c172cfef233b5195c68fefb0781`. Vercel confirmed production deployment `dpl_6Az7vBopZKNk4LJxdibMzrj8HrAX` READY. Visit `https://badai.vercel.app/admin`, log in, select WA Marketing.

- Separate **Status WA** target seeded once, disabled by default; enable only if needed for a draft campaign.
- A new RLS-protected `wa_marketing_delivery_plan` table stores simulated queue plans. It cannot send messages.
- `wa_marketing_build_plan(uuid)` checks the marketing role, campaign text, future scheduled time, enabled targets, then calculates planned times with per-campaign delay, optional destination override, and bounded jitter.
- `wa_marketing_cancel_plan(uuid)` marks planned rows cancelled.
- Updating drafts, selected destinations, or enabled flags invalidates stale planned snapshots.
- Calendar tab shows planned times in WIB and allows build/cancel (dry run). Reports tab shows planning counts only, **not sent/delivered metrics**.
- Both RPCs use `SECURITY INVOKER`; data tables have RLS and no anonymous table grants.

**Important unresolved dependency:** The accessible Zawa docs document session creation, message/status sending headings, but do not clearly expose an endpoint to list all WhatsApp groups/Channels, nor a complete verified QR status flow. Do not build or claim auto detection without provider verification. In the meantime the admin supports manual group/channel ID entry and a separate Story planning target.

**Do not enable live publishing** until a dedicated number is connected, the actual provider endpoint/body is confirmed using a single test destination, and an idempotent worker with a global rate limiter, audit logs, pause, and fail-safe uncertain delivery handling is built and tested. No background worker exists yet. Sessions not linked after four hours may be deleted by Zawa per their session documentation.


## Tahap 4 — Direct QR pairing in BADAI Admin (14 Oktober 2026)

Production release verified READY on Vercel, commit `d23afd1e88c3a4b4a98546d65122c7b35f31b97b`.
Added:
- `wa-zawa-ui.js`: Admin BADAI → WA Marketing → Koneksi WA: create-session button, secure QR image, refresh status, controlled 12-second polling while QR is waiting, explicit replace-session confirmation. Only displays provider-sourced QR, never example/fake QR.
- Supabase Edge Function `badai-zawa-connect`, `verify_jwt=true`, active: admin-authorized POST create/replace via **documented** Zawa `POST https://api-zawa.azickri.com/session`, and status read via `GET /session` with Zawa ID headers. GET QR/status response schema remains to be field-validated with a real session because the corresponding GitBook page could not be retrieved.
- Secure singleton table `wa_marketing_connection_secure`: stores `provider_id` and `session_secret`. RLS enabled; no table privileges for anon or authenticated; only service_role can read/write, Edge Function verifies active Owner/Super Admin from server-side admin_team_members. Credentials do not enter browser code, URLs, logs, or GitHub.
- Header button checks provider status; QR shown only if provider returns valid image data or raw pairing string successfully encoded locally. QR is short-lived and is intended only for WhatsApp **Linked Devices** scan.
- Live WA sending/scheduler remain disabled. Real pairing/connected status still **unverified** until the user scans a device and observes the provider response.
- First test: open https://badai.vercel.app/admin, log in as Owner, WA Marketing → Koneksi WA → Buat QR Koneksi. If QR does not appear, report the exact non-secret error shown. Do not send ID/sessionId/token/QR as screenshot to third parties.


## Tahap 5 — One-click Zawa group/channel catalog sync

- New authorized Supabase Edge Function `badai-zawa-sync` (verify_jwt enabled): `POST {kind:"group"|"channel"}`.
- Owner/Super Admin role checked server-side. Zawa session ID and session secret read from `wa_marketing_connection_secure` using a server-side service key. Browser never gets these secrets.
- Read-only Zawa API probes (GET only), currently using provider endpoint candidates as the documentation pages supplied were not machine-readable from available fetch: `/group`, `/groups`, `/group/list`, `/group/get`, `/channel`, `/channels`, `/channel/list`, `/channel/get`. **The exact correct Zawa list URL and response shape must be verified with a connected session.** The UI displays safe HTTP status diagnostics if none match. Do not say syncing is confirmed to work until counts return successfully.
- Only group/channel ID and display name are retained. No members, numbers, or messages fetched/stored. No live message publishing.
- `wa_marketing_targets` catalog is upserted by `(kind,external_id)`. New entries `enabled=false` by default; existing entries preserve `enabled` and `origin`, and manually named rows keep their names. Missing entries are **never deleted**. Current campaign selections are untouched.
- Admin tab Grup/Channel includes **SINKRONKAN DARI ZAWA**, results and diagnostics.
- After first test, if Zawa returns unexpected IDs or nested JSON, inspect sanitized response *shape* through server debugging without exposing session, member records or private messages; then update parser.
- The user supplied detail/member/message API pages, but these are not necessary for catalog sync; only list group/list channel is used at this stage.

UI deployed at https://badai.vercel.app/admin. Edge Function deploy READY; real-group sync still awaiting verified user-side test.
