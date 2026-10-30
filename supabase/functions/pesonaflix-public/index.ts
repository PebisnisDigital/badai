// Public PESONAFLIX service API. This service never provisions BADAI members.
// Configure the function with verify_jwt=false; every privileged DB operation
// uses the server-side service role and no service key is sent to a browser.
const API_URL = Deno.env.get("SUPABASE_URL") ?? "";
const secretMap = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); }
  catch { return {}; }
})();
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? secretMap.default ?? "";
const ORIGINS = new Set(
  (Deno.env.get("PESONAFLIX_PUBLIC_ORIGINS") ??
    "https://pesonaflix.vercel.app,http://localhost:5173")
    .split(",").map((s) => s.trim()).filter(Boolean)
);
const TEMPLATES = new Set([
  "original", "chibi-3d", "anime", "clay-3d", "komik-pop", "doodle",
  "storybook", "scrapbook", "paper-cut", "pixel-retro", "miniature-world",
  "editorial-premium", "documentary", "minimalist", "futuristic-neon", "vintage-heritage"
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function respond(req: Request, data: unknown, status = 200): Response {
  const origin = req.headers.get("origin") ?? "";
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  if (origin && ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Headers", "content-type,apikey,authorization");
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function db(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", SERVICE);
  headers.set("Authorization", `Bearer ${SERVICE}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}/rest/v1/${path}`, { ...options, headers });
  const raw = await response.text();
  let data: any;
  try { data = raw ? JSON.parse(raw) : null; }
  catch { data = raw; }
  if (!response.ok) throw new Error(data?.message ?? `Database error ${response.status}`);
  return data;
}

async function invoiceConfig() {
  const data = await db("rpc/get_buatqris_server_config", { method: "POST", body: "{}" });
  const config = data?.[0];
  if (!config?.enabled || !config?.account_id || !config?.secret_token) {
    throw new Error("BuatQris belum siap");
  }
  return config;
}

async function offer() {
  const settings = (await db("pesonaflix_settings?id=eq.1&select=*"))?.[0];
  if (!settings) throw new Error("Pengaturan PESONAFLIX belum tersedia");
  const base = Number(settings.normal_price);
  const promo = Number(settings.promo_price);
  const withPromo = settings.promo_enabled === true && promo > 0 && promo <= base;
  return {
    sales_open: settings.sales_open === true && base > 0 &&
      Deno.env.get("PESONAFLIX_PAYMENTS_ENABLED") === "true",
    normal_price: base > 0 ? base : null,
    price: base > 0 ? (withPromo ? promo : base) : null,
    promo_enabled: withPromo,
    commission_percent: Number(settings.commission_percent ?? 50)
  };
}

function validOrder(data: any) {
  const fullName = String(data?.full_name ?? "").trim();
  const email = String(data?.email ?? "").trim().toLowerCase();
  const whatsapp = String(data?.whatsapp ?? "").replace(/\D/g, "");
  const templateId = String(data?.template_id ?? "");
  const requestId = String(data?.request_id ?? "");
  const referredByCode = String(data?.referred_by_code ?? "").trim().toUpperCase();
  if (fullName.length < 2 || fullName.length > 100) throw new Error("Nama harus 2–100 karakter");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email tidak valid");
  if (!/^62\d{8,13}$/.test(whatsapp)) throw new Error("Nomor WhatsApp harus format 62...");
  if (!TEMPLATES.has(templateId)) throw new Error("Gaya website tidak tersedia");
  if (!UUID.test(requestId)) throw new Error("ID permintaan tidak valid");
  if (referredByCode && !/^[A-Z0-9_-]{3,32}$/.test(referredByCode)) throw new Error("Kode referral tidak valid");
  return { fullName, email, whatsapp, templateId, requestId, referredByCode: referredByCode || null };
}

async function orderStatus(token: string) {
  if (!UUID.test(token)) return null;
  const order = (await db(`pesonaflix_orders?customer_token=eq.${encodeURIComponent(token)}&select=id,payment_status,paid_at&limit=1`))?.[0];
  if (!order) return null;
  const attempts = await db(`pesonaflix_payment_attempts?order_id=eq.${order.id}&select=status,qr_url,payment_url,amount,total_amount,expires_at&order=created_at.desc&limit=1`);
  const attempt = attempts?.[0] ?? null;
  const brief = (await db(`pesonaflix_briefs?order_id=eq.${order.id}&select=status&limit=1`))?.[0];
  const job = (await db(`pesonaflix_jobs?order_id=eq.${order.id}&select=status,preview_url,public_url&limit=1`))?.[0];
  return {
    status: order.payment_status,
    paid_at: order.paid_at,
    payment: attempt,
    brief_status: brief?.status ?? null,
    production_status: job?.status ?? null,
    preview_url: job?.preview_url ?? null,
    public_url: job?.public_url ?? null
  };
}

async function createOrder(req: Request, body: any) {
  const customer = validOrder(body);
  const existing = (await db(`pesonaflix_orders?client_request_id=eq.${customer.requestId}&select=customer_token&limit=1`))?.[0];
  if (existing) return respond(req, { success: true, token: existing.customer_token, ...(await orderStatus(existing.customer_token)), reused: true });

  const settings = (await db("pesonaflix_settings?id=eq.1&select=*"))?.[0];
  const currentOffer = await offer();
  if (!currentOffer.sales_open || !currentOffer.price || !settings) {
    return respond(req, { error: "Pemesanan PESONAFLIX belum dibuka" }, 423);
  }
  if (settings.order_quota) {
    const response = await fetch(`${API_URL}/rest/v1/pesonaflix_orders?select=id&payment_status=in.(pending,paid)`, {
      method: "HEAD",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "count=exact" }
    });
    if (!response.ok) throw new Error("Tidak dapat memeriksa kuota");
    const count = Number((response.headers.get("content-range") ?? "").split("/").pop());
    if (Number.isFinite(count) && count >= settings.order_quota) {
      return respond(req, { error: "Kuota pesanan sementara penuh" }, 423);
    }
  }

  const base = Number(settings.normal_price);
  const amount = Number(currentOffer.price);
  const created = await db("pesonaflix_orders", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      client_request_id: customer.requestId,
      full_name: customer.fullName,
      email: customer.email,
      whatsapp: customer.whatsapp,
      template_id: customer.templateId,
      referred_by_code: customer.referredByCode,
      normal_amount: base,
      discount_amount: base - amount,
      amount,
      commission_percent_snapshot: currentOffer.commission_percent
    })
  });
  const order = created?.[0];
  if (!order) throw new Error("Pesanan gagal dibuat");

  const cfg = await invoiceConfig();
  const callback = `${API_URL.replace(/\/$/, "")}/functions/v1/pesonaflix-webhook`;
  const form = new URLSearchParams({
    action: "api_create_qris",
    account_id: String(cfg.account_id),
    secret_token: String(cfg.secret_token),
    amount: String(amount),
    description: (`PESONAFLIX - ${order.id}`).slice(0, 100),
    fee_by: String(cfg.fee_by || "user"),
    callback_url: callback,
    app_name: "PESONAFLIX",
    app_version: "1.0",
    app_url: "https://pesonaflix.vercel.app"
  });
  if (cfg.qris_method && cfg.qris_method !== "default") form.set("qris_method", String(cfg.qris_method));
  if (cfg.umkm_name) form.set("qris_name", String(cfg.umkm_name));
  if (cfg.test_mode) form.set("test", "1");
  const gateway = await fetch("https://app.buatqris.site/api", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PESONAFLIX-Payment/1.0" },
    body: form.toString()
  });
  const gatewayText = await gateway.text();
  let payload: any = null;
  try { payload = JSON.parse(gatewayText); } catch { /* invalid provider response */ }
  const result = payload?.data ?? payload;
  if (!gateway.ok || payload?.success === false || !result?.transaction_id || !(result.qr_url || result.qris_image)) {
    await db(`pesonaflix_orders?id=eq.${order.id}&payment_status=eq.pending`, {
      method: "PATCH", body: JSON.stringify({ payment_status: "failed", updated_at: new Date().toISOString() })
    });
    throw new Error("Invoice QRIS belum berhasil dibuat");
  }
  const expires = result.expired_at && !Number.isNaN(Date.parse(result.expired_at))
    ? new Date(result.expired_at).toISOString()
    : new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db("pesonaflix_payment_attempts", {
    method: "POST",
    body: JSON.stringify({
      order_id: order.id,
      provider_transaction_id: String(result.transaction_id),
      amount,
      total_amount: Number(result.total_amount ?? result.amount ?? amount),
      qr_url: String(result.qr_url || result.qris_image),
      payment_url: result.payment_url ? String(result.payment_url) : null,
      expires_at: expires,
      status: "pending"
    })
  });
  return respond(req, { success: true, token: order.customer_token, ...(await orderStatus(order.customer_token)) }, 201);
}

