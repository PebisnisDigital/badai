const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { createHmac, webcrypto } = require('node:crypto');

function makeHarness() {
  let callback;
  const writes = [];
  const state = { payment: 'pending', order: 'pending' };
  const fetchMock = async (input, init = {}) => {
    const url = new URL(input);
    const p = url.pathname + url.search;
    const method = init.method || 'GET';
    const json = (value) => new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json' }
    });
    if (p.includes('/rpc/get_buatqris_server_config')) return json([{ signing_secret: 'sample-secret' }]);
    if (p.includes('/pesonaflix_payment_attempts')) {
      if (method === 'PATCH') {
        const patch = JSON.parse(init.body);
        state.payment = patch.status;
        writes.push({ table: 'payment', patch });
        return json(null);
      }
      return json([{ id: 'tx-1', order_id: 'order-1', status: state.payment, amount: 99000, total_amount: 99000 }]);
    }
    if (p.includes('/pesonaflix_orders')) {
      if (method === 'PATCH') {
        const patch = JSON.parse(init.body);
        if (p.includes('payment_status=eq.pending') && state.order !== 'pending') return json([]);
        state.order = patch.payment_status;
        writes.push({ table: 'order', patch });
        return json([{ id: 'order-1', payment_status: state.order }]);
      }
      return json([{ id: 'order-1', payment_status: state.order }]);
    }
    if (p.includes('/pesonaflix_events') || p.includes('/pesonaflix_jobs')) {
      writes.push({ table: p.includes('events') ? 'event' : 'job' });
      return json(null);
    }
    throw new Error('Unexpected request: ' + method + ' ' + p);
  };
  const code = stripTypeScriptTypes(fs.readFileSync(
    path.join(__dirname, '../supabase/functions/pesonaflix-webhook/index.ts'), 'utf8'
  ));
  vm.runInNewContext(code, {
    Deno: {
      env: { get(name) {
        return {
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'server-only-secret'
        }[name] || undefined;
      } },
      serve(handler) { callback = handler; }
    },
    fetch: fetchMock,
    Request,
    Response,
    Headers,
    URL,
    TextEncoder,
    crypto: webcrypto,
    console
  });
  async function send(payload, signature = null) {
    const body = JSON.stringify(payload);
    const hmac = signature ?? 'sha256=' + createHmac('sha256', 'sample-secret').update(body).digest('hex');
    return callback(new Request('https://example.supabase.co/functions/v1/pesonaflix-webhook', {
      method: 'POST',
      headers: { 'X-BuatQris-Signature': hmac },
      body
    }));
  }
  return { send, writes, state };
}

test('PESONAFLIX webhook rejects unsigned payments and never creates BADAI members', async () => {
  const h = makeHarness();
  const payload = { event: 'payment.success', transaction_id: 'invoice-123', amount: 99000 };
  const rejected = await h.send(payload, 'sha256=invalid');
  assert.equal(rejected.status, 401);
  assert.equal(h.writes.length, 0);

  const success = await h.send(payload);
  assert.equal(success.status, 200);
  assert.equal(h.state.order, 'paid');
  assert.equal(h.writes.filter(w => w.table === 'event').length, 1);
  assert.equal(h.writes.filter(w => w.table === 'job').length, 1);
  assert.ok(h.writes.every(w => ['payment', 'order', 'event', 'job'].includes(w.table)));

  const retry = await h.send(payload);
  assert.equal(retry.status, 200);
  assert.equal(h.writes.filter(w => w.table === 'event').length, 1);
});
