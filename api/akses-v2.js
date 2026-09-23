module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/akses/index.html`;
    const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Member-Area/1.0' } });
    if (!source.ok) throw new Error(`Gagal memuat member area (${source.status})`);

    let html = await source.text();

    const flaticonUicons = '<link rel="stylesheet" href="https://cdn-uicons.flaticon.com/3.0.0/uicons-regular-rounded/css/uicons-regular-rounded.css">';

    const style = String.raw`
<style id="badai-member-v4-style">
  .hero{display:none!important}
  #chapterGrid .card .meta,#chapterGrid .card p,#chapterGrid .card .arrow{display:none!important}
  #chapterGrid .card h3{margin:9px 1px 2px!important;line-height:1.2!important}
  #chapterGrid .card{padding-bottom:11px!important}

  .footer{
    background:rgba(0,0,0,.98)!important;border-top:1px solid #1f1f1f!important;
    box-shadow:0 -8px 24px rgba(0,0,0,.18)!important;
    grid-template-columns:repeat(5,minmax(0,1fr))!important
  }
  .footer #affiliateNavButton{display:flex!important}
  .footer button{background:transparent!important;color:#fff!important}
  .footer button:hover,.footer button.active{background:#ff4fa3!important;color:#111!important}
  .footer .label{color:inherit!important;font-family:"Nunito",Arial,sans-serif!important;font-size:11px!important;font-weight:600!important;line-height:1.05!important;letter-spacing:0!important}
  .footer .emoji .fi{display:block;font-size:17px;line-height:1;color:currentColor}
  .footer button.is-plan-locked{position:relative;opacity:.46}
  .footer button.is-plan-locked::after{content:"🔒";position:absolute;top:4px;right:calc(50% - 24px);font-size:8px;line-height:1}

  .badai-member-header{
    position:sticky;top:0;z-index:80;width:100%;min-height:64px;display:flex;align-items:center;
    justify-content:space-between;gap:14px;padding:10px 14px;background:rgba(7,7,7,.96);
    border-bottom:1px solid #242424;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)
  }
  .badai-member-header-logo{display:flex;align-items:center;min-width:0;text-decoration:none}
  .badai-member-header-logo img{display:block;width:auto;height:34px;max-width:210px;object-fit:contain}
  .badai-member-help{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:0 14px;border-radius:999px;background:#25D366;color:#07170d;text-decoration:none;font-family:"Nunito",Arial,sans-serif;font-size:10px;font-weight:700;box-shadow:0 8px 24px rgba(37,211,102,.22);border:1px solid rgba(255,255,255,.08)}

  .community-wrap{display:grid;gap:11px}
  .community-hero{position:relative;overflow:hidden;padding:20px;border-radius:24px;background:linear-gradient(145deg,#151515,#090909);border:1px solid #282828;box-shadow:0 16px 46px rgba(0,0,0,.28)}
  .community-hero::after{content:"";position:absolute;width:130px;height:130px;border-radius:50%;right:-62px;top:-70px;background:rgba(255,79,163,.18)}
  .community-kicker{position:relative;z-index:1;color:#ff8fc5;font:700 9px "Nunito",Arial,sans-serif;letter-spacing:.08em}
  .community-hero h1{position:relative;z-index:1;margin:6px 0 7px;color:#fff;font:800 28px "Raleway",Arial,sans-serif;line-height:1.02;letter-spacing:-.045em}
  .community-hero p{position:relative;z-index:1;margin:0;color:#aaa;font:500 11px "Nunito",Arial,sans-serif;line-height:1.5;max-width:470px}
  .community-plan-pill{position:relative;z-index:1;display:inline-flex;align-items:center;gap:6px;margin-top:14px;min-height:30px;padding:0 11px;border-radius:999px;background:#24101a;border:1px solid #64304c;color:#ff91c6;font:700 9px "Nunito",Arial,sans-serif}
  .community-wa{padding:16px;border-radius:21px;background:#111;border:1px solid #252525;display:grid;grid-template-columns:46px 1fr;gap:12px;align-items:center}
  .community-wa-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:#0d2818;font-size:23px}
  .community-wa h2{margin:0 0 3px;color:#fff;font:800 16px "Raleway",Arial,sans-serif}
  .community-wa p{margin:0;color:#999;font:500 10px "Nunito",Arial,sans-serif;line-height:1.45}
  .community-wa a{grid-column:1/-1;display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:13px;background:#25D366;color:#07170d;text-decoration:none;font:800 11px "Nunito",Arial,sans-serif}
  .community-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .community-access-card{padding:14px;border-radius:20px;background:#111;border:1px solid #252525;display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center}
  .community-access-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#0d2818;font-size:21px}
  .community-access-card h2{margin:0 0 3px;color:#fff;font:700 15px "Nunito",Arial,sans-serif}
  .community-access-card p{margin:0;color:#999;font:500 9.5px "Nunito",Arial,sans-serif;line-height:1.4}
  .community-access-card a{grid-column:1/-1;display:flex;align-items:center;justify-content:center;min-height:39px;border-radius:11px;background:#25D366;color:#07170d;text-decoration:none;font:700 10px "Nunito",Arial,sans-serif}
  .community-access-card.channel a{background:#ff4fa3;color:#111}
  .gratisan-offer-card{
    width:min(100%,520px);margin:0 auto;padding:18px;border-radius:22px;
    background:linear-gradient(180deg,#141414,#0d0d0d);border:1px solid #2a2a2a;
    box-shadow:0 18px 48px rgba(0,0,0,.28);font-family:"Nunito",Arial,sans-serif
  }
  .gratisan-offer-label{margin:0 0 14px;color:#fff;font-size:25px;font-weight:800;text-align:center;line-height:1.1}
  .gratisan-value-list{display:grid;gap:7px}
  .gratisan-value-row{display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:9px;padding:11px 12px;border-radius:12px;background:#0a0a0a;border:1px solid #242424}
  .gratisan-value-check{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:#0d2818;color:#25D366;font-size:13px;font-weight:700}
  .gratisan-value-row b{color:#fff;font-size:11.5px;font-weight:600;line-height:1.3}
  .gratisan-value-row span:last-child{color:#ff8fc5;font-size:10.5px;font-weight:700;white-space:nowrap}
  .gratisan-price-box{margin-top:14px;padding:15px 12px;border-radius:14px;background:#161016;border:1px solid #4d263a;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px}
  .gratisan-price-label{color:#fff;font-size:17px;font-weight:800;line-height:1.1;text-align:left}
  .gratisan-price-right{display:flex;align-items:center;justify-content:flex-end;gap:12px;white-space:nowrap}
  .gratisan-price-total{display:inline-block;color:#c7c7c7;font-size:24px;font-weight:800;line-height:1;text-decoration:line-through;text-decoration-thickness:2.5px;text-decoration-color:#ff4fa3}
  .gratisan-price{display:inline-block;color:#25D366;font-size:29px;font-weight:900;line-height:1}
  .gratisan-offer-cta{display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;border-radius:13px;background:#25D366;color:#07170d;text-decoration:none;font-size:12px;font-weight:800;box-shadow:0 10px 26px rgba(37,211,102,.18)}
  .gratisan-offer-note{margin:8px 0 0;text-align:center;color:#777;font-size:8.5px;font-weight:500;line-height:1.35}
  .community-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .community-card{padding:15px;border-radius:20px;background:#111;border:1px solid #252525}
  .community-card .ico{font-size:22px;margin-bottom:7px}.community-card .eyebrow{color:#ff8fc5;font:700 8px "Nunito",Arial,sans-serif;letter-spacing:.06em}
  .community-card h3{margin:4px 0 5px;color:#fff;font:800 14px "Raleway",Arial,sans-serif}.community-card p{margin:0;color:#949494;font:500 9px "Nunito",Arial,sans-serif;line-height:1.5}
  .community-levels{padding:15px;border-radius:21px;background:#0d0d0d;border:1px solid #242424}
  .community-levels-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}.community-levels-head h3{margin:0;color:#fff;font:800 15px "Raleway",Arial,sans-serif}.community-levels-head span{color:#777;font:500 9px "Nunito",Arial,sans-serif}
  .community-level-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .community-level{min-height:86px;padding:10px;border-radius:15px;background:#151515;border:1px solid #242424;display:flex;flex-direction:column;justify-content:space-between}
  .community-level.active{border-color:#ff4fa3;background:#201018}.community-level small{color:#777;font:700 7px "Nunito",Arial,sans-serif}.community-level b{display:block;margin-top:4px;color:#fff;font:800 11px "Raleway",Arial,sans-serif}.community-level span{display:block;margin-top:7px;color:#919191;font:500 8px "Nunito",Arial,sans-serif;line-height:1.35}.community-level.active small{color:#ff8fc5}

  .screen-heading{margin-bottom:12px}.screen-heading .kicker{color:#ff8fc5;font:700 8px "Nunito",Arial,sans-serif;letter-spacing:.08em}.screen-heading h1{margin:4px 0 5px;color:#fff;font:800 25px "Raleway",Arial,sans-serif;letter-spacing:-.04em}.screen-heading p{margin:0;color:#999;font:500 10px "Nunito",Arial,sans-serif;line-height:1.45}

  .badai-upgrade-modal{display:none;position:fixed;inset:0;z-index:9999999;padding:18px;background:rgba(0,0,0,.80);align-items:center;justify-content:center;backdrop-filter:blur(8px)}
  .badai-upgrade-modal.open{display:flex}.badai-upgrade-card{width:min(100%,420px);border:1px solid #303030;border-radius:22px;background:#111;color:#fff;padding:21px;box-shadow:0 28px 80px rgba(0,0,0,.55)}
  .badai-upgrade-lock{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;margin-bottom:12px;background:#25101a;border:1px solid #65304d;font-size:21px}.badai-upgrade-kicker{color:#ff8fc5;font:700 9px "Nunito",Arial,sans-serif}.badai-upgrade-card h2{margin:5px 0 8px;font:800 23px "Nunito",Arial,sans-serif}.badai-upgrade-card p{margin:0;color:#aaa;font:500 12px "Nunito",Arial,sans-serif;line-height:1.55}.badai-upgrade-benefits{display:grid;gap:7px;margin-top:14px;padding:12px 13px;border-radius:14px;background:#090909;border:1px solid #252525;color:#ddd;font:500 11px "Nunito",Arial,sans-serif}.badai-upgrade-actions{display:grid;gap:8px;margin-top:15px}.badai-upgrade-actions a,.badai-upgrade-actions button{min-height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;text-decoration:none;font:700 11px "Nunito",Arial,sans-serif;cursor:pointer}.badai-upgrade-actions a{border:0;background:#25D366;color:#07170d}.badai-upgrade-actions button{border:1px solid #303030;background:#181818;color:#ddd}

  .badai-affiliate-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0 0 10px;padding:5px;border:1px solid #252525;border-radius:14px;background:#0c0c0c}
  .badai-affiliate-tab{min-height:40px;border:1px solid transparent;border-radius:10px;background:transparent;color:#858585;font:700 10px "Nunito",Arial,sans-serif;cursor:pointer}
  .badai-affiliate-tab.active{background:#ff4fa3;border-color:#ff4fa3;color:#111}
  .badai-affiliate-panel{display:none}
  .badai-affiliate-panel.active{display:block}
  .badai-affiliate-panel.badai-affiliate-tutorial{display:none}
  .badai-affiliate-panel.badai-affiliate-tutorial.active{display:grid;gap:10px}
  .badai-affiliate-video-placeholder{aspect-ratio:16/9;border-radius:18px;border:1px solid #2c2c2c;background:radial-gradient(circle at center,rgba(255,79,163,.16),transparent 34%),#0d0d0d;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18px}
  .badai-affiliate-video-placeholder .play{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#ff4fa3;color:#111;font-size:18px;margin-bottom:9px}
  .badai-affiliate-video-placeholder b{color:#fff;font:700 15px "Nunito",Arial,sans-serif}
  .badai-affiliate-video-placeholder span{margin-top:4px;color:#777;font:500 9px "Nunito",Arial,sans-serif}
  .badai-affiliate-rules{padding:14px;border-radius:16px;border:1px solid #262626;background:#101010}
  .badai-affiliate-rules h3{margin:0 0 9px;color:#fff;font:700 15px "Nunito",Arial,sans-serif}
  .badai-affiliate-rule-list{display:grid;gap:7px}
  .badai-affiliate-rule{display:grid;grid-template-columns:24px 1fr;gap:8px;align-items:start;color:#b9b9b9;font:500 10px "Nunito",Arial,sans-serif;line-height:1.4}
  .badai-affiliate-rule i{width:24px;height:24px;border-radius:8px;background:#211018;color:#ff8fc5;display:grid;place-items:center;font-style:normal;font-weight:800}
  .badai-sales-section{gap:9px}
  .badai-affiliate-panel.badai-sales-section:not(.active){display:none!important}
  .badai-affiliate-panel.badai-sales-section.active{display:grid!important}
  .badai-sales-section .stats{margin:0!important}
  .badai-sales-subcard{padding:13px;border-radius:16px;background:#101010;border:1px solid #262626}
  .badai-sales-subhead{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:8px}
  .badai-sales-subhead h3{margin:0;color:#fff;font:700 15px "Nunito",Arial,sans-serif}
  .badai-sales-subhead span{color:#777;font:500 8px "Nunito",Arial,sans-serif}
  .badai-referral-list,.badai-payout-history{display:grid;gap:6px}
  .badai-referral-row,.badai-payout-history-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:11px;background:#090909;border:1px solid #222}
  .badai-referral-main{min-width:0}
  .badai-referral-main b{display:block;color:#fff;font:600 11px "Nunito",Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .badai-referral-main span{display:block;margin-top:2px;color:#777;font:500 8px "Nunito",Arial,sans-serif}
  .badai-referral-side{text-align:right;flex:0 0 auto}
  .badai-referral-side strong{display:block;color:#ff8fc5;font:700 10px "Nunito",Arial,sans-serif}
  .badai-referral-side small{display:block;margin-top:2px;color:#777;font:700 7px "Nunito",Arial,sans-serif}
  .badai-payout-history-row div b{display:block;color:#fff;font:700 9px "Nunito",Arial,sans-serif}
  .badai-payout-history-row div span{display:block;margin-top:2px;color:#777;font:500 8px "Nunito",Arial,sans-serif}
  .badai-payout-history-row>strong{color:#25D366;font:700 11px "Nunito",Arial,sans-serif}
  .badai-affiliate-multilink-box{padding:16px!important}.badai-affiliate-link-intro{margin:0 0 12px!important;color:#aaa!important;font-size:10px!important;line-height:1.5!important}
  .badai-affiliate-link-list{display:grid;gap:8px;margin-top:10px}.badai-affiliate-link-card{padding:12px;border:1px solid #2a2a2a;border-radius:15px;background:#0b0b0b}.badai-affiliate-link-card.is-featured{border-color:#66324e;background:#160d12}
  .badai-affiliate-link-badge{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border-radius:999px;border:1px solid #553047;background:#211018;color:#ff92c7;font:800 7px "Nunito",Arial,sans-serif;letter-spacing:.06em}
  .badai-affiliate-link-card h3{margin:7px 0 3px!important;color:#fff!important;font:800 13px "Raleway",Arial,sans-serif!important}.badai-affiliate-link-card p{margin:0!important;color:#858585!important;font:500 9px "Nunito",Arial,sans-serif!important;line-height:1.45!important}
  .badai-affiliate-url{display:block;margin-top:9px;padding:9px 10px;border-radius:10px;border:1px solid #222;background:#050505;color:#d9d9d9;font:600 8px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .badai-affiliate-link-actions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}.badai-affiliate-copy,.badai-affiliate-open,.badai-affiliate-edit-code{min-height:38px;border-radius:10px;font:800 9px "Nunito",Arial,sans-serif;cursor:pointer}.badai-affiliate-copy{border:0;background:#ff4fa3;color:#090909;padding:0 12px}.badai-affiliate-copy.copied{background:#25D366;color:#07170d}.badai-affiliate-open{min-width:66px;padding:0 12px;display:flex;align-items:center;justify-content:center;border:1px solid #333;background:#151515;color:#fff;text-decoration:none}.badai-affiliate-code-slot{margin:5px 0 7px}.badai-affiliate-code-card{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0!important;padding:9px 10px!important;border-radius:10px!important;background:#0b0b0b!important;border:1px solid #2d2d2d!important;box-shadow:none!important}.badai-affiliate-code-line{display:flex!important;align-items:baseline!important;gap:6px!important;flex:1 1 auto!important;min-width:0!important;flex-wrap:nowrap!important;color:#fff!important;font-family:"Nunito",Arial,sans-serif!important}.badai-affiliate-code-line b{margin:0!important;font-size:15px!important;font-weight:500!important;line-height:1.1!important;letter-spacing:0!important;white-space:nowrap!important}.badai-affiliate-code-line span{font-family:"Nunito",Arial,sans-serif!important;font-size:16px!important;font-weight:500!important;line-height:1.1!important;color:#ff8fc5!important;letter-spacing:.02em!important;white-space:nowrap!important}.badai-affiliate-edit-code{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;width:auto!important;min-height:31px!important;margin:0!important;padding:0 11px!important;border:1px solid #3a3a3a;background:#151515;color:#fff;border-radius:8px;font:500 10px "Nunito",Arial,sans-serif;cursor:pointer;white-space:nowrap!important}.badai-affiliate-commission-card{position:relative!important;padding-right:145px!important}.badai-affiliate-payout{display:inline-flex!important;align-items:center!important;justify-content:center!important;position:absolute!important;right:14px!important;bottom:14px!important;margin:0!important;min-height:34px!important;padding:0 13px!important;border-radius:9px!important;background:#25D366!important;color:#07170d!important;text-decoration:none!important;font:700 10px "Nunito",Arial,sans-serif!important;white-space:nowrap!important}.badai-affiliate-loading,.badai-affiliate-empty{padding:13px;border:1px dashed #333;border-radius:13px;color:#888;text-align:center;font:600 9px "Nunito",Arial,sans-serif;line-height:1.5}

  @media(max-width:420px){.badai-affiliate-tabs{gap:3px;padding:4px}.badai-affiliate-tab{min-height:36px;padding:0 4px;font-size:8.5px}.badai-affiliate-video-placeholder{border-radius:14px}.badai-sales-subcard{padding:10px}.badai-referral-row,.badai-payout-history-row{padding:8px}.badai-member-header{padding:9px 10px;min-height:58px}.badai-member-header-logo img{height:30px;max-width:174px}.badai-member-help{min-height:37px;padding:0 11px;font-size:9px}.footer .label{font-size:9.7px!important}.community-hero{padding:17px}.community-hero h1{font-size:24px}.community-access-grid{grid-template-columns:1fr;gap:7px}.community-access-card{padding:12px}.gratisan-offer-card{padding:14px;border-radius:18px}.gratisan-offer-label{font-size:23px}.gratisan-value-row{padding:9px}.gratisan-value-row b{font-size:11px}.gratisan-value-row span:last-child{font-size:9.5px}.gratisan-price-box{grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:13px 10px}.gratisan-price-label{font-size:14px}.gratisan-price-right{gap:7px}.gratisan-price-total{font-size:20px}.gratisan-price{font-size:24px}.gratisan-offer-cta{min-height:46px}.community-two{gap:7px}.community-card{padding:12px}.community-level{padding:8px;min-height:82px}}
</style>`;

    const headerMarkup = String.raw`
<header class="badai-member-header" aria-label="Header Member Area BADAI">
  <a class="badai-member-header-logo" href="/akses" aria-label="BADAI Member Area"><img src="https://i.ibb.co.com/j9prt6Xr/BADAI-LOGO-HORIZONTAL-UNDER50-KB-1.webp" alt="BADAI"></a>
  <a class="badai-member-help" href="https://wa.me/6281237523626?text=Halo%20Admin%20BADAI%2C%20saya%20butuh%20bantuan%20di%20Member%20Area." target="_blank" rel="noopener noreferrer"><span>💬</span><span>HUBUNGI ADMIN</span></a>
</header>`;

    const enhancement = String.raw`
<script id="badai-member-v4-enhancement">
document.addEventListener('DOMContentLoaded', function(){
  var SUPABASE_URL='https://tlvxlekqrllkvcpgwmic.supabase.co';
  var SUPABASE_KEY='sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  var STORAGE_KEY='badai_member_session';
  var affiliateRenderedCode='';

  function el(id){return document.getElementById(id)}
  function memberSession(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch(_){return null}}

  var community=el('carapakai');
  if(community){
    community.innerHTML='<div class="gratisan-offer-card">'+
      '<div class="gratisan-offer-label">Yang kamu dapatkan:</div>'+
      '<div class="gratisan-value-list">'+
        '<div class="gratisan-value-row"><span class="gratisan-value-check">✓</span><b>Kuliah WhatsApp Rutin Setiap Hari</b><span>Senilai Rp49.000</span></div>'+
        '<div class="gratisan-value-row"><span class="gratisan-value-check">✓</span><b>Ebook AI &amp; Bisnis</b><span>Senilai Rp39.000</span></div>'+
        '<div class="gratisan-value-row"><span class="gratisan-value-check">✓</span><b>Belajar AI Gratisan</b><span>Senilai Rp29.000</span></div>'+
      '</div>'+
      '<div class="gratisan-price-box"><div class="gratisan-price-label">TOTAL SENILAI</div><div class="gratisan-price-right"><span class="gratisan-price-total">Rp117.000</span><span class="gratisan-price">GRATIS</span></div></div>'+
      '<a class="gratisan-offer-cta" href="https://chat.whatsapp.com/LCGm5LowkYG3NiHKItShC6" target="_blank" rel="noopener noreferrer">MASUK KULIAH BADAI</a>'+
      '<p class="gratisan-offer-note">Klik tombol di atas untuk langsung bergabung ke Kuliah WhatsApp BADAI.</p>'+
      '<span id="communityPlanName" style="display:none">MEMBER GRATISAN</span>'+
      '</div>';
  }

  var kelas=el('kelas');
  if(kelas&&!kelas.querySelector('.screen-heading')) kelas.insertAdjacentHTML('afterbegin','<div class="screen-heading"><div class="kicker">PERPUSTAKAAN BADAI</div><h1>Pemula</h1><p>Kumpulan kelas dan materi AI untuk dipelajari langkah demi langkah.</p></div>');
  var bonus=el('jaluruntung');
  if(bonus&&!bonus.querySelector('.screen-heading')) bonus.insertAdjacentHTML('afterbegin','<div class="screen-heading"><div class="kicker">KHUSUS MEMBER UNTUNG</div><h1>Untung</h1><p>Bonus dan jalur praktik untuk membantu ilmu BADAI dipakai menghasilkan.</p></div>');

  [
    ['carapakai','Gratisan','fi fi-rr-square-1'],['kelas','Pemula','fi fi-rr-square-2'],['jaluruntung','Untung','fi fi-rr-square-3'],['afiliasi','Affiliasi','fi fi-rr-square-4'],['akun','Akun','fi fi-rr-square-5']
  ].forEach(function(menu){var button=document.querySelector('.footer [data-screen="'+menu[0]+'"]');if(!button)return;var label=button.querySelector('.label');var emoji=button.querySelector('.emoji');if(label)label.textContent=menu[1];if(emoji)emoji.innerHTML='<i class="'+menu[2]+'" aria-hidden="true"></i>'});

  function levelFromPlan(plan){if(plan==='pro')return 3;if(plan==='free')return 1;return 2}
  function currentPlan(){var stable=document.documentElement.dataset.membershipPlan;if(stable)return stable;var text=String(el('memberPlanName')?el('memberPlanName').textContent:'').toUpperCase();if(text.indexOf('UNTUNG')!==-1)return'pro';if(text.indexOf('GRATIS')!==-1)return'free';return'newbie'}
  function planLabel(level){return level>=3?'MEMBER UNTUNG':level===1?'MEMBER GRATISAN':'MEMBER PEMULA'}

  var upgradeModal=null;
  function getUpgradeModal(){if(upgradeModal)return upgradeModal;upgradeModal=document.createElement('div');upgradeModal.className='badai-upgrade-modal';upgradeModal.innerHTML='<div class="badai-upgrade-card" role="dialog" aria-modal="true"><div class="badai-upgrade-lock">🔒</div><div class="badai-upgrade-kicker">AKSES TERKUNCI</div><h2 id="badaiUpgradeTitle">Menu ini masih terkunci</h2><p id="badaiUpgradeText">Naik paket untuk membuka akses ini.</p><div id="badaiUpgradeBenefits" class="badai-upgrade-benefits"></div><div class="badai-upgrade-actions"><a id="badaiUpgradeButton" href="#" target="_blank" rel="noopener noreferrer">UPGRADE SEKARANG</a><button type="button" data-close-upgrade>NANTI DULU</button></div></div>';document.body.appendChild(upgradeModal);upgradeModal.addEventListener('click',function(e){if(e.target===upgradeModal||(e.target.closest&&e.target.closest('[data-close-upgrade]')))upgradeModal.classList.remove('open')});return upgradeModal}
  function openUpgrade(feature,targetPackage){var modal=getUpgradeModal();var target=targetPackage==='Pemula'?'Paket Pemula':'Paket Untung';el('badaiUpgradeTitle').textContent=feature+' masih terkunci';el('badaiUpgradeText').textContent='Upgrade ke '+target+' untuk membuka menu '+feature+'.';el('badaiUpgradeBenefits').innerHTML=targetPackage==='Pemula'?'<span>✓ Buka seluruh menu Pemula</span><span>✓ Akses kelas dan update materi BADAI</span><span>✓ Tetap dapat Komunitas + KulWA</span>':'<span>✓ Menu Untung terbuka</span><span>✓ Program Affiliasi aktif</span><span>✓ Link afiliasi + bahan promosi + komisi</span>';var btn=el('badaiUpgradeButton');btn.textContent='UPGRADE KE '+target.toUpperCase();btn.href='https://wa.me/6281237523626?text='+encodeURIComponent('Halo Admin BADAI, saya ingin upgrade ke '+target+'.');modal.classList.add('open')}

  function syncPlanAccess(){var level=levelFromPlan(currentPlan());var req={kelas:2,jaluruntung:3,afiliasi:3};Object.keys(req).forEach(function(screen){var btn=document.querySelector('.footer [data-screen="'+screen+'"]');if(!btn)return;var locked=level<req[screen];btn.classList.toggle('is-plan-locked',locked);btn.dataset.planLocked=locked?'1':'0';btn.setAttribute('aria-disabled',locked?'true':'false')});var planText=el('communityPlanName');if(planText)planText.textContent=planLabel(level);document.querySelectorAll('[data-member-level]').forEach(function(card){card.classList.toggle('active',Number(card.getAttribute('data-member-level'))===level)});var active=document.querySelector('#kelas.screen.active,#jaluruntung.screen.active,#afiliasi.screen.active');if(active&&level<(req[active.id]||1)&&typeof window.show==='function')window.show('carapakai')}

  document.addEventListener('click',function(e){var btn=e.target.closest?e.target.closest('.footer button'):null;if(!btn||btn.dataset.planLocked!=='1')return;var screen=btn.getAttribute('data-screen');if(!['kelas','jaluruntung','afiliasi'].includes(screen))return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();if(screen==='kelas')openUpgrade('Pemula','Pemula');if(screen==='jaluruntung')openUpgrade('Untung','Untung');if(screen==='afiliasi')openUpgrade('Affiliasi','Untung')},true);

  async function resolveRealPlan(){try{var s=memberSession();if(!s||!s.access_token)return;var userId=s.user&&s.user.id?s.user.id:'';if(!userId){var ur=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}});if(ur.ok){var u=await ur.json();userId=u&&u.id?u.id:''}}if(!userId)return;var pr=await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+encodeURIComponent(userId)+'&select=membership_plan',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}});if(!pr.ok)return;var rows=await pr.json();var plan=rows&&rows[0]&&rows[0].membership_plan?rows[0].membership_plan:'newbie';document.documentElement.dataset.membershipPlan=plan;var pn=el('memberPlanName'),pd=el('memberPlanDesc');if(pn)pn.textContent=plan==='pro'?'PAKET UNTUNG':plan==='free'?'PAKET GRATISAN':'PAKET PEMULA';if(pd)pd.textContent=plan==='pro'?'Ilmu + Bonus + Program Affiliasi':plan==='free'?'Komunitas + KulWA':'Belajar Ilmu AI + Update';syncPlanAccess()}catch(err){console.warn('BADAI plan sync:',err&&err.message?err.message:err)}}

  function setupAffiliateTabs(){
    var root=el('afiliasi');
    if(!root||root.dataset.tabsReady==='1')return;
    root.dataset.tabsReady='1';

    var heading=root.querySelector('.center');
    var affbox=root.querySelector('.affbox');
    var stats=root.querySelector('.stats');
    var materials=root.querySelector('.affiliate-member-section');
    if(!heading||!affbox||!stats||!materials)return;

    var nav=document.createElement('div');
    nav.className='badai-affiliate-tabs';
    nav.innerHTML='<button class="badai-affiliate-tab active" type="button" data-aff-tab="tutorial">Tutorial</button><button class="badai-affiliate-tab" type="button" data-aff-tab="link">Link</button><button class="badai-affiliate-tab" type="button" data-aff-tab="sales">Penjualan</button><button class="badai-affiliate-tab" type="button" data-aff-tab="materials">Bahan Promosi</button>';
    heading.insertAdjacentElement('afterend',nav);

    var tutorial=document.createElement('div');
    tutorial.className='badai-affiliate-panel badai-affiliate-tutorial active';
    tutorial.dataset.affPanel='tutorial';
    tutorial.innerHTML='<div class="badai-affiliate-video-placeholder"><div class="play">▶</div><b>Video Tutorial Afiliasi BADAI</b><span>Slot video YouTube sudah disiapkan. Tinggal masukkan link videonya.</span></div><div class="badai-affiliate-rules"><h3>Aturan Main Afiliasi</h3><div class="badai-affiliate-rule-list"><div class="badai-affiliate-rule"><i>1</i><span>Bagikan link afiliasi milik kamu sendiri agar referral tercatat otomatis.</span></div><div class="badai-affiliate-rule"><i>2</i><span>Komisi dihitung dari transaksi yang valid dan berhasil terverifikasi.</span></div><div class="badai-affiliate-rule"><i>3</i><span>Pencairan komisi dilakukan melalui Admin BADAI dan riwayatnya tercatat di menu Penjualan.</span></div><div class="badai-affiliate-rule"><i>4</i><span>Gunakan materi promosi dengan wajar. Hindari spam dan klaim yang menyesatkan.</span></div></div></div>';

    var linkPanel=document.createElement('div');
    linkPanel.className='badai-affiliate-panel';
    linkPanel.dataset.affPanel='link';
    linkPanel.appendChild(affbox);

    var salesPanel=document.createElement('div');
    salesPanel.className='badai-affiliate-panel badai-sales-section';
    salesPanel.dataset.affPanel='sales';

    var codeEl=el('affiliateCode');
    var codeCard=codeEl&&codeEl.closest?codeEl.closest('.stat'):null;
    var salesEl=el('affiliateSalesCount');
    var salesCard=salesEl&&salesEl.closest?salesEl.closest('.stat'):null;
    var commissionEl=el('affiliateCommissionTotal');
    var commissionCard=commissionEl&&commissionEl.closest?commissionEl.closest('.stat'):null;
    if(commissionCard){
      var commissionLabel=commissionCard.querySelector('b');
      if(commissionLabel)commissionLabel.textContent='Belum Dicairkan';
    }

    var grossCard=document.createElement('div');
    grossCard.className='stat';
    grossCard.innerHTML='💰<b>Total Komisi</b><span id="affiliateCommissionGross">Rp0</span>';
    var paidCard=document.createElement('div');
    paidCard.className='stat';
    paidCard.innerHTML='✅<b>Sudah Dicairkan</b><span id="affiliateCommissionPaid">Rp0</span>';

    if(salesCard)stats.appendChild(salesCard);
    stats.appendChild(grossCard);
    stats.appendChild(paidCard);
    if(commissionCard)stats.appendChild(commissionCard);
    salesPanel.appendChild(stats);

    var referralCard=document.createElement('div');
    referralCard.className='badai-sales-subcard';
    referralCard.innerHTML='<div class="badai-sales-subhead"><h3>Member dari Link Kamu</h3><span>Referral yang mendaftar lewat link afiliasi</span></div><div id="affiliateReferralList" class="badai-referral-list"><div class="affiliate-empty">Memuat data referral...</div></div>';
    salesPanel.appendChild(referralCard);

    var payoutCard=document.createElement('div');
    payoutCard.className='badai-sales-subcard';
    payoutCard.innerHTML='<div class="badai-sales-subhead"><h3>Riwayat Pencairan</h3><span>Komisi yang sudah dibayarkan</span></div><div id="affiliatePayoutHistory" class="badai-payout-history"><div class="affiliate-empty">Memuat riwayat pencairan...</div></div>';
    salesPanel.appendChild(payoutCard);

    var materialsPanel=document.createElement('div');
    materialsPanel.className='badai-affiliate-panel';
    materialsPanel.dataset.affPanel='materials';
    materialsPanel.appendChild(materials);

    nav.insertAdjacentElement('afterend',tutorial);
    tutorial.insertAdjacentElement('afterend',linkPanel);
    linkPanel.insertAdjacentElement('afterend',salesPanel);
    salesPanel.insertAdjacentElement('afterend',materialsPanel);

    nav.addEventListener('click',function(e){
      var btn=e.target.closest?e.target.closest('[data-aff-tab]'):null;
      if(!btn)return;
      var target=btn.getAttribute('data-aff-tab');
      nav.querySelectorAll('.badai-affiliate-tab').forEach(function(item){item.classList.toggle('active',item===btn)});
      root.querySelectorAll('.badai-affiliate-panel').forEach(function(panel){panel.classList.toggle('active',panel.getAttribute('data-aff-panel')===target)});
    });
  }

  function prepareAffiliateBox(){var legacy=el('affiliateLink');if(!legacy)return null;var box=legacy.closest?legacy.closest('.affbox'):null;if(!box)return null;if(box.dataset.multiLinkReady==='1')return box;box.dataset.multiLinkReady='1';box.classList.add('badai-affiliate-multilink-box');box.innerHTML='<div class="affiliate-pro-pill">PAKET UNTUNG • AKTIF</div><div id="badaiAffiliateCodeSlot" class="badai-affiliate-code-slot"></div><h2>Pilih Link Jualan Kamu</h2><p class="badai-affiliate-link-intro">Mau ajak orang masuk gratis dulu atau langsung jual paket? Pilih link sesuai cara jualanmu.</p><div id="badaiAffiliateLinkChoices" class="badai-affiliate-link-list"><div class="badai-affiliate-loading">Menyiapkan link jualan...</div></div><div id="affiliateLink" class="linkbox" style="display:none">Memuat link afiliasi...</div>';var slot=el('badaiAffiliateCodeSlot');var codeEl=el('affiliateCode');var codeStat=codeEl&&codeEl.closest?codeEl.closest('.stat'):null;if(slot&&codeStat){codeStat.classList.add('badai-affiliate-code-card');slot.appendChild(codeStat);var label=codeStat.querySelector('b');var line=document.createElement('div');line.className='badai-affiliate-code-line';Array.from(codeStat.childNodes).forEach(function(node){if(node.nodeType===3)node.remove()});if(label){label.textContent='KODE AFFILIASI :';line.appendChild(label)}line.appendChild(codeEl);codeStat.appendChild(line);var edit=document.createElement('button');edit.type='button';edit.className='badai-affiliate-edit-code';edit.textContent='EDIT KODE';edit.addEventListener('click',function(){if(typeof window.openAffiliateEditor==='function')window.openAffiliateEditor()});codeStat.appendChild(edit)}return box}
  function ensurePayoutButton(){var commission=el('affiliateCommissionTotal');if(!commission)return;var card=commission.closest?commission.closest('.stat'):null;if(!card)return;card.classList.add('badai-affiliate-commission-card');if(el('badaiAffiliatePayout'))return;var btn=document.createElement('a');btn.id='badaiAffiliatePayout';btn.className='badai-affiliate-payout';btn.href='#';btn.target='_blank';btn.rel='noopener noreferrer';btn.textContent='CAIRKAN KOMISI';btn.addEventListener('click',function(){var code=String(el('affiliateCode')?el('affiliateCode').textContent:'-').trim()||'-';var amount=String(commission.textContent||'Rp0').trim()||'Rp0';btn.href='https://wa.me/6281237523626?text='+encodeURIComponent('Halo Admin BADAI, saya ingin mencairkan komisi afiliasi saya.\n\nKode Afiliasi: '+code+'\nTotal Komisi: '+amount)});card.appendChild(btn)}
  function affiliateCode(){var code=String(el('affiliateCode')?el('affiliateCode').textContent:'').trim();if(code&&code!=='-'&&code.toLowerCase().indexOf('memuat')===-1)return code;var link=String(window.BADAI_AFFILIATE_LINK||'').trim();if(link){try{var parsed=new URL(link,location.origin);var seg=parsed.pathname.split('/').filter(Boolean).pop();if(seg)return decodeURIComponent(seg)}catch(_){}}return''}
  function affiliateUrl(code,type){var main=location.origin.replace(/\/$/,'')+'/'+encodeURIComponent(code);if(type==='free')return main+'?paket=gratisan';if(type==='newbie')return main+'?paket=pemula';if(type==='pro')return main+'?paket=untung';return main}
  function fallbackCopy(text,done){var t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');if(done)done()}catch(_){}t.remove()}
  function copyAffiliate(text,button){function ok(){var old=button.textContent;button.textContent='TERSALIN ✓';button.classList.add('copied');setTimeout(function(){button.textContent=old;button.classList.remove('copied')},1300)}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(ok).catch(function(){fallbackCopy(text,ok)});else fallbackCopy(text,ok)}
  function addAffiliateCard(container,cfg,code){var url=affiliateUrl(code,cfg.type);var card=document.createElement('div');card.className='badai-affiliate-link-card'+(cfg.featured?' is-featured':'');var badge=document.createElement('span');badge.className='badai-affiliate-link-badge';badge.textContent=cfg.badge;var h=document.createElement('h3');h.textContent=cfg.title;var p=document.createElement('p');p.textContent=cfg.desc;var c=document.createElement('code');c.className='badai-affiliate-url';c.textContent=url;var actions=document.createElement('div');actions.className='badai-affiliate-link-actions';var copy=document.createElement('button');copy.type='button';copy.className='badai-affiliate-copy';copy.textContent='SALIN LINK';copy.addEventListener('click',function(){copyAffiliate(url,copy)});var open=document.createElement('a');open.className='badai-affiliate-open';open.href=url;open.target='_blank';open.rel='noopener noreferrer';open.textContent='BUKA';actions.appendChild(copy);actions.appendChild(open);card.appendChild(badge);card.appendChild(h);card.appendChild(p);card.appendChild(c);card.appendChild(actions);container.appendChild(card)}
  async function renderAffiliateChoices(code){if(!code||affiliateRenderedCode===code)return;affiliateRenderedCode=code;var container=el('badaiAffiliateLinkChoices');if(!container)return;var settings={link_main_enabled:true,link_free_enabled:true,link_newbie_enabled:true,link_pro_enabled:true};try{var s=memberSession();if(s&&s.access_token){var r=await fetch(SUPABASE_URL+'/rest/v1/affiliate_settings?id=eq.1&select=link_main_enabled,link_free_enabled,link_newbie_enabled,link_pro_enabled',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}});if(r.ok){var rows=await r.json();if(rows&&rows[0])settings=Object.assign(settings,rows[0])}}}catch(err){console.warn('BADAI affiliate links:',err&&err.message?err.message:err)}var configs=[{key:'link_main_enabled',type:'main',badge:'SEMUA PAKET',title:'Link Utama',desc:'Kirim ke LP utama. Calon member bebas memilih Gratisan, Pemula, atau Untung.',featured:true},{key:'link_free_enabled',type:'free',badge:'PAKET GRATISAN',title:'Ajak Masuk Gratis Dulu',desc:'Cocok untuk memperbanyak member dan membawa orang masuk komunitas tanpa hambatan.'},{key:'link_newbie_enabled',type:'newbie',badge:'PAKET PEMULA',title:'Langsung Jual Paket Pemula',desc:'Gunakan saat kamu memang menawarkan akses belajar Paket Pemula.'},{key:'link_pro_enabled',type:'pro',badge:'PAKET UNTUNG',title:'Langsung Jual Paket Untung',desc:'Gunakan untuk calon member yang siap ambil akses lengkap termasuk bonus dan affiliasi.'}];container.innerHTML='';var shown=0;configs.forEach(function(cfg){if(settings[cfg.key]===false)return;addAffiliateCard(container,cfg,code);shown++});if(!shown)container.innerHTML='<div class="badai-affiliate-empty">Belum ada link jualan yang diaktifkan Admin. Hubungi Admin BADAI.</div>'}
  function bootAffiliate(attempt){ensurePayoutButton();prepareAffiliateBox();var code=affiliateCode();if(code){renderAffiliateChoices(code);return}if((attempt||0)<50)setTimeout(function(){bootAffiliate((attempt||0)+1)},250)}

  var planNode=el('memberPlanName');if(planNode&&typeof MutationObserver!=='undefined')new MutationObserver(syncPlanAccess).observe(planNode,{childList:true,subtree:true,characterData:true});
  var codeNode=el('affiliateCode');if(codeNode&&typeof MutationObserver!=='undefined')new MutationObserver(function(){affiliateRenderedCode='';bootAffiliate(0)}).observe(codeNode,{childList:true,subtree:true,characterData:true});

  setupAffiliateTabs();syncPlanAccess();setTimeout(resolveRealPlan,250);setTimeout(function(){bootAffiliate(0)},350);
});
</script>`;

    html = html.replace('</head>', flaticonUicons + '\n' + style + '\n</head>');
    html = html.replace('</body>', enhancement + '\n</body>');

    if (html.includes('<div class="app">')) html = html.replace('<div class="app">', '<div class="app">\n' + headerMarkup);
    else html = html.replace('<body>', '<body>\n' + headerMarkup);

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI member area gagal dimuat: ' + String(error && error.message ? error.message : error));
  }
};
