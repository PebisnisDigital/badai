module.exports = async function handler(req, res) {
  try {
    let html;

    // Railway staging must render the files from the exact deployed commit.
    // Falling back to GitHub main here made /akses look stale even after staging deploys.
    if (process.env.RAILWAY_PROJECT_ID || process.env.BADAI_ENV === 'staging') {
      const fs = require('fs');
      const path = require('path');
      html = fs.readFileSync(path.join(process.cwd(), 'akses', 'index.html'), 'utf8');
    } else {
      const ref = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || 'main';
      const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/akses/index.html`;
      const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Member-Area/1.0' } });
      if (!source.ok) throw new Error(`Gagal memuat member area (${source.status})`);
      html = await source.text();
    }

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
    grid-template-columns:repeat(var(--member-nav-count,4),minmax(0,1fr))!important;
    gap:4px!important;
    padding-left:6px!important;
    padding-right:6px!important;
    box-sizing:border-box!important
  }
  .footer button{
    width:100%!important;
    min-width:0!important;
    background:transparent!important;
    color:#fff!important
  }
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
  #carapakai.screen.active{
    display:flex!important;
    flex-direction:column!important;
    min-height:calc(100dvh - 145px)!important;
  }
  #carapakai .badai-gratisan-heading{flex:0 0 auto}
  .gratisan-offer-card{
    width:min(100%,560px);
    min-height:max(520px,calc(100dvh - 235px));
    margin:0 auto;
    padding:24px 20px 18px;
    border-radius:22px;
    background:linear-gradient(180deg,#141414,#0d0d0d);
    border:1px solid #2a2a2a;
    box-shadow:0 18px 48px rgba(0,0,0,.28);
    font-family:"Nunito",Arial,sans-serif;
    display:grid;
    grid-template-rows:auto minmax(0,1fr) auto auto auto;
    gap:14px;
  }
  .gratisan-offer-label{margin:0;color:#fff;font-size:30px;font-weight:800;text-align:center;line-height:1.05}
  .gratisan-value-list{display:grid;grid-template-rows:repeat(3,minmax(72px,1fr));gap:10px}
  .gratisan-value-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:11px;padding:14px 15px;border-radius:14px;background:#0a0a0a;border:1px solid #242424}
  .gratisan-value-check{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#0d2818;color:#25D366;font-size:16px;font-weight:800}
  .gratisan-value-row b{color:#fff;font-size:14px;font-weight:700;line-height:1.3}
  .gratisan-value-row span:last-child{color:#ff8fc5;font-size:13px;font-weight:800;white-space:nowrap}
  .gratisan-price-box{margin:0;padding:18px 15px;border-radius:15px;background:#161016;border:1px solid #4d263a;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px}
  .gratisan-price-label{color:#fff;font-size:20px;font-weight:800;line-height:1.1;text-align:left}
  .gratisan-price-right{display:flex;align-items:center;justify-content:flex-end;gap:13px;white-space:nowrap}
  .gratisan-price-total{display:inline-block;color:#c7c7c7;font-size:28px;font-weight:800;line-height:1;text-decoration:line-through;text-decoration-thickness:2.5px;text-decoration-color:#ff4fa3}
  .gratisan-price{display:inline-block;color:#25D366;font-size:35px;font-weight:900;line-height:1}
  .gratisan-offer-cta{display:flex;align-items:center;justify-content:center;min-height:54px;margin:0;border-radius:13px;background:#25D366;color:#07170d;text-decoration:none;font-size:14px;font-weight:800;box-shadow:0 10px 26px rgba(37,211,102,.18)}
  .gratisan-offer-note{margin:0;text-align:center;color:#8b8b8b;font-size:9.5px;font-weight:600;line-height:1.35}
  .community-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .community-card{padding:15px;border-radius:20px;background:#111;border:1px solid #252525}
  .community-card .ico{font-size:22px;margin-bottom:7px}.community-card .eyebrow{color:#ff8fc5;font:700 8px "Nunito",Arial,sans-serif;letter-spacing:.06em}
  .community-card h3{margin:4px 0 5px;color:#fff;font:800 14px "Raleway",Arial,sans-serif}.community-card p{margin:0;color:#949494;font:500 9px "Nunito",Arial,sans-serif;line-height:1.5}
  .community-levels{padding:15px;border-radius:21px;background:#0d0d0d;border:1px solid #242424}
  .community-levels-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}.community-levels-head h3{margin:0;color:#fff;font:800 15px "Raleway",Arial,sans-serif}.community-levels-head span{color:#777;font:500 9px "Nunito",Arial,sans-serif}
  .community-level-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .community-level{min-height:86px;padding:10px;border-radius:15px;background:#151515;border:1px solid #242424;display:flex;flex-direction:column;justify-content:space-between}
  .community-level.active{border-color:#ff4fa3;background:#201018}.community-level small{color:#777;font:700 7px "Nunito",Arial,sans-serif}.community-level b{display:block;margin-top:4px;color:#fff;font:800 11px "Raleway",Arial,sans-serif}.community-level span{display:block;margin-top:7px;color:#919191;font:500 8px "Nunito",Arial,sans-serif;line-height:1.35}.community-level.active small{color:#ff8fc5}

  .screen-heading,.badai-gratisan-heading,#akun .account-head{text-align:center!important;margin:0 0 16px!important;padding:2px 10px 0!important}
  .screen-heading .kicker,#akun .account-kicker{display:none!important}
  .screen-heading h1,.badai-gratisan-heading h1,#akun .account-head h1{margin:0 0 6px!important;color:#fff!important;font-family:"Raleway",Arial,sans-serif!important;font-size:34px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.045em!important}
  .screen-heading p,.badai-gratisan-heading p,#akun .account-head p{margin:0!important;color:#a8a8a8!important;font-family:"Nunito",Arial,sans-serif!important;font-size:11.5px!important;font-weight:600!important;line-height:1.4!important}

  /* AKUN — larger type, tighter vertical rhythm */
  #akun .account-head{margin-bottom:10px!important}
  #akun .member-plan-card{padding:10px 12px!important;margin-bottom:8px!important;gap:2px!important;border-radius:14px!important}
  #akun .member-plan-card span{font-family:"Nunito",Arial,sans-serif!important;font-size:9px!important;font-weight:700!important}
  #akun .member-plan-card strong{font-family:"Raleway",Arial,sans-serif!important;font-size:18px!important;font-weight:800!important;line-height:1.1!important}
  #akun .member-plan-card small{font-family:"Nunito",Arial,sans-serif!important;font-size:10.5px!important;font-weight:600!important;line-height:1.3!important}

  #akun .account-card{padding:12px 13px!important;border-radius:17px!important}
  #akun .account-field{gap:4px!important;margin-bottom:7px!important}
  #akun .account-field:last-of-type{margin-bottom:0!important}
  #akun .account-field label{font-family:"Nunito",Arial,sans-serif!important;font-size:10px!important;font-weight:700!important;letter-spacing:.03em!important}
  #akun .account-field input{min-height:40px!important;padding:0 11px!important;border-radius:10px!important;font-family:"Nunito",Arial,sans-serif!important;font-size:13px!important;font-weight:700!important}
  #akun .account-help{margin-top:0!important;font-family:"Nunito",Arial,sans-serif!important;font-size:9px!important;font-weight:500!important;line-height:1.3!important}
  #akun .account-save{min-height:41px!important;margin-top:9px!important;border-radius:10px!important;font-family:"Nunito",Arial,sans-serif!important;font-size:11.5px!important;font-weight:800!important}
  #akun .account-status{min-height:0!important;margin-top:5px!important;font-family:"Nunito",Arial,sans-serif!important;font-size:10px!important;font-weight:600!important}
  #akun .account-status:empty{display:none!important}

  #akun .account-logout-card{margin-top:8px!important;padding:11px 13px!important;border-radius:15px!important;gap:10px!important}
  #akun .account-logout-card h3{margin:0 0 2px!important;font-family:"Nunito",Arial,sans-serif!important;font-size:16px!important;font-weight:800!important;line-height:1.15!important}
  #akun .account-logout-card p{font-family:"Nunito",Arial,sans-serif!important;font-size:10.5px!important;font-weight:600!important;line-height:1.3!important}
  #akun #badaiMemberLogout{min-height:36px!important;padding:0 13px!important;border-radius:9px!important;font-family:"Nunito",Arial,sans-serif!important;font-size:10.5px!important;font-weight:800!important}
  .badai-material-accordion{display:grid;gap:7px}
  .badai-material-faq{overflow:hidden;border:1px solid #282828;border-radius:14px;background:#101010}
  .badai-material-faq[open]{border-color:#5b2945;background:#121012}
  .badai-material-summary{list-style:none;display:grid;grid-template-columns:34px minmax(0,1fr) 28px;align-items:center;gap:10px;min-height:58px;padding:8px 10px;cursor:pointer;user-select:none}
  .badai-material-summary::-webkit-details-marker{display:none}
  .badai-material-index{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#1a1016;border:1px solid #4f2a3e;color:#ff8fc5;font:800 9px "Nunito",Arial,sans-serif}
  .badai-material-title{min-width:0;color:#fff;font:700 12px "Nunito",Arial,sans-serif;line-height:1.25}
  .badai-material-chevron{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:#171717;color:#ff8fc5;font:800 16px "Nunito",Arial,sans-serif;transition:transform .2s ease}
  .badai-material-faq[open] .badai-material-chevron{transform:rotate(45deg)}
  .badai-material-content{padding:0 10px 11px;border-top:1px solid #222}
  .badai-material-video{margin-top:10px;aspect-ratio:16/9;border-radius:12px;overflow:hidden;border:1px solid #292929;background:#080808}
  .badai-material-video iframe{width:100%;height:100%;border:0;display:block}
  .badai-material-video-empty{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18px;color:#777;font:500 9px "Nunito",Arial,sans-serif}
  .badai-material-video-empty b{display:block;margin-bottom:4px;color:#fff;font:700 12px "Nunito",Arial,sans-serif}
  .badai-material-copy{margin-top:9px;padding:11px 12px;border-radius:11px;background:#0a0a0a;border:1px solid #222;color:#a8a8a8;font:500 10px "Nunito",Arial,sans-serif;line-height:1.5}
  .badai-material-copy b{display:block;margin-bottom:4px;color:#fff;font-weight:700}

  .badai-upgrade-modal{display:none;position:fixed;inset:0;z-index:9999999;padding:18px;background:rgba(0,0,0,.80);align-items:center;justify-content:center;backdrop-filter:blur(8px)}
  .badai-upgrade-modal.open{display:flex}.badai-upgrade-card{width:min(100%,420px);border:1px solid #303030;border-radius:22px;background:#111;color:#fff;padding:21px;box-shadow:0 28px 80px rgba(0,0,0,.55)}
  .badai-upgrade-lock{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;margin-bottom:12px;background:#25101a;border:1px solid #65304d;font-size:21px}.badai-upgrade-kicker{color:#ff8fc5;font:700 9px "Nunito",Arial,sans-serif}.badai-upgrade-card h2{margin:5px 0 8px;font:800 23px "Nunito",Arial,sans-serif}.badai-upgrade-card p{margin:0;color:#aaa;font:500 12px "Nunito",Arial,sans-serif;line-height:1.55}.badai-upgrade-benefits{display:grid;gap:7px;margin-top:14px;padding:12px 13px;border-radius:14px;background:#090909;border:1px solid #252525;color:#ddd;font:500 11px "Nunito",Arial,sans-serif}.badai-upgrade-actions{display:grid;gap:8px;margin-top:15px}.badai-upgrade-actions a,.badai-upgrade-actions button{min-height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;text-decoration:none;font:700 11px "Nunito",Arial,sans-serif;cursor:pointer}.badai-upgrade-actions a{border:0;background:#25D366;color:#07170d}.badai-upgrade-actions button{border:1px solid #303030;background:#181818;color:#ddd}

  .badai-affiliate-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 14px;padding:7px;border:1px solid #252525;border-radius:15px;background:#0c0c0c}
  .badai-affiliate-tab{min-height:50px;padding:0 12px;border:1px solid transparent;border-radius:11px;background:transparent;color:#bdbdbd;font:800 14px/1.2 "Nunito",Arial,sans-serif;cursor:pointer;white-space:normal}
  .badai-affiliate-tab.active{background:#ff4fa3;border-color:#ff4fa3;color:#111}
  .badai-affiliate-panel{display:none}
  .badai-affiliate-panel.active{display:block}
  .badai-affiliate-panel.badai-affiliate-tutorial{display:none}
  .badai-affiliate-panel.badai-affiliate-tutorial.active{display:grid;gap:12px}
  .badai-affiliate-video-placeholder{width:100%;max-width:none;aspect-ratio:16/9;border-radius:18px;border:1px solid #2c2c2c;background:radial-gradient(circle at center,rgba(255,79,163,.16),transparent 34%),#0d0d0d;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px}
  .badai-affiliate-video-placeholder .play{width:66px;height:66px;border-radius:50%;display:grid;place-items:center;background:#ff4fa3;color:#111;font-size:26px;margin-bottom:14px}
  .badai-affiliate-video-placeholder b{color:#fff;font:800 23px/1.25 "Raleway",Arial,sans-serif}
  .badai-affiliate-video-placeholder span{display:none}
  .badai-affiliate-rules{padding:20px;border-radius:18px;border:1px solid #262626;background:#101010}
  .badai-affiliate-rules h3{margin:0 0 14px;color:#fff;font:800 22px/1.2 "Raleway",Arial,sans-serif}
  .badai-affiliate-rule-list{display:grid;gap:12px}
  .badai-affiliate-rule{display:grid;grid-template-columns:36px 1fr;gap:12px;align-items:start;color:#e0e0e0;font:650 14.5px/1.55 "Nunito",Arial,sans-serif}
  .badai-affiliate-rule i{width:36px;height:36px;border-radius:10px;background:#211018;color:#ff8fc5;display:grid;place-items:center;font:900 13px "Nunito",Arial,sans-serif}
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
  [data-aff-panel="link"].active{display:flex!important;flex-direction:column!important;min-height:calc(100dvh - 245px)!important}
  [data-aff-panel="link"] .badai-affiliate-multilink-box{flex:1 1 auto!important;display:flex!important;flex-direction:column!important;min-height:max(520px,calc(100dvh - 255px))!important;padding:18px!important}
  .badai-affiliate-link-intro{margin:2px 0 12px!important;color:#aaa!important;font-size:12px!important;font-weight:600!important;line-height:1.45!important}
  .badai-affiliate-link-list{display:grid;grid-template-columns:1fr!important;grid-template-rows:repeat(4,minmax(96px,1fr));gap:10px;margin-top:10px;flex:1 1 auto!important}
  .badai-affiliate-link-card{min-width:0;padding:14px!important;border:1px solid #2a2a2a;border-radius:15px;background:#0b0b0b;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;grid-template-areas:"badge title actions" "url url actions"!important;align-items:center!important;column-gap:10px!important;row-gap:8px!important}
  .badai-affiliate-link-card.is-featured{border-color:#66324e;background:#160d12}
  .badai-affiliate-link-badge{grid-area:badge!important;display:inline-flex;align-items:center;min-height:24px;padding:0 9px;border-radius:999px;border:1px solid #553047;background:#211018;color:#ff92c7;font:800 8px "Nunito",Arial,sans-serif;letter-spacing:.06em;white-space:nowrap}
  .badai-affiliate-link-card h3{grid-area:title!important;margin:0!important;color:#fff!important;font:800 15px "Nunito",Arial,sans-serif!important;line-height:1.2!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
  .badai-affiliate-link-card p{display:none!important}
  .badai-affiliate-url{grid-area:url!important;display:block!important;margin:0!important;padding:10px 11px;border-radius:10px;border:1px solid #222;background:#050505;color:#d9d9d9;font:700 10px "Nunito",Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .badai-affiliate-link-actions{grid-area:actions!important;display:flex!important;flex-direction:column!important;gap:6px!important;margin:0!important;align-self:stretch!important;justify-content:center!important}
  .badai-affiliate-copy,.badai-affiliate-open,.badai-affiliate-edit-code{min-height:38px;border-radius:10px;font:800 10px "Nunito",Arial,sans-serif;cursor:pointer}
  .badai-affiliate-copy{border:0;background:#ff4fa3;color:#090909;padding:0 12px}
  .badai-affiliate-copy.copied{background:#25D366;color:#07170d}
  .badai-affiliate-open{min-width:74px;padding:0 12px;display:flex;align-items:center;justify-content:center;border:1px solid #333;background:#151515;color:#fff;text-decoration:none}.badai-affiliate-code-slot{margin:5px 0 7px}.badai-affiliate-code-card{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0!important;padding:9px 10px!important;border-radius:10px!important;background:#0b0b0b!important;border:1px solid #2d2d2d!important;box-shadow:none!important}.badai-affiliate-code-line{display:flex!important;align-items:baseline!important;gap:6px!important;flex:1 1 auto!important;min-width:0!important;flex-wrap:nowrap!important;color:#fff!important;font-family:"Nunito",Arial,sans-serif!important}.badai-affiliate-code-line b{margin:0!important;font-size:15px!important;font-weight:500!important;line-height:1.1!important;letter-spacing:0!important;white-space:nowrap!important}.badai-affiliate-code-line span{font-family:"Nunito",Arial,sans-serif!important;font-size:16px!important;font-weight:500!important;line-height:1.1!important;color:#ff8fc5!important;letter-spacing:.02em!important;white-space:nowrap!important}.badai-affiliate-edit-code{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;width:auto!important;min-height:31px!important;margin:0!important;padding:0 11px!important;border:1px solid #3a3a3a;background:#151515;color:#fff;border-radius:8px;font:500 10px "Nunito",Arial,sans-serif;cursor:pointer;white-space:nowrap!important}.badai-affiliate-commission-card{position:static!important;padding-right:12px!important}.badai-affiliate-payout-row{display:flex;justify-content:flex-end;align-items:center;margin:1px 0 10px}.badai-affiliate-payout{display:inline-flex!important;align-items:center!important;justify-content:center!important;position:static!important;margin:0!important;min-height:36px!important;padding:0 14px!important;border-radius:9px!important;background:#25D366!important;color:#07170d!important;text-decoration:none!important;font:700 10px "Nunito",Arial,sans-serif!important;white-space:nowrap!important}.badai-referral-card{margin-top:5px!important}.badai-affiliate-loading,.badai-affiliate-empty{padding:13px;border:1px dashed #333;border-radius:13px;color:#888;text-align:center;font:600 9px "Nunito",Arial,sans-serif;line-height:1.5}

  @media(max-width:420px){.screen-heading h1,.badai-gratisan-heading h1,#akun .account-head h1{font-size:30px!important}.screen-heading p,.badai-gratisan-heading p,#akun .account-head p{font-size:10.5px!important}#akun .account-card{padding:10px 11px!important}#akun .account-field{margin-bottom:6px!important}#akun .account-field label{font-size:9.5px!important}#akun .account-field input{min-height:39px!important;font-size:12.5px!important}#akun .member-plan-card strong{font-size:17px!important}#akun .account-logout-card{grid-template-columns:1fr auto!important;padding:10px 11px!important}#akun #badaiMemberLogout{width:auto!important}.badai-material-accordion{gap:6px}.badai-material-summary{grid-template-columns:31px minmax(0,1fr) 26px;gap:8px;min-height:54px;padding:7px 8px}.badai-material-index{width:31px;height:31px}.badai-material-title{font-size:11px}.badai-material-content{padding:0 8px 9px}.badai-material-video{border-radius:10px}.badai-material-copy{font-size:9.5px}.badai-affiliate-tabs{gap:3px;padding:4px}.badai-affiliate-tab{min-height:36px;padding:0 4px;font-size:8.5px}[data-aff-panel="link"].active{min-height:calc(100dvh - 225px)!important}[data-aff-panel="link"] .badai-affiliate-multilink-box{min-height:max(500px,calc(100dvh - 235px))!important;padding:13px!important}.badai-affiliate-link-list{grid-template-rows:repeat(4,minmax(105px,1fr))!important;gap:8px!important}.badai-affiliate-link-card{grid-template-columns:1fr auto!important;grid-template-areas:"badge actions" "title actions" "url url"!important;padding:11px!important}.badai-affiliate-link-card h3{font-size:13px!important}.badai-affiliate-url{font-size:9.5px!important}.badai-affiliate-link-actions{min-width:76px!important}.badai-affiliate-video-placeholder{border-radius:14px}.badai-sales-subcard{padding:10px}.badai-referral-row,.badai-payout-history-row{padding:8px}.badai-member-header{padding:9px 10px;min-height:58px}.badai-member-header-logo img{height:30px;max-width:174px}.badai-member-help{min-height:37px;padding:0 11px;font-size:9px}.footer .label{font-size:9.7px!important}.community-hero{padding:17px}.community-hero h1{font-size:24px}.community-access-grid{grid-template-columns:1fr;gap:7px}.community-access-card{padding:12px}#carapakai.screen.active{min-height:calc(100dvh - 138px)!important}.gratisan-offer-card{width:100%;min-height:max(500px,calc(100dvh - 220px));padding:18px 14px 14px;border-radius:18px;gap:11px}.gratisan-offer-label{font-size:26px}.gratisan-value-list{grid-template-rows:repeat(3,minmax(68px,1fr));gap:8px}.gratisan-value-row{grid-template-columns:31px minmax(0,1fr) auto;gap:8px;padding:11px 10px}.gratisan-value-check{width:31px;height:31px;font-size:15px}.gratisan-value-row b{font-size:12.5px}.gratisan-value-row span:last-child{font-size:11px}.gratisan-price-box{grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:15px 11px}.gratisan-price-label{font-size:16px}.gratisan-price-right{gap:8px}.gratisan-price-total{font-size:22px}.gratisan-price{font-size:27px}.gratisan-offer-cta{min-height:49px;font-size:12.5px}.gratisan-offer-note{font-size:8.5px}.community-two{gap:7px}.community-card{padding:12px}.community-level{padding:8px;min-height:82px}}

  /* BADAI MEMBER TYPOGRAPHY OVERRIDE */
  .app,.app *{font-family:"Nunito",Arial,sans-serif!important}
  .app h1,.app h2,.app h3,.app h4,.app h5,.app h6,
  .app .title,.app .logo{
    font-family:"Raleway",Arial,sans-serif!important;
  }

  /* BADAI MEMBER DYNAMIC READABILITY */
  .app .title{font-size:34px!important;line-height:1.06!important}
  .app .subtitle{font-size:14px!important;line-height:1.5!important}
  .app p{line-height:1.5!important}
  .app .community-kicker{font-size:10.5px!important}
  .app .community-hero h1{font-size:32px!important;line-height:1.06!important}
  .app .community-hero p{font-size:13px!important;line-height:1.55!important}
  .app .community-plan-pill{font-size:10.5px!important}
  .app .community-wa h2,
  .app .community-access-card h2{font-size:18px!important;line-height:1.25!important}
  .app .community-wa p,
  .app .community-access-card p{font-size:12px!important;line-height:1.5!important}
  .app .community-wa a,
  .app .community-access-card a{font-size:11.5px!important}
  .app .gratisan-offer-label{font-size:33px!important}
  .app .gratisan-value-row b{font-size:16px!important;line-height:1.35!important}
  .app .gratisan-value-row span:last-child{font-size:14px!important}
  .app .badai-affiliate-tabs button,
  .app .badai-affiliate-tab{font-size:12px!important}
  .app .badai-affiliate-multilink-box>h2{font-size:23px!important;line-height:1.15!important}
  .app .badai-affiliate-link-intro{font-size:13px!important;line-height:1.5!important}
  .app .badai-affiliate-link-card h3{font-size:16px!important;line-height:1.25!important}
  .app .badai-affiliate-link-card p{font-size:12px!important;line-height:1.5!important}
  .app .badai-affiliate-url{font-size:11.5px!important}
  .app .badai-affiliate-copy,
  .app .badai-affiliate-open{font-size:10.5px!important}
  .app .stats .stat b{font-size:19px!important;line-height:1.2!important}
  .app .stats .stat span{font-size:12.5px!important;line-height:1.35!important}
  .app .affiliate-member-heading h2{font-size:25px!important;line-height:1.1!important}
  .app .affiliate-member-heading p{font-size:13px!important;line-height:1.5!important}
  .app .badai-affiliate-rules h3,
  .app .badai-sales-subhead h3{font-size:19px!important}
  .app .badai-affiliate-rule{font-size:13px!important;line-height:1.5!important}
  .app .badai-referral-main b{font-size:14px!important}
  .app .badai-referral-main span{font-size:11px!important}
  .app .badai-member-help{font-size:11px!important}
  .app .footer .label{font-size:11px!important}
  @media(max-width:430px){
    .app .title{font-size:30px!important}
    .app .subtitle{font-size:13px!important}
    .app .community-hero h1{font-size:28px!important}
    .app .badai-affiliate-multilink-box>h2{font-size:21px!important}
    .app .badai-affiliate-link-card h3{font-size:14px!important}
    .app .footer .label{font-size:10.5px!important}
  }



  /* BADAI AFFILIATE MOBILE READABILITY */
  @media(max-width:560px){
    .badai-affiliate-tabs{
      gap:5px!important;
      padding:5px!important;
    }
    .badai-affiliate-tab{
      min-height:48px!important;
      padding:0 7px!important;
      font-size:12.5px!important;
      line-height:1.15!important;
    }
    .badai-affiliate-video-placeholder .play{
      width:60px!important;
      height:60px!important;
      font-size:23px!important;
    }
    .badai-affiliate-video-placeholder b{
      font-size:20px!important;
      line-height:1.25!important;
    }
    .badai-affiliate-rules{
      padding:14px!important;
    }
    .badai-affiliate-rules h3{
      font-size:20px!important;
    }
    .badai-affiliate-rule{
      grid-template-columns:34px 1fr!important;
      gap:10px!important;
      font-size:13.5px!important;
      line-height:1.5!important;
    }
    .badai-affiliate-rule i{
      width:34px!important;
      height:34px!important;
      font-size:12px!important;
    }
  }

  /* BADAI MEMBER ACCESSIBILITY READABILITY FINAL
     Prioritas: jelas dibaca di HP, terutama untuk mata yang cepat lelah. */
  .app{
    font-size:15px!important;
  }

  /* Heading halaman */
  .screen-heading,
  .badai-gratisan-heading,
  #akun .account-head{
    margin-bottom:18px!important;
  }
  .screen-heading h1,
  .badai-gratisan-heading h1,
  #akun .account-head h1{
    font-size:36px!important;
    line-height:1.06!important;
  }
  .screen-heading p,
  .badai-gratisan-heading p,
  #akun .account-head p{
    font-size:15px!important;
    line-height:1.55!important;
    font-weight:600!important;
    color:#c3c3c3!important;
  }

  /* Materi accordion */
  .badai-material-accordion{
    gap:10px!important;
  }
  .badai-material-faq{
    border-radius:16px!important;
  }
  .badai-material-summary{
    grid-template-columns:42px minmax(0,1fr) 34px!important;
    gap:12px!important;
    min-height:70px!important;
    padding:11px 12px!important;
  }
  .badai-material-index{
    width:42px!important;
    height:42px!important;
    border-radius:11px!important;
    font-size:12px!important;
    font-weight:900!important;
  }
  .badai-material-title{
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:16px!important;
    line-height:1.32!important;
    font-weight:800!important;
  }
  .badai-material-chevron{
    width:34px!important;
    height:34px!important;
    border-radius:10px!important;
    font-size:20px!important;
    font-weight:900!important;
  }
  .badai-material-content{
    padding:0 12px 13px!important;
  }
  .badai-material-video{
    margin-top:12px!important;
    border-radius:14px!important;
  }
  .badai-material-video-empty{
    padding:22px!important;
    color:#aaa!important;
    font-size:13px!important;
    line-height:1.55!important;
    font-weight:600!important;
  }
  .badai-material-video-empty b{
    margin-bottom:6px!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:16px!important;
    line-height:1.2!important;
    font-weight:800!important;
  }
  .badai-material-copy{
    margin-top:11px!important;
    padding:14px 15px!important;
    border-radius:13px!important;
    color:#c7c7c7!important;
    font-size:14px!important;
    line-height:1.65!important;
    font-weight:600!important;
  }
  .badai-material-copy>b{
    margin-bottom:6px!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:15px!important;
    line-height:1.3!important;
    font-weight:800!important;
  }
  .badai-material-copy b:not(:first-child){
    color:#fff!important;
    font-weight:800!important;
  }

  /* Header & navigasi bawah */
  .badai-member-help{
    min-height:42px!important;
    padding:0 15px!important;
    font-size:12px!important;
    font-weight:800!important;
  }
  .footer{
    min-height:68px!important;
  }
  .footer .emoji .fi{
    font-size:19px!important;
  }
  .footer .label{
    font-size:12px!important;
    font-weight:700!important;
    line-height:1.15!important;
  }

  /* Community */
  .community-kicker,
  .community-card .eyebrow{
    font-size:11px!important;
  }
  .community-hero p,
  .community-card p{
    font-size:13px!important;
    line-height:1.55!important;
  }
  .community-plan-pill{
    font-size:11.5px!important;
  }
  .community-wa p,
  .community-access-card p{
    font-size:12.5px!important;
    line-height:1.5!important;
  }
  .community-wa a,
  .community-access-card a{
    font-size:12px!important;
  }
  .community-levels-head span{
    font-size:11px!important;
  }
  .community-level small{
    font-size:10px!important;
  }
  .community-level b{
    font-size:14px!important;
    line-height:1.3!important;
  }
  .community-level span{
    font-size:11.5px!important;
    line-height:1.45!important;
  }

  /* Akun */
  #akun .member-plan-card span{
    font-size:12px!important;
  }
  #akun .member-plan-card strong{
    font-size:21px!important;
  }
  #akun .member-plan-card small{
    font-size:12.5px!important;
    line-height:1.45!important;
  }
  #akun .account-field label{
    font-size:13px!important;
    font-weight:800!important;
  }
  #akun .account-field input{
    min-height:46px!important;
    font-size:14px!important;
  }
  #akun .account-help,
  #akun .account-status{
    font-size:12px!important;
    line-height:1.45!important;
  }
  #akun .account-save{
    min-height:46px!important;
    font-size:13px!important;
  }
  #akun .account-logout-card p{
    font-size:12.5px!important;
    line-height:1.5!important;
  }
  #akun #badaiMemberLogout{
    min-height:42px!important;
    font-size:12px!important;
  }

  /* Gratisan / offer */
  .gratisan-offer-note{
    font-size:11.5px!important;
    line-height:1.5!important;
  }
  .gratisan-value-row b{
    font-size:15px!important;
    line-height:1.4!important;
  }
  .gratisan-value-row span:last-child{
    font-size:13px!important;
  }

  /* Affiliate & statistik */
  .badai-affiliate-kicker,
  .affiliate-pro-pill,
  .badai-affiliate-link-badge{
    font-size:10px!important;
  }
  .badai-affiliate-link-intro,
  .affiliate-member-heading p{
    font-size:13px!important;
    line-height:1.5!important;
  }
  .badai-affiliate-link-card h3{
    font-size:16px!important;
    line-height:1.3!important;
  }
  .badai-affiliate-link-card p{
    font-size:12.5px!important;
    line-height:1.5!important;
  }
  .badai-affiliate-url{
    font-size:11.5px!important;
  }
  .badai-affiliate-copy,
  .badai-affiliate-open,
  .badai-affiliate-edit-code,
  .badai-affiliate-payout{
    font-size:11px!important;
  }
  .badai-affiliate-rule{
    font-size:13px!important;
    line-height:1.55!important;
  }
  .badai-sales-subhead span{
    font-size:11.5px!important;
  }
  .badai-referral-main b{
    font-size:14px!important;
  }
  .badai-referral-main span,
  .badai-payout-history-row div span{
    font-size:11.5px!important;
  }
  .badai-referral-side strong,
  .badai-payout-history-row>strong{
    font-size:13px!important;
  }
  .badai-referral-side small{
    font-size:10.5px!important;
  }
  .badai-payout-history-row div b{
    font-size:12.5px!important;
  }

  /* Modal upgrade */
  .badai-upgrade-kicker{
    font-size:11px!important;
  }
  .badai-upgrade-card h2{
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:26px!important;
  }
  .badai-upgrade-card p{
    font-size:14px!important;
    line-height:1.55!important;
  }
  .badai-upgrade-benefits{
    font-size:13px!important;
    line-height:1.5!important;
  }
  .badai-upgrade-actions a,
  .badai-upgrade-actions button{
    font-size:12.5px!important;
  }

  @media(max-width:430px){
    .screen-heading h1,
    .badai-gratisan-heading h1,
    #akun .account-head h1{
      font-size:32px!important;
    }
    .screen-heading p,
    .badai-gratisan-heading p,
    #akun .account-head p{
      font-size:14px!important;
    }
    .badai-material-summary{
      grid-template-columns:40px minmax(0,1fr) 32px!important;
      gap:10px!important;
      min-height:66px!important;
      padding:10px!important;
    }
    .badai-material-index{
      width:40px!important;
      height:40px!important;
      font-size:11px!important;
    }
    .badai-material-title{
      font-size:15px!important;
    }
    .badai-material-video-empty{
      font-size:12.5px!important;
    }
    .badai-material-video-empty b{
      font-size:15px!important;
    }
    .badai-material-copy{
      font-size:13.5px!important;
      padding:13px!important;
    }
    .badai-material-copy>b{
      font-size:14px!important;
    }
    .footer .label{
      font-size:11.5px!important;
    }
    .badai-member-help{
      font-size:11.5px!important;
      padding:0 12px!important;
    }
  }


  /* BADAI ACCOUNT FIT READABILITY — larger text + fuller vertical composition */
  #akun{
    padding-bottom:18px!important;
  }
  #akun .account-head{
    margin:0 0 14px!important;
    padding:10px 14px 4px!important;
  }
  #akun .account-head h1{
    font-size:40px!important;
    line-height:1.04!important;
    margin-bottom:8px!important;
  }
  #akun .account-head p{
    font-size:16px!important;
    line-height:1.5!important;
    font-weight:600!important;
    color:#c8c8c8!important;
  }

  #akun .member-plan-card{
    min-height:92px!important;
    padding:16px 18px!important;
    margin-bottom:12px!important;
    gap:4px!important;
    border-radius:17px!important;
  }
  #akun .member-plan-card span{
    font-size:13px!important;
    line-height:1.2!important;
    font-weight:800!important;
    letter-spacing:.06em!important;
  }
  #akun .member-plan-card strong{
    font-size:24px!important;
    line-height:1.12!important;
  }
  #akun .member-plan-card small{
    font-size:14px!important;
    line-height:1.45!important;
    font-weight:600!important;
  }

  #akun .account-card{
    padding:20px 18px!important;
    border-radius:20px!important;
  }
  #akun .account-field{
    gap:7px!important;
    margin-bottom:14px!important;
  }
  #akun .account-field:last-of-type{
    margin-bottom:0!important;
  }
  #akun .account-field label{
    font-size:14px!important;
    line-height:1.2!important;
    font-weight:800!important;
    letter-spacing:.035em!important;
  }
  #akun .account-field input{
    min-height:52px!important;
    padding:0 14px!important;
    border-radius:12px!important;
    font-size:16px!important;
    line-height:1.2!important;
    font-weight:700!important;
  }
  #akun .account-help{
    margin-top:2px!important;
    font-size:13px!important;
    line-height:1.45!important;
    font-weight:600!important;
    color:#929292!important;
  }
  #akun .account-save{
    min-height:54px!important;
    margin-top:15px!important;
    border-radius:12px!important;
    font-size:14px!important;
    line-height:1!important;
    font-weight:900!important;
  }
  #akun .account-status{
    margin-top:8px!important;
    font-size:13px!important;
    line-height:1.4!important;
  }

  #akun .account-logout-card{
    min-height:86px!important;
    margin-top:12px!important;
    padding:16px 18px!important;
    border-radius:18px!important;
    gap:14px!important;
    align-items:center!important;
  }
  #akun .account-logout-card h3{
    margin:0 0 5px!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:19px!important;
    line-height:1.2!important;
    font-weight:800!important;
  }
  #akun .account-logout-card p{
    font-size:13px!important;
    line-height:1.45!important;
    font-weight:600!important;
  }
  #akun #badaiMemberLogout{
    min-height:44px!important;
    padding:0 16px!important;
    border-radius:10px!important;
    font-size:12.5px!important;
    font-weight:900!important;
  }

  @media(max-width:430px){
    #akun .account-head h1{
      font-size:35px!important;
    }
    #akun .account-head p{
      font-size:14.5px!important;
    }
    #akun .member-plan-card{
      min-height:84px!important;
      padding:14px 15px!important;
    }
    #akun .member-plan-card span{
      font-size:12px!important;
    }
    #akun .member-plan-card strong{
      font-size:22px!important;
    }
    #akun .member-plan-card small{
      font-size:13px!important;
    }
    #akun .account-card{
      padding:17px 15px!important;
    }
    #akun .account-field{
      margin-bottom:12px!important;
    }
    #akun .account-field label{
      font-size:13px!important;
    }
    #akun .account-field input{
      min-height:49px!important;
      font-size:15px!important;
    }
    #akun .account-help{
      font-size:12px!important;
    }
    #akun .account-save{
      min-height:50px!important;
      font-size:13px!important;
    }
    #akun .account-logout-card{
      min-height:80px!important;
      padding:14px 15px!important;
    }
    #akun .account-logout-card h3{
      font-size:16px!important;
    }
    #akun .account-logout-card p{
      font-size:12.5px!important;
    }
    #akun #badaiMemberLogout{
      min-height:42px!important;
      font-size:12px!important;
    }
  }


  /* BADAI AFFILIATE FINAL FIT SIZE — large, clear, balanced */
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
      font-size:15px!important;
      line-height:1.4!important;
      margin-top:7px!important;
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


  /* BADAI MATERIAL RELEASE STATE — locked until each lesson is ready */
  .badai-material-faq.is-coming-soon{
    border-color:#2b2b2b!important;
    background:#0d0d0d!important;
    opacity:.78!important;
    cursor:not-allowed!important;
  }
  .badai-material-faq.is-coming-soon .badai-material-summary{
    grid-template-columns:42px minmax(0,1fr) auto!important;
    cursor:not-allowed!important;
  }
  .badai-material-faq.is-coming-soon .badai-material-index{
    background:#141414!important;
    border-color:#303030!important;
    color:#8c8c8c!important;
  }
  .badai-material-faq.is-coming-soon .badai-material-title{
    color:#b9b9b9!important;
  }
  .badai-material-coming{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    min-height:30px!important;
    padding:0 10px!important;
    border-radius:999px!important;
    border:1px solid #573047!important;
    background:#211018!important;
    color:#ff8fc5!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:10px!important;
    font-weight:900!important;
    line-height:1!important;
    letter-spacing:.02em!important;
    white-space:nowrap!important;
  }
  @media(max-width:560px){
    .badai-material-faq.is-coming-soon .badai-material-summary{
      grid-template-columns:40px minmax(0,1fr) auto!important;
    }
    .badai-material-coming{
      min-height:28px!important;
      padding:0 8px!important;
      font-size:9px!important;
    }
  }


  .badai-material-tool{
    width:100%!important;
    min-height:48px!important;
    margin-top:11px!important;
    border:1px solid #ff4fa3!important;
    border-radius:13px!important;
    background:#ff4fa3!important;
    color:#101010!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    text-align:center!important;
    text-decoration:none!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:14px!important;
    font-weight:900!important;
    line-height:1.15!important;
    letter-spacing:.01em!important;
    box-shadow:0 10px 24px rgba(255,79,163,.18)!important;
    transition:transform .18s ease,box-shadow .18s ease!important;
  }
  .badai-material-tool:hover{
    transform:translateY(-1px)!important;
    box-shadow:0 14px 28px rgba(255,79,163,.25)!important;
  }
  .badai-material-tool:active{
    transform:scale(.985)!important;
  }
  @media(max-width:560px){
    .badai-material-tool{
      min-height:46px!important;
      font-size:13px!important;
    }
  }


  .badai-material-copy.is-learning-guide{
    margin-top:12px!important;
    padding:18px 18px!important;
    border-radius:15px!important;
    background:#0b0b0b!important;
    border:1px solid #2d2d2d!important;
    color:#f1f1f1!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:18px!important;
    font-weight:800!important;
    line-height:1.55!important;
  }
  .badai-material-copy.is-learning-guide>b{
    display:block!important;
    margin-bottom:7px!important;
    color:#ff8fc5!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:14px!important;
    font-weight:900!important;
    letter-spacing:.02em!important;
  }
  @media(max-width:560px){
    .badai-material-copy.is-learning-guide{
      padding:16px!important;
      font-size:17px!important;
      line-height:1.55!important;
    }
    .badai-material-copy.is-learning-guide>b{
      font-size:13px!important;
    }
  }


  /* BADAI MATERIAL CARDS — card layout, no accordion */
  .badai-material-card-grid{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:11px!important;
    align-items:stretch!important;
  }
  .badai-material-card{
    min-width:0!important;
    min-height:248px!important;
    padding:17px!important;
    border:1px solid #3b2231!important;
    border-radius:20px!important;
    background:linear-gradient(180deg,#171015 0%,#0f0d0f 100%)!important;
    box-shadow:0 14px 30px rgba(0,0,0,.20)!important;
    display:flex!important;
    flex-direction:column!important;
    color:#fff!important;
    position:relative!important;
  }
  .badai-material-card.is-coming-soon{
    opacity:.76!important;
    filter:saturate(.72)!important;
  }
  .badai-material-card-coming{
    position:absolute!important;
    top:13px!important;
    right:13px!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    min-height:22px!important;
    padding:0 8px!important;
    border-radius:999px!important;
    border:1px solid #573047!important;
    background:#211018!important;
    color:#ff8fc5!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:8px!important;
    font-weight:900!important;
    line-height:1!important;
    letter-spacing:.02em!important;
    white-space:nowrap!important;
  }
  .badai-material-card-number{
    margin-top:0!important;
    color:#9c8490!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:11px!important;
    font-weight:800!important;
  }
  .badai-material-card-title{
    margin:10px 0 6px!important;
    color:#fff!important;
    font-family:"Raleway",Arial,sans-serif!important;
    font-size:18px!important;
    font-weight:900!important;
    line-height:1.2!important;
    letter-spacing:-.02em!important;
  }
  .badai-material-card-desc{
    margin:0!important;
    color:#c2afb8!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:12.5px!important;
    font-weight:650!important;
    line-height:1.45!important;
  }
  .badai-material-card-divider{
    height:1px!important;
    margin:16px 0 13px!important;
    background:#402532!important;
  }
  .badai-material-card-actions{
    margin-top:auto!important;
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:6px!important;
    align-items:stretch!important;
  }
  .badai-card-action{
    width:100%!important;
    min-height:34px!important;
    padding:6px 7px!important;
    border-radius:9px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    gap:4px!important;
    text-decoration:none!important;
    text-align:center!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:9.5px!important;
    font-weight:900!important;
    line-height:1.12!important;
    cursor:pointer!important;
    box-sizing:border-box!important;
  }
  .badai-card-action-tool{
    border:1px solid #ff6fb6!important;
    background:linear-gradient(90deg,#ff4fa3,#ff79bd)!important;
    color:#fff!important;
  }
  .badai-card-action-video{
    border:1px solid #ff4fa3!important;
    background:#120b0f!important;
    color:#ff8fc5!important;
  }
  .badai-card-action.is-disabled{
    background:#151113!important;
    border-color:#3b2b33!important;
    color:#89737d!important;
    cursor:not-allowed!important;
    box-shadow:none!important;
  }
  @media(max-width:560px){
    .badai-material-card-grid{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:9px!important;
    }
    .badai-material-card{
      min-height:228px!important;
      padding:10px!important;
      border-radius:15px!important;
    }
    .badai-material-card-coming{
      top:9px!important;
      right:9px!important;
      min-height:19px!important;
      padding:0 6px!important;
      font-size:6.8px!important;
    }
    .badai-material-card-number{
      font-size:9.5px!important;
    }
    .badai-material-card-title{
      margin:8px 0 5px!important;
      font-size:14px!important;
      line-height:1.18!important;
    }
    .badai-material-card-desc{
      font-size:11px!important;
      line-height:1.4!important;
    }
    .badai-material-card-divider{
      margin:12px 0 10px!important;
    }
    .badai-material-card-actions{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:5px!important;
    }
    .badai-card-action{
      min-height:32px!important;
      padding:5px 4px!important;
      font-size:8.5px!important;
      line-height:1.08!important;
      border-radius:8px!important;
    }
  }

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

  var kelas=el('kelas');
  if(kelas&&!kelas.querySelector('.screen-heading')) kelas.insertAdjacentHTML('afterbegin','<div class="screen-heading"><h1>Pemula BADAI</h1><p>10 materi khusus Member Pemula untuk mulai bikin karya dengan AI.</p></div>');
  var bonus=el('jaluruntung');
  if(bonus&&!bonus.querySelector('.screen-heading')) bonus.insertAdjacentHTML('afterbegin','<div class="screen-heading"><h1>Untung BADAI</h1><p>21 materi khusus Member Untung untuk bikin produk, konten, dan sistem yang menghasilkan.</p></div>');
  var akun=el('akun');
  if(akun){
    var accountTitle=akun.querySelector('.account-head h1');
    var accountDesc=akun.querySelector('.account-head p');
    if(accountTitle)accountTitle.textContent='Akun BADAI';
    if(accountDesc)accountDesc.textContent='Kelola data dan keamanan akun Member BADAI.';
  }

  var pemulaMaterials=[
    {title:'BIKIN AI EDUKATOR',video:'https://youtu.be/uIVMayQodjI',description:'Bikin karakter AI edukator yang bisa menyampaikan materi, tips, atau penjelasan secara menarik dalam bentuk konten.',content:'Cara belajarnya mudah, lihat dulu video tutorialnya, dan klik tombol TOOLSnya',copyLabel:'CARA BELAJARNYA',guide:true,ready:true,toolLabel:'TOOLS AI EDUCATOR',toolUrl:'https://share.gemini.google/UAeV1F4ZAmzK'},
    {title:'BIKIN GEO-SPASIAL',video:'https://youtu.be/ZxoE9HJawnk',description:'Bikin konten peta, lokasi, dan visual geospasial yang menarik dengan bantuan AI.',content:'Cara belajarnya mudah, lihat dulu video tutorialnya, dan klik tombol TOOLSnya',copyLabel:'CARA BELAJARNYA',guide:true,ready:true,toolLabel:'TOOLS GEO-SPASIAL',toolUrl:'https://share.gemini.google/mPJoQiTzg6bT'},
    {title:'BIKIN AI INFLUENCER',video:'https://youtu.be/aAYxcLKzCTc',description:'Bikin AI Influencer dengan teknik pose mirroring di depan cermin, seolah sedang ngaca, untuk menghasilkan karakter dan konten visual yang lebih natural, estetik, dan konsisten.',content:'Cara belajarnya mudah, lihat video tutorialnya lalu klik tombol TOOLS untuk praktik.',ready:true,toolLabel:'TOOLS AI INFLUENCER',toolUrl:'https://share.gemini.google/seGz1fbfq0vy'},
    {title:'BIKIN SELEBGRAM AI',video:'',description:'Bikin karakter selebgram AI lengkap dengan konsep konten dan tampilan yang konsisten.',content:'Klik tombol TOOLS untuk membuka tools Selebgram AI.',ready:true,toolLabel:'TOOLS SELEBGRAM AI',toolUrl:'https://share.gemini.google/j4HLJbWz0Lq5'},
    {title:'BIKIN AFFILIATE AI',video:'',description:'Bikin konten affiliate berbantu AI untuk memperkenalkan produk dengan lebih menarik.',content:''},
    {title:'BIKIN PAPER CRAFT',video:'',description:'Bikin desain paper craft dari ide sederhana sampai siap dijadikan pola visual.',content:''},
    {title:'BIKIN UNBOXING AI',video:'',description:'Bikin video unboxing produk dengan visual AI tanpa harus selalu merekam dari awal.',content:''},
    {title:'BIKIN SQUIDGAME AI',video:'',description:'Bikin konten Squidgame AI dengan bantuan AI, mulai dari konsep adegan sampai hasil visual yang bisa dikembangkan menjadi konten.',content:''},
    {title:'BIKIN VIDEO GENJUTSU VIRAL',video:'',description:'Bikin video transformasi Genjutsu yang menarik untuk konten pendek dan media sosial.',content:''},
    {title:'BIKIN VIDEO KLONING',video:'',description:'Bikin video kloning karakter atau diri sendiri untuk variasi konten kreatif dengan AI.',content:''}
  ];

  var untungMaterials=[
    {title:'BIKIN APLIKASI',video:'',description:'Belajar menyusun aplikasi sederhana dengan bantuan AI dari ide sampai fungsi dasarnya.',content:''},
    {title:'BIKIN POSTER',video:'',description:'Bikin poster promosi yang rapi dan menarik dengan bantuan AI.',content:''},
    {title:'BIKIN PRESENTASI',video:'',description:'Bikin slide presentasi lebih cepat, terstruktur, dan enak dilihat dengan AI.',content:''},
    {title:'BIKIN BUKU',video:'',description:'Susun ide, isi, dan struktur buku dengan bantuan AI sampai siap dirapikan.',content:''},
    {title:'BIKIN WEB APP',video:'',description:'Bikin web app sederhana dari kebutuhan nyata tanpa harus mulai dari kode kosong.',content:''},
    {title:'BIKIN RPP',video:'',description:'Bantu menyusun RPP yang lebih terstruktur dengan AI sesuai kebutuhan pembelajaran.',content:''},
    {title:'BIKIN LKPD',video:'',description:'Bikin LKPD yang rapi dan mudah dipakai untuk kegiatan belajar.',content:''},
    {title:'BIKIN KOMIK DIGITAL',video:'',description:'Bikin cerita, karakter, dan panel komik digital menggunakan bantuan AI.',content:''},
    {title:'BIKIN LKPD INTERAKTIF',video:'',description:'Ubah materi belajar menjadi LKPD interaktif yang lebih menarik untuk siswa.',content:''},
    {title:'BIKIN INFOGRAFIS',video:'',description:'Ubah informasi panjang menjadi infografis yang ringkas dan mudah dipahami.',content:''},
    {title:'BIKIN PRESENTASI',video:'',description:'Susun materi menjadi presentasi visual yang siap dipakai untuk mengajar atau menjual.',content:''},
    {title:'BIKIN GAME EDUKASI',video:'',description:'Bikin permainan edukasi sederhana yang membantu proses belajar jadi lebih interaktif.',content:''},
    {title:'WEB RAHASIA KUMPULAN PROMPT GRATIS',video:'',description:'Bikin web sederhana untuk menyimpan dan membagikan koleksi prompt secara rapi.',content:''},
    {title:'BUAT VIDEO PENDEK DIBAYAR LYNK ID',video:'',description:'Pelajari alur membuat video pendek dan memanfaatkannya melalui fitur monetisasi Lynk ID.',content:''},
    {title:'JUALAN OTOMATIS DI INSTAGRAM DAN THREADS',video:'',description:'Susun alur konten dan promosi agar aktivitas jualan di Instagram dan Threads lebih teratur.',content:''},
    {title:'STRATEGI JAGO JUALAN DI WHATSAPP',video:'',description:'Pelajari cara membangun percakapan dan penawaran yang lebih nyaman lewat WhatsApp.',content:''},
    {title:'CONTEKAN 3 PESAN BIAR KONTAK BARU LEBIH CEPAT JADI PEMBELI',video:'',description:'Pelajari tiga pola pesan untuk menindaklanjuti kontak baru tanpa terasa memaksa.',content:''},
    {title:'BIKIN KELAS ONLINE',video:'',description:'Susun materi, struktur, dan akses kelas online dari pengetahuan yang kamu punya.',content:''},
    {title:'5 STRATEGI DAPAT KONTAK BERKUALITAS',video:'',description:'Pelajari cara mencari kontak yang lebih relevan dengan produk atau layananmu.',content:''},
    {title:'9 STRATEGI DAPAT RIBUAN KONTAK NON STOP',video:'',description:'Pelajari beberapa jalur untuk memperluas jaringan kontak secara konsisten.',content:''},
    {title:'DAPAT KONTAK LANGSUNG DAPAT TRANSFERAN',video:'',description:'Pelajari cara menghubungkan aktivitas mencari kontak dengan penawaran yang jelas dan terarah.',content:''}
  ];

  function youtubeEmbedUrl(url){
    var value=String(url||'').trim();
    if(!value)return '';
    var match=value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
    return match?'https://www.youtube.com/embed/'+match[1]:value;
  }

  function renderMemberMaterials(targetId,items,label,startNo){
    var host=el(targetId);
    if(!host)return;
    var firstNo=Number(startNo||1);
    host.className='badai-material-card-grid';
    host.innerHTML=items.map(function(item,i){
      var number=String(firstNo+i).padStart(3,'0');
      var hasTool=!!String(item.toolUrl||'').trim();
      var hasVideo=!!String(item.video||'').trim();
      var ready=item.ready===true || hasTool || hasVideo;
      var description=item.description
        ? item.description
        : (item.content ? item.content : 'Materi ini sedang disiapkan.');

      var toolButton=hasTool
        ? '<a class="badai-card-action badai-card-action-tool" href="'+item.toolUrl+'" target="_blank" rel="noopener noreferrer">BUKA TOOLS <span>↗</span></a>'
        : '<button class="badai-card-action badai-card-action-tool is-disabled" type="button" disabled>TOOLS</button>';

      var videoButton=hasVideo
        ? '<a class="badai-card-action badai-card-action-video" href="'+item.video+'" target="_blank" rel="noopener noreferrer">▶ TUTORIAL</a>'
        : '<button class="badai-card-action badai-card-action-video is-disabled" type="button" disabled>▶ TUTORIAL</button>';

      return '<article class="badai-material-card'+(ready?' is-ready':' is-coming-soon')+'">'+
        (!ready?'<span class="badai-material-card-coming">SEGERA HADIR</span>':'')+
        '<div class="badai-material-card-number">#'+number+'</div>'+
        '<h3 class="badai-material-card-title">'+item.title+'</h3>'+
        '<p class="badai-material-card-desc">'+description+'</p>'+
        '<div class="badai-material-card-divider"></div>'+
        '<div class="badai-material-card-actions">'+toolButton+videoButton+'</div>'+
      '</article>';
    }).join('');
  }

  renderMemberMaterials('chapterGrid',pemulaMaterials,'Materi Pemula',1);
  renderMemberMaterials('profitRouteGrid',untungMaterials,'Materi Untung',11);

  [
    ['kelas','Pemula','fi fi-rr-square-1'],['jaluruntung','Untung','fi fi-rr-square-2'],['afiliasi','Affiliasi','fi fi-rr-square-3'],['akun','Akun','fi fi-rr-square-4']
  ].forEach(function(menu){var button=document.querySelector('.footer [data-screen="'+menu[0]+'"]');if(!button)return;var label=button.querySelector('.label');var emoji=button.querySelector('.emoji');if(label)label.textContent=menu[1];if(emoji)emoji.innerHTML='<i class="'+menu[2]+'" aria-hidden="true"></i>'});

  function levelFromPlan(plan){if(plan==='pro')return 3;if(plan==='free')return 1;return 2}
  function currentPlan(){var stable=document.documentElement.dataset.membershipPlan;if(stable)return stable;var text=String(el('memberPlanName')?el('memberPlanName').textContent:'').toUpperCase();if(text.indexOf('UNTUNG')!==-1)return'pro';if(text.indexOf('GRATIS')!==-1)return'free';return'newbie'}
  function planLabel(level){return level>=3?'MEMBER UNTUNG':level===1?'MEMBER GRATISAN':'MEMBER PEMULA'}

  var upgradeModal=null;
  function getUpgradeModal(){if(upgradeModal)return upgradeModal;upgradeModal=document.createElement('div');upgradeModal.className='badai-upgrade-modal';upgradeModal.innerHTML='<div class="badai-upgrade-card" role="dialog" aria-modal="true"><div class="badai-upgrade-lock">🔒</div><div class="badai-upgrade-kicker">AKSES TERKUNCI</div><h2 id="badaiUpgradeTitle">Menu ini masih terkunci</h2><p id="badaiUpgradeText">Naik paket untuk membuka akses ini.</p><div id="badaiUpgradeBenefits" class="badai-upgrade-benefits"></div><div class="badai-upgrade-actions"><a id="badaiUpgradeButton" href="#" target="_blank" rel="noopener noreferrer">UPGRADE SEKARANG</a><button type="button" data-close-upgrade>NANTI DULU</button></div></div>';document.body.appendChild(upgradeModal);upgradeModal.addEventListener('click',function(e){if(e.target===upgradeModal||(e.target.closest&&e.target.closest('[data-close-upgrade]')))upgradeModal.classList.remove('open')});return upgradeModal}
  function openUpgrade(feature,targetPackage){var modal=getUpgradeModal();var target=targetPackage==='Pemula'?'Paket Pemula':'Paket Untung';el('badaiUpgradeTitle').textContent=feature+' masih terkunci';el('badaiUpgradeText').textContent='Upgrade ke '+target+' untuk membuka menu '+feature+'.';el('badaiUpgradeBenefits').innerHTML=targetPackage==='Pemula'?'<span>✓ Buka seluruh menu Pemula</span><span>✓ Akses kelas dan update materi BADAI</span><span>✓ Tetap dapat Komunitas + KulWA</span>':'<span>✓ Menu Untung terbuka</span><span>✓ Program Affiliasi aktif</span><span>✓ Link afiliasi + bahan promosi + komisi</span>';var btn=el('badaiUpgradeButton');btn.textContent='UPGRADE KE '+target.toUpperCase();btn.href='https://wa.me/6281237523626?text='+encodeURIComponent('Halo Admin BADAI, saya ingin upgrade ke '+target+'.');modal.classList.add('open')}

  function syncPlanAccess(){var level=levelFromPlan(currentPlan());var req={kelas:2,jaluruntung:3,afiliasi:3};Object.keys(req).forEach(function(screen){var btn=document.querySelector('.footer [data-screen="'+screen+'"]');if(!btn)return;var locked=level<req[screen];btn.classList.toggle('is-plan-locked',locked);btn.dataset.planLocked=locked?'1':'0';btn.setAttribute('aria-disabled',locked?'true':'false')});document.querySelectorAll('[data-member-level]').forEach(function(card){card.classList.toggle('active',Number(card.getAttribute('data-member-level'))===level)});var active=document.querySelector('#kelas.screen.active,#jaluruntung.screen.active,#afiliasi.screen.active');if(active&&level<(req[active.id]||1)&&typeof window.show==='function')window.show('kelas')}

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
    tutorial.innerHTML='<div class="badai-affiliate-video-placeholder"><div class="play">▶</div><b>Video Tutorial Afiliasi BADAI</b></div><div class="badai-affiliate-rules"><h3>Aturan Main Afiliasi</h3><div class="badai-affiliate-rule-list"><div class="badai-affiliate-rule"><i>1</i><span>Bagikan link afiliasi milik kamu sendiri agar referral tercatat otomatis.</span></div><div class="badai-affiliate-rule"><i>2</i><span>Komisi dihitung dari transaksi yang valid dan berhasil terverifikasi.</span></div><div class="badai-affiliate-rule"><i>3</i><span>Pencairan komisi dilakukan melalui Admin BADAI dan riwayatnya tercatat di menu Penjualan.</span></div><div class="badai-affiliate-rule"><i>4</i><span>Gunakan materi promosi dengan wajar. Hindari spam dan klaim yang menyesatkan.</span></div></div></div>';

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

    var payoutRow=document.createElement('div');
    payoutRow.id='badaiAffiliatePayoutRow';
    payoutRow.className='badai-affiliate-payout-row';
    salesPanel.appendChild(payoutRow);

    var referralCard=document.createElement('div');
    referralCard.className='badai-sales-subcard badai-referral-card';
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
  function ensurePayoutButton(){var commission=el('affiliateCommissionTotal');if(!commission)return;var card=commission.closest?commission.closest('.stat'):null;if(!card)return;card.classList.add('badai-affiliate-commission-card');if(el('badaiAffiliatePayout'))return;var host=el('badaiAffiliatePayoutRow')||card;var btn=document.createElement('a');btn.id='badaiAffiliatePayout';btn.className='badai-affiliate-payout';btn.href='#';btn.target='_blank';btn.rel='noopener noreferrer';btn.textContent='CAIRKAN KOMISI';btn.addEventListener('click',function(){var code=String(el('affiliateCode')?el('affiliateCode').textContent:'-').trim()||'-';var amount=String(commission.textContent||'Rp0').trim()||'Rp0';btn.href='https://wa.me/6281237523626?text='+encodeURIComponent('Halo Admin BADAI, saya ingin mencairkan komisi afiliasi saya.\n\nKode Afiliasi: '+code+'\nTotal Komisi: '+amount)});host.appendChild(btn)}
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
