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
  /* BADAI COMPACT HEADING TYPOGRAPHY */
  #afiliasi h1,
  #afiliasi h2,
  #afiliasi h3,
  #afiliasi h4,
  #afiliasi h5,
  #afiliasi h6,
  #afiliasi .title{
    font-family:"Raleway",Arial,sans-serif!important;
  }
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
  #afiliasi .stats .stat b{font-size:17px!important;font-weight:800!important;line-height:1.15!important}
  #afiliasi .stats .stat span{font-size:12.5px!important;font-weight:600!important;line-height:1.3!important}
  #afiliasi .badai-affiliate-commission-card{
    position:static!important;
    padding-right:10px!important;
  }
  #afiliasi .badai-affiliate-payout-row{
    display:flex!important;
    justify-content:flex-end!important;
    align-items:center!important;
    margin:2px 0 12px!important;
  }
  #afiliasi .badai-affiliate-payout{
    position:static!important;
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
  #afiliasi .badai-referral-card{
    margin-top:6px!important;
  }
  #afiliasi .affiliate-member-heading>div>span{font-size:10px!important;font-weight:800!important}
  #afiliasi .affiliate-member-heading h2{font-size:22px!important;font-weight:800!important;line-height:1.08!important}
  #afiliasi .affiliate-member-heading p{font-size:12px!important;font-weight:600!important;line-height:1.4!important}
  #afiliasi .affiliate-rate{font-size:10px!important;font-weight:800!important}
  #afiliasi .affiliate-empty,
  #afiliasi .badai-affiliate-loading,
  #afiliasi .badai-affiliate-empty{font-size:11.5px!important;font-weight:600!important;line-height:1.45!important}
  #afiliasi .center{margin-bottom:9px!important}
  #afiliasi .center .title{font-size:28px!important;font-weight:800!important;line-height:1.05!important}
  #afiliasi .center .subtitle{font-size:11px!important;font-weight:600!important;margin:5px 0 9px!important;color:#a7a7a7!important}
  #afiliasi .badai-affiliate-tabs{
    gap:7px!important;
    margin:0 0 14px!important;
    padding:7px!important;
    border-radius:15px!important;
  }
  #afiliasi .badai-affiliate-tab{
    min-height:50px!important;
    padding:0 10px!important;
    border-radius:11px!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:14px!important;
    font-weight:800!important;
    line-height:1.18!important;
    white-space:normal!important;
  }
  #afiliasi .badai-affiliate-panel.active{display:block!important}
  #afiliasi .badai-affiliate-tutorial.active{display:grid!important}
  #afiliasi .badai-affiliate-video-placeholder{
    width:100%!important;
    max-width:none!important;
    max-height:none!important;
    min-height:0!important;
    aspect-ratio:16/9!important;
    border-radius:16px!important;
    padding:18px!important;
  }
  #afiliasi .badai-affiliate-video-placeholder .play{
    width:66px!important;
    height:66px!important;
    margin-bottom:14px!important;
    font-size:25px!important;
  }
  #afiliasi .badai-affiliate-video-placeholder b{
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:23px!important;
    line-height:1.25!important;
    font-weight:800!important;
  }
  #afiliasi .badai-affiliate-video-placeholder span{display:none!important}
  #afiliasi .badai-affiliate-rules,
  #afiliasi .badai-sales-subcard{
    padding:20px!important;
    border-radius:17px!important;
  }
  #afiliasi .badai-affiliate-rules h3,
  #afiliasi .badai-sales-subhead h3{
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:22px!important;
    line-height:1.2!important;
    font-weight:800!important;
  }
  #afiliasi .badai-affiliate-rule-list{
    gap:12px!important;
  }
  #afiliasi .badai-affiliate-rule{
    grid-template-columns:36px 1fr!important;
    gap:12px!important;
    font-size:14.5px!important;
    font-weight:650!important;
    line-height:1.55!important;
  }
  #afiliasi .badai-affiliate-rule i{
    width:36px!important;
    height:36px!important;
    border-radius:10px!important;
    font-size:13px!important;
    font-weight:900!important;
  }
  #afiliasi [data-aff-panel="sales"] .stats{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:5px!important;
  }
  #afiliasi [data-aff-panel="sales"] .stats .stat{
    min-width:0!important;
    padding:10px!important;
  }
  #afiliasi .badai-sales-subhead span{font-size:9.5px!important;font-weight:600!important}
  #afiliasi .badai-referral-row,
  #afiliasi .badai-payout-history-row{
    padding:10px 11px!important;
  }
  #afiliasi .badai-referral-main b{font-size:12.5px!important;font-weight:700!important}
  #afiliasi .badai-referral-main span{font-size:9.5px!important;font-weight:600!important}
  #afiliasi .badai-referral-side strong{font-size:12px!important}
  #afiliasi .badai-referral-side small{font-size:8.5px!important}

  #afiliasi .badai-affiliate-multilink-box{
    padding:8px!important;
    border-radius:13px!important;
  }
  #afiliasi .badai-affiliate-multilink-box>h2{
    margin:4px 0!important;
    font-size:18px!important;
    line-height:1.1!important;
  }
  #afiliasi .badai-affiliate-link-intro{
    margin:2px 0 7px!important;
    font-size:10.5px!important;
    line-height:1.35!important;
    color:#9a9a9a!important;
  }
  #afiliasi .affiliate-pro-pill{
    min-height:17px!important;
    padding:0 6px!important;
    margin-bottom:3px!important;
    font-size:5.8px!important;
  }
  #afiliasi [data-aff-panel="link"].active{
    display:flex!important;
    flex-direction:column!important;
    min-height:calc(100dvh - 245px)!important;
  }
  #afiliasi [data-aff-panel="link"] .badai-affiliate-multilink-box{
    flex:1 1 auto!important;
    display:flex!important;
    flex-direction:column!important;
    min-height:max(520px,calc(100dvh - 255px))!important;
    padding:14px!important;
  }
  #afiliasi .badai-affiliate-link-list{
    display:grid!important;
    grid-template-columns:1fr!important;
    grid-template-rows:repeat(4,minmax(94px,1fr))!important;
    gap:8px!important;
    margin-top:8px!important;
    flex:1 1 auto!important;
  }
  #afiliasi .badai-affiliate-link-card{
    min-width:0!important;
    min-height:0!important;
    padding:11px 12px!important;
    border-radius:11px!important;
    display:grid!important;
    grid-template-columns:auto minmax(0,1fr) auto!important;
    grid-template-areas:"badge title actions" "url url actions"!important;
    align-items:center!important;
    column-gap:9px!important;
    row-gap:7px!important;
  }
  #afiliasi .badai-affiliate-link-card p{
    display:none!important;
  }
  #afiliasi .badai-affiliate-url{
    grid-area:url!important;
    display:block!important;
    margin:0!important;
    padding:9px 10px!important;
    border-radius:9px!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:10.5px!important;
    font-weight:700!important;
    line-height:1.2!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #afiliasi .badai-affiliate-link-badge{
    grid-area:badge!important;
    min-height:22px!important;
    padding:0 7px!important;
    border-radius:999px!important;
    font-size:8px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  #afiliasi .badai-affiliate-link-card h3{
    grid-area:title!important;
    margin:0!important;
    min-width:0!important;
    font-size:14px!important;
    font-weight:800!important;
    line-height:1.15!important;
    white-space:normal!important;
    overflow:visible!important;
    text-overflow:clip!important;
  }
  #afiliasi .badai-affiliate-link-actions{
    grid-area:actions!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:center!important;
    align-items:stretch!important;
    gap:5px!important;
    margin:0!important;
    min-width:82px!important;
    align-self:stretch!important;
  }
  #afiliasi .badai-affiliate-copy,
  #afiliasi .badai-affiliate-open{
    min-height:34px!important;
    height:34px!important;
    width:100%!important;
    min-width:0!important;
    padding:0 10px!important;
    border-radius:8px!important;
    font-size:9px!important;
    font-weight:800!important;
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
    #afiliasi .badai-affiliate-tabs{gap:4px!important;padding:5px!important}
    #afiliasi .badai-affiliate-tab{min-height:46px!important;padding:0 6px!important;font-size:12px!important;line-height:1.15!important}
    #afiliasi [data-aff-panel="sales"] .stats{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
    }
    #afiliasi .badai-affiliate-video-placeholder{
      min-height:190px!important;
    }
    #afiliasi .badai-affiliate-video-placeholder .play{
      width:60px!important;
      height:60px!important;
      font-size:23px!important;
    }
    #afiliasi .badai-affiliate-video-placeholder b{
      font-size:20px!important;
    }
    #afiliasi .badai-affiliate-rules{
      padding:17px!important;
    }
    #afiliasi .badai-affiliate-rules h3{
      font-size:20px!important;
    }
    #afiliasi .badai-affiliate-rule{
      grid-template-columns:34px 1fr!important;
      gap:10px!important;
      font-size:13.5px!important;
    }
    #afiliasi .badai-affiliate-rule i{
      width:34px!important;
      height:34px!important;
      font-size:12px!important;
    }
    #afiliasi [data-aff-panel="link"].active{
      min-height:calc(100dvh - 225px)!important;
    }
    #afiliasi [data-aff-panel="link"] .badai-affiliate-multilink-box{
      min-height:max(500px,calc(100dvh - 235px))!important;
      padding:11px!important;
    }
    #afiliasi .badai-affiliate-link-list{
      grid-template-columns:1fr!important;
      grid-template-rows:repeat(4,minmax(103px,1fr))!important;
      gap:7px!important;
    }
    #afiliasi .badai-affiliate-link-card{
      min-height:0!important;
      padding:10px!important;
      grid-template-columns:1fr auto!important;
      grid-template-areas:"badge actions" "title actions" "url url"!important;
      column-gap:8px!important;
      row-gap:6px!important;
    }
    #afiliasi .badai-affiliate-link-badge{font-size:7px!important}
    #afiliasi .badai-affiliate-link-card h3{font-size:12px!important}
    #afiliasi .badai-affiliate-url{font-size:9.5px!important;padding:8px 9px!important}
    #afiliasi .badai-affiliate-link-actions{min-width:76px!important}
    #afiliasi .badai-affiliate-copy,
    #afiliasi .badai-affiliate-open{
      min-height:30px!important;
      height:30px!important;
      padding:0 7px!important;
      font-size:8px!important;
    }
    #afiliasi .badai-affiliate-commission-card{
      padding-right:8px!important;
    }
    #afiliasi .badai-affiliate-payout-row{
      margin:2px 0 10px!important;
    }
    #afiliasi .badai-affiliate-payout{
      min-height:29px!important;
      height:29px!important;
      padding:0 9px!important;
      font-size:8.5px!important;
    }
    #afiliasi .badai-referral-card{
      margin-top:5px!important;
    }
  }

  /* BADAI ACCESS READABILITY FINAL — override compact tiny fonts */
  #afiliasi .center .title{font-size:30px!important;line-height:1.06!important}
  #afiliasi .center .subtitle{font-size:13px!important;line-height:1.45!important}
  #afiliasi .affiliate-pro-pill{font-size:9px!important}
  #afiliasi .badai-affiliate-multilink-box>h2{font-size:22px!important;line-height:1.15!important}
  #afiliasi .badai-affiliate-link-intro{font-size:12.5px!important;line-height:1.45!important}
  #afiliasi .badai-affiliate-link-badge{font-size:9px!important}
  #afiliasi .badai-affiliate-link-card h3{font-size:15px!important;line-height:1.2!important}
  #afiliasi .badai-affiliate-url{font-size:11px!important;line-height:1.25!important}
  #afiliasi .badai-affiliate-copy,
  #afiliasi .badai-affiliate-open{font-size:10px!important}
  #afiliasi .stats .stat b{font-size:19px!important}
  #afiliasi .stats .stat span{font-size:12.5px!important}
  #afiliasi .affiliate-member-heading>div>span{font-size:11px!important}
  #afiliasi .affiliate-member-heading h2{font-size:24px!important;line-height:1.1!important}
  #afiliasi .affiliate-member-heading p{font-size:13px!important;line-height:1.45!important}
  #afiliasi .affiliate-rate{font-size:11px!important}
  #afiliasi .badai-affiliate-tab{font-size:11px!important;min-height:38px!important}
  #afiliasi .badai-affiliate-video-placeholder b{font-size:20px!important}
  #afiliasi .badai-affiliate-rules h3,
  #afiliasi .badai-sales-subhead h3{font-size:19px!important}
  #afiliasi .badai-affiliate-rule{font-size:13px!important;line-height:1.5!important}
  #afiliasi .badai-sales-subhead span{font-size:11px!important}
  #afiliasi .badai-referral-main b{font-size:14px!important}
  #afiliasi .badai-referral-main span{font-size:11px!important}
  #afiliasi .badai-referral-side strong{font-size:13px!important}
  #afiliasi .badai-referral-side small{font-size:10px!important}
  #afiliasi .badai-affiliate-code-line b{font-size:16px!important}
  #afiliasi .badai-affiliate-code-line span{font-size:17px!important}
  #afiliasi .badai-affiliate-edit-code{font-size:10px!important}
  #afiliasi .badai-affiliate-loading,
  #afiliasi .badai-affiliate-empty{font-size:11px!important;line-height:1.45!important}
  @media(max-width:560px){
    #afiliasi .center .title{font-size:28px!important}
    #afiliasi .center .subtitle{font-size:12px!important}
    #afiliasi .badai-affiliate-tab{font-size:10px!important;min-height:36px!important}
    #afiliasi .badai-affiliate-link-card h3{font-size:14px!important}
    #afiliasi .badai-affiliate-url{font-size:10.5px!important}
    #afiliasi .badai-affiliate-copy,
    #afiliasi .badai-affiliate-open{font-size:9.5px!important}
    #afiliasi .badai-affiliate-payout{font-size:10px!important}
  }


  /* BADAI AFFILIATE FINAL FIT SIZE COMPACT — must stay last */
  #afiliasi .center{
    margin:0 0 16px!important;
    padding-top:4px!important;
  }
  #afiliasi .center .title{
    margin:0!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:36px!important;
    line-height:1.04!important;
    font-weight:900!important;
    letter-spacing:-.035em!important;
  }
  #afiliasi .center .subtitle{
    margin:8px 0 0!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:16px!important;
    line-height:1.4!important;
    font-weight:700!important;
    color:#c6c6c6!important;
  }
  #afiliasi .badai-affiliate-tabs{
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:8px!important;
    margin:0 0 16px!important;
    padding:7px!important;
    border-radius:16px!important;
  }
  #afiliasi .badai-affiliate-tab{
    min-width:0!important;
    min-height:58px!important;
    padding:8px 10px!important;
    border-radius:12px!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:18px!important;
    line-height:1.15!important;
    font-weight:900!important;
    white-space:normal!important;
    text-wrap:balance!important;
    overflow-wrap:anywhere!important;
    transition:transform .18s ease,font-size .18s ease,background .18s ease,border-color .18s ease!important;
  }
  #afiliasi .badai-affiliate-tab.active{
    font-size:19px!important;
    transform:scale(1.025)!important;
  }
  @media(max-width:560px){
    #afiliasi .center{
      margin-bottom:14px!important;
    }
    #afiliasi .center .title{
      font-size:32px!important;
    }
    #afiliasi .center .subtitle{
      margin-top:7px!important;
      font-size:15px!important;
      line-height:1.4!important;
    }
    #afiliasi .badai-affiliate-tabs{
      gap:5px!important;
      padding:5px!important;
    }
    #afiliasi .badai-affiliate-tab{
      min-height:54px!important;
      padding:7px 5px!important;
      font-size:16px!important;
      line-height:1.12!important;
    }
    #afiliasi .badai-affiliate-tab.active{
      font-size:17px!important;
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
