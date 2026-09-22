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

    body = body.replace(
      `$sp('socialProofTarget').value = s.target || 'both';`,
      `$sp('socialProofTarget').value = s.target || 'both';\n      if($sp('socialProofAudienceMode')) $sp('socialProofAudienceMode').value = s.audience_mode || 'paid';`
    );

    body = body.replace(
      `p_max_items:20`,
      `p_max_items:20,\n      p_audience_mode:el('socialProofAudienceMode')?.value || 'paid'`
    );

    body = body.replace(
      `if($sp('socialProofPreviewTime')) $sp('socialProofPreviewTime').textContent = 'Contoh tampilan • data pembeli nyata';`,
      `if($sp('socialProofPreviewTime')) $sp('socialProofPreviewTime').textContent = ($sp('socialProofAudienceMode')?.value === 'registrations')\n      ? 'Contoh • semua pendaftar, lunas maupun belum lunas'\n      : 'Contoh • pembelian terverifikasi';`
    );

    body = body.replaceAll(
      'Data yang diputar hanya berasal dari <b>pembayaran berstatus LUNAS</b>.',
      'Sumber data mengikuti pilihan <b>Data Social Proof</b>: semua pendaftar atau pembeli yang sudah lunas.'
    );

    body = body.replace(
      '<select id="managePlan">\n          <option value="newbie">Paket Pemula — Belajar AI + Update</option>',
      '<select id="managePlan">\n          <option value="free">Paket Gratisan — Komunitas + KulWA</option>\n          <option value="newbie">Paket Pemula — Belajar AI + Update</option>'
    );

    body = body.replace(
      `function planBadge(plan){\n    const value = plan === 'pro' ? 'PAKET UNTUNG' : 'PAKET PEMULA';\n    return '<span class="plan-badge ' + (plan === 'pro' ? 'pro' : 'newbie') + '">' + value + '</span>';\n  }`,
      `function planBadge(plan){\n    let value = 'PAKET PEMULA';\n    let cls = 'newbie';\n    if(plan === 'free'){ value = 'PAKET GRATISAN'; cls = 'free'; }\n    else if(plan === 'pro'){ value = 'PAKET UNTUNG'; cls = 'pro'; }\n    return '<span class="plan-badge ' + cls + '">' + value + '</span>';\n  }`
    );

    const audienceUi = String.raw`
<style id="badai-free-member-admin-style">
  .plan-badge.free{
    background:#171717!important;
    border:1px solid #3b3b3b!important;
    color:#d7d7d7!important;
  }
</style>
<script id="badai-social-proof-audience-ui">
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
        '<option value="registrations">Semua pendaftar — sudah / belum bayar</option>' +
        '<option value="paid">Pembeli lunas saja</option>' +
      '</select>' +
      '<div class="price-plan-note">Landing Page otomatis mengikuti pilihan ini.</div>';
    targetField.insertAdjacentElement('afterend', field);

    const select = document.getElementById('socialProofAudienceMode');
    select?.addEventListener('change', function(){
      const preview = document.getElementById('socialProofPreviewTime');
      if(preview){
        preview.textContent = select.value === 'registrations'
          ? 'Contoh • semua pendaftar, lunas maupun belum lunas'
          : 'Contoh • pembelian terverifikasi';
      }
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

  function boot(){
    ensureAudienceField();
    ensureFreePlanOption();
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