function sanitizeBrief(raw: any) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Data formulir tidak valid");
  const fields = ["name", "role", "location", "bio", "headline", "services", "achievements", "portfolio", "instagram", "facebook", "website", "whatsapp", "preferred_slug", "notes"];
  const brief: Record<string, string> = {};
  for (const key of fields) {
    if (raw[key] === undefined || raw[key] === null) continue;
    if (typeof raw[key] !== "string" || raw[key].length > (key === "bio" || key === "portfolio" ? 4000 : 1200)) {
      throw new Error(`Data ${key} terlalu panjang atau salah format`);
    }
    brief[key] = raw[key].trim();
  }
  if (JSON.stringify(brief).length > 18000) throw new Error("Data formulir terlalu besar");
  return brief;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !ORIGINS.has(origin)) return respond(req, { error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return respond(req, { ok: true });
  if (!API_URL || !SERVICE) return respond(req, { error: "Server belum dikonfigurasi" }, 503);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "offer";
  try {
    if (req.method === "GET" && action === "offer") return respond(req, await offer());
    if (req.method === "POST" && action === "create") return await createOrder(req, await req.json());
    const token = url.searchParams.get("token") ?? "";
    if (!UUID.test(token)) return respond(req, { error: "Tautan pesanan tidak valid" }, 400);
    if (req.method === "GET" && action === "status") {
      const status = await orderStatus(token);
      return status ? respond(req, status) : respond(req, { error: "Pesanan tidak ditemukan" }, 404);
    }
    const order = (await db(`pesonaflix_orders?customer_token=eq.${encodeURIComponent(token)}&select=id,payment_status,template_id&limit=1`))?.[0];
    if (!order) return respond(req, { error: "Pesanan tidak ditemukan" }, 404);
    if (order.payment_status !== "paid") return respond(req, { error: "Formulir tersedia setelah pembayaran berhasil" }, 403);
    if (req.method === "GET" && action === "brief") {
      const row = (await db(`pesonaflix_briefs?order_id=eq.${order.id}&select=brief,status&limit=1`))?.[0];
      return respond(req, { brief: row?.brief ?? {}, status: row?.status ?? "draft", template_id: order.template_id });
    }
    if (req.method === "PATCH" && action === "brief") {
      const current = (await db(`pesonaflix_briefs?order_id=eq.${order.id}&select=status&limit=1`))?.[0];
      if (current?.status === "submitted" || current?.status === "approved") {
        return respond(req, { error: "Data sudah dikirim. Hubungi tim untuk revisi." }, 409);
      }
      const payload = await req.json();
      const brief = sanitizeBrief(payload.brief);
      const submitting = payload.submit === true;
      if (submitting && (!brief.name || !brief.role || !brief.bio)) {
        return respond(req, { error: "Nama, profesi dan cerita singkat wajib diisi" }, 400);
      }
      const rows = await db("pesonaflix_briefs?on_conflict=order_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          order_id: order.id, brief,
          status: submitting ? "submitted" : "draft",
          submitted_at: submitting ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
      });
      if (submitting) {
        await db(`pesonaflix_jobs?order_id=eq.${order.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "brief_submitted", updated_at: new Date().toISOString() })
        });
      }
      return respond(req, { status: rows?.[0]?.status ?? "draft" });
    }
    return respond(req, { error: "Aksi tidak tersedia" }, 404);
  } catch (error) {
    console.error("PESONAFLIX public API error", error instanceof Error ? error.name : "unknown");
    // Do not send raw DB/provider diagnostics or secret material to customers.
    return respond(req, { error: error instanceof Error && /^(Nama|Email|Nomor|Gaya|ID permintaan|Kode referral|Data formulir|Tautan)/.test(error.message) ? error.message : "Layanan belum dapat memproses permintaan" }, 500);
  }
});
