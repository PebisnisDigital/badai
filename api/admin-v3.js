const adminHandler = require('./admin-v2.js');

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

    body = body.replaceAll(
      '[nama] baru bergabung di [paket] 🎉',
      '[nama] daftar [paket] • [waktu]'
    );

    body = body.replace(
      'Variabel: <b>[nama]</b> <b>[paket]</b> <b>[waktu]</b>',
      'Variabel: <b>[nama]</b> <b>[paket]</b> <b>[waktu]</b><br><span style="color:#777">[waktu] otomatis mengikuti waktu daftar: menit, jam, hari, minggu, bulan, sampai tahun.</span>'
    );

    body = body.replaceAll(
      ".split('[waktu]').join('baru saja')",
      ".split('[waktu]').join('3 menit yang lalu')"
    );

    body = body.replace(
      '<small id="socialProofPreviewTime">baru saja</small>',
      '<small id="socialProofPreviewTime">Contoh waktu otomatis: 3 menit yang lalu</small>'
    );

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI admin v3 gagal dimuat: ' + String(error?.message || error));
  }
};
