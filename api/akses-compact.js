const memberHandler = require('./akses-v2.js');

let cachedHtml = '';
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  try {
    const now = Date.now();
    let body = cachedHtml;
    let statusCode = 200;
    let headers = {};

    if (!body || (now - cachedAt) > CACHE_MS) {
      const capture = {
        setHeader(name, value){ headers[String(name).toLowerCase()] = value; return this; },
        status(code){ statusCode = code; return this; },
        send(payload){ body = payload == null ? '' : String(payload); return this; }
      };

      await memberHandler(req, capture);

      if (statusCode >= 400 || !String(headers['content-type'] || '').includes('text/html')) {
        Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
        res.status(statusCode).send(body);
        return;
      }

      const compactStyle = `
<style id="badai-affiliate-super-compact">
  #afiliasi .center{margin-bottom:6px!important}
  #afiliasi .center .title{font-size:21px!important}
  #afiliasi .center .subtitle{font-size:9px!important;margin:3px 0 7px!important}

  #afiliasi .badai-affiliate-multilink-box{
    padding:9px!important;
    border-radius:14px!important;
  }
  #afiliasi .badai-affiliate-multilink-box>h2{
    margin:2px 0!important;
    font-size:15px!important;
    line-height:1.1!important;
  }
  #afiliasi .badai-affiliate-link-intro{
    margin:1px 0 6px!important;
    font-size:8px!important;
    line-height:1.25!important;
  }
  #afiliasi .affiliate-pro-pill{
    min-height:18px!important;
    padding:0 6px!important;
    font-size:6px!important;
    margin-bottom:4px!important;
  }
  #afiliasi .badai-affiliate-link-list{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:5px!important;
    margin-top:5px!important;
  }
  #afiliasi .badai-affiliate-link-card{
    min-width:0!important;
    padding:7px 8px!important;
    border-radius:10px!important;
    display:grid!important;
    grid-template-columns:auto minmax(0,1fr) auto!important;
    align-items:center!important;
    gap:6px!important;
  }
  #afiliasi .badai-affiliate-link-card p,
  #afiliasi .badai-affiliate-url{
    display:none!important;
  }
  #afiliasi .badai-affiliate-link-badge{
    min-height:18px!important;
    padding:0 6px!important;
    font-size:5.8px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  #afiliasi .badai-affiliate-link-card h3{
    margin:0!important;
    min-width:0!important;
    font-size:10px!important;
    line-height:1.05!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #afiliasi .badai-affiliate-link-actions{
    display:flex!important;
    align-items:center!important;
    gap:4px!important;
    margin:0!important;
  }
  #afiliasi .badai-affiliate-copy,
  #afiliasi .badai-affiliate-open{
    min-height:28px!important;
    height:28px!important;
    border-radius:8px!important;
    font-size:7px!important;
    padding:0 8px!important;
    min-width:0!important;
    width:auto!important;
  }
  #afiliasi .badai-affiliate-open{display:flex!important}
  #afiliasi .badai-affiliate-edit-wrap{
    margin-top:6px!important;
    padding-top:6px!important;
  }
  #afiliasi .badai-affiliate-edit-code{
    min-height:30px!important;
    height:30px!important;
    border-radius:8px!important;
    font-size:7px!important;
  }

  @media(max-width:560px){
    #afiliasi .badai-affiliate-link-list{
      grid-template-columns:1fr!important;
      gap:4px!important;
    }
    #afiliasi .badai-affiliate-link-card{
      padding:6px 7px!important;
      grid-template-columns:74px minmax(0,1fr) auto!important;
    }
    #afiliasi .badai-affiliate-copy,
    #afiliasi .badai-affiliate-open{
      min-height:26px!important;
      height:26px!important;
      padding:0 7px!important;
      font-size:6.5px!important;
    }
  }
</style>`;

      const compactScript = `
<script id="badai-affiliate-super-compact-script">
(function(){
  function compact(){
    document.querySelectorAll('#afiliasi .badai-affiliate-copy').forEach(function(btn){
      if(btn.textContent.trim() === 'SALIN LINK') btn.textContent = 'SALIN';
    });
    var intro = document.querySelector('#afiliasi .badai-affiliate-link-intro');
    if(intro) intro.textContent = 'Pilih link sesuai cara jualanmu.';
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){setTimeout(compact,300)});
  else setTimeout(compact,300);
  setTimeout(compact,900);
  setTimeout(compact,1800);
})();
</script>`;

      body = body.replace('</head>', compactStyle + '\n</head>');
      body = body.replace('</body>', compactScript + '\n</body>');
      cachedHtml = body;
      cachedAt = now;
    }

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI member area compact gagal dimuat: ' + String(error && error.message ? error.message : error));
  }
};
