# BADAI — WA Marketing Automation (internal)

Status: **UI + authenticated setup-status endpoint in GitHub; not live until Vercel deployment succeeds.**

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
