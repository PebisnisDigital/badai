// PESONAFLIX commerce admin API. Does not modify BADAI membership data.
// Deploy with verify_jwt=false: the endpoint validates the user session itself.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const secretMap = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); }
  catch { return {}; }
})();
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? secretMap.default ?? "";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("PESONAFLIX_ADMIN_ORIGINS") ??
    "https://badai.vercel.app,https://badai.up.railway.app")
    .split(",").map((v) => v.trim()).filter(Boolean)
);

function respond(req: Request, body: unknown, status = 200): Response {
  const origin = req.headers.get("origin") ?? "";
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Headers", "authorization,apikey,content-type");
    headers.set("Access-Control-Allow-Methods", "GET,PATCH,OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function rest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_KEY);
  headers.set("Authorization", `Bearer ${SERVICE_KEY}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const body = await response.text();
  let result: any = null;
  try { result = body ? JSON.parse(body) : null; }
  catch { result = body; }
  if (!response.ok) throw new Error(result?.message ?? result?.error ?? `Database error (${response.status})`);
  return result;
}

async function staff(req: Request): Promise<{ id: string; role: string } | null> {
  const bearer = req.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || bearer.length < 35) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": PUBLIC_KEY, "Authorization": bearer }
  });
  if (!response.ok) return null;
  const user = await response.json();
  if (!user?.id) return null;
  const rows = await rest(`admin_team_members?auth_user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=role&limit=1`);
  return rows?.[0] ? { id: user.id, role: String(rows[0].role) } : null;
}

function integerOrNull(value: unknown, field: string): number | null {
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000) {
    throw new Error(`${field} harus bilangan bulat positif`);
  }
  return value;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) return respond(req, { error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return respond(req, { ok: true });
  if (!SUPABASE_URL || !PUBLIC_KEY || !SERVICE_KEY) return respond(req, { error: "Server belum dikonfigurasi" }, 503);

  try {
    const actor = await staff(req);
    if (!actor) return respond(req, { error: "Login Admin BADAI diperlukan" }, 401);
    const canRead = ["owner", "super_admin", "admin", "sales", "finance", "marketing"].includes(actor.role);
    const canWrite = ["owner", "super_admin", "admin"].includes(actor.role);
    const action = new URL(req.url).searchParams.get("action") ?? "settings";

    if (req.method === "GET" && action === "settings" && canRead) {
      const rows = await rest("pesonaflix_settings?id=eq.1&select=*");
      return respond(req, { settings: rows?.[0] ?? null });
    }

    if (req.method === "PATCH" && action === "settings" && canWrite) {
      const previous = (await rest("pesonaflix_settings?id=eq.1&select=*"))?.[0];
      if (!previous) return respond(req, { error: "Pengaturan PESONAFLIX belum tersedia" }, 503);
      const body = await req.json();
      const normal = integerOrNull(body.normal_price, "Harga normal");
      const promo = integerOrNull(body.promo_price, "Harga promo");
      const commission = Number(body.commission_percent);
      const quota = body.order_quota === null || body.order_quota === "" ? null : integerOrNull(body.order_quota, "Kuota");
      if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
        return respond(req, { error: "Komisi harus 0–100%" }, 400);
      }
      if (normal !== null && promo !== null && promo > normal) {
        return respond(req, { error: "Harga promo tidak boleh melebihi harga normal" }, 400);
      }
      if (body.sales_open === true && !normal) return respond(req, { error: "Atur harga sebelum membuka pesanan" }, 400);
      if (body.promo_enabled === true && !promo) return respond(req, { error: "Atur harga promo dahulu" }, 400);
      const changes = {
        normal_price: normal, promo_price: promo,
        promo_enabled: body.promo_enabled === true,
        sales_open: body.sales_open === true,
        order_quota: quota,
        commission_percent: commission,
        updated_by: actor.id,
        updated_at: new Date().toISOString()
      };
      const updated = await rest("pesonaflix_settings?id=eq.1", {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(changes)
      });
      return respond(req, { settings: updated?.[0] ?? null });
    }

    if (req.method === "GET" && action === "orders" && canRead) {
      const orders = await rest(
        "pesonaflix_orders?select=id,customer_token,full_name,email,whatsapp,template_id,amount,payment_status,created_at,paid_at&order=created_at.desc&limit=100"
      );
      return respond(req, { orders });
    }

    if (req.method === "GET" && action === "jobs" && canRead) {
      const jobs = await rest("pesonaflix_jobs?select=*,pesonaflix_orders(full_name,whatsapp,template_id,payment_status)&order=created_at.desc&limit=100");
      return respond(req, { jobs });
    }

    if (req.method === "PATCH" && action === "job" && canWrite) {
      const body = await req.json();
      const jobId = String(body?.id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(jobId)) return respond(req, { error: "ID pekerjaan tidak valid" }, 400);
      const current = (await rest(`pesonaflix_jobs?id=eq.${jobId}&select=*,pesonaflix_orders(payment_status)&limit=1`))?.[0];
      if (!current) return respond(req, { error: "Pekerjaan tidak ditemukan" }, 404);
      if (current.pesonaflix_orders?.payment_status !== "paid") {
        return respond(req, { error: "Pesanan belum dibayar" }, 403);
      }
      const states = [
        "waiting_brief", "brief_submitted", "review", "in_production", "preview_ready",
        "revision_requested", "approved", "published", "completed", "on_hold", "cancelled"
      ];
      const status = String(body.status ?? current.status);
      if (!states.includes(status)) return respond(req, { error: "Status tidak valid" }, 400);
      const slug = String(body.site_slug ?? current.site_slug ?? "").trim();
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return respond(req, { error: "Nama link tidak valid" }, 400);
      }
      const previewUrl = String(body.preview_url ?? current.preview_url ?? "").trim();
      const publicUrl = String(body.public_url ?? current.public_url ?? "").trim();
      let validPreview = !previewUrl;
      try {
        const parsed = new URL(previewUrl);
        validPreview = parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app") &&
          !parsed.username && !parsed.password;
      } catch { /* no preview supplied or invalid URL */ }
      if (!validPreview) {
        return respond(req, { error: "URL preview tidak sesuai" }, 400);
      }
      if (publicUrl && !publicUrl.startsWith("https://pesonaflix.vercel.app/")) {
        return respond(req, { error: "URL publik harus domain PESONAFLIX" }, 400);
      }
      if (["published", "completed"].includes(status) && !publicUrl) {
        return respond(req, { error: "Isi URL publik sebelum menyelesaikan pekerjaan" }, 400);
      }
      const patch = {
        status, site_slug: slug || null, preview_url: previewUrl || null,
        public_url: publicUrl || null, updated_at: new Date().toISOString(),
        published_at: ["published", "completed"].includes(status)
          ? (current.published_at || new Date().toISOString()) : current.published_at
      };
      const result = await rest(`pesonaflix_jobs?id=eq.${jobId}`, {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch)
      });
      await rest("pesonaflix_events", {
        method: "POST",
        body: JSON.stringify({
          order_id: current.order_id, actor_user_id: actor.id, event_type: "job.updated",
          details: { from: current.status, to: status }
        })
      });
      return respond(req, { job: result?.[0] ?? null });
    }

    return respond(req, { error: canRead ? "Aksi tidak tersedia" : "Akses ditolak" }, canRead ? 404 : 403);
  } catch (error) {
    console.error("PESONAFLIX admin error", error instanceof Error ? error.name : "unknown");
    return respond(req, { error: "Permintaan belum berhasil diproses" }, 500);
  }
});
