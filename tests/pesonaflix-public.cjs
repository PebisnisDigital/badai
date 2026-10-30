const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function harness(paymentEnabled = false) {
  let endpoint;
  const writes = [];
  const code = stripTypeScriptTypes(fs.readFileSync(path.join(
    __dirname, '../supabase/functions/pesonaflix-public/index.ts'
  ), 'utf8'));
  vm.runInNewContext(code, {
    Deno: {
      env: { get(key) {
        const values = {
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'only-on-the-server',
          PESONAFLIX_PAYMENTS_ENABLED: paymentEnabled ? 'true' : undefined
        };
        return values[key];
      } },
      serve(handler) { endpoint = handler; }
    },
    fetch: async (url, init = {}) => {
      const method = init.method || 'GET';
      if (method !== 'GET') writes.push({ method, url });
      if (String(url).includes('/pesonaflix_settings')) return new Response(JSON.stringify([{
        sales_open: true, normal_price: 199000, promo_price: 99000,
        promo_enabled: true, commission_percent: 25
      }]));
      if (method === 'GET' && String(url).includes('/pesonaflix_orders')) {
        return new Response('[]');
      }
      throw new Error('Unexpected call: ' + url);
    },
    Request, Response, Headers, URL, URLSearchParams, crypto, console
  });
  return {
    writes,
    request: (action, method = 'GET', body) => endpoint(new Request(
      'https://example.supabase.co/functions/v1/pesonaflix-public?action=' + action,
      { method, ...(body ? { body: JSON.stringify(body) } : {}) }
    ))
  };
}

test('PESONAFLIX checkout stays OFF even when admin sales_open=true unless server enables payments', async () => {
  const h = harness(false);
  const offer = await (await h.request('offer')).json();
  assert.equal(offer.sales_open, false);
  assert.equal(offer.price, 99000);
  assert.equal(offer.normal_price, 199000);
  const rejected = await h.request('create', 'POST', {
    full_name: 'Contoh Pelanggan', email: 'contoh@example.com', whatsapp: '6281234567890',
    template_id: 'original', request_id: crypto.randomUUID()
  });
  assert.equal(rejected.status, 423);
  assert.equal(h.writes.length, 0);
});

test('PESONAFLIX admin panel IDs and script are linked correctly', () => {
  const admin = fs.readFileSync(path.join(__dirname, '../admin/index.html'), 'utf8');
  const script = fs.readFileSync(path.join(__dirname, '../pesonaflix-admin.js'), 'utf8');
  for (const id of ['pesonaflixAdminCard', 'pfSaveSettings', 'pfRefreshOrders', 'pfRefreshJobs', 'pfJobList']) {
    assert.match(admin, new RegExp(`id="${id}"`));
    assert.ok(script.includes(`$('${id}')`), `Script does not refer to ${id}`);
  }
  assert.ok(admin.includes('src="/pesonaflix-admin.js"'));
});
