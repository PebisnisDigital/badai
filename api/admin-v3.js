const adminHandler = require('./admin-v2.js');
const memberHandler = require('./akses-v2.js');

let compactMemberCache = '';
let compactMemberCacheAt = 0;
const COMPACT_CACHE_MS = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  try {
    const compactAffiliate = String(req?.query?.accesscompact || '') === '1';

    if (compactAffiliate) {
      let memberStatus = 200;
      const memberHeaders = {};
      let memberBody = compactMemberCache;

      if (!memberBody || (Date.now() - compactMemberCacheAt) > COMPACT_CACHE_MS) {
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
<style id="badai-affiliate-super-compact-v2">
  #afiliasi,
  #afiliasi *{
    font-family:"Nunito",Arial,sans-serif!important;
  }
  #afiliasi{font-weight:600!important}
  #afiliasi .center .title{font-size:26px!important;font-weight:700!important;line-height:1.05!important}
  #afiliasi .center .subtitle{font-size:10.5px!important;font-weight:500!important;line-height:1.35!important;margin:4px 0 8px!important}
  #afiliasi .affiliate-pro-pill{font-size:7.5px!important;font-weight:700!important}
  #afiliasi .badai-affiliate-multilink-box>h2{font-size:18px!important;font-weight:700!important;line-height:1.1!important}
  #afiliasi .badai-affiliate-link-intro{font-size:9.5px!important;font-weight:500!important;line-height:1.35!important}
  #afiliasi .badai-affiliate-link-badge{font-size:7.2px!important;font-weight:700!important}
  #afiliasi .badai-affiliate-link-card h3{font-size:11.5px!important;font-weight:600!important;line-height:1.12!important}
  #afiliasi .badai-affiliate-copy,
  #afiliasi .badai-affiliate-open{font-size:8px!important;font-weight:700!important}
  #afiliasi .badai-affiliate-code-line b{font-size:16px!important;font-weight:600!important}
  #afiliasi .badai-affiliate-code-line span{font-size:17px!important;font-weight:600!important}
  #afiliasi .badai-affiliate-edit-code{font-size:10px!important;font-weight:600!important}
  #afiliasi .stats .stat b{font-size:15px!important;font-weight:700!important;line-height:1.15!important}
  #afiliasi .stats .stat span{font-size:10.5px!important;font-weight:500!important;line-height:1.3!important}
  #afiliasi .badai-affiliate-commission-card{
    position:relative!important;
    padding-right:148px!important;
  }
  #afiliasi .badai-affiliate-payout{
    position:absolute!important;
    right:14px!important;
    bottom:13px!important;
    margin:0!important;
    min-height:32px!important;
    height:32px!important;
    padding:0 12px!important;
    border-radius:8px!important;
    background:#25D366!important;
    color:#07170d!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:9.5px!important;
    font-weight:700!important;
    text-decoration:none!important;
  }
  #afiliasi .affiliate-member-heading>div>span{font-size:8.5px!important;font-weight:700!important}
  #afiliasi .affiliate-member-heading h2{font-size:20px!important;font-weight:700!important;line-height:1.08!important}
  #afiliasi .affiliate-member-heading p{font-size:10px!important;font-weight:500!important;line-height:1.35!important}
  #afiliasi .affiliate-rate{font-size:8px!important;font-weight:700!important}
  #afiliasi .affiliate-empty,
  #afiliasi .badai-affiliate-loading,
  #afiliasi .badai-affiliate-empty{font-size:9.5px!important;font-weight:500!important;line-height:1.35!important}
  #afiliasi .center{margin-bottom:5px!important}
  #afiliasi .center .title{font-size:20px!important;line-height:1!important}
  #afiliasi .center .subtitle{font-size:8px!important;margin:3px 0 6px!important}

  #afiliasi .badai-affiliate-multilink-box{
    padding:8px!important;
    border-radius:13px!important;
  }
  #afiliasi .badai-affiliate-multilink-box>h2{
    margin:2px 0!important;
    font-size:14px!important;
    line-height:1.05!important;
  }
  #afiliasi .badai-affiliate-link-intro{
    margin:1px 0 5px!important;
    font-size:7.5px!important;
    line-height:1.2!important;
    color:#818181!important;
  }
  #afiliasi .affiliate-pro-pill{
    min-height:17px!important;
    padding:0 6px!important;
    margin-bottom:3px!important;
    font-size:5.8px!important;
  }
  #afiliasi .badai-affiliate-link-list{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:4px!important;
    margin-top:4px!important;
  }
  #afiliasi .badai-affiliate-link-card{
    min-width:0!important;
    min-height:42px!important;
    padding:6px!important;
    border-radius:9px!important;
    display:grid!important;
    grid-template-columns:auto minmax(0,1fr) auto!important;
    align-items:center!important;
    gap:5px!important;
  }
  #afiliasi .badai-affiliate-link-card p,
  #afiliasi .badai-affiliate-url{
    display:none!important;
  }
  #afiliasi .badai-affiliate-link-badge{
    min-height:17px!important;
    padding:0 5px!important;
    border-radius:999px!important;
    font-size:5.4px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  #afiliasi .badai-affiliate-link-card h3{
    margin:0!important;
    min-width:0!important;
    font-size:9.5px!important;
    line-height:1.05!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #afiliasi .badai-affiliate-link-actions{
    display:flex!important;
    align-items:center!important;
    gap:3px!important;
    margin:0!important;
  }
  #afiliasi .badai-affiliate-copy,
  #afiliasi .badai-affiliate-open{
    min-height:25px!important;
    height:25px!important;
    width:auto!important;
    min-width:0!important;
    padding:0 7px!important;
    border-radius:7px!important;
    font-size:6.2px!important;
    line-height:1!important;
  }
  #afiliasi .badai-affiliate-open{
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
  }
  #afiliasi .badai-affiliate-code-slot{
    margin:4px 0 6px!important;
  }
  #afiliasi .badai-affiliate-code-card{
    min-height:0!important;
    padding:7px 8px!important;
    border-radius:9px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:space-between!important;
    gap:8px!important;
  }
  #afiliasi .badai-affiliate-code-line{
    display:flex!important;
    align-items:baseline!important;
    gap:5px!important;
    flex:1 1 auto!important;
    min-width:0!important;
    flex-wrap:nowrap!important;
    font-family:"Nunito",Arial,sans-serif!important;
  }
  #afiliasi .badai-affiliate-code-line b{
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:15px!important;
    font-weight:500!important;
    line-height:1.1!important;
    white-space:nowrap!important;
  }
  #afiliasi .badai-affiliate-code-line span{
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:16px!important;
    font-weight:500!important;
    line-height:1.1!important;
    color:#ff8fc5!important;
    white-space:nowrap!important;
  }
  #afiliasi .badai-affiliate-edit-code{
    min-height:29px!important;
    height:29px!important;
    margin:0!important;
    padding:0 10px!important;
    border-radius:7px!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:9px!important;
    font-weight:500!important;
    white-space:nowrap!important;
  }
  #afiliasi .badai-affiliate-loading,
  #afiliasi .badai-affiliate-empty{
    grid-column:1/-1!important;
    padding:8px!important;
    font-size:7.5px!important;
  }

  @media(max-width:560px){
    #afiliasi .badai-affiliate-link-list{
      grid-template-columns:1fr!important;
      gap:3px!important;
    }
    #afiliasi .badai-affiliate-link-card{
      min-height:39px!important;
      padding:5px 6px!important;
      grid-template-columns:72px minmax(0,1fr) auto!important;
    }
    #afiliasi .badai-affiliate-link-badge{font-size:5.2px!important}
    #afiliasi .badai-affiliate-link-card h3{font-size:9px!important}
    #afiliasi .badai-affiliate-copy,
    #afiliasi .badai-affiliate-open{
      min-height:24px!important;
      height:24px!important;
      padding:0 6px!important;
      font-size:6px!important;
    }
    #afiliasi .badai-affiliate-commission-card{
      padding-right:128px!important;
    }
    #afiliasi .badai-affiliate-payout{
      right:10px!important;
      bottom:10px!important;
      min-height:29px!important;
      height:29px!important;
      padding:0 9px!important;
      font-size:8.5px!important;
    }
  }
