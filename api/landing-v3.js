const landingHandler = require('./landing-v2.js');

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
`.badai-social-icon{
  width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;
  border-radius:13px;background:#ff4fa3;color:#0a0a0a;font-size:21px;
  box-shadow:0 8px 20px rgba(255,79,163,.18)
}`,
`.badai-social-icon{
  width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;
  border-radius:13px;background:#ff4fa3;color:#0a0a0a;font-size:21px;
  box-shadow:0 8px 20px rgba(255,79,163,.18);overflow:hidden
}
.badai-social-icon img{width:100%;height:100%;display:block;object-fit:contain}`
    );

    body = body.replace(
`    if(icon) icon.textContent = settings?.icon || '🔥';`,
`    if(icon){
      const fallbackIcon = settings?.icon || '🔥';
      const iconUrl = String(settings?.icon_url || '').trim();
      icon.textContent = '';
      if(/^https?:\/\//i.test(iconUrl)){
        const img = document.createElement('img');
        img.alt = 'Icon notifikasi';
        img.src = iconUrl;
        img.onerror = () => { icon.textContent = fallbackIcon; };
        icon.appendChild(img);
      }else{
        icon.textContent = fallbackIcon;
      }
    }`
    );

    body = body.replace(
`      scheduleNext(Math.max(3,Number(settings.interval_seconds || 9)) * 1000);`,
`      scheduleNext(Math.max(2,Number(settings.interval_seconds || 9)) * 1000);`
    );

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI landing v3 gagal dimuat: ' + String(error?.message || error));
  }
};
