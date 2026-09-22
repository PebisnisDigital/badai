const adminHandler = require('./admin-v3.js');

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

    body = body.replace(
      '<button id="saveSocialProofBtn" class="social-proof-save-btn" type="button">SIMPAN SOCIAL PROOF</button>',
      '<div class="social-proof-note" style="margin-top:10px;padding:9px 10px;border:1px dashed #3a2a34;border-radius:10px">Pengaturan Social Proof disimpan lewat tombol <b>SIMPAN PENGATURAN</b> di bagian bawah.</div>'
    );

    const oldSubmit = `  $('marketingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try{ await saveMarketing(); }
    catch(err){ $('marketingStatus').textContent = err.message; }
  });`;

    const newSubmit = `  $('marketingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('saveMarketingBtn');
    const originalText = btn ? btn.textContent : 'SIMPAN PENGATURAN';
    try{
      await saveMarketing();
      if(btn){ btn.disabled = true; btn.textContent = 'MENYIMPAN...'; }
      $('marketingStatus').textContent = 'Menyimpan Social Proof...';
      if(window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__) {
        await window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__();
      }
      $('marketingStatus').textContent = '✓ Semua pengaturan marketing berhasil disimpan.';
      const spStatus = document.getElementById('socialProofStatus');
      if(spStatus) spStatus.textContent = '✓ Social Proof ikut tersimpan.';
    }
    catch(err){
      $('marketingStatus').textContent = '✕ ' + (err.message || 'Gagal menyimpan pengaturan.');
      const spStatus = document.getElementById('socialProofStatus');
      if(spStatus) spStatus.textContent = '✕ ' + (err.message || 'Gagal menyimpan Social Proof.');
    }
    finally{
      if(btn){ btn.disabled = false; btn.textContent = originalText; }
    }
  });`;

    if (!body.includes(oldSubmit)) {
      throw new Error('Handler SIMPAN PENGATURAN tidak ditemukan');
    }
    body = body.replace(oldSubmit, newSubmit);

    const helper = String.raw`
<script id="badai-social-proof-general-save">
(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  const STORAGE_KEY = 'badai_admin_session';

  const el = id => document.getElementById(id);

  function readSession(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')}catch(_){return null}
  }

  window.__BADAI_SAVE_SOCIAL_PROOF_GENERAL__ = async function(){
    const session = readSession();
    if(!session?.access_token) throw new Error('Sesi admin habis. Silakan login ulang.');

    const message = String(el('socialProofMessage')?.value || '').trim();
    const iconUrl = String(el('socialProofIconUrl')?.value || '').trim();
    if(!message) throw new Error('Redaksi Social Proof wajib diisi.');
    if(iconUrl && !/^https?:\/\//i.test(iconUrl)) throw new Error('Link icon Social Proof harus diawali http:// atau https://.');

    const payload = {
      p_enabled:!!el('socialProofEnabled')?.checked,
      p_target:el('socialProofTarget')?.value || 'both',
      p_placement:el('socialProofPlacement')?.value || 'bottom-left',
      p_icon:String(el('socialProofIcon')?.value || '🔥').trim() || '🔥',
      p_icon_url:iconUrl || null,
      p_message_template:message,
      p_name_style:el('socialProofNameStyle')?.value || 'first',
      p_duration_seconds:Number(el('socialProofDuration')?.value || 5),
      p_interval_seconds:Number(el('socialProofInterval')?.value || 9),
      p_max_items:20
    };

    const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_save_social_proof_settings', {
      method:'POST',
      headers:{
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer ' + session.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify(payload)
    });

    const raw = await response.text();
    let data = null;
    if(raw){ try{ data = JSON.parse(raw); }catch(_){ data = raw; } }
    if(!response.ok){
      throw new Error(data?.message || data?.error || 'Gagal menyimpan Social Proof.');
    }
    return data;
  };
})();
</script>`;

    body = body.replace('</body>', helper + '\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin v4 gagal dimuat: ' + String(error?.message || error));
  }
};