</style>`;

        const compactScript = String.raw`
<script id="badai-affiliate-super-compact-copy-v2">
(function(){
  function compact(){
    var intro=document.querySelector('#afiliasi .badai-affiliate-link-intro');
    if(intro && intro.textContent !== 'Pilih link sesuai cara jualanmu.') intro.textContent='Pilih link sesuai cara jualanmu.';

    var cards=document.querySelectorAll('#afiliasi .badai-affiliate-link-card');
    var titles=['Link Utama','Gratisan','Pemula','Untung'];
    cards.forEach(function(card,i){
      var h=card.querySelector('h3');
      var copy=card.querySelector('.badai-affiliate-copy');
      if(h && titles[i] && h.textContent !== titles[i]) h.textContent=titles[i];
      if(copy && copy.textContent.trim()==='SALIN LINK') copy.textContent='SALIN';
    });
  }

  function start(){
    compact();
    [250,600,1200,2200,4000].forEach(function(ms){ setTimeout(compact,ms); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
</script>`;

        memberBody = memberBody.replace('</head>', compactStyle + '\n</head>');
        memberBody = memberBody.replace('</body>', compactScript + '\n</body>');
        compactMemberCache = memberBody;
        compactMemberCacheAt = Date.now();
      }

      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
      res.status(200).send(memberBody);
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
