module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/admin/index.html`;
    const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Admin/1.0' } });
    if (!source.ok) throw new Error(`Gagal memuat admin (${source.status})`);

    let html = await source.text();

    const style = String.raw`
<style id="badai-social-proof-admin-style">
.social-proof-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.social-proof-switch-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid #2b2b2b;border-radius:11px;background:#0a0a0a;margin-bottom:8px}
.social-proof-switch-copy b{display:block;font-size:10px;color:#fff}
.social-proof-switch-copy span{display:block;margin-top:2px;color:#777;font-size:7px;line-height:1.4}
.social-proof-toggle{position:relative;width:42px;height:24px;flex:0 0 auto}
.social-proof-toggle input{position:absolute;opacity:0;pointer-events:none}
.social-proof-toggle span{position:absolute;inset:0;border-radius:999px;background:#282828;border:1px solid #3a3a3a;transition:.2s}
.social-proof-toggle span:after{content:"";position:absolute;width:18px;height:18px;left:2px;top:2px;border-radius:50%;background:#aaa;transition:.2s}
.social-proof-toggle input:checked + span{background:#ff4fa3;border-color:#ff4fa3}
.social-proof-toggle input:checked + span:after{left:20px;background:#090909}
.social-proof-preview-wrap{margin-top:9px;padding:10px;border:1px dashed #3a2a34;border-radius:12px;background:#090909}
.social-proof-preview-label{margin-bottom:6px;color:#777;font-size:7px;font-weight:900;letter-spacing:.08em}
.social-proof-preview{display:flex;align-items:center;gap:9px;padding:10px 11px;border:1px solid #46243a;border-radius:12px;background:#160d12;box-shadow:0 12px 28px rgba(0,0,0,.22)}
.social-proof-preview-icon{width:31px;height:31px;display:grid;place-items:center;flex:0 0 31px;border-radius:10px;background:#ff4fa3;color:#090909;font-size:17px}
.social-proof-preview-copy{min-width:0}
.social-proof-preview-copy b{display:block;color:#fff;font-size:9px;line-height:1.35}
.social-proof-preview-copy small{display:block;margin-top:2px;color:#858585;font-size:7px}
.social-proof-save-btn{width:100%;min-height:38px;margin-top:9px;border:0;border-radius:10px;background:#ff4fa3;color:#090909;font-size:8px;font-weight:950;cursor:pointer}
.social-proof-save-btn:disabled{opacity:.55;cursor:wait}
.social-proof-note{margin-top:7px;color:#747474;font-size:7px;line-height:1.45}
.social-proof-note b{color:#bbb}
@media(max-width:430px){.social-proof-grid{grid-template-columns:1fr}}
</style>`;

    const card = String.raw`
          <div class="marketing-card" id="socialProofMarketingCard">
            <div class="marketing-card-head">
              <span class="marketing-number">4</span>
              <div><h3>Social Proof Penjualan</h3><p>Tampilkan notifikasi pembelian nyata dari data member yang sudah lunas.</p></div>
            </div>

            <div class="social-proof-switch-row">
              <div class="social-proof-switch-copy">
                <b>Aktifkan Social Proof</b>
                <span>Kalau OFF, notifikasi tidak tampil di Landing Page maupun formulir pendaftaran.</span>
              </div>
              <label class="social-proof-toggle">
                <input id="socialProofEnabled" type="checkbox">
                <span></span>
              </label>
            </div>

            <div class="social-proof-grid">
              <div class="manage-field">
                <label>Tampil di Mana</label>
                <select id="socialProofTarget">
                  <option value="landing">Landing Page saja</option>
                  <option value="registration">Form Pendaftaran saja</option>
                  <option value="both">Landing Page + Form Pendaftaran</option>
                </select>
              </div>

              <div class="manage-field">
                <label>Posisi Notifikasi</label>
                <select id="socialProofPlacement">
                  <option value="top-left">Atas Kiri</option>
                  <option value="top-center">Atas Tengah</option>
                  <option value="top-right">Atas Kanan</option>
                  <option value="bottom-left">Bawah Kiri</option>
                  <option value="bottom-center">Bawah Tengah</option>
                  <option value="bottom-right">Bawah Kanan</option>
                </select>
              </div>

              <div class="manage-field">
                <label>Icon / Emoji</label>
                <input id="socialProofIcon" type="text" maxlength="8" placeholder="🔥"/>
              </div>

              <div class="manage-field">
                <label>Penyebutan Nama</label>
                <select id="socialProofNameStyle">
                  <option value="first">Nama depan — Rina</option>
                  <option value="first_initial">Nama + inisial — Rina S.</option>
                  <option value="masked">Disamarkan — R***</option>
                </select>
              </div>

              <div class="manage-field full">
                <label>Redaksi Notifikasi</label>
                <input id="socialProofMessage" type="text" maxlength="180" placeholder="[nama] baru bergabung di [paket] 🎉"/>
                <div class="price-plan-note">Variabel: <b>[nama]</b> <b>[paket]</b> <b>[waktu]</b></div>
              </div>

              <div class="manage-field">
                <label>Lama Tampil</label>
                <select id="socialProofDuration">
                  <option value="3">3 detik</option>
                  <option value="5">5 detik</option>
                  <option value="7">7 detik</option>
                  <option value="10">10 detik</option>
                </select>
              </div>

              <div class="manage-field">
                <label>Jeda Antar Notifikasi</label>
                <select id="socialProofInterval">
                  <option value="5">5 detik</option>
                  <option value="9">9 detik</option>
                  <option value="15">15 detik</option>
                  <option value="30">30 detik</option>
                </select>
              </div>
            </div>

            <div class="social-proof-preview-wrap">
              <div class="social-proof-preview-label">PREVIEW</div>
              <div class="social-proof-preview">
                <div class="social-proof-preview-icon" id="socialProofPreviewIcon">🔥</div>
                <div class="social-proof-preview-copy">
                  <b id="socialProofPreviewText">Rina baru bergabung di Paket Untung 🎉</b>
                  <small id="socialProofPreviewTime">baru saja</small>
                </div>
              </div>
            </div>

            <button id="saveSocialProofBtn" class="social-proof-save-btn" type="button">SIMPAN SOCIAL PROOF</button>
            <div id="socialProofStatus" class="team-status-note"></div>
            <div class="social-proof-note">Data yang diputar hanya berasal dari <b>pembayaran berstatus LUNAS</b>. Nama publik dibatasi ke nama depan / inisial supaya data member tetap aman.</div>
          </div>`;

    const script = String.raw`
<script id="badai-social-proof-admin-script">
(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  const STORAGE_KEY = 'badai_admin_session';

  const $sp = id => document.getElementById(id);

  function session(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')}catch(_){return null}
  }

  async function spApi(path, options={}){
    const s = session();
    if(!s?.access_token) throw new Error('Silakan login ulang.');
    const headers = Object.assign({
      'apikey':SUPABASE_KEY,
      'Authorization':'Bearer ' + s.access_token,
      'Content-Type':'application/json'
    }, options.headers || {});
    const response = await fetch(SUPABASE_URL + path, Object.assign({}, options, {headers}));
    const text = await response.text();
    let data = null;
    if(text){try{data=JSON.parse(text)}catch(_){data=text}}
    if(!response.ok) throw new Error(data?.message || data?.error || 'Request gagal');
    return data;
  }

  function previewName(){
    const style = $sp('socialProofNameStyle')?.value || 'first';
    if(style === 'first_initial') return 'Rina S.';
    if(style === 'masked') return 'R***';
    return 'Rina';
  }

  function renderPreview(){
    const icon = ($sp('socialProofIcon')?.value || '🔥').trim() || '🔥';
    const template = ($sp('socialProofMessage')?.value || '[nama] baru bergabung di [paket] 🎉').trim();
    let text = template
      .split('[nama]').join(previewName())
      .split('[paket]').join('Paket Untung')
      .split('[waktu]').join('baru saja');
    if($sp('socialProofPreviewIcon')) $sp('socialProofPreviewIcon').textContent = icon;
    if($sp('socialProofPreviewText')) $sp('socialProofPreviewText').textContent = text;
    if($sp('socialProofPreviewTime')) $sp('socialProofPreviewTime').textContent = 'Contoh tampilan • data pembeli nyata';
  }

  async function loadSocialProof(){
    if(!$sp('socialProofEnabled') || !session()?.access_token) return;
    try{
      const rows = await spApi('/rest/v1/social_proof_settings?id=eq.1&select=*');
      const s = rows?.[0];
      if(!s) return;
      $sp('socialProofEnabled').checked = !!s.enabled;
      $sp('socialProofTarget').value = s.target || 'both';
      $sp('socialProofPlacement').value = s.placement || 'bottom-left';
      $sp('socialProofIcon').value = s.icon || '🔥';
      $sp('socialProofMessage').value = s.message_template || '[nama] baru bergabung di [paket] 🎉';
      $sp('socialProofNameStyle').value = s.name_style || 'first';
      $sp('socialProofDuration').value = String(s.duration_seconds || 5);
      $sp('socialProofInterval').value = String(s.interval_seconds || 9);
      renderPreview();
      $sp('socialProofStatus').textContent = '';
    }catch(err){
      $sp('socialProofStatus').textContent = 'Gagal memuat: ' + err.message;
    }
  }

  async function saveSocialProof(){
    const btn = $sp('saveSocialProofBtn');
    const status = $sp('socialProofStatus');
    if(!btn) return;
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'MENYIMPAN...';
    if(status) status.textContent = 'Menyimpan pengaturan...';
    try{
      const s = session();
      const body = {
        enabled:$sp('socialProofEnabled').checked,
        target:$sp('socialProofTarget').value,
        placement:$sp('socialProofPlacement').value,
        icon:($sp('socialProofIcon').value || '🔥').trim() || '🔥',
        message_template:($sp('socialProofMessage').value || '').trim(),
        name_style:$sp('socialProofNameStyle').value,
        duration_seconds:Number($sp('socialProofDuration').value || 5),
        interval_seconds:Number($sp('socialProofInterval').value || 9),
        max_items:20,
        updated_by:s?.user?.id || null
      };
      if(!body.message_template) throw new Error('Redaksi notifikasi wajib diisi.');
      await spApi('/rest/v1/social_proof_settings?id=eq.1', {
        method:'PATCH',
        headers:{'Prefer':'return=minimal'},
        body:JSON.stringify(body)
      });
      if(status) status.textContent = body.enabled
        ? '✓ Social proof aktif dan siap tampil sesuai pengaturan.'
        : '✓ Pengaturan tersimpan. Social proof sedang OFF.';
      renderPreview();
    }catch(err){
      if(status) status.textContent = '✕ ' + err.message;
    }finally{
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function bind(){
    if(!$sp('socialProofMarketingCard')) return;
    ['socialProofEnabled','socialProofTarget','socialProofPlacement','socialProofIcon','socialProofMessage','socialProofNameStyle','socialProofDuration','socialProofInterval']
      .forEach(id => $sp(id)?.addEventListener(id === 'socialProofMessage' || id === 'socialProofIcon' ? 'input' : 'change', renderPreview));
    $sp('saveSocialProofBtn')?.addEventListener('click', saveSocialProof);
    document.querySelectorAll('[data-page="marketing"],[data-marketing-tab="notifications"]').forEach(el => {
      el.addEventListener('click', () => setTimeout(loadSocialProof,120));
    });
    renderPreview();
    setTimeout(loadSocialProof,500);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
</script>`;

    const marker = '        <div class="marketing-category-panel" data-marketing-panel="affiliate">';
    const notificationsEnd = '        </div>\n\n' + marker;
    if (!html.includes(notificationsEnd)) throw new Error('Panel Notifikasi Marketing tidak ditemukan');

    html = html.replace('</head>', style + '\n</head>');
    html = html.replace(notificationsEnd, card + '\n        </div>\n\n' + marker);
    html = html.replace('</body>', script + '\n</body>');

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin gagal dimuat: ' + String(error?.message || error));
  }
};
