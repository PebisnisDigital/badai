# PESONAFLIX Commerce — BADAI Admin

PESONAFLIX is a **done-for-you website service**, not a BADAI learning product. Customers who pay are offered a project brief and a production status page; they are never provisioned as BADAI members.

## Owner / developer rollout checklist

1. Review and apply `supabase/migrations/20261030122412_pesonaflix_commerce.sql` to the BADAI Supabase project. The migration adds six isolated tables; it does not alter `registrations`, membership credentials, or BADAI prices.
2. Deploy `pesonaflix-admin`, `pesonaflix-public`, and `pesonaflix-webhook` as Supabase Edge Functions with `verify_jwt = false`. Each function performs its own authorization: the admin API checks the logged-in BADAI staff session; the public API gates order tokens and paid briefs; the webhook verifies the provider's HMAC signature.
3. Keep `PESONAFLIX_PAYMENTS_ENABLED=false` or unset on the public function. Set `PESONAFLIX_ADMIN_ORIGINS` and `PESONAFLIX_PUBLIC_ORIGINS` to comma-delimited exact application origins when using preview deployments. Never expose the service-role key or BuatQris credentials in any Vite env variable.
4. Deploy the related PESONAFLIX frontend branch to a preview environment. Check `/checkout`, `/pesanan?token=...`, `/studio?order=...`, and existing demos/editor. Set the frontend's `VITE_PESONAFLIX_API_URL` only if the Edge Function URL differs from the code default.
5. Log in to BADAI Admin → Marketing → PESONAFLIX to configure the actual price, optional promo price, quota, commission snapshot, and `Buka Pemesanan`. Initially leave it OFF.
6. Use BuatQris **sandbox** to prove invoice creation, valid and invalid webhook signatures, paid-only brief access, idempotent webhook retry, and import into an authorized Studio session. Also exercise failed/expired payment and manual customer support recovery.
7. Only after a reviewed end-to-end paid test, set `PESONAFLIX_PAYMENTS_ENABLED=true` and then switch on `Buka Pemesanan`. Recheck the offer from a public browser and monitor the first invoices.

## Status & operational notes

- Buyer flow: `PESONAFLIX /checkout` → QRIS payment → `/pesanan?token=UUID` → text brief → team processes the order. The browser retains the most recent order link and the buyer can copy it. Lost links require staff verification; do not search by customer name alone.
- Team flow: BADAI Admin → Marketing → PESONAFLIX → orders and jobs. The paid order has a Studio import link; Studio still requires existing team access. Imported drafts remain in that browser's IndexedDB, so the team must save/publish using the established Studio workflow.
- The buyer's submitted text brief is stored centrally; **portrait and portfolio photo collection is via WhatsApp with the team in this release**. Private photo storage and a fully automated file handoff are future work.
- The commission percentage is snapshotted per order but **this release does not calculate affiliate attribution validity or distribute commissions**. Do not promise automatic payouts.
- Order quota checks are currently non-atomic; do not advertise strict guaranteed limited slots until a transaction-safe reservation RPC is added.
- The existing membership checkout and member activation functions must never be reused for PESONAFLIX orders.

## Verification run on 2026-10-30

- PESONAFLIX: `npm run verify` (11 frontend tests, TypeScript, Vite build).
- BADAI: `node --test tests/pesonaflix-public.cjs tests/pesonaflix-schema.cjs tests/pesonaflix-webhook.cjs tests/admin-render.cjs`.
- Existing broad BADAI Playwright suite could not complete reliably in this environment; this does **not** constitute production payment certification.
