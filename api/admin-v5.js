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

    // Affiliate sales links: main LP plus direct links for each package.
    const affiliateDataMarker = `          <div class="marketing-card">\n            <div class="affiliate-admin-title">\n              <div>\n                <b>Data Afiliasi</b>`;

    const affiliateLinkCard = String.raw`
          <div class="marketing-card" id="affiliateSalesLinkCard">
            <div class="marketing-card-head">
              <span class="marketing-number">2</span>
              <div><h3>Link Jualan Afiliasi</h3><p>Atur link yang boleh dipakai affiliate: LP utama atau langsung ke paket tertentu.</p></div>
            </div>

            <div class="affiliate-link-setting-list">
              <label class="affiliate-link-setting-row">
                <div><b>Link Utama</b><span>Masuk LP utama dan calon member memilih paket sendiri.</span><code id="affiliateMainPreview">/KODE-AFILIASI</code></div>
                <i class="affiliate-link-switch"><input id="affiliateLinkMainEnabled" type="checkbox" checked><span></span></i>
              </label>
              <label class="affiliate-link-setting-row">
                <div><b>Paket Gratisan</b><span>Langsung membawa calon member ke alur Paket Gratisan.</span><code id="affiliateFreePreview">/KODE-AFILIASI?paket=gratisan</code></div>
                <i class="affiliate-link-switch"><input id="affiliateLinkFreeEnabled" type="checkbox" checked><span></span></i>
              </label>
              <label class="affiliate-link-setting-row">
                <div><b>Paket Pemula</b><span>Untuk affiliate yang ingin langsung menjual Paket Pemula.</span><code id="affiliateNewbiePreview">/KODE-AFILIASI?paket=pemula</code></div>
                <i class="affiliate-link-switch"><input id="affiliateLinkNewbieEnabled" type="checkbox" checked><span></span></i>
              </label>
              <label class="affiliate-link-setting-row">
                <div><b>Paket Untung</b><span>Untuk affiliate yang ingin langsung menjual Paket Untung.</span><code id="affiliateProPreview">/KODE-AFILIASI?paket=untung</code></div>
                <i class="affiliate-link-switch"><input id="affiliateLinkProEnabled" type="checkbox" checked><span></span></i>
              </label>
            </div>

            <div class="affiliate-link-rule-note"><b>1 KODE, BANYAK JALUR.</b> Semua link memakai kode affiliate yang sama. Pilihan ini nanti menentukan link mana yang tampil di menu Affiliasi member.</div>
            <div id="affiliateLinkSettingsStatus" class="team-status-note"></div>
          </div>
`;

    if (!body.includes(affiliateDataMarker)) {
      throw new Error('Panel Data Afiliasi tidak ditemukan');
    }
    body = body.replace(affiliateDataMarker, affiliateLinkCard + '\n' + affiliateDataMarker);

    // The existing global save button also persists these affiliate-link switches.
    body = body.replace(
      `      if(window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__) {\n        await window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__();\n      }`,
      `      if(window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__) {\n        await window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__();\n      }\n      if(window.__BADAI_SAVE_AFFILIATE_LINKS__) {\n        await window.__BADAI_SAVE_AFFILIATE_LINKS__();\n      }`
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

    const affiliateLinkUi = String.raw`
<style id="badai-affiliate-link-admin-style">
  .affiliate-link-setting-list{display:grid;gap:7px}
  .affiliate-link-setting-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:10px 11px;border:1px solid #262626;border-radius:12px;background:#090909}
  .affiliate-link-setting-row>div{min-width:0}
  .affiliate-link-setting-row b{display:block;color:#fff;font-size:9px}
  .affiliate-link-setting-row div>span{display:block;margin-top:2px;color:#7e7e7e;font-size:7px;line-height:1.45}
  .affiliate-link-setting-row code{display:block;margin-top:6px;padding:6px 8px;border:1px solid #242424;border-radius:8px;background:#050505;color:#ff8fc5;font:700 7px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .affiliate-link-switch{position:relative;width:42px;height:24px;flex:0 0 42px}
  .affiliate-link-switch input{position:absolute;opacity:0;pointer-events:none}
  .affiliate-link-switch span{position:absolute;inset:0;border-radius:999px;background:#282828;border:1px solid #3a3a3a;transition:.2s}
  .affiliate-link-switch span:after{content:"";position:absolute;width:18px;height:18px;left:2px;top:2px;border-radius:50%;background:#aaa;transition:.2s}
  .affiliate-link-switch input:checked+span{background:#ff4fa3;border-color:#ff4fa3}
  .affiliate-link-switch input:checked+span:after{left:20px;background:#090909}
  .affiliate-link-rule-note{margin-top:9px;padding:9px 10px;border:1px dashed #472b3a;border-radius:10px;background:#120b0f;color:#8f8f8f;font-size:7px;line-height:1.5}
  .affiliate-link-rule-note b{color:#ff8fc5}
</style>
<script id="badai-affiliate-link-admin-script">
(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  const STORAGE_KEY = 'badai_admin_session';
  const el = id => document.getElementById(id);

  function session(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')}catch(_){return null}
  }

  function status(message){
    const node = el('affiliateLinkSettingsStatus');
    if(node) node.textContent = message || '';
  }

  function preview(){
    const origin = location.origin.replace(/\/$/,'');
    const code = 'KODE-AFILIASI';
    const data = [
      ['affiliateMainPreview',origin + '/' + code],
      ['affiliateFreePreview',origin + '/' + code + '?paket=gratisan'],
      ['affiliateNewbiePreview',origin + '/' + code + '?paket=pemula'],
      ['affiliateProPreview',origin + '/' + code + '?paket=untung']
    ];
    data.forEach(function(row){ const node=el(row[0]); if(node) node.textContent=row[1]; });
  }

  async function api(path, options){
    const s = session();
    if(!s?.access_token) throw new Error('Sesi admin habis. Silakan login ulang.');
    const opts = options || {};
    const response = await fetch(SUPABASE_URL + path, Object.assign({},opts,{
      headers:Object.assign({
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer ' + s.access_token,
        'Content-Type':'application/json'
      },opts.headers || {})
    }));
    const raw = await response.text();
    let data = null;
    if(raw){try{data=JSON.parse(raw)}catch(_){data=raw}}
    if(!response.ok) throw new Error(data?.message || data?.error || 'Request gagal.');
    return data;
  }

  async function load(){
    if(!el('affiliateSalesLinkCard')) return;
    try{
      const rows = await api('/rest/v1/affiliate_settings?id=eq.1&select=link_main_enabled,link_free_enabled,link_newbie_enabled,link_pro_enabled');
      const s = rows?.[0];
      if(!s) return;
      el('affiliateLinkMainEnabled').checked = s.link_main_enabled !== false;
      el('affiliateLinkFreeEnabled').checked = s.link_free_enabled !== false;
      el('affiliateLinkNewbieEnabled').checked = s.link_newbie_enabled !== false;
      el('affiliateLinkProEnabled').checked = s.link_pro_enabled !== false;
      status('');
    }catch(err){ status('Gagal memuat pengaturan link: ' + (err.message || err)); }
  }

  window.__BADAI_SAVE_AFFILIATE_LINKS__ = async function(){
    if(!el('affiliateSalesLinkCard')) return true;
    const settings = {
      link_main_enabled:!!el('affiliateLinkMainEnabled')?.checked,
      link_free_enabled:!!el('affiliateLinkFreeEnabled')?.checked,
      link_newbie_enabled:!!el('affiliateLinkNewbieEnabled')?.checked,
      link_pro_enabled:!!el('affiliateLinkProEnabled')?.checked,
      updated_at:new Date().toISOString()
    };
    if(!settings.link_main_enabled && !settings.link_free_enabled && !settings.link_newbie_enabled && !settings.link_pro_enabled){
      throw new Error('Aktifkan minimal satu Link Jualan Afiliasi.');
    }
    status('Menyimpan pengaturan link...');
    await api('/rest/v1/affiliate_settings?id=eq.1',{
      method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify(settings)
    });
    status('✓ Link jualan affiliate berhasil disimpan.');
    return true;
  };

  function boot(){
    preview();
    load();
    document.querySelectorAll('[data-marketing-tab="affiliate"],[data-page="marketing"]').forEach(function(node){
      node.addEventListener('click',function(){setTimeout(load,120)});
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
</script>`;

    body = body.replace('</body>', audienceUi + '\n</body>');
    body = body.replace('</body>', affiliateLinkUi + '\n</body>');


    const typographyUi = String.raw`
<style id="badai-admin-typography-final">
  body,button,input,select,textarea,label,p,span,small,a,td,th{
    font-family:"Nunito",Arial,sans-serif!important;
  }
  h1,h2,h3,h4,h5,h6,
  .brand,.page-title,.statement-title,
  .card-head h3,.marketing-card-head h3,
  .affiliate-admin-title b,.dashboard-head h1{
    font-family:"Raleway",Arial,sans-serif!important;
  }
  code,pre,kbd,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important}

  body{font-size:14px!important;line-height:1.52!important}
  .dashboard-head h1{font-size:36px!important;line-height:1.05!important}
  .dashboard-head p{font-size:14px!important;line-height:1.45!important}
  .page-title h2{font-size:30px!important;line-height:1.08!important}
  .page-title p{font-size:14px!important;line-height:1.45!important}
  .admin-tab{font-size:13px!important;min-height:44px!important;padding:0 17px!important}
  .nav-label{font-size:13px!important;font-weight:800!important}

  .stat{padding:17px!important}
  .stat span{font-size:12.5px!important;line-height:1.35!important}
  .stat strong{font-family:"Raleway",Arial,sans-serif!important;font-size:30px!important;line-height:1.05!important}

  .field label,.manage-field label{font-size:13px!important;line-height:1.35!important;font-weight:800!important}
  .field input,.manage-field input,.manage-field select,.manage-field textarea,
  .toolbar input,.toolbar select,.team-form input,.team-form select,
  .finance-report-toolbar select{font-size:14px!important;line-height:1.35!important}
  .field input,.manage-field input,.manage-field select,
  .toolbar input,.toolbar select,.team-form input,.team-form select,
  .finance-report-toolbar select{min-height:46px!important}
  .manage-field textarea{font-size:14px!important;line-height:1.5!important}

  .primary,.secondary,.small-btn,.marketing-save,.payment-add-btn,.finance-add-btn,
  .payment-test-btn,.affiliate-payout-wa,.affiliate-payout-paid,
  .affiliate-material-actions button,.affiliate-material-actions a{
    font-size:13px!important;
    font-weight:800!important;
  }
  .small-btn{min-height:40px!important}

  th{font-size:11.5px!important;line-height:1.35!important}
  td{font-size:13px!important;line-height:1.45!important}
  th,td{padding:14px 12px!important}

  .card-head h3,.marketing-card-head h3,.team-panel h3,
  .statement-title,.affiliate-admin-title b{
    font-size:18px!important;
    line-height:1.2!important;
  }
  .card-head p,.marketing-card-head p,.team-panel>p,
  .statement-note,.manage-note,.price-plan-note,.team-status-note,
  .payment-managed-note,.buatqris-security-note{
    font-size:12.5px!important;
    line-height:1.55!important;
  }

  .coupon-code{font-size:14px!important}
  .coupon-meta,.coupon-row,.affiliate-material-info,
  .affiliate-payout-meta,.affiliate-overview-row{font-size:12.5px!important}

  /* BADAI SALES FINAL FIT — fill 5th stat + compact invoice rows */
  .stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .stat{min-width:0!important}
  .stat-revenue strong{
    font-size:18px!important;
    letter-spacing:-.025em!important;
    white-space:nowrap!important;
  }

  .sales-compact-head,
  .sales-compact-row{
    display:grid!important;
    grid-template-columns:58px minmax(88px,1.05fr) minmax(118px,1.35fr) minmax(88px,1fr) 72px 100px!important;
    gap:7px!important;
    align-items:center!important;
  }
  .sales-compact-head{
    padding:7px 9px!important;
    margin-bottom:5px!important;
    border:1px solid #2c2c2c!important;
    border-radius:10px!important;
    background:#121212!important;
    color:#8e8e8e!important;
    font-size:8px!important;
    font-weight:900!important;
    text-transform:uppercase!important;
    letter-spacing:.03em!important;
  }
  .sales-compact-record{
    margin-bottom:6px!important;
    padding:8px 9px!important;
    border:1px solid #282828!important;
    border-radius:12px!important;
    background:linear-gradient(180deg,#111,#0c0c0c)!important;
  }
  .sales-compact-row{
    min-height:28px!important;
    font-size:9px!important;
    line-height:1.15!important;
  }
  .sales-compact-row>span,.sales-data-row td{min-width:0!important}
  .sales-number{color:#ff91c6!important;font-weight:900!important;white-space:nowrap!important}
  .sales-member-name{
    color:#fff!important;font-weight:900!important;white-space:nowrap!important;
    overflow:hidden!important;text-overflow:ellipsis!important;
  }
  .sales-clip{
    color:#c5c5c5!important;white-space:nowrap!important;
    overflow:hidden!important;text-overflow:ellipsis!important;
  }
  .sales-plan{color:#ff91c6!important;font-size:8px!important;font-weight:900!important;white-space:nowrap!important}
  .sales-date{color:#bdbdbd!important;white-space:nowrap!important}
  .sales-row-actions{
    margin-top:7px!important;padding-top:7px!important;border-top:1px solid #242424!important;gap:5px!important;
  }
  .sales-row-actions .action{
    min-height:27px!important;padding:0 8px!important;font-size:7px!important;
  }
  .sales-data-row td{
    white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
  .sales-action-row td{padding-top:0!important;border-bottom:1px solid #242424!important}
  .sales-action-row .sales-row-actions{margin-top:0!important}

  @media(max-width:760px){
    .stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}
    .stat{padding:8px 7px!important}
    .stat span{font-size:7px!important}
    .stat strong{font-size:16px!important}
    .stat-revenue strong{font-size:12px!important}
  }
  @media(max-width:560px){
    .sales-compact-head,
    .sales-compact-row{
      grid-template-columns:50px minmax(70px,1fr) minmax(92px,1.25fr) minmax(72px,.95fr) 58px 82px!important;
      gap:5px!important;
    }
    .sales-compact-head{font-size:6.8px!important;padding:6px!important}
    .sales-compact-record{padding:7px!important}
    .sales-compact-row{font-size:7.8px!important}
    .sales-plan{font-size:6.8px!important}
    .sales-row-actions .action{font-size:6.5px!important;padding:0 6px!important}
  }

  @media(max-width:760px){
    body{font-size:13.5px!important}
    .dashboard-head h1{font-size:32px!important}
    .page-title h2{font-size:27px!important}
    .dashboard-head p,.page-title p{font-size:13px!important}
    .admin-tab{font-size:12px!important;min-height:42px!important;padding:0 13px!important}
    .nav-label{font-size:12px!important}
    .stat strong{font-size:27px!important}
    .field label,.manage-field label{font-size:12.5px!important}
    .field input,.manage-field input,.manage-field select,.manage-field textarea,
    .toolbar input,.toolbar select,.team-form input,.team-form select,
    .finance-report-toolbar select{font-size:13.5px!important}
    th{font-size:10.5px!important}
    td{font-size:12.5px!important}
    th,td{padding:12px 10px!important}
    .card-head h3,.marketing-card-head h3,.team-panel h3,
    .statement-title,.affiliate-admin-title b{font-size:17px!important}
  }


  /* FINAL SALES SUMMARY — 3 equal cards, no empty slots */
  #pageSales .stats{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:9px!important;
    width:100%!important;
    margin:0 0 10px!important;
  }
  #pageSales .stat{
    min-width:0!important;
    min-height:88px!important;
    padding:13px 15px!important;
    border-radius:16px!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:center!important;
    align-items:flex-start!important;
  }
  #pageSales .stat span{
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:12px!important;
    font-weight:900!important;
    line-height:1.2!important;
    letter-spacing:.02em!important;
  }
  #pageSales .stat strong{
    margin-top:8px!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:29px!important;
    font-weight:900!important;
    line-height:1!important;
  }
  @media(max-width:760px){
    #pageSales .stats{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      gap:7px!important;
    }
    #pageSales .stat{
      min-height:82px!important;
      padding:11px 12px!important;
    }
    #pageSales .stat span{font-size:11px!important}
    #pageSales .stat strong{font-size:27px!important}
  }
  @media(max-width:430px){
    #pageSales .stats{gap:5px!important}
    #pageSales .stat{
      min-height:76px!important;
      padding:9px!important;
    }
    #pageSales .stat span{font-size:9.5px!important}
    #pageSales .stat strong{font-size:24px!important}
  }

  /* FINAL SALES ACTION COLUMN + POPUP */
  .sales-compact-head,
  .sales-compact-row{
    grid-template-columns:34px minmax(82px,1fr) minmax(112px,1.25fr) minmax(84px,.95fr) 60px 86px 82px!important;
  }
  .sales-action-cell{
    min-width:0!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
  }
  .sales-inline-actions{
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:5px!important;
    width:100%!important;
  }
  .sales-action-open,
  .sales-action-delete{
    border:1px solid #5a2944!important;
    background:#1a0f15!important;
    color:#ff8fc5!important;
    min-height:28px!important;
    border-radius:8px!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    cursor:pointer!important;
  }
  .sales-action-open{
    gap:4px!important;
    padding:0 8px!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:7.5px!important;
    font-weight:900!important;
  }
  .sales-action-open span{font-size:11px!important;line-height:1!important}
  .sales-action-delete{
    width:29px!important;
    padding:0!important;
    border-color:#5a2525!important;
    background:#1b0d0d!important;
    color:#ff7979!important;
  }
  .sales-action-delete svg{
    width:13px!important;height:13px!important;fill:none!important;stroke:currentColor!important;
    stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;
  }
  .sales-action-modal-box{width:min(100%,520px)!important}
  .sales-action-modal-head{
    display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;
  }
  .sales-action-modal-head h2{margin:0 0 4px!important}
  .sales-action-modal-head p{margin:0!important}
  .sales-modal-close{
    width:34px!important;height:34px!important;flex:0 0 34px!important;border:1px solid #333!important;
    border-radius:10px!important;background:#111!important;color:#aaa!important;font-size:24px!important;
    line-height:1!important;cursor:pointer!important;
  }
  .sales-action-summary{
    display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:16px 0 4px!important;
  }
  .sales-action-summary>div{
    min-width:0!important;padding:10px 11px!important;border:1px solid #292929!important;
    border-radius:11px!important;background:#0a0a0a!important;
  }
  .sales-action-summary span{
    display:block!important;margin-bottom:3px!important;color:#777!important;font-size:9px!important;
    font-weight:800!important;text-transform:uppercase!important;
  }
  .sales-action-summary strong{
    display:block!important;color:#fff!important;font-family:"Nunito",Arial,sans-serif!important;
    font-size:12px!important;line-height:1.3!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
  .sales-action-select-wrap{margin-top:12px!important}
  .sales-action-select-wrap select{min-height:46px!important;font-size:14px!important;font-weight:800!important}
  .sales-pending-tools{
    margin-top:11px!important;padding:11px!important;border:1px solid #44351b!important;
    border-radius:12px!important;background:#171208!important;
  }
  .sales-pending-tools>span{
    display:block!important;margin-bottom:7px!important;color:#d8bd69!important;font-size:10px!important;font-weight:900!important;
  }
  .sales-pending-tools>div{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:6px!important}
  .sales-pending-tools a{
    min-height:34px!important;border:1px solid #5b4922!important;border-radius:9px!important;
    display:flex!important;align-items:center!important;justify-content:center!important;
    color:#f4d36d!important;text-decoration:none!important;font-size:10px!important;font-weight:900!important;
  }
  .sales-action-modal-actions{margin-top:14px!important}
  @media(max-width:560px){
    .sales-compact-head,
    .sales-compact-row{
      grid-template-columns:28px minmax(66px,1fr) minmax(82px,1.15fr) minmax(66px,.9fr) 50px 72px 68px!important;
      gap:4px!important;
    }
    .sales-action-open{min-height:26px!important;padding:0 5px!important;font-size:6.5px!important}
    .sales-action-delete{width:27px!important;min-height:26px!important}
    .sales-action-summary{grid-template-columns:1fr!important}
  }


  /* FINAL SALES ROW DATA LAYOUT — Member / Afiliasi / Paket / Status */
  .sales-compact-head,
  .sales-compact-row{
    grid-template-columns:30px minmax(165px,1.65fr) minmax(90px,.9fr) minmax(85px,.8fr) 66px 86px 78px!important;
    gap:7px!important;
    align-items:center!important;
  }
  .sales-data-row td{vertical-align:middle!important}
  .sales-member-stack,
  .sales-affiliate-stack,
  .sales-package-stack{
    min-width:0!important;
    display:flex!important;
    flex-direction:column!important;
  }
  .sales-member-stack{gap:3px!important;padding:2px 0!important}
  .sales-member-stack strong{
    color:#fff!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:11px!important;
    font-weight:900!important;
    line-height:1.15!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  .sales-member-contact{
    color:#b9b9b9!important;
    font-size:8.5px!important;
    font-weight:700!important;
    line-height:1.2!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  .sales-affiliate-stack{gap:3px!important}
  .sales-affiliate-stack strong{
    color:#fff!important;
    font-size:9.5px!important;
    font-weight:900!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  .sales-affiliate-stack span{
    color:#8b8b8b!important;
    font-size:7.5px!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  .sales-package-stack{gap:3px!important}
  .sales-package-stack strong{
    color:#ff7fbd!important;
    font-size:9px!important;
    font-weight:900!important;
  }
  .sales-package-stack span{
    color:#c8c8c8!important;
    font-size:8px!important;
    white-space:nowrap!important;
  }
  .sales-status-pill{
    width:max-content!important;
    max-width:100%!important;
    min-height:22px!important;
    padding:0 7px!important;
    border-radius:999px!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:7.5px!important;
    font-weight:900!important;
    line-height:1!important;
  }
  .sales-status-pill.active{background:#10301c!important;color:#71e49a!important}
  .sales-status-pill.pending{background:#30270e!important;color:#f2cf62!important}
  .sales-status-pill.suspended{background:#321414!important;color:#ff8d8d!important}
  .sales-data-row td{padding-top:10px!important;padding-bottom:10px!important}
  .sales-action-cell{align-self:center!important}
  @media(max-width:560px){
    .sales-compact-head,
    .sales-compact-row{
      grid-template-columns:24px minmax(135px,1.55fr) minmax(74px,.85fr) minmax(72px,.78fr) 58px 72px 68px!important;
      gap:4px!important;
    }
    .sales-member-stack strong{font-size:10px!important}
    .sales-member-contact{font-size:7.5px!important}
    .sales-affiliate-stack strong{font-size:8.5px!important}
    .sales-affiliate-stack span{font-size:6.8px!important}
    .sales-package-stack strong{font-size:8px!important}
    .sales-package-stack span{font-size:7px!important}
    .sales-status-pill{font-size:6.8px!important;min-height:20px!important;padding:0 6px!important}
  }


  /* FINAL SALES SIX-COLUMN LIST — date remains only inside action modal */
  #pageSales .sales-compact-head,
  #pageSales .sales-compact-row{
    grid-template-columns:30px minmax(185px,1.8fr) minmax(100px,.95fr) minmax(90px,.85fr) 72px 90px!important;
    gap:8px!important;
    align-items:center!important;
  }
  #pageSales .sales-action-cell{
    justify-content:flex-end!important;
  }
  @media(max-width:560px){
    #pageSales .sales-compact-head,
    #pageSales .sales-compact-row{
      grid-template-columns:24px minmax(145px,1.6fr) minmax(80px,.9fr) minmax(76px,.82fr) 60px 70px!important;
      gap:4px!important;
    }
  }


  /* FINAL SALES FIVE-COLUMN LIST + PENDING FOLLOW-UP */
  #pageSales .sales-compact-head,
  #pageSales .sales-compact-row{
    grid-template-columns:30px minmax(230px,2fr) minmax(130px,1fr) 80px 92px!important;
    gap:9px!important;
    align-items:center!important;
  }
  #pageSales .sales-action-cell{justify-content:flex-end!important}

  .manage-pending-followup{
    width:100%!important;
    box-sizing:border-box!important;
    margin-top:2px!important;
    padding:12px!important;
    border:1px solid #5a4620!important;
    border-radius:12px!important;
    background:#171307!important;
  }
  .manage-pending-followup.hidden{display:none!important}
  .manage-pending-followup-head b{
    display:block!important;
    color:#f4d36d!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:12px!important;
    font-weight:900!important;
  }
  .manage-pending-followup-head span{
    display:block!important;
    margin-top:3px!important;
    color:#a89a6a!important;
    font-size:10.5px!important;
    line-height:1.35!important;
  }
  .manage-pending-followup-actions{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:6px!important;
    margin-top:10px!important;
  }
  .manage-pending-followup-actions a{
    min-height:36px!important;
    padding:0 7px!important;
    border:1px solid #6a5426!important;
    border-radius:9px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    background:#0f0d07!important;
    color:#f4d36d!important;
    text-decoration:none!important;
    text-align:center!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:9px!important;
    font-weight:900!important;
  }
  @media(max-width:560px){
    #pageSales .sales-compact-head,
    #pageSales .sales-compact-row{
      grid-template-columns:24px minmax(165px,1.8fr) minmax(92px,.95fr) 62px 70px!important;
      gap:4px!important;
    }
    .manage-pending-followup-actions{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
      gap:5px!important;
    }
    .manage-pending-followup-actions a{
      min-height:34px!important;
      padding:0 4px!important;
      font-size:8px!important;
    }
  }


  /* FINAL SALES PACKAGE RESTORED — after Member */
  #pageSales .sales-compact-head,
  #pageSales .sales-compact-row{
    grid-template-columns:30px minmax(205px,1.8fr) minmax(78px,.72fr) minmax(120px,1fr) 76px 92px!important;
    gap:8px!important;
    align-items:center!important;
  }
  #pageSales .sales-package-stack{
    min-width:0!important;
    display:flex!important;
    flex-direction:column!important;
    gap:3px!important;
  }
  #pageSales .sales-package-stack strong{
    color:#ff7fbd!important;
    font-size:9px!important;
    font-weight:900!important;
    white-space:nowrap!important;
  }
  #pageSales .sales-package-stack span{
    color:#c8c8c8!important;
    font-size:8px!important;
    white-space:nowrap!important;
  }
  @media(max-width:560px){
    #pageSales .sales-compact-head,
    #pageSales .sales-compact-row{
      grid-template-columns:24px minmax(150px,1.65fr) minmax(66px,.72fr) minmax(86px,.9fr) 60px 70px!important;
      gap:4px!important;
    }
    #pageSales .sales-package-stack strong{font-size:8px!important}
    #pageSales .sales-package-stack span{font-size:7px!important}
  }


  /* FINAL SALES ONE-LINE OVERRIDE */
  #pageSales .sales-compact-head,
  #pageSales .sales-compact-row{
    display:grid!important;
    grid-template-columns:24px minmax(145px,2fr) 64px minmax(82px,.95fr) 60px 72px!important;
    gap:5px!important;
    width:100%!important;
    max-width:100%!important;
    box-sizing:border-box!important;
    align-items:center!important;
    grid-auto-flow:column!important;
  }
  #pageSales .sales-compact-head > *,
  #pageSales .sales-compact-row > *{
    min-width:0!important;
    max-width:100%!important;
    box-sizing:border-box!important;
  }
  #pageSales .sales-compact-head{
    white-space:nowrap!important;
    overflow:hidden!important;
  }
  #pageSales .sales-compact-head span{
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #pageSales .sales-compact-record{
    width:100%!important;
    max-width:100%!important;
    box-sizing:border-box!important;
  }
  #pageSales .sales-member-stack,
  #pageSales .sales-package-stack,
  #pageSales .sales-affiliate-stack{
    min-width:0!important;
    max-width:100%!important;
  }
  #pageSales .sales-member-stack strong,
  #pageSales .sales-member-contact,
  #pageSales .sales-package-stack strong,
  #pageSales .sales-package-stack span,
  #pageSales .sales-affiliate-stack strong,
  #pageSales .sales-affiliate-stack span{
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #pageSales .sales-action-cell{
    min-width:0!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
    white-space:nowrap!important;
  }
  #pageSales .sales-inline-actions{
    display:flex!important;
    flex-wrap:nowrap!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:4px!important;
    width:auto!important;
    min-width:0!important;
  }
  #pageSales .sales-action-open{
    min-height:26px!important;
    padding:0 6px!important;
    font-size:7px!important;
  }
  #pageSales .sales-action-delete{
    width:26px!important;
    min-width:26px!important;
    min-height:26px!important;
  }
  #pageSales .sales-data-row td{
    padding-top:8px!important;
    padding-bottom:8px!important;
    vertical-align:middle!important;
  }
  @media(max-width:560px){
    #pageSales .sales-compact-head,
    #pageSales .sales-compact-row{
      grid-template-columns:20px minmax(120px,1.75fr) 56px minmax(70px,.9fr) 54px 64px!important;
      gap:3px!important;
    }
    #pageSales .sales-action-open{
      padding:0 4px!important;
      font-size:6.4px!important;
    }
    #pageSales .sales-action-delete{
      width:24px!important;
      min-width:24px!important;
    }
  }


  /* FINAL SALES SPACING POLISH */
  #pageSales .sales-compact-head,
  #pageSales .sales-compact-row{
    grid-template-columns:24px minmax(0,1.2fr) minmax(0,.5fr) minmax(0,.6fr) minmax(0,.55fr) minmax(0,.6fr)!important;
    gap:3px!important;
    column-gap:3px!important;
  }
  #pageSales .sales-compact-head{padding:6px 7px!important}
  #pageSales .sales-compact-record{padding:6px 7px!important}
  #pageSales .sales-member-stack{padding-right:3px!important}
  #pageSales .sales-package-stack,
  #pageSales .sales-affiliate-stack{padding:0 2px!important}
  #pageSales .sales-status-pill{margin:0!important}
  #pageSales .sales-action-cell{padding-left:1px!important}
  #pageSales .sales-inline-actions{gap:3px!important}
  #pageSales .sales-action-open{
    min-height:25px!important;
    padding:0 5px!important;
  }
  #pageSales .sales-action-delete{
    width:25px!important;
    min-width:25px!important;
    min-height:25px!important;
  }
  @media(max-width:560px){
    #pageSales .sales-compact-head,
    #pageSales .sales-compact-row{
      grid-template-columns:20px minmax(0,1.25fr) minmax(0,.48fr) minmax(0,.58fr) minmax(0,.52fr) minmax(0,.58fr)!important;
      gap:2px!important;
      column-gap:2px!important;
    }
    #pageSales .sales-compact-head,
    #pageSales .sales-compact-record{
      padding-left:5px!important;
      padding-right:5px!important;
    }
  }

</style>`;

    body = body.replace('</head>', typographyUi + '\n</head>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin v5 gagal dimuat: ' + String(error?.message || error));
  }
};
