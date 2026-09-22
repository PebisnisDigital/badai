const adminHandler = require('./admin-v2.js');
const memberHandler = require('./akses-v2.js');

module.exports = async function handler(req, res) {
  try {
    const compactAffiliate = String(req?.query?.accesscompact || '') === '1';

    if (compactAffiliate) {
      let memberStatus = 200;
      const memberHeaders = {};
      let memberBody = '';

      const memberCapture = {
        setHeader(name, value){ memberHeaders[String(name).toLowerCase()] = value; return this; },
        status(code){ memberStatus = code; return this; },
        send(payload){ memberBody = payload == null ? '' : String(payload); return this; }
      };

      await memberHandler(req, memberCapture);

      const memberType = String(memberHeaders['content-type'] || '');
      if (memberStatus >= 400 || !memberType.includes('text/html')) {
        Object.entries(memberHeaders).forEach(([k,v]) => res.setHeader(k,v));
        res.status(memberStatus).send(memberBody);
        return;
      }

      const compactStyle = String.raw`
<style id="badai-affiliate-compact-v1">
  .badai-affiliate-multilink-box{padding:11px!important}
  .badai-affiliate-multilink-box>h2{font-size:18px!important;line-height:1.08!important;margin:4px 0 2px!important}
  .badai-affiliate-link-intro{margin:0 0 7px!important;font-size:8px!important;line-height:1.3!important;color:#858585!important}
  .badai-affiliate-link-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;margin-top:6px!important}
  .badai-affiliate-link-card{padding:8px!important;border-radius:11px!important;min-width:0!important}
  .badai-affiliate-link-badge{min-height:17px!important;padding:0 5px!important;font-size:5.8px!important}
  .badai-affiliate-link-card h3{margin:3px 0 1px!important;font-size:10.5px!important;line-height:1.12!important}
  .badai-affiliate-link-card p{margin:0!important;font-size:7px!important;line-height:1.25!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .badai-affiliate-url{margin-top:5px!important;padding:5px 6px!important;border-radius:7px!important;font-size:6.5px!important}
  .badai-affiliate-link-actions{display:flex!important;gap:4px!important;margin-top:5px!important}
  .badai-affiliate-copy,.badai-affiliate-open{min-height:27px!important;border-radius:7px!important;font-size:7px!important}
  .badai-affiliate-copy{flex:1!important;padding:0 7px!important}
  .badai-affiliate-open{min-width:45px!important;padding:0 7px!important}
  .badai-affiliate-edit-wrap{margin-top:6px!important;padding-top:6px!important}
  .badai-affiliate-edit-code{min-height:29px!important;font-size:7px!important;border-radius:8px!important}
  .badai-affiliate-loading,.badai-affiliate-empty{grid-column:1/-1!important;padding:9px!important;font-size:8px!important}
  @media(max-width:520px){
    .badai-affiliate-link-list{grid-template-columns:1fr!important;gap:5px!important}
    .badai-affiliate-multilink-box{padding:9px!important}
    .badai-affiliate-link-card{padding:7px 8px!important}
    .badai-affiliate-link-card h3{font-size:10px!important}
    .badai-affiliate-url{margin-top:4px!important}
    .badai-affiliate-link-actions{margin-top:4px!important}
  }
</style>`;

      const compactScript = String.raw`
<script id="badai-affiliate-compact-copy">
(function(){
  function compact(){
    var intro=document.querySelector('.badai-affiliate-link-intro');
    if(intro) intro.textContent='Pilih link sesuai cara jualanmu.';
    var cards=document.querySelectorAll('.badai-affiliate-link-card');
    var titles=['Link Utama','Masuk Gratis Dulu','Jual Paket Pemula','Jual Paket Untung'];
    var descs=['Bebas pilih paket','Ajak masuk komunitas','Langsung ke Paket Pemula','Langsung ke Paket Untung'];
    cards.forEach(function(card,i){
      var h=card.querySelector('h3');
      var p=card.querySelector('p');
      var copy=card.querySelector('.badai-affiliate-copy');
      if(h&&titles[i]) h.textContent=titles[i];
      if(p&&descs[i]) p.textContent=descs[i];
      if(copy&&copy.textContent==='SALIN LINK') copy.textContent='SALIN';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',compact);
  else compact();
  var target=document.getElementById('afiliasi')||document.body;
  if(typeof MutationObserver!=='undefined') new MutationObserver(compact).observe(target,{childList:true,subtree:true});
  setTimeout(compact,600);
  setTimeout(compact,1400);
})();
</script>`;

      memberBody = memberBody.replace('</head>', compactStyle + '\n</head>');
      memberBody = memberBody.replace('</body>', compactScript + '\n</body>');

      Object.entries(memberHeaders).forEach(([k,v]) => res.setHeader(k,v));
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('Cache-Control','no-store');
      res.status(memberStatus).send(memberBody);
      return;
    }

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
