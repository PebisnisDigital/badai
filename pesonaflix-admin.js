// PESONAFLIX module for BADAI's existing Marketing dashboard.
// All reads and writes go through the authenticated Edge Function.
(() => {
  'use strict';
  const BASE = 'https://tlvxlekqrllkvcpgwmic.supabase.co/functions/v1/pesonaflix-admin';
  const $ = (id) => document.getElementById(id);
  const rupiah = (value) => 'Rp' + Number(value || 0).toLocaleString('id-ID');
  let loaded = false;

  function token() {
    try { return JSON.parse(localStorage.getItem('badai_admin_session') || 'null')?.access_token || ''; }
    catch { return ''; }
  }

  function message(text, error = false) {
    const node = $('pfAdminMessage');
    if (!node) return;
    node.textContent = text;
    node.style.color = error ? '#ff8d98' : '#a7d8b8';
  }

  async function request(action, options = {}) {
    const access = token();
    if (!access) throw new Error('Login ke Admin BADAI dahulu.');
    const response = await fetch(BASE + '?action=' + encodeURIComponent(action), {
      cache: 'no-store',
      ...options,
      headers: {
        Authorization: 'Bearer ' + access,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Layanan PESONAFLIX belum terhubung.');
    return data;
  }

  async function loadSettings() {
    message('Memuat pengaturan PESONAFLIX...');
    try {
      const { settings } = await request('settings');
      if (!settings) throw new Error('Pengaturan belum dipasang pada database.');
      $('pfNormalPrice').value = settings.normal_price ?? '';
      $('pfPromoPrice').value = settings.promo_price ?? '';
      $('pfQuota').value = settings.order_quota ?? '';
      $('pfCommission').value = settings.commission_percent ?? 50;
      $('pfPromoEnabled').checked = !!settings.promo_enabled;
      $('pfSalesOpen').checked = !!settings.sales_open;
      message(settings.sales_open
        ? 'Pemesanan aktif · Harga tampil: ' + rupiah(settings.promo_enabled ? settings.promo_price : settings.normal_price)
        : 'Pemesanan ditutup. Atur harga, lalu aktifkan setelah checkout lolos pengujian.');
      loaded = true;
    } catch (error) {
      loaded = false;
      message(error.message || 'Gagal memuat pengaturan.', true);
    }
  }

  function nullableNumber(id) {
    return $(id).value.trim() === '' ? null : Number($(id).value);
  }

  async function saveSettings() {
    if (!loaded) { message('Pengaturan belum dimuat. Coba lagi.', true); return; }
    const button = $('pfSaveSettings');
    const body = {
      normal_price: nullableNumber('pfNormalPrice'),
      promo_price: nullableNumber('pfPromoPrice'),
      order_quota: nullableNumber('pfQuota'),
      commission_percent: nullableNumber('pfCommission'),
      promo_enabled: $('pfPromoEnabled').checked,
      sales_open: $('pfSalesOpen').checked
    };
    if (body.sales_open && !body.normal_price) {
      message('Isi harga normal sebelum membuka pesanan.', true); return;
    }
    if (body.promo_enabled && !body.promo_price) {
      message('Isi harga launching sebelum mengaktifkan promo.', true); return;
    }
    button.disabled = true;
    message('Menyimpan pengaturan...');
    try {
      await request('settings', { method: 'PATCH', body: JSON.stringify(body) });
      await loadSettings();
      message('Pengaturan PESONAFLIX berhasil disimpan.');
    } catch (error) {
      message(error.message || 'Gagal menyimpan.', true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadOrders() {
    const list = $('pfOrderList');
    if (!list) return;
    list.textContent = 'Memuat pesanan...';
    try {
      const { orders } = await request('orders');
      list.replaceChildren();
      if (!orders?.length) { list.textContent = 'Belum ada pesanan PESONAFLIX.'; return; }
      for (const order of orders) {
        const row = document.createElement('div');
        row.style.cssText = 'border-bottom:1px solid #363636;padding:10px 0;display:grid;gap:3px';
        const head = document.createElement('strong');
        head.textContent = order.full_name + ' · ' + rupiah(order.amount);
        const detail = document.createElement('span');
        detail.textContent = [order.template_id, order.payment_status, order.whatsapp].join(' · ');
        const date = document.createElement('small');
        date.textContent = new Date(order.created_at).toLocaleString('id-ID');
        row.append(head, detail, date);
        if (order.payment_status === 'paid' && order.customer_token) {
          const edit = document.createElement('a');
          edit.href = 'https://pesonaflix.vercel.app/studio?order=' + encodeURIComponent(order.customer_token);
          edit.target = '_blank';
          edit.rel = 'noopener noreferrer';
          edit.textContent = 'Buka Data di Studio ↗';
          edit.style.cssText = 'color:#ff789a;font-size:12px;font-weight:700;margin-top:5px';
          row.appendChild(edit);
        }
        list.appendChild(row);
      }
    } catch (error) { list.textContent = error.message || 'Gagal memuat pesanan.'; }
  }

  const JOB_STATUSES = [
    ['waiting_brief', 'Menunggu formulir'],
    ['brief_submitted', 'Formulir masuk'],
    ['review', 'Review data'],
    ['in_production', 'Sedang dibuat'],
    ['preview_ready', 'Preview siap'],
    ['revision_requested', 'Revisi'],
    ['approved', 'Disetujui'],
    ['published', 'Terbit'],
    ['completed', 'Selesai'],
    ['on_hold', 'Ditunda'],
    ['cancelled', 'Dibatalkan']
  ];

  function field(label, value, placeholder) {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:grid;gap:5px;font-size:12px;color:#bcbcbc';
    wrap.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder;
    input.style.cssText = 'width:100%;min-width:0';
    wrap.appendChild(input);
    return { wrap, input };
  }

  async function loadJobs() {
    const list = $('pfJobList');
    if (!list) return;
    list.textContent = 'Memuat pekerjaan...';
    try {
      const { jobs } = await request('jobs');
      list.replaceChildren();
      if (!jobs?.length) { list.textContent = 'Belum ada pekerjaan produksi.'; return; }
      for (const job of jobs) {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;gap:9px;border-bottom:1px solid #363636;padding:13px 0';
        const name = document.createElement('strong');
        name.textContent = (job.pesonaflix_orders?.full_name || 'Pemesan') + ' · ' + (job.pesonaflix_orders?.template_id || '');
        const info = document.createElement('small');
        info.textContent = job.pesonaflix_orders?.whatsapp || '';
        const statusLabel = document.createElement('label');
        statusLabel.textContent = 'Tahap produksi';
        const select = document.createElement('select');
        select.style.width = '100%';
        for (const [value, label] of JOB_STATUSES) {
          const option = new Option(label, value);
          select.append(option);
        }
        select.value = job.status;
        statusLabel.appendChild(select);
        const slug = field('Nama link', job.site_slug, 'contoh: vinirahmawati');
        const preview = field('Link preview Vercel', job.preview_url, 'https://contoh.vercel.app/preview');
        const published = field('Link publik', job.public_url, 'https://pesonaflix.vercel.app/vinirahmawati');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'SIMPAN STATUS PRODUKSI';
        const notice = document.createElement('small');
        button.addEventListener('click', async () => {
          button.disabled = true;
          notice.textContent = 'Menyimpan...';
          try {
            await request('job', { method: 'PATCH', body: JSON.stringify({
              id: job.id, status: select.value, site_slug: slug.input.value,
              preview_url: preview.input.value, public_url: published.input.value
            }) });
            notice.textContent = 'Berhasil disimpan.';
          } catch (error) {
            notice.textContent = error.message || 'Gagal menyimpan pekerjaan.';
          } finally { button.disabled = false; }
        });
        row.append(name, info, statusLabel, slug.wrap, preview.wrap, published.wrap, button, notice);
        list.appendChild(row);
      }
    } catch (error) { list.textContent = error.message || 'Gagal memuat pekerjaan.'; }
  }

  function attach() {
    if (!$('pesonaflixAdminCard')) return;
    $('pfSaveSettings')?.addEventListener('click', saveSettings);
    $('pfRefreshOrders')?.addEventListener('click', loadOrders);
    $('pfRefreshJobs')?.addEventListener('click', loadJobs);
    document.querySelector('[data-marketing-tab="pesonaflix"]')?.addEventListener('click', () => {
      loadSettings();
      loadOrders();
      loadJobs();
    });
    if (document.querySelector('[data-marketing-panel="pesonaflix"]')?.classList.contains('active')) {
      loadSettings();
      loadOrders();
      loadJobs();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
