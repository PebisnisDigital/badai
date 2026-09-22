const adminHandler = require('./admin-v5.js');

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

    const affiliateDataMarker = `          <div class="marketing-card">
            <div class="affiliate-admin-title">
              <div>
                <b>Data Afiliasi</b>`;

    const affiliateLinkCard = String.raw`
          <div class="marketing-card" id="affiliateSalesLinkCard">
            <div class="marketing-card-head">
              <span class="marketing-number">2</span>
              <div>
                <h3>Link Jualan Afiliasi</h3>
                <p>Pilih jenis link yang boleh dipakai affiliate: ke LP utama atau langsung ke paket tertentu.</p>
              </div>
            </div>

            <div class="affiliate-link-setting-list">
              <label class="affiliate-link-setting-row">
                <div class="affiliate-link-setting-copy">
                  <b>Link Utama</b>
                  <span>Masuk ke Landing Page utama. Calon member memilih paket sendiri.</span>
                  <code id="affiliateMainPreview">/KODE-AFILIASI</code>
                </div>
                <span class="affiliate-link-switch">
                  <input id="affiliateLinkMainEnabled" type="checkbox" checked>
                  <span></span>
                </span>
              </label>

              <label class="affiliate-link-setting-row">
                <div class="affiliate-link-setting-copy">
                  <b>Paket Gratisan</b>
                  <span>Untuk affiliate yang ingin mengajak orang masuk komunitas gratis dulu.</span>
                  <code id="affiliateFreePreview">/KODE-AFILIASI?paket=gratisan</code>
                </div>
                <span class="affiliate-link-switch">
                  <input id="affiliateLinkFreeEnabled" type="checkbox" checked>
                  <span></span>
                </span>
              </label>

              <label class="affiliate-link-setting-row">
                <div class="affiliate-link-setting-copy">
                  <b>Paket Pemula</b>
                  <span>Untuk affiliate yang ingin langsung menjual Paket Pemula.</span>
                  <code id="affiliateNewbiePreview">/KODE-AFILIASI?paket=pemula</code>
                </div>
                <span class="affiliate-link-switch">
                  <input id="affiliateLinkNewbieEnabled" type="checkbox" checked>
                  <span></span>
                </span>
              </label>

              <label class="affiliate-link-setting-row">
                <div class="affiliate-link-setting-copy">
                  <b>Paket Untung</b>
                  <span>Untuk affiliate yang ingin langsung menjual Paket Untung.</span>
                  <code id="affiliateProPreview">/KODE-AFILIASI?paket=untung</code>
                </div>
                <span class="affiliate-link-switch">
                  <input id="affiliateLinkProEnabled" type="checkbox" checked>
                  <span></span>
                </span>
              </label>
            </div>

            <div class="affiliate-link-rule-note">
              <b>TRACKING TETAP SATU.</b> Semua link tetap membawa kode affiliate yang sama. Jika orang masuk dari link Gratisan lalu upgrade kemudian, kode referralnya tetap bisa dipakai sebagai sumber affiliate saat alur upgrade kita aktifkan.
            </div>
            <div id="affiliateLinkSettingsStatus" class="team-status-note"></div>
          </div>
`;

    if (!body.includes(affiliateDataMarker)) {
      throw new Error('Panel Data Afiliasi tidak ditemukan');
    }
    body = body.replace(affiliateDataMarker, affiliateLinkCard + '\n' + affiliateDataMarker);

    // Keep the existing global "SIMPAN PENGATURAN" button as the single save action.
    body = body.replace(
      `      if(window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__) {
        await window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__();
      }`,
      `      if(window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__) {
        await window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__();
      }
      if(window.__BADAI_SAVE_AFFILIATE_LINKS__) {
        await window.__BADAI_SAVE_AFFILIATE_LINKS__();
      }`
    );

    const style = String.raw`
<style id="badai-affiliate-link-admin-style">
  .affiliate-link-setting-list{display:grid;gap:7px}
  .affiliate-link-setting-row{
    display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;
    padding:10px 11px;border:1px solid #262626;border-radius:12px;background:#090909
  }
  .affiliate-link-setting-copy{min-width:0}
  .affiliate-link-setting-copy b{display:block;color:#fff;font-size:9px}
  .affiliate-link-setting-copy span{display:block;margin-top:2px;color:#7e7e7e;font-size:7px;line-height:1.45}
  .affiliate-link-setting-copy code{
    display:block;margin-top:6px;padding:6px 8px;border:1px solid #242424;border-radius:8px;
    background:#050505;color:#ff8fc5;font:700 7px ui-monospace,SFMono-Regular,Menlo,monospace;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis
  }
  .affiliate-link-switch{position:relative;width:42px;height:24px;flex:0 0 42px}
  .affiliate-link-switch input{position:absolute;opacity:0;pointer-events:none}
  .affiliate-link-switch>span{
    position:absolute;inset:0;border-radius:999px;background:#282828;border:1px solid #3a3a3a;transition:.2s
  }
  .affiliate-link-switch>span:after{
    content:"";position:absolute;width:18px;height:18px;left:2px;top:2px;border-radius:50%;background:#aaa;transition:.2s
  }
  .affiliate-link-switch input:checked+span{background:#ff4fa3;border-color:#ff4fa3}
  .affiliate-link-switch input:checked+span:after{left:20px;background:#090909}
  .affiliate-link-rule-note{
    margin-top:9px;padding:9px 10px;border:1px dashed #472b3a;border-radius:10px;
    background:#120b0f;color:#8f8f8f;font-size:7px;line-height:1.5
  }
  .affiliate-link-rule-note b{color:#ff8fc5}
</style>`;

    const script = String.raw`
<script id="badai-affiliate-link-admin-script">
(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  const STORAGE_KEY = 'badai_admin_session';
  const el = id => document.getElementById(id);

  function readSession(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')}catch(_){return null}
  }

  function setStatus(message){
    const node = el('affiliateLinkSettingsStatus');
    if(node) node.textContent = message || '';
  }

  function renderPreview(){
    const origin = location.origin.replace(/\/$/,'');
    const code = 'KODE-AFILIASI';
    const rows = [
      ['affiliateMainPreview', origin + '/' + code],
      ['affiliateFreePreview', origin + '/' + code + '?paket=gratisan'],
      ['affiliateNewbiePreview', origin + '/' + code + '?paket=pemula'],
      ['affiliateProPreview', origin + '/' + code + '?paket=untung']
    ];
    rows.forEach(function(row){
      const node = el(row[0]);
      if(node) node.textContent = row[1];
    });
  }

  async function request(path, options){
    const session = readSession();
    if(!session?.access_token) throw new Error('Sesi admin habis. Silakan login ulang.');
    const response = await fetch(SUPABASE_URL + path, Object.assign({}, options || {}, {
      headers:Object.assign({
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer ' + session.access_token,
        'Content-Type':'application/json'
      }, options?.headers || {})
    }));
    const raw = await response.text();
    let data = null;
    if(raw){try{data=JSON.parse(raw)}catch(_){data=raw}}
    if(!response.ok) throw new Error(data?.message || data?.error || 'Request gagal.');
    return data;
  }

  async function loadSettings(){
    if(!el('affiliateSalesLinkCard')) return;
    try{
      const rows = await request('/rest/v1/affiliate_settings?id=eq.1&select=link_main_enabled,link_free_enabled,link_newbie_enabled,link_pro_enabled');
      const settings = rows?.[0];
      if(!settings) return;
      el('affiliateLinkMainEnabled').checked = settings.link_main_enabled !== false;
      el('affiliateLinkFreeEnabled').checked = settings.link_free_enabled !== false;
      el('affiliateLinkNewbieEnabled').checked = settings.link_newbie_enabled !== false;
      el('affiliateLinkProEnabled').checked = settings.link_pro_enabled !== false;
      setStatus('');
    }catch(err){
      setStatus('Gagal memuat pengaturan link: ' + (err.message || err));
    }
  }

  window.__BADAI_SAVE_AFFILIATE_LINKS__ = async function(){
    if(!el('affiliateSalesLinkCard')) return true;
    const body = {
      link_main_enabled:!!el('affiliateLinkMainEnabled')?.checked,
      link_free_enabled:!!el('affiliateLinkFreeEnabled')?.checked,
      link_newbie_enabled:!!el('affiliateLinkNewbieEnabled')?.checked,
      link_pro_enabled:!!el('affiliateLinkProEnabled')?.checked,
      updated_at:new Date().toISOString()
    };

    if(!Object.values(body).some(function(v){ return v === true; })){
      throw new Error('Aktifkan minimal satu Link Jualan Afiliasi.');
    }

    setStatus('Menyimpan pengaturan link...');
    await request('/rest/v1/affiliate_settings?id=eq.1', {
      method:'PATCH',
      headers:{'Prefer':'return=minimal'},
      body:JSON.stringify(body)
    });
    setStatus('✓ Link jualan affiliate berhasil disimpan.');
    return true;
  };

  function boot(){
    renderPreview();
    loadSettings();
    document.querySelectorAll('[data-marketing-tab="affiliate"],[data-page="marketing"]').forEach(function(node){
      node.addEventListener('click', function(){ setTimeout(loadSettings,120); });
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;

    body = body.replace('</head>', style + '\n</head>');
    body = body.replace('</body>', script + '\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin v6 gagal dimuat: ' + String(error?.message || error));
  }
};
