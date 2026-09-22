const adminHandler = require('./admin-v4.js');

module.exports = async function handler(req, res) {
  try {
    let statusCode = 200;
    const headers = {};
    let body = '';

    const capture = {
      setHeader(name, value){ headers[String(name).toLowerCase()] = value; return this; },
      status(code){ statusCode = code; return this; },
      send(payload){ body = payload == null ? '' : String(payload); return this; }
    };

    await adminHandler(req, capture);

    const contentType = String(headers['content-type'] || '');
    if (statusCode >= 400 || !contentType.includes('text/html')) {
      Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
      res.status(statusCode).send(body);
      return;
    }

    // Social Proof settings: source + package filter.
    body = body.replace(
      `$sp('socialProofTarget').value = s.target || 'both';`,
      `$sp('socialProofTarget').value = s.target || 'both';\n      if($sp('socialProofAudienceMode')) $sp('socialProofAudienceMode').value = s.audience_mode || 'paid';\n      if($sp('socialProofPlanFilter')) $sp('socialProofPlanFilter').value = s.plan_filter || 'all';`
    );

    body = body.replace(
      `p_max_items:20,\n      p_audience_mode:el('socialProofAudienceMode')?.value || 'paid'`,
      `p_max_items:20,\n      p_audience_mode:el('socialProofAudienceMode')?.value || 'paid',\n      p_plan_filter:el('socialProofPlanFilter')?.value || 'all'`
    );

    body = body.replace(
      `p_max_items:20`,
      `p_max_items:20,\n      p_audience_mode:el('socialProofAudienceMode')?.value || 'paid',\n      p_plan_filter:el('socialProofPlanFilter')?.value || 'all'`
    );

    body = body.replace(
      `if($sp('socialProofPreviewTime')) $sp('socialProofPreviewTime').textContent = 'Contoh tampilan • data pembeli nyata';`,
      `if($sp('socialProofPreviewTime')) $sp('socialProofPreviewTime').textContent = ($sp('socialProofAudienceMode')?.value === 'registrations')\n      ? 'Contoh • semua pendaftar, termasuk Gratisan'\n      : 'Contoh • pembelian terverifikasi';`
    );

    body = body.replaceAll(
      'Data yang diputar hanya berasal dari <b>pembayaran berstatus LUNAS</b>.',
      'Sumber data mengikuti pilihan <b>Data Social Proof</b> dan <b>Paket Member</b>: Gratisan, Pemula, Untung, atau semuanya.'
    );

    body = body.replaceAll(
      '<div><h3>Social Proof Penjualan</h3><p>Tampilkan notifikasi pembelian nyata dari data member yang sudah lunas.</p></div>',
      '<div><h3>Social Proof Member BADAI</h3><p>Tampilkan aktivitas member dari Paket Gratisan, Pemula, dan Untung.</p></div>'
    );

    // Member management package option.
    body = body.replace(
      '<select id="managePlan">\n          <option value="newbie">Paket Pemula — Belajar AI + Update</option>',
      '<select id="managePlan">\n          <option value="free">Paket Gratisan — Komunitas + KulWA</option>\n          <option value="newbie">Paket Pemula — Belajar AI + Update</option>'
    );

    body = body.replace(
      `function planBadge(plan){\n    const value = plan === 'pro' ? 'PAKET UNTUNG' : 'PAKET PEMULA';\n    return '<span class="plan-badge ' + (plan === 'pro' ? 'pro' : 'newbie') + '">' + value + '</span>';\n  }`,
      `function planBadge(plan){\n    let value = 'PAKET PEMULA';\n    let cls = 'newbie';\n    if(plan === 'free'){ value = 'PAKET GRATISAN'; cls = 'free'; }\n    else if(plan === 'pro'){ value = 'PAKET UNTUNG'; cls = 'pro'; }\n    return '<span class="plan-badge ' + cls + '">' + value + '</span>';\n  }`
    );

    // Marketing pricing UI now represents all three levels. Gratisan is fixed Rp0.
    body = body.replaceAll(
      'Atur harga Paket Pemula dan Paket Untung.',
      'Atur jenjang Paket Gratisan, Paket Pemula, dan Paket Untung.'
    );

    body = body.replace(
      `<div class="marketing-price-grid">\n              <div class="manage-field">\n                <label>Harga Paket Pemula</label>`,
      `<div class="marketing-price-grid badai-three-package-grid">\n              <div class="manage-field badai-free-price-field">\n                <label>Harga Paket Gratisan</label>\n                <div class="badai-free-price">Rp0 <small>GRATIS</small></div>\n                <div class="price-plan-note">Komunitas + KulWA rutin</div>\n              </div>\n\n              <div class="manage-field">\n                <label>Harga Paket Pemula</label>`
    );

    body = body.replace(
      `              Untuk sementara pendaftaran dari landing page yang lama tetap menggunakan harga\n              <b>Paket Pemula</b> sampai pilihan paket dipasang di landing page.`,
      `              <b>Paket Gratisan</b> selalu Rp0. Paket Pemula dan Paket Untung mengikuti harga yang kamu atur di sini.`
    );

    // Notification variables must understand all three membership plans.
    body = body.replaceAll(
      `r.membership_plan === 'pro' ? 'Paket Untung' : 'Paket Pemula'`,
      `r.membership_plan === 'free' ? 'Paket Gratisan' : (r.membership_plan === 'pro' ? 'Paket Untung' : 'Paket Pemula')`
    );
    body = body.replaceAll(
      `row.membership_plan === 'pro' ? 'Paket Untung' : 'Paket Pemula'`,
      `row.membership_plan === 'free' ? 'Paket Gratisan' : (row.membership_plan === 'pro' ? 'Paket Untung' : 'Paket Pemula')`
    );
    body = body.replaceAll(
      `harga:rupiah(r.amount || marketingSettings.product_price || 123000)`,
      `harga:r.membership_plan === 'free' ? 'GRATIS' : rupiah(r.amount ?? marketingSettings.product_price ?? 123000)`
    );
    body = body.replaceAll(
      `harga:rupiah(row.amount || marketingSettings.product_price || 123000)`,
      `harga:row.membership_plan === 'free' ? 'GRATIS' : rupiah(row.amount ?? marketingSettings.product_price ?? 123000)`
    );

    // Social Proof preview uses selected package instead of hard-coding Paket Untung.
    body = body.replaceAll(
      `.split('[paket]').join('Paket Untung')`,
      `.split('[paket]').join((document.getElementById('socialProofPlanFilter')?.value === 'free' ? 'Paket Gratisan' : document.getElementById('socialProofPlanFilter')?.value === 'pro' ? 'Paket Untung' : 'Paket Pemula'))`
    );

    const audienceUi = String.raw`
<style id="badai-three-package-admin-style">
  .plan-badge.free{
    background:#171717!important;
    border:1px solid #3b3b3b!important;
    color:#d7d7d7!important;
  }
  .badai-three-package-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .badai-free-price{
    min-height:46px;display:flex;align-items:center;justify-content:space-between;gap:10px;
    padding:0 13px;border:1px solid #303030;border-radius:12px;background:#080808;
    color:#fff;font-weight:900;font-size:16px
  }
  .badai-free-price small{
    display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border-radius:999px;
    background:#142519;border:1px solid #275337;color:#83e3a5;font-size:8px;letter-spacing:.06em
  }
  .badai-package-sync-note{
    margin:0 0 12px;padding:12px 13px;border:1px solid #44283a;border-radius:13px;
    background:#160d12;color:#bdbdbd;font-size:10px;line-height:1.5
  }
  .badai-package-sync-note b{color:#ff91c5}
  @media(max-width:560px){.badai-three-package-grid{grid-template-columns:1fr!important}}
</style>
<script id="badai-three-package-admin-script">
(function(){
  function ensureAudienceField(){
    const target = document.getElementById('socialProofTarget');
    if(!target || document.getElementById('socialProofAudienceMode')) return;
    const targetField = target.closest('.manage-field');
    if(!targetField) return;

    const field = document.createElement('div');
    field.className = 'manage-field';
    field.innerHTML =
      '<label>Data Social Proof</label>' +
      '<select id="socialProofAudienceMode">' +
        '<option value="registrations">Semua pendaftar — Gratisan + berbayar</option>' +
        '<option value="paid">Pembeli lunas saja — Pemula + Untung</option>' +
      '</select>' +
      '<div class="price-plan-note">Pilih sumber data yang boleh tampil.</div>';
    targetField.insertAdjacentElement('afterend', field);

    const select = document.getElementById('socialProofAudienceMode');
    select?.addEventListener('change', function(){
      const preview = document.getElementById('socialProofPreviewTime');
      if(preview){
        preview.textContent = select.value === 'registrations'
          ? 'Contoh • semua pendaftar, termasuk Gratisan'
          : 'Contoh • pembelian terverifikasi';
      }
    });
  }

  function ensurePlanFilter(){
    if(document.getElementById('socialProofPlanFilter')) return;
    const audience = document.getElementById('socialProofAudienceMode');
    const anchor = audience?.closest('.manage-field') || document.getElementById('socialProofTarget')?.closest('.manage-field');
    if(!anchor) return;

    const field = document.createElement('div');
    field.className = 'manage-field';
    field.innerHTML =
      '<label>Paket Member yang Ditampilkan</label>' +
      '<select id="socialProofPlanFilter">' +
        '<option value="all">Semua Paket</option>' +
        '<option value="free">Paket Gratisan</option>' +
        '<option value="newbie">Paket Pemula</option>' +
        '<option value="pro">Paket Untung</option>' +
      '</select>' +
      '<div class="price-plan-note">Social Proof akan mengambil data sesuai paket ini.</div>';
    anchor.insertAdjacentElement('afterend', field);

    const select = document.getElementById('socialProofPlanFilter');
    select?.addEventListener('change', function(){
      const message = document.getElementById('socialProofMessage');
      if(message) message.dispatchEvent(new Event('input',{bubbles:true}));
    });
  }

  function ensureFreePlanOption(){
    const select = document.getElementById('managePlan');
    if(!select || select.querySelector('option[value="free"]')) return;
    const option = document.createElement('option');
    option.value = 'free';
    option.textContent = 'Paket Gratisan — Komunitas + KulWA';
    select.insertBefore(option, select.firstChild);
  }

  function ensureNotificationNote(){
    const panel = document.querySelector('[data-marketing-panel="notifications"]');
    if(!panel || panel.querySelector('.badai-package-sync-note')) return;
    const note = document.createElement('div');
    note.className = 'badai-package-sync-note';
    note.innerHTML = '<b>3 PAKET TERSINKRON</b><br>[paket] otomatis menjadi Paket Gratisan, Paket Pemula, atau Paket Untung. Untuk Gratisan, [harga] otomatis menjadi GRATIS.';
    panel.insertBefore(note,panel.firstChild);
  }

  async function loadPlanFilter(){
    const select = document.getElementById('socialProofPlanFilter');
    if(!select) return;
    try{
      const session = JSON.parse(localStorage.getItem('badai_admin_session') || 'null');
      if(!session?.access_token) return;
      const response = await fetch('https://tlvxlekqrllkvcpgwmic.supabase.co/rest/v1/social_proof_settings?id=eq.1&select=plan_filter',{
        headers:{
          'apikey':'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R',
          'Authorization':'Bearer ' + session.access_token
        }
      });
      const rows = await response.json().catch(function(){return []});
      if(response.ok && rows?.[0]?.plan_filter){
        select.value = rows[0].plan_filter;
        const message = document.getElementById('socialProofMessage');
        if(message) message.dispatchEvent(new Event('input',{bubbles:true}));
      }
    }catch(_){}
  }

  function boot(){
    ensureAudienceField();
    ensurePlanFilter();
    ensureFreePlanOption();
    ensureNotificationNote();
    setTimeout(loadPlanFilter,450);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;

    body = body.replace('</body>', audienceUi + '\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin v5 gagal dimuat: ' + String(error?.message || error));
  }
};
