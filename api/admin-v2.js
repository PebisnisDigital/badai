const adminHandler = require('./admin.js');

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
`              <div class="manage-field">
                <label>Icon / Emoji</label>
                <input id="socialProofIcon" type="text" maxlength="8" placeholder="🔥"/>
              </div>

              <div class="manage-field">
                <label>Penyebutan Nama</label>`,
`              <div class="manage-field">
                <label>Icon / Emoji</label>
                <input id="socialProofIcon" type="text" maxlength="8" placeholder="🔥"/>
                <div class="price-plan-note">Dipakai kalau link icon di bawah dikosongkan.</div>
              </div>

              <div class="manage-field">
                <label>Link Icon Eksternal</label>
                <input id="socialProofIconUrl" type="url" placeholder="https://.../icon.gif"/>
                <div class="price-plan-note">Bisa direct URL dari Flaticon/CDN. GIF, animated WebP, PNG, SVG, dan JPG didukung.</div>
              </div>

              <div class="manage-field">
                <label>Penyebutan Nama</label>`
    );

    body = body.replace(
`                <select id="socialProofDuration">
                  <option value="3">3 detik</option>`,
`                <select id="socialProofDuration">
                  <option value="2">2 detik</option>
                  <option value="3">3 detik</option>`
    );

    body = body.replace(
`                <select id="socialProofInterval">
                  <option value="5">5 detik</option>`,
`                <select id="socialProofInterval">
                  <option value="2">2 detik</option>
                  <option value="3">3 detik</option>
                  <option value="5">5 detik</option>`
    );

    body = body.replace(
`.social-proof-preview-icon{width:31px;height:31px;display:grid;place-items:center;flex:0 0 31px;border-radius:10px;background:#ff4fa3;color:#090909;font-size:17px}`,
`.social-proof-preview-icon{width:31px;height:31px;display:grid;place-items:center;flex:0 0 31px;border-radius:10px;background:#ff4fa3;color:#090909;font-size:17px;overflow:hidden}.social-proof-preview-icon img{width:100%;height:100%;object-fit:contain;display:block}`
    );

    body = body.replace(
`    const icon = ($sp('socialProofIcon')?.value || '🔥').trim() || '🔥';
    const template = ($sp('socialProofMessage')?.value || '[nama] baru bergabung di [paket] 🎉').trim();`,
`    const icon = ($sp('socialProofIcon')?.value || '🔥').trim() || '🔥';
    const iconUrl = ($sp('socialProofIconUrl')?.value || '').trim();
    const template = ($sp('socialProofMessage')?.value || '[nama] baru bergabung di [paket] 🎉').trim();`
    );

    body = body.replace(
`    if($sp('socialProofPreviewIcon')) $sp('socialProofPreviewIcon').textContent = icon;`,
`    if($sp('socialProofPreviewIcon')){
      const previewIcon = $sp('socialProofPreviewIcon');
      previewIcon.textContent = '';
      if(/^https?:\/\//i.test(iconUrl)){
        const img = document.createElement('img');
        img.alt = 'Icon notifikasi';
        img.src = iconUrl;
        img.onerror = () => { previewIcon.textContent = icon; };
        previewIcon.appendChild(img);
      }else{
        previewIcon.textContent = icon;
      }
    }`
    );

    body = body.replace(
`      $sp('socialProofIcon').value = s.icon || '🔥';`,
`      $sp('socialProofIcon').value = s.icon || '🔥';
      $sp('socialProofIconUrl').value = s.icon_url || '';`
    );

    body = body.replace(
`        icon:($sp('socialProofIcon').value || '🔥').trim() || '🔥',
        message_template:($sp('socialProofMessage').value || '').trim(),`,
`        icon:($sp('socialProofIcon').value || '🔥').trim() || '🔥',
        icon_url:($sp('socialProofIconUrl').value || '').trim() || null,
        message_template:($sp('socialProofMessage').value || '').trim(),`
    );

    body = body.replace(
`      if(!body.message_template) throw new Error('Redaksi notifikasi wajib diisi.');`,
`      if(!body.message_template) throw new Error('Redaksi notifikasi wajib diisi.');
      if(body.icon_url && !/^https?:\/\//i.test(body.icon_url)) throw new Error('Link icon harus diawali http:// atau https://.');`
    );

    body = body.replace(
`    ['socialProofEnabled','socialProofTarget','socialProofPlacement','socialProofIcon','socialProofMessage','socialProofNameStyle','socialProofDuration','socialProofInterval']
      .forEach(id => $sp(id)?.addEventListener(id === 'socialProofMessage' || id === 'socialProofIcon' ? 'input' : 'change', renderPreview));`,
`    ['socialProofEnabled','socialProofTarget','socialProofPlacement','socialProofIcon','socialProofIconUrl','socialProofMessage','socialProofNameStyle','socialProofDuration','socialProofInterval']
      .forEach(id => $sp(id)?.addEventListener(['socialProofMessage','socialProofIcon','socialProofIconUrl'].includes(id) ? 'input' : 'change', renderPreview));`
    );

    body = body.replace(
`            <div class="social-proof-note">Data yang diputar hanya berasal dari <b>pembayaran berstatus LUNAS</b>. Nama publik dibatasi ke nama depan / inisial supaya data member tetap aman.</div>`,
`            <div class="social-proof-note">Data yang diputar hanya berasal dari <b>pembayaran berstatus LUNAS</b>. Nama publik dibatasi ke nama depan / inisial supaya data member tetap aman. Untuk icon animasi, gunakan direct URL file seperti <b>.gif</b> atau animated <b>.webp</b>.</div>`
    );

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin v2 gagal dimuat: ' + String(error?.message || error));
  }
};
