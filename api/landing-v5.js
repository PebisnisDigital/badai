const landingHandler = require('./landing-v4.js');

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

    await landingHandler(req, capture);

    const contentType = String(headers['content-type'] || '');
    if (statusCode >= 400 || !contentType.includes('text/html')) {
      Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
      res.status(statusCode).send(body);
      return;
    }

    body = body.replace(
      `    if(meta) meta.innerHTML = '<span class="badai-social-verified">✓ Pembelian terverifikasi</span> • ' + when;`,
      `    if(meta){
      if(item.payment_status === 'paid'){
        meta.innerHTML = '<span class="badai-social-verified">✓ Pembelian terverifikasi</span> • ' + when;
      }else{
        meta.innerHTML = '<span style="color:#ff9aca">◉ Baru mendaftar</span> • ' + when;
      }
    }`
    );

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI landing v5 gagal dimuat: ' + String(error?.message || error));
  }
};
