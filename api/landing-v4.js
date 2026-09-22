const landingHandler = require('./landing-v3.js');

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
`  function relativeTime(value){
    const time = new Date(value).getTime();
    if(!Number.isFinite(time)) return 'baru saja';
    const diff = Math.max(0, Date.now() - time);
    const minute = 60000, hour = 3600000, day = 86400000;
    if(diff < minute) return 'baru saja';
    if(diff < hour) return Math.max(1,Math.floor(diff/minute)) + ' menit lalu';
    if(diff < day) return Math.max(1,Math.floor(diff/hour)) + ' jam lalu';
    const days = Math.max(1,Math.floor(diff/day));
    return days === 1 ? 'kemarin' : days + ' hari lalu';
  }`,
`  function relativeTime(value){
    const time = new Date(value).getTime();
    if(!Number.isFinite(time)) return 'waktu pendaftaran tidak diketahui';
    const diff = Math.max(0, Date.now() - time);
    const minute = 60000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if(diff < minute) return 'kurang dari 1 menit yang lalu';
    if(diff < hour) return Math.max(1,Math.floor(diff/minute)) + ' menit yang lalu';
    if(diff < day) return Math.max(1,Math.floor(diff/hour)) + ' jam yang lalu';
    if(diff < week) return Math.max(1,Math.floor(diff/day)) + ' hari yang lalu';
    if(diff < month) return Math.max(1,Math.floor(diff/week)) + ' minggu yang lalu';
    if(diff < year) return Math.max(1,Math.floor(diff/month)) + ' bulan yang lalu';
    return Math.max(1,Math.floor(diff/year)) + ' tahun yang lalu';
  }`
    );

    body = body.replaceAll("[nama] baru bergabung di [paket] 🎉", "[nama] daftar [paket] • [waktu]");

    body = body.replaceAll(
`      if(!response.ok && response.status !== 409){
        throw new Error('Gagal menyimpan pendaftaran');
      }`,
`      if(!response.ok && response.status !== 409){
        let registrationError = 'Gagal menyimpan pendaftaran';
        try{
          const errorData = await response.clone().json();
          registrationError = errorData?.message || errorData?.error_description || errorData?.error || registrationError;
        }catch(_){ }
        throw new Error(registrationError);
      }`
    );

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI landing v4 gagal dimuat: ' + String(error?.message || error));
  }
};
