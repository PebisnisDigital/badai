// Dedicated BuatQris callback for PESONAFLIX. Never call BADAI activateMember.
const API_URL = Deno.env.get("SUPABASE_URL") ?? "";
const secretMap = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); }
  catch { return {}; }
})();
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? secretMap.default ?? "";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function db(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE);
  headers.set("Authorization", `Bearer ${SERVICE}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}/rest/v1/${path}`, { ...init, headers });
  const raw = await response.text();
  let parsed: any;
  try { parsed = raw ? JSON.parse(raw) : null; }
  catch { parsed = raw; }
  if (!response.ok) throw new Error(parsed?.message ?? `Database error ${response.status}`);
  return parsed;
}

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
    name: "HMAC", hash: "SHA-256"
  }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + Array.from(new Uint8Array(signed)).map((v) => v.toString(16).padStart(2, "0")).join("");
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  if (!API_URL || !SERVICE) return respond({ error: "Server configuration incomplete" }, 503);
  try {
    const settings = await db("rpc/get_buatqris_server_config", { method: "POST", body: "{}" });
    const signatureSecret = settings?.[0]?.signing_secret;
    if (!signatureSecret) return respond({ error: "Webhook belum siap" }, 503);
    const raw = await req.text();
    const received = req.headers.get("X-BuatQris-Signature") ?? "";
    if (!received || !equal(received, await hmac(String(signatureSecret), raw))) {
      return respond({ error: "Invalid signature" }, 401);
    }
    let event: any;
    try { event = JSON.parse(raw); }
    catch { return respond({ error: "Invalid JSON" }, 400); }
    const transactionId = String(event?.transaction_id ?? event?.data?.transaction_id ?? "").trim();
    if (!transactionId) return respond({ error: "transaction_id missing" }, 400);
    const name = String(event?.event ?? req.headers.get("X-BuatQris-Event") ?? "");
    const rows = await db(`pesonaflix_payment_attempts?provider_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id,order_id,status,amount,total_amount&limit=1`);
    const tx = rows?.[0];
    if (!tx) return respond({ ok: true, ignored: true });

    const next = name === "payment.success" ? "success"
      : name === "payment.expired" ? "expired"
      : name === "payment.failed" ? "failed" : null;
    if (!next) return respond({ ok: true, ignored: true });
    // Paid invoices must never be downgraded by a late expiry/failure webhook.
    if (tx.status === "success" && next !== "success") return respond({ ok: true, ignored: true });
    if (next === "success") {
      const reported = event?.amount ?? event?.data?.amount;
      if (reported !== undefined && Number(reported) !== Number(tx.amount) &&
          Number(reported) !== Number(tx.total_amount)) {
        return respond({ error: "Amount mismatch" }, 409);
      }
    }
    const timestamp = new Date().toISOString();
    await db(`pesonaflix_payment_attempts?id=eq.${tx.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: next,
        paid_at: next === "success" ? timestamp : null,
        updated_at: timestamp
      })
    });

    if (next === "success") {
      const orders = await db(`pesonaflix_orders?id=eq.${tx.order_id}&select=id,payment_status&limit=1`);
      const order = orders?.[0];
      if (!order) throw new Error("Order not found");
      if (!["pending", "paid"].includes(order.payment_status)) {
        return respond({ error: "Order is not payable" }, 409);
      }
      if (order.payment_status === "pending") {
        const changed = await db(`pesonaflix_orders?id=eq.${tx.order_id}&payment_status=eq.pending`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ payment_status: "paid", paid_at: timestamp, updated_at: timestamp })
        });
        if (changed?.length) {
          await db("pesonaflix_events", {
            method: "POST", body: JSON.stringify({ order_id: tx.order_id, event_type: "payment.paid" })
          });
        }
      }
      await db("pesonaflix_jobs?on_conflict=order_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({ order_id: tx.order_id, status: "waiting_brief" })
      });
    } else {
      // Only unpaid orders may transition to an unsuccessful status.
      await db(`pesonaflix_orders?id=eq.${tx.order_id}&payment_status=eq.pending`, {
        method: "PATCH", body: JSON.stringify({
          payment_status: next === "expired" ? "expired" : "failed",
          updated_at: timestamp
        })
      });
    }
    return respond({ ok: true });
  } catch (error) {
    console.error("PESONAFLIX webhook", error instanceof Error ? error.name : "unknown");
    return respond({ error: "Callback belum dapat diproses" }, 500);
  }
});
