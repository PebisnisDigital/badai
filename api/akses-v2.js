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
    --member-nav-count:5;
    background:rgba(0,0,0,.98)!important;border-top:1px solid #1f1f1f!important;
    box-shadow:0 -8px 24px rgba(0,0,0,.18)!important;
    grid-template-columns:repeat(var(--member-nav-count,5),minmax(0,1fr))!important;
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
  .footer #affiliateNavButton.is-feature-coming-soon{
    position:relative!important;
    opacity:.62!important;
    cursor:not-allowed!important;
    filter:grayscale(.15)!important;
  }
  .footer #affiliateNavButton.is-feature-coming-soon:hover,
  .footer #affiliateNavButton.is-feature-coming-soon.active{
    background:transparent!important;
    color:#fff!important;
  }
  .footer #affiliateNavButton .label{
    display:grid!important;
    justify-items:center!important;
    gap:3px!important;
  }
  .footer #affiliateNavButton .affiliate-soon-badge{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    min-height:15px!important;
    padding:0 5px!important;
    border-radius:999px!important;
    border:1px solid #65304d!important;
    background:#24101a!important;
    color:#ff8fc5!important;
    font:900 6.5px/1 "Nunito",Arial,sans-serif!important;
    letter-spacing:.04em!important;
    white-space:nowrap!important;
  }

  .badai-member-header{
    position:sticky;top:0;z-index:80;width:100%;min-height:64px;display:grid;
    grid-template-columns:1fr;align-items:center;gap:0;padding:8px 14px;
    background:rgba(7,7,7,.97);border-bottom:1px solid #242424;
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)
  }
  .badai-member-header-logo{display:flex;align-items:center;min-width:0;text-decoration:none}
  .badai-member-header-logo img{display:block;width:auto;height:34px;max-width:150px;object-fit:contain}
  .badai-member-header-actions{
    justify-self:end;width:min(100%,330px);display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:center
  }
  .badai-member-header-action{
    min-width:0;min-height:38px;padding:0 11px;border-radius:11px;
    display:flex;align-items:center;justify-content:center;gap:6px;
    text-decoration:none;white-space:nowrap;
    font:900 9.5px/1 "Nunito",Arial,sans-serif;
    transition:transform .18s ease,border-color .18s ease,background .18s ease
  }
  .badai-member-header-action:hover{transform:translateY(-1px)}
  .badai-member-header-action.mentor{
    position:relative;background:#25d366;border:1px solid #25d366;color:#07170d;
    box-shadow:0 7px 18px rgba(37,211,102,.15)
  }
  .badai-member-header-action.mentor .mentor-nav-badge{
    position:absolute!important;top:-5px!important;right:-5px!important;
    min-width:18px!important;height:18px!important;padding:0 4px!important;
    display:grid!important;place-items:center!important;border:2px solid #070707!important;
    border-radius:999px!important;background:#ff4fa3!important;color:#111!important;
    font:950 7px/1 "Nunito",Arial,sans-serif!important
  }
  .badai-member-header-action.mentor .mentor-nav-badge.hidden{display:none!important}
  .badai-member-header-action.group{
    background:#0c140f;border:1px solid #28563a;color:#79eaa0
  }
  .badai-member-header-action span{font-size:11px;line-height:1}
  .badai-member-header-actions{display:none!important}
  .badai-member-header-logo{justify-self:start}

  .badai-pemula-intro{
    min-width:0;min-height:72px;display:grid;gap:0;align-content:center;
    padding:14px 14px 14px 7px;border-bottom:1px solid #352832;text-align:left
  }
  .badai-pemula-intro-title-row{display:flex;align-items:center;gap:8px;min-width:0}
  .badai-pemula-intro-title{
    margin:0;color:#fff;font-family:"Raleway",Arial,sans-serif;
    font-size:28px;font-weight:900;line-height:1;letter-spacing:-.03em;white-space:nowrap
  }
  .badai-pemula-intro-title span{color:#ff4fa3}
  .badai-pemula-update-badge{
    display:inline-flex;align-items:center;min-height:34px;padding:0 14px;border-radius:999px;
    border:1px solid #77385b;background:#1a0f15;color:#ffadd4;
    font:900 12px/1 "Nunito",Arial,sans-serif;letter-spacing:.05em;white-space:nowrap
  }
  .badai-pemula-intro-marquee{
    position:relative;min-width:0;overflow:hidden;height:44px;display:flex;align-items:center;
    -webkit-mask-image:linear-gradient(90deg,#000 0%,#000 95%,transparent 100%);
    mask-image:linear-gradient(90deg,#000 0%,#000 95%,transparent 100%)
  }
  .badai-pemula-intro-track{
    display:flex;align-items:center;flex:0 0 max-content;width:max-content;white-space:nowrap;
    animation:badaiPemulaIntroTicker 34s linear infinite!important;
    -webkit-animation:badaiPemulaIntroTicker 34s linear infinite!important;
    will-change:transform;transform:translate3d(0,0,0)
  }
  .badai-pemula-intro-item{
    flex:0 0 auto;padding-right:82px;color:#f5f5f5;
    font:900 18px/1.2 "Nunito",Arial,sans-serif;letter-spacing:0
  }
  .badai-pemula-intro-item::before{
    content:"●";margin-right:14px;color:#ff4fa3;font-size:9px;vertical-align:2px
  }
  @-webkit-keyframes badaiPemulaIntroTicker{
    from{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}
    to{-webkit-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0)}
  }
  @keyframes badaiPemulaIntroTicker{
    from{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}
    to{-webkit-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0)}
  }
  @media(max-width:560px){
    .badai-member-header{gap:8px;padding:7px 8px;min-height:60px}
    .badai-member-header-logo img{height:29px;max-width:92px}
    .badai-member-header-actions{width:min(100%,245px);gap:5px}
    .badai-member-header-action{min-height:34px;padding:0 7px;border-radius:9px;font-size:8px;gap:4px}
    .badai-member-header-action span{font-size:9px}
    .badai-pemula-intro{min-height:64px;gap:0;padding:12px 8px 12px 4px}
    .badai-pemula-intro-title-row{gap:8px}
    .badai-pemula-intro-title{font-size:22px}
    .badai-pemula-update-badge{min-height:29px;padding:0 10px;font-size:10px}
    .badai-pemula-intro-marquee{height:38px}
    .badai-pemula-intro-item{font-size:15.5px;line-height:1.2;padding-right:60px}
  }

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

  /* PEMULA — support buttons in header, member intro + Tool VO above materials */
  #kelas .screen-heading.badai-pemula-heading{
    display:grid!important;grid-template-columns:minmax(0,1fr) minmax(170px,215px)!important;
    gap:12px!important;align-items:stretch!important;text-align:left!important;
    padding:4px 4px 0!important;margin-bottom:18px!important
  }
  #kelas .badai-pemula-heading-actions{
    width:100%;display:grid;grid-template-columns:1fr;gap:0;align-items:stretch
  }
  #kelas .badai-pemula-bonus{
    min-width:0;padding:10px 11px;border-radius:16px;
    box-shadow:0 12px 28px rgba(0,0,0,.2);text-align:left;
    background:linear-gradient(145deg,#191015,#0d0d0d);border:1px solid #4d263a
  }
  #kelas .badai-pemula-bonus small{
    display:block;margin:0 0 5px;color:#ff8fc5;
    font:800 8px/1 "Nunito",Arial,sans-serif;letter-spacing:.08em
  }
  #kelas .badai-pemula-bonus a{
    display:flex;align-items:center;justify-content:space-between;gap:9px;
    min-height:38px;padding:0 12px;border-radius:11px;
    background:#ff4fa3;color:#111;text-decoration:none;
    font:900 10.5px/1 "Nunito",Arial,sans-serif;white-space:nowrap;
    box-shadow:0 8px 22px rgba(255,79,163,.18)
  }
  #kelas .badai-pemula-bonus a span{font-size:13px}
  @media(max-width:560px){
    #kelas .screen-heading.badai-pemula-heading{
      grid-template-columns:minmax(0,1fr) minmax(125px,155px)!important;
      gap:8px!important;padding:3px 0 0!important;margin-bottom:12px!important
    }
    #kelas .badai-pemula-bonus{padding:8px;border-radius:13px}
    #kelas .badai-pemula-bonus small{font-size:7px;margin-bottom:4px}
    #kelas .badai-pemula-bonus a{min-height:34px;padding:0 9px;font-size:9px;border-radius:9px}
  }

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
  .badai-material-card-actions.is-single{
    grid-template-columns:minmax(0,1fr)!important;
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


  #mentor{padding-bottom:105px!important}
  .mentor-member-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:16px 4px 12px;border-bottom:1px solid #2c2027}
  .mentor-member-head h1{margin:4px 0 6px;color:#fff;font:900 28px/1 "Raleway",Arial,sans-serif;letter-spacing:-.03em}
  .mentor-member-head p{margin:0;max-width:520px;color:#aaa;font:700 12px/1.55 "Nunito",Arial,sans-serif}
  .mentor-kicker{color:#ff77ba;font:950 9px/1 "Nunito",Arial,sans-serif;letter-spacing:.1em}
  .mentor-member-status{flex:0 0 auto;padding:7px 10px;border:1px solid #343434;border-radius:999px;background:#101010;color:#aaa;font:900 8px/1 "Nunito",Arial,sans-serif}
  .mentor-member-status.online{border-color:#28573a;color:#78dfa0;background:#0c1710}
  .mentor-member-status.offline{border-color:#4a3f32;color:#d7b784;background:#17120d}
  #mentorNavButton{position:relative}
  .footer #mentorNavButton .mentor-nav-badge{
    position:absolute!important;
    top:3px!important;
    right:calc(50% - 24px)!important;
    min-width:18px!important;height:18px!important;padding:0 5px!important;
    display:grid!important;place-items:center!important;
    border:2px solid #080808!important;border-radius:999px!important;
    background:#25d366!important;color:#0b141a!important;
    font:800 9px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;
    box-sizing:border-box
  }
  .mentor-nav-badge.hidden{display:none!important}
  .footer #mentorNavButton .mentor-nav-badge.hidden{display:none!important}
  .mentor-chat-card{margin-top:12px;border:1px solid #292929;border-radius:18px;background:#080808;overflow:hidden}
  .mentor-message-list{height:min(58vh,520px);min-height:350px;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:radial-gradient(circle at 50% -20%,#1c0c15 0,#090909 36%,#060606 100%)}
  .mentor-empty{margin:auto;color:#7d7d7d;text-align:center;font:800 11px/1.5 "Nunito",Arial,sans-serif}
  .mentor-msg{max-width:82%;padding:9px 11px;border-radius:14px;display:grid;gap:4px}
  .mentor-msg.member{align-self:flex-end;background:#ff4fa3;color:#111;border-bottom-right-radius:4px}
  .mentor-msg.mentor{align-self:flex-start;background:#171717;color:#fff;border:1px solid #2b2b2b;border-bottom-left-radius:4px}
  .mentor-msg.system{align-self:center;background:#161016;color:#d3a7bd;border:1px solid #3d2833;text-align:center}
  .mentor-msg .who{font:950 7px/1 "Nunito",Arial,sans-serif;letter-spacing:.07em;opacity:.75}
  .mentor-msg .body{white-space:pre-wrap;overflow-wrap:anywhere;font:750 12px/1.42 "Nunito",Arial,sans-serif}
  .mentor-msg .time{justify-self:end;font:800 7px/1 "Nunito",Arial,sans-serif;opacity:.6}
  .mentor-msg.sticker .body{font-size:34px;line-height:1.1}
  .mentor-msg-file{display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;font-weight:900}
  .mentor-msg-image{display:grid;gap:6px;color:inherit;text-decoration:none}
  .mentor-msg-image img{display:block;width:min(260px,100%);max-height:300px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#111}
  .mentor-msg-image span{font-size:8px;font-weight:900;opacity:.8}
  .mentor-toast{position:fixed;left:50%;bottom:90px;transform:translate(-50%,16px);z-index:9999;max-width:min(92vw,430px);padding:10px 13px;border:1px solid #63324d;border-radius:12px;background:#180f15;color:#fff;box-shadow:0 16px 44px rgba(0,0,0,.42);font:850 10px/1.4 "Nunito",Arial,sans-serif;opacity:0;pointer-events:none;transition:.22s ease}
  .mentor-toast.show{opacity:1;transform:translate(-50%,0)}
  .mentor-sticker-tray{display:flex;gap:7px;padding:9px 10px;border-top:1px solid #242424;overflow:auto;background:#0c0c0c}
  .mentor-sticker-tray.hidden{display:none}
  .mentor-sticker-tray button{flex:0 0 auto;width:40px;height:40px;border:1px solid #303030;border-radius:11px;background:#151515;font-size:21px;cursor:pointer}
  .mentor-composer{display:grid;grid-template-columns:38px 38px minmax(0,1fr) auto;gap:7px;padding:9px;border-top:1px solid #242424;background:#0b0b0b;align-items:end}
  .mentor-icon-btn{width:38px;height:38px;display:grid;place-items:center;border:1px solid #303030;border-radius:11px;background:#151515;color:#fff;font-size:18px;cursor:pointer;box-sizing:border-box}
  .mentor-composer textarea{min-height:38px;max-height:110px;resize:none;padding:10px 11px;border:1px solid #303030;border-radius:12px;background:#111;color:#fff;outline:none;font:750 11px/1.4 "Nunito",Arial,sans-serif;box-sizing:border-box}
  .mentor-composer textarea:focus{border-color:#ff4fa3}
  .mentor-send-btn{min-height:38px;padding:0 13px;border:0;border-radius:11px;background:#ff4fa3;color:#111;font:950 9px/1 "Raleway",Arial,sans-serif;cursor:pointer}
  .mentor-upload-note{padding:0 10px 10px;color:#6f6f6f;font:700 7.5px/1.4 "Nunito",Arial,sans-serif;background:#0b0b0b}
  .mentor-archive-note{margin-top:10px;padding:11px 12px;border:1px solid #2b2230;border-radius:13px;background:#100c0f;display:grid;gap:4px}
  .mentor-archive-note b{color:#ff8fc5;font:950 8px/1 "Nunito",Arial,sans-serif;letter-spacing:.08em}
  .mentor-archive-note span{color:#8d8288;font:700 9px/1.45 "Nunito",Arial,sans-serif}
  @media(max-width:560px){
    .mentor-member-head{display:grid}
    .mentor-member-head h1{font-size:23px}
    .mentor-member-status{justify-self:start}
    .mentor-message-list{height:52vh;min-height:310px;padding:10px}
    .mentor-composer{grid-template-columns:34px 34px minmax(0,1fr) auto;gap:5px;padding:7px}
    .mentor-icon-btn{width:34px;height:36px}
    .mentor-send-btn{min-height:36px;padding:0 9px;font-size:8px}
    .mentor-msg{max-width:88%}
  }


  /* Mentor work hours — member view */
  #mentor .mentor-work-hours-member-notice{
    flex:0 0 auto;
    display:grid;
    gap:3px;
    padding:10px 13px;
    border-top:1px solid #3b3034;
    border-bottom:1px solid #3b3034;
    background:rgba(0,0,0,.82);
    color:#aaa;
  }
  #mentor .mentor-work-hours-member-notice.hidden{display:none!important}
  #mentor .mentor-work-hours-member-notice b{
    color:#ff9297;
    font-size:9px!important;
    font-weight:950!important;
  }
  #mentor .mentor-work-hours-member-notice span{
    font-size:9px!important;
    line-height:1.45!important;
  }
  #mentor .mentor-chat-card.mentor-after-hours{
    background:rgba(0,0,0,.92)!important;
    border-color:#242424!important;
  }
  #mentor .mentor-chat-card.mentor-after-hours .mentor-wa-head,
  #mentor .mentor-chat-card.mentor-after-hours .mentor-message-wrap{
    background-color:#050505!important;
    opacity:.58;
    filter:saturate(.5) brightness(.72);
  }
  #mentor .mentor-chat-card.mentor-after-hours .mentor-composer{
    background:#080808!important;
  }
  #mentor .mentor-chat-card.mentor-after-hours .mentor-upload-note{
    background:#080808!important;
    color:#696969!important;
  }
  #mentor .mentor-chat-card.mentor-after-hours .mentor-wa-person span{
    color:#ff9ea3!important;
  }

  /* Chat management menu + multi-delete */
  .mentor-wa-person{flex:1 1 auto!important}
  .mentor-chat-more{
    flex:0 0 38px;width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:999px;
    background:transparent;color:#d1d7db;font-size:25px;line-height:1;cursor:pointer
  }
  .mentor-chat-more:hover{background:#202c33}
  .mentor-chat-manage-menu{
    position:absolute;right:9px;top:55px;z-index:120;width:210px;padding:6px;
    border:1px solid #2b3942;border-radius:11px;background:#202c33;
    box-shadow:0 14px 36px rgba(0,0,0,.46)
  }
  .mentor-chat-manage-menu.hidden{display:none}
  .mentor-chat-manage-menu button{
    width:100%;min-height:42px;padding:0 11px;display:flex;align-items:center;gap:10px;border:0;border-radius:8px;
    background:transparent;color:#e9edef;text-align:left;font:750 11px/1.2 "Nunito",Arial,sans-serif;cursor:pointer
  }
  .mentor-chat-manage-menu button:hover{background:#2a3942}
  .mentor-chat-manage-menu button.danger{color:#ff9aa8}
  .mentor-chat-select-bar{
    position:absolute;left:8px;right:8px;top:62px;z-index:110;min-height:46px;padding:6px 8px;
    display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:8px;
    border:1px solid #31444e;border-radius:11px;background:#202c33;box-shadow:0 8px 24px rgba(0,0,0,.35)
  }
  .mentor-chat-select-bar.hidden{display:none}
  .mentor-chat-select-bar button{min-height:34px;border:0;border-radius:9px;background:#2a3942;color:#e9edef;font-weight:900;cursor:pointer}
  .mentor-chat-select-bar .delete-selected{padding:0 12px;background:#ff4fa3;color:#111}
  .mentor-chat-select-bar b{font-size:11px;color:#e9edef}
  .mentor-chat-card.chat-select-mode .mentor-msg[data-message-id]{cursor:pointer!important;outline:1px solid transparent}
  .mentor-chat-card.chat-select-mode .mentor-msg[data-message-id]::after{
    content:"";position:absolute;right:-9px;top:-8px;width:18px;height:18px;border:2px solid #8696a0;border-radius:999px;background:#0b141a;box-sizing:border-box
  }
  .mentor-chat-card.chat-select-mode .mentor-msg[data-message-id].chat-selected{outline:2px solid #ff4fa3!important}
  .mentor-chat-card.chat-select-mode .mentor-msg[data-message-id].chat-selected::after{
    content:"✓";display:grid;place-items:center;border-color:#ff4fa3;background:#ff4fa3;color:#111;font-size:10px;font-weight:950
  }
  .mentor-chat-card.chat-select-mode .mentor-bubble-menu-btn{display:none!important}

  /* Mentor chat: familiar WhatsApp-style behavior, BADAI visual identity */
  .mentor-chat-card{position:relative;border-radius:15px!important;background:#0b0b0b!important;border:1px solid #292929!important;overflow:hidden!important}
  .mentor-wa-head{height:58px;display:flex;align-items:center;gap:10px;padding:8px 11px;border-bottom:1px solid #242424;background:#121212}
  .mentor-wa-avatar{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:999px;background:linear-gradient(145deg,#ff4fa3,#a92367);color:#fff;font:950 16px/1 "Raleway",Arial,sans-serif}
  #mentor .mentor-wa-avatar.has-photo,#mentor .mentor-chat-row-avatar.shared-mentor-photo,#mentor .mentor-chat-info-avatar.has-photo{padding:0!important;overflow:hidden!important}
  #mentor .mentor-wa-avatar img,#mentor .mentor-chat-row-avatar.shared-mentor-photo img,#mentor .mentor-chat-info-avatar img{display:block;width:100%;height:100%;object-fit:cover;border-radius:999px}
  .mentor-wa-person{min-width:0;display:grid;gap:3px}
  .mentor-wa-person strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font:900 12px/1.1 "Nunito",Arial,sans-serif}
  .mentor-wa-person span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#939393;font:750 8px/1.1 "Nunito",Arial,sans-serif}
  .mentor-wa-person span.typing{color:#78dfa0}
  .mentor-message-wrap{position:relative}
  .mentor-message-list{height:min(60vh,560px)!important;min-height:380px!important;padding:14px 10px!important;gap:3px!important;background:
    radial-gradient(circle at 12px 12px,rgba(255,255,255,.018) 1.2px,transparent 1.5px) 0 0/24px 24px,
    linear-gradient(180deg,#0c0c0c,#080808)!important;scroll-behavior:smooth}
  .mentor-date-sep{align-self:center;margin:8px 0 6px;padding:5px 9px;border-radius:8px;background:#1a1719;color:#aaa;font:850 7px/1 "Nunito",Arial,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.2)}
  .mentor-msg{position:relative;max-width:79%!important;padding:6px 7px 4px!important;border-radius:8px!important;display:block!important;box-shadow:0 1px 1px rgba(0,0,0,.22)}
  .mentor-msg.member{align-self:flex-end!important;background:#512039!important;color:#fff!important;border:0!important;border-top-right-radius:2px!important}
  .mentor-msg.mentor{align-self:flex-start!important;background:#202020!important;color:#f7f7f7!important;border:0!important;border-top-left-radius:2px!important}
  .mentor-msg.system{align-self:center!important;background:#171317!important;color:#d6b3c4!important}
  .mentor-msg .who{display:none!important}
  .mentor-msg .body{font:650 11.5px/1.36 "Nunito",Arial,sans-serif!important;padding:1px 2px 0}
  .mentor-msg-meta{display:flex;align-items:center;justify-content:flex-end;gap:3px;min-height:11px;margin-top:1px;padding-left:20px;color:rgba(255,255,255,.56);font:750 6.8px/1 "Nunito",Arial,sans-serif}
  .mentor-receipt{font-size:8px;letter-spacing:-2px;color:#a7a7a7;padding-right:2px}
  .mentor-receipt.read{color:#55b9ff}
  .mentor-msg.sticker{background:transparent!important;box-shadow:none!important;padding:3px!important}
  .mentor-msg.sticker .body{font-size:38px!important;line-height:1.08!important}
  .mentor-msg.sticker .mentor-msg-meta{padding:2px 4px;border-radius:7px;background:rgba(0,0,0,.35)}
  .mentor-msg-image img{width:min(290px,100%)!important;max-height:330px!important;border-radius:6px!important;border:0!important}
  .mentor-msg-image span{display:none}
  .mentor-image-caption{padding:6px 3px 1px;font:650 11px/1.35 "Nunito",Arial,sans-serif}
  .mentor-msg-file{min-width:190px;padding:8px;border-radius:7px;background:rgba(0,0,0,.18);text-decoration:none!important}
  .mentor-file-icon{width:31px;height:31px;display:grid;place-items:center;border-radius:999px;background:#333;font-size:14px}
  .mentor-file-copy{display:grid;gap:2px;min-width:0}
  .mentor-file-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}
  .mentor-file-copy small{font-size:6.5px;opacity:.65}
  .mentor-jump-latest{position:absolute;right:12px;bottom:12px;z-index:3;width:36px;height:36px;border:1px solid #343434;border-radius:999px;background:#202020;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);font-size:18px;cursor:pointer}
  .mentor-jump-latest.hidden{display:none}
  .mentor-sticker-tray{padding:8px 9px!important;background:#151515!important;border-top:1px solid #282828!important}
  .mentor-sticker-tray button{background:#202020!important;border-color:#303030!important}
  .mentor-attach-menu{display:flex;gap:9px;padding:9px 10px;border-top:1px solid #292929;background:#151515}
  .mentor-attach-menu.hidden{display:none}
  .mentor-attach-choice{flex:1;min-height:45px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid #303030;border-radius:10px;background:#202020;color:#fff;font:850 9px/1 "Nunito",Arial,sans-serif;cursor:pointer}
  .mentor-attach-choice.image{color:#ff9dce}.mentor-attach-choice.file{color:#d8c6ff}
  .mentor-pending-attachment{display:grid;grid-template-columns:48px minmax(0,1fr) 30px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid #292929;background:#171717}
  .mentor-pending-attachment.hidden{display:none}
  .mentor-pending-preview{width:48px;height:48px;display:grid;place-items:center;border-radius:7px;background:#252525;overflow:hidden;font-size:20px}
  .mentor-pending-preview img{width:100%;height:100%;object-fit:cover}
  .mentor-pending-meta{min-width:0;display:grid;gap:3px}
  .mentor-pending-meta strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:9px}
  .mentor-pending-meta span{color:#888;font-size:7px}
  .mentor-pending-attachment>button{width:28px;height:28px;border:0;border-radius:999px;background:#292929;color:#bbb;font-size:17px;cursor:pointer}
  .mentor-composer{grid-template-columns:34px 34px minmax(0,1fr) 38px!important;gap:5px!important;padding:7px 8px!important;background:#121212!important;align-items:end!important}
  .mentor-icon-btn{width:34px!important;height:38px!important;border:0!important;border-radius:999px!important;background:transparent!important;color:#a8a8a8!important;font-size:19px!important}
  #mentorAttachBtn{transform:none;font-size:18px!important}
  .mentor-composer textarea{min-height:38px!important;max-height:108px!important;border:0!important;border-radius:20px!important;background:#262626!important;padding:10px 13px!important;color:#fff!important;font:650 11.5px/1.35 "Nunito",Arial,sans-serif!important;overflow-y:auto!important}
  .mentor-composer textarea:focus{box-shadow:0 0 0 1px #45333c inset!important}
  .mentor-send-btn{width:38px!important;height:38px!important;min-height:38px!important;padding:0!important;display:grid!important;place-items:center!important;border-radius:999px!important;background:#ff4fa3!important;color:#111!important;font-size:15px!important}
  .mentor-send-btn:disabled{opacity:.55}
  .mentor-upload-note{min-height:0!important;padding:0 10px!important;background:#121212!important;color:#777!important;font-size:6.5px!important;line-height:1.2!important}
  .mentor-archive-note{display:none!important}
  @media(max-width:560px){
    .mentor-member-head{padding-bottom:8px!important}
    .mentor-member-head p{display:none}
    .mentor-message-list{height:calc(100dvh - 330px)!important;min-height:330px!important}
    .mentor-msg{max-width:86%!important}
    .mentor-composer{grid-template-columns:32px 32px minmax(0,1fr) 38px!important}
    .mentor-icon-btn{width:32px!important}
  }


  /* Mentor WhatsApp-like dark visual theme */
  #mentor{--wa-bg:#0b141a;--wa-panel:#111b21;--wa-header:#202c33;--wa-input:#2a3942;--wa-in:#202c33;--wa-out:#005c4b;--wa-green:#00a884;--wa-green-bright:#25d366;--wa-text:#e9edef;--wa-muted:#8696a0}
  #mentor .mentor-member-head{border-bottom-color:#202c33!important}
  #mentor .mentor-chat-card{background:var(--wa-bg)!important;border-color:#26343c!important;box-shadow:0 10px 34px rgba(0,0,0,.28)}
  #mentor .mentor-wa-head{background:var(--wa-header)!important;border-bottom-color:#283943!important}
  #mentor .mentor-wa-avatar{background:#374248!important;border:2px solid #ff4fa3!important;color:#fff!important}
  #mentor .mentor-wa-person strong{color:var(--wa-text)!important}
  #mentor .mentor-wa-person span{color:var(--wa-muted)!important}
  #mentor .mentor-wa-person span.typing{color:var(--wa-green-bright)!important}
  #mentor .mentor-message-list{
    background-color:var(--wa-bg)!important;
    background-image:
      radial-gradient(circle at 15px 17px,rgba(134,150,160,.055) 0 1.2px,transparent 1.4px),
      radial-gradient(circle at 42px 48px,rgba(134,150,160,.04) 0 1px,transparent 1.3px),
      linear-gradient(45deg,transparent 46%,rgba(134,150,160,.018) 47% 53%,transparent 54%),
      linear-gradient(-45deg,transparent 46%,rgba(134,150,160,.014) 47% 53%,transparent 54%)!important;
    background-size:58px 58px,72px 72px,94px 94px,118px 118px!important;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
    scrollbar-gutter:stable;
    scrollbar-width:thin;
    scrollbar-color:#43515a transparent;
  }
  #mentor .mentor-message-list::-webkit-scrollbar{width:7px;height:7px}
  #mentor .mentor-message-list::-webkit-scrollbar-track{background:transparent}
  #mentor .mentor-message-list::-webkit-scrollbar-thumb{background:#43515a;border-radius:999px;border:2px solid transparent;background-clip:padding-box}
  #mentor .mentor-date-sep{position:sticky;top:6px;z-index:2;background:#182229!important;color:#d1d7db!important;backdrop-filter:blur(6px)}
  #mentor .mentor-jump-latest:not(.hidden){animation:mentorJumpIn .16s ease-out}
  #mentor .mentor-sticker-tray:not(.hidden),
  #mentor .mentor-attach-menu:not(.hidden),
  #mentor .mentor-pending-attachment:not(.hidden){animation:mentorTrayIn .14s ease-out}
  @keyframes mentorJumpIn{from{opacity:0;transform:translateY(8px) scale(.92)}to{opacity:1;transform:none}}
  @keyframes mentorTrayIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  #mentor .mentor-msg.mentor{background:var(--wa-in)!important;color:var(--wa-text)!important}
  #mentor .mentor-msg.member{background:var(--wa-out)!important;color:#e9edef!important}
  #mentor .mentor-msg.system{background:#182229!important;color:#d1d7db!important}
  #mentor .mentor-msg-meta{color:#aebac1!important}
  #mentor .mentor-receipt.read{color:#53bdeb!important}
  #mentor .mentor-msg-file{background:rgba(11,20,26,.36)!important}
  #mentor .mentor-file-icon{background:#3b4a54!important}
  #mentor .mentor-jump-latest{background:var(--wa-header)!important;border-color:#31444e!important;color:#d1d7db!important}
  #mentor .mentor-sticker-tray,
  #mentor .mentor-attach-menu,
  #mentor .mentor-pending-attachment{background:var(--wa-panel)!important;border-top-color:#26343c!important}
  #mentor .mentor-sticker-tray button,
  #mentor .mentor-attach-choice{background:var(--wa-header)!important;border-color:#31444e!important}
  #mentor .mentor-attach-choice.image,
  #mentor .mentor-attach-choice.file{color:#d1d7db!important}
  #mentor .mentor-pending-preview{background:#2a3942!important}
  #mentor .mentor-pending-meta span{color:var(--wa-muted)!important}
  #mentor .mentor-composer{background:var(--wa-bg)!important;border-top-color:#26343c!important}
  #mentor .mentor-icon-btn{color:#8696a0!important}
  #mentor .mentor-composer textarea{background:var(--wa-header)!important;color:var(--wa-text)!important;box-shadow:none!important}
  #mentor .mentor-composer textarea::placeholder{color:#8696a0!important}
  #mentor .mentor-composer textarea:focus{box-shadow:0 0 0 1px #3b4a54 inset!important}
  #mentor .mentor-send-btn{background:var(--wa-green)!important;color:#fff!important}
  #mentor .mentor-upload-note{background:var(--wa-bg)!important;color:#667781!important}
  #mentor .mentor-member-status.online{border-color:#1d6f5a!important;color:#25d366!important;background:#102a24!important}
  #mentor .mentor-member-status.offline{border-color:#3b4a54!important;color:#8696a0!important;background:#111b21!important}
  #mentor .mentor-nav-badge{background:var(--wa-green-bright)!important;border-color:#0b141a!important;color:#0b141a!important}

  /* MENTOR STATIC CHAT — normal web UI, scrolling stays inside chat */
  #mentor .mentor-chat-card{
    width:100%;
    max-width:none;
    height:clamp(500px,68dvh,680px);
    min-height:0!important;
    margin:12px 0 0!important;
    display:flex;
    flex-direction:column;
    border-width:1px!important;
    border-radius:15px!important;
    outline:0;
    overflow:hidden!important;
    box-sizing:border-box;
  }
  #mentor .mentor-wa-head{flex:0 0 auto}
  #mentor .mentor-message-wrap{
    flex:1 1 auto;
    min-height:0;
    display:flex;
    overflow:hidden;
    position:relative;
  }
  #mentor .mentor-message-list{
    flex:1 1 auto;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    overflow-y:auto!important;
    overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;
  }
  #mentor .mentor-sticker-tray,
  #mentor .mentor-attach-menu,
  #mentor .mentor-pending-attachment,
  #mentor .mentor-composer,
  #mentor .mentor-upload-note{flex:0 0 auto}
  @media(max-width:560px){
    #mentor .mentor-chat-card{
      height:calc(100dvh - 245px);
      min-height:360px!important;
      margin-top:8px!important;
      border-radius:14px!important;
    }
    #mentor .mentor-message-list{
      height:auto!important;
      min-height:0!important;
      max-height:none!important;
    }
  }

  /* XL typography for every textual element inside Member Mentor Chat */
  #mentor .mentor-wa-person strong{font-size:16px!important}
  #mentor .mentor-wa-person span{font-size:12px!important}
  #mentor .mentor-msg .body{font-size:16px!important;line-height:1.45!important}
  #mentor .mentor-msg-meta{font-size:10px!important}
  #mentor .mentor-date-sep{font-size:11px!important}
  #mentor .mentor-image-caption{font-size:14px!important}
  #mentor .mentor-file-copy b{font-size:13px!important}
  #mentor .mentor-file-copy small{font-size:10px!important}
  #mentor .mentor-attach-choice{font-size:12px!important}
  #mentor .mentor-pending-meta strong{font-size:13px!important}
  #mentor .mentor-pending-meta span{font-size:11px!important}
  #mentor .mentor-composer textarea{font-size:15px!important}
  #mentor .mentor-upload-note{font-size:10px!important}
  #mentor .mentor-empty{font-size:14px!important}
  #mentor .mentor-member-status{font-size:11px!important}
  #mentor .mentor-sticker-tray button{font-size:24px!important}
  @media(max-width:560px){
    #mentor .mentor-wa-person strong{font-size:15px!important}
    #mentor .mentor-wa-person span{font-size:11px!important}
    #mentor .mentor-msg .body{font-size:16px!important}
    #mentor .mentor-composer textarea{font-size:15px!important}
  }

  /* WhatsApp-style rich text formatting inside member chat */
  #mentor .mentor-wa-formatted,
  #mentor .mentor-image-caption{white-space:normal!important}
  #mentor .mentor-wa-line{min-height:1.2em}
  #mentor .mentor-wa-formatted strong,
  #mentor .mentor-image-caption strong{font-weight:900!important}
  #mentor .mentor-wa-formatted em,
  #mentor .mentor-image-caption em{font-style:italic}
  #mentor .mentor-wa-formatted del,
  #mentor .mentor-image-caption del{text-decoration-thickness:1.5px}
  #mentor .mentor-wa-inline-code{
    display:inline-block;
    padding:1px 5px;
    border-radius:4px;
    background:rgba(0,0,0,.28);
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;
    font-size:.92em;
  }
  #mentor .mentor-wa-code{
    margin:5px 0;
    padding:8px 10px;
    overflow-x:auto;
    border-radius:6px;
    background:rgba(0,0,0,.32);
    white-space:pre-wrap;
    overflow-wrap:anywhere;
  }
  #mentor .mentor-wa-code code{
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;
    font-size:.9em;
  }
  #mentor .mentor-wa-list{
    margin:4px 0 4px 22px;
    padding:0;
  }
  #mentor .mentor-wa-list li{margin:2px 0;padding-left:2px}
  #mentor .mentor-wa-quote{
    margin:4px 0;
    padding:3px 0 3px 9px;
    border-left:3px solid #00a884;
    color:inherit;
    opacity:.94;
  }

  /* Roboto inside Mentor chat only, closer to WhatsApp's neutral UI feel */
  #mentor .mentor-chat-card,
  #mentor .mentor-chat-card *{
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;
  }
  #mentor .mentor-wa-inline-code,
  #mentor .mentor-wa-code,
  #mentor .mentor-wa-code code{
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;
  }

  /* Light baseline so WhatsApp-style bold has real contrast */
  #mentor .mentor-chat-card{font-weight:300!important}
  #mentor .mentor-wa-person span,
  #mentor .mentor-msg .body,
  #mentor .mentor-msg-meta,
  #mentor .mentor-image-caption,
  #mentor .mentor-composer textarea,
  #mentor .mentor-upload-note,
  #mentor .mentor-file-copy small,
  #mentor .mentor-pending-meta span,
  #mentor .mentor-empty{
    font-weight:300!important;
  }
  #mentor .mentor-wa-person strong,
  #mentor .mentor-file-copy b,
  #mentor .mentor-pending-meta strong{
    font-weight:400!important;
  }
  #mentor .mentor-wa-formatted strong,
  #mentor .mentor-image-caption strong{
    font-weight:700!important;
  }
  #mentor .mentor-wa-formatted em,
  #mentor .mentor-image-caption em{font-weight:300!important}
  #mentor .mentor-date-sep{font-weight:400!important}
  #mentor .mentor-attach-choice{font-weight:400!important}

  /* WhatsApp-like per-message actions */
  #mentor .mentor-msg{position:relative!important}
  #mentor .mentor-bubble-menu-btn{
    position:absolute;top:2px;right:3px;z-index:4;width:24px;height:24px;display:grid;place-items:center;
    border:0;border-radius:999px;background:transparent;color:rgba(233,237,239,.72);font-size:16px!important;
    opacity:.25;transition:.14s ease
  }
  #mentor .mentor-msg:hover .mentor-bubble-menu-btn,
  #mentor .mentor-bubble-menu-btn:focus{opacity:1;background:rgba(11,20,26,.22)}
  #mentor .mentor-message-star{position:absolute;top:5px;left:6px;color:#f5c451;font-size:11px}
  #mentor .mentor-ai-reply-badge{display:inline-flex;align-items:center;min-height:16px;padding:0 6px;margin:0 4px 3px 2px;border-radius:999px;background:#12372f;color:#79e5a3;font-size:8px!important;font-weight:700!important;letter-spacing:.05em}
  #mentor .mentor-reply-quote{
    width:100%;display:grid;gap:2px;margin:0 0 6px;padding:6px 8px;border:0;border-left:3px solid #00a884;
    border-radius:5px;background:rgba(11,20,26,.28);color:inherit;text-align:left
  }
  #mentor .mentor-reply-quote b{font:700 12px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;color:#53bdeb}
  #mentor .mentor-reply-quote span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:300 12px/1.25 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;color:#c7d0d5}
  #mentor .mentor-reaction-chips{display:flex;flex-wrap:wrap;gap:4px;margin:3px 0 -7px 5px}
  #mentor .mentor-reaction-chip{
    min-height:22px;padding:2px 7px;border:1px solid #31444e;border-radius:999px;background:#182229;color:#e9edef;
    font:400 11px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important
  }
  #mentor .mentor-reaction-chip.mine{border-color:#00a884;background:#12372f}
  #mentor .mentor-reaction-chip span{font-size:9px!important;color:#aebac1}
  #mentor .mentor-reply-bar{
    display:grid;grid-template-columns:minmax(0,1fr) 32px;align-items:center;gap:8px;padding:7px 10px;
    border-top:1px solid #26343c;background:#111b21
  }
  #mentor .mentor-reply-bar.hidden{display:none!important}
  #mentor .mentor-reply-bar.mentor-reply-closing{
    animation:badaiIosReplyOut .18s cubic-bezier(.4,0,1,1) both!important;
    pointer-events:none
  }
  #mentor .mentor-reply-bar>div{min-width:0;display:grid;gap:2px;padding-left:8px;border-left:3px solid #00a884}
  #mentor .mentor-reply-bar b{font:700 12px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;color:#53bdeb}
  #mentor .mentor-reply-bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:300 12px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;color:#aebac1}
  #mentor .mentor-reply-bar>button{width:30px;height:30px;border:0;border-radius:999px;background:transparent;color:#aebac1;font-size:20px!important}
  #mentor .mentor-msg-highlight{animation:mentorMsgFlash .9s ease}
  @keyframes mentorMsgFlash{0%,100%{filter:none}40%{filter:brightness(1.55)}}

  .mentor-message-menu{
    position:fixed;z-index:10050;width:210px;padding:6px;border:1px solid #303d44;border-radius:12px;
    background:#111b21;box-shadow:0 18px 48px rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif
  }
  .mentor-message-menu>button{
    width:100%;min-height:40px;display:grid;grid-template-columns:28px 1fr;align-items:center;border:0;
    border-radius:8px;background:transparent;color:#e9edef;text-align:left;padding:0 10px;font-size:14px;font-weight:400
  }
  .mentor-message-menu>button:hover{background:#202c33}
  .mentor-message-menu>button span{font-size:17px}
  .mentor-message-menu>button.danger{color:#ff9a9a}
  .mentor-menu-reactions{display:flex;gap:3px;padding:5px 6px 8px}
  .mentor-menu-reactions.hidden{display:none}
  .mentor-menu-reactions button{width:30px;height:30px;border:0;border-radius:999px;background:#202c33;font-size:16px}
  @media(max-width:560px){#mentor .mentor-bubble-menu-btn{opacity:.8}}

  /* WhatsApp app navigation: chat list -> thread -> back to chat list */
  #mentor .mentor-chat-home{
    width:100%;
    height:clamp(500px,68dvh,680px);
    margin:12px 0 0;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    border:1px solid #26343c;
    border-radius:15px;
    background:#111b21;
    color:#e9edef;
  }
  #mentor .mentor-chat-home-head{
    min-height:64px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:10px 14px;
    background:#202c33;
    border-bottom:1px solid #26343c;
  }
  #mentor .mentor-chat-home-head>div{display:grid;gap:3px}
  #mentor .mentor-chat-home-head strong{font-size:20px!important;font-weight:700!important;line-height:1.1}
  #mentor .mentor-chat-home-head span{font-size:11px!important;font-weight:300!important;color:#8696a0}
  #mentor .mentor-chat-home-search{
    min-height:42px;
    margin:8px 10px;
    padding:0 12px;
    display:grid;
    grid-template-columns:22px minmax(0,1fr);
    align-items:center;
    gap:5px;
    border-radius:10px;
    background:#202c33;
    color:#8696a0;
  }
  #mentor .mentor-chat-home-search input{
    width:100%;border:0;outline:0;background:transparent;color:#e9edef;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif!important;
    font-size:14px!important;font-weight:300!important
  }
  #mentor .mentor-chat-home-search input::placeholder{color:#8696a0}
  #mentor .mentor-chat-home-list{
    flex:1;min-height:0;overflow-y:auto;background:#111b21;
  }
  #mentor .mentor-chat-row{
    width:100%;min-height:76px;padding:10px 12px;
    display:grid;grid-template-columns:52px minmax(0,1fr);gap:11px;align-items:center;
    border:0;border-bottom:1px solid #222d34;background:transparent;color:#e9edef;text-align:left;
  }
  #mentor .mentor-chat-row:hover,#mentor .mentor-chat-row:active{background:#202c33}
  #mentor .mentor-chat-row-avatar{
    width:52px;height:52px;display:grid;place-items:center;border-radius:999px;
    background:#374248;color:#fff;font-size:17px!important;font-weight:400!important
  }
  #mentor .mentor-chat-row-main{min-width:0;display:grid;gap:7px}
  #mentor .mentor-chat-row-top,
  #mentor .mentor-chat-row-bottom{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:10px}
  #mentor .mentor-chat-row-top strong{
    min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    font-size:16px!important;font-weight:400!important
  }
  #mentor .mentor-chat-row-top span{flex:0 0 auto;color:#8696a0;font-size:11px!important;font-weight:300!important}
  #mentor .mentor-chat-row-bottom>span{
    min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8696a0;
    font-size:13px!important;font-weight:300!important
  }
  #mentor .mentor-chat-row-bottom>b{
    flex:0 0 auto;min-width:20px;height:20px;padding:0 6px;display:grid;place-items:center;
    border-radius:999px;background:#25d366;color:#0b141a;font-size:10px!important;font-weight:700!important
  }
  #mentor .mentor-chat-row-bottom>b.hidden{
    display:none!important;
  }
  #mentor .mentor-chat-row-bottom>b.announcement-fire-unread{
    position:relative!important;
    width:30px!important;
    min-width:30px!important;
    height:31px!important;
    padding:0!important;
    display:grid!important;
    place-items:center!important;
    background:transparent!important;
    border:0!important;
    border-radius:0!important;
    color:#fff!important;
    font-size:10px!important;
    font-weight:900!important;
    line-height:1!important;
    text-shadow:0 1px 2px rgba(0,0,0,.95),0 0 3px rgba(0,0,0,.75)!important;
    isolation:isolate;
    animation:badaiAnnouncementFirePulse 1.35s ease-in-out infinite!important;
  }
  #mentor .mentor-chat-row-bottom>b.announcement-fire-unread.hidden{
    display:none!important;
  }
  #mentor .mentor-chat-row-bottom>b.announcement-fire-unread::before{
    content:"🔥";
    position:absolute;
    inset:0;
    display:grid;
    place-items:center;
    font-size:30px!important;
    line-height:1;
    filter:drop-shadow(0 0 6px rgba(255,91,0,.72));
    z-index:-1;
  }
  @keyframes badaiAnnouncementFirePulse{
    0%,100%{transform:scale(1);filter:brightness(1)}
    50%{transform:scale(1.10);filter:brightness(1.14)}
  }
  #mentor .mentor-chat-back{
    width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;
    border:0;border-radius:999px;background:transparent;color:#d1d7db;
    font-size:22px!important;font-weight:400!important
  }
  #mentor .mentor-chat-back:hover{background:#2a3942}
  #mentor .mentor-wa-head{grid-template-columns:34px 40px minmax(0,1fr)!important}
  #mentor.mentor-chat-list-mode .mentor-chat-home{display:flex!important}
  #mentor.mentor-chat-list-mode .mentor-chat-card{display:none!important}
  #mentor.mentor-chat-thread-mode .mentor-chat-home{display:none!important}
  #mentor.mentor-chat-thread-mode .mentor-chat-card{display:flex!important}
  #mentor .mentor-chat-card{
    width:100%!important;
    max-width:none!important;
    margin:12px 0 0!important;
  }
  #mentor .mentor-chat-row-avatar.announcement{background:#59431a!important;font-size:20px!important}
  #mentor .mentor-chat-row-avatar.group{background:#174a3f!important}
  #mentor .mentor-readonly-notice{
    flex:0 0 auto;padding:10px 14px;border-top:1px solid #26343c;background:#111b21;color:#8696a0;
    text-align:center;font-size:12px!important;font-weight:300!important
  }
  #mentor .mentor-community-sender{
    margin:0 0 3px;color:#53bdeb;font-size:11px!important;font-weight:600!important
  }
  #mentor .mentor-composer.hidden,#mentor .mentor-readonly-notice.hidden,#mentor .mentor-chat-row.hidden{display:none!important}
  @media(max-width:560px){
    #mentor .mentor-chat-home,
    #mentor .mentor-chat-card{
      height:calc(100dvh - 245px)!important;
      min-height:360px!important;
      margin-top:8px!important;
      border-radius:14px!important;
    }
  }

  /* iOS-inspired motion: quick, soft, springy */
  .screen.active{
    animation:badaiIosScreenIn .28s cubic-bezier(.22,.61,.36,1) both;
  }
  #mentor.mentor-chat-thread-mode .mentor-chat-card{
    animation:badaiIosPushIn .34s cubic-bezier(.22,.61,.36,1) both;
    transform-origin:right center;
  }
  #mentor.mentor-chat-list-mode .mentor-chat-home{
    animation:badaiIosPopIn .32s cubic-bezier(.22,.61,.36,1) both;
    transform-origin:left center;
  }
  #mentor .mentor-chat-row{
    transition:transform .18s cubic-bezier(.22,.61,.36,1),background .18s ease,opacity .18s ease!important;
  }
  #mentor .mentor-chat-row:active{transform:scale(.985)}
  #mentor .mentor-chat-back,
  #mentor .mentor-icon-btn,
  #mentor .mentor-composer button[type="submit"],
  #mentor .mentor-reaction-chip{
    transition:transform .16s cubic-bezier(.22,.61,.36,1),background .16s ease,opacity .16s ease!important;
  }
  #mentor .mentor-chat-back:active,
  #mentor .mentor-icon-btn:active,
  #mentor .mentor-composer button[type="submit"]:active,
  #mentor .mentor-reaction-chip:active{transform:scale(.9)}
  #mentor .mentor-msg-new{
    animation:badaiIosBubbleIn .32s cubic-bezier(.18,.89,.32,1.24) both;
  }
  #mentor .mentor-msg.member.mentor-msg-new{transform-origin:right bottom}
  #mentor .mentor-msg.mentor.mentor-msg-new{transform-origin:left bottom}
  #mentor .mentor-reaction-chips{animation:badaiIosReactionIn .22s cubic-bezier(.22,.61,.36,1) both}
  .mentor-message-menu{
    transform-origin:top right;
    animation:badaiIosMenuIn .2s cubic-bezier(.22,.61,.36,1) both;
  }
  #mentor .mentor-sticker-tray:not(.hidden),
  #mentor .mentor-attach-menu:not(.hidden),
  #mentor .mentor-pending-attachment:not(.hidden),
  #mentor .mentor-reply-bar:not(.hidden){
    animation:badaiIosTrayIn .24s cubic-bezier(.22,.61,.36,1) both;
  }
  #mentor .mentor-chat-row-bottom>b:not(.hidden){
    animation:badaiIosBadgeIn .3s cubic-bezier(.18,.89,.32,1.35) both;
  }
  @keyframes badaiIosScreenIn{
    from{opacity:0;transform:translate3d(10px,0,0) scale(.995)}
    to{opacity:1;transform:none}
  }
  @keyframes badaiIosPushIn{
    from{opacity:.2;transform:translate3d(11%,0,0) scale(.985)}
    to{opacity:1;transform:none}
  }
  @keyframes badaiIosPopIn{
    from{opacity:.3;transform:translate3d(-7%,0,0) scale(.99)}
    to{opacity:1;transform:none}
  }
  @keyframes badaiIosBubbleIn{
    0%{opacity:0;transform:translate3d(0,10px,0) scale(.92)}
    70%{opacity:1;transform:translate3d(0,-1px,0) scale(1.015)}
    100%{opacity:1;transform:none}
  }
  @keyframes badaiIosMenuIn{
    from{opacity:0;transform:translate3d(0,-5px,0) scale(.94)}
    to{opacity:1;transform:none}
  }
  @keyframes badaiIosTrayIn{
    from{opacity:0;transform:translate3d(0,10px,0)}
    to{opacity:1;transform:none}
  }
  @keyframes badaiIosReplyOut{
    from{opacity:1;transform:translate3d(0,0,0)}
    to{opacity:0;transform:translate3d(0,8px,0)}
  }
  @keyframes badaiIosReactionIn{
    from{opacity:0;transform:scale(.88)}
    to{opacity:1;transform:none}
  }
  @keyframes badaiIosBadgeIn{
    0%{opacity:0;transform:scale(.55)}
    75%{opacity:1;transform:scale(1.12)}
    100%{opacity:1;transform:scale(1)}
  }
  /* WhatsApp-style speech bubbles + sender names */
  #mentor .mentor-msg:not(.sticker):not(.system){
    position:relative!important;
    border-radius:10px!important;
    box-shadow:0 1px 1px rgba(0,0,0,.28)!important;
    overflow:visible!important;
  }
  #mentor .mentor-msg.mentor:not(.sticker):not(.system){
    border-top-left-radius:3px!important;
  }
  #mentor .mentor-msg.member:not(.sticker):not(.system){
    border-top-right-radius:3px!important;
  }
  #mentor .mentor-msg.mentor:not(.sticker):not(.system)::before{
    content:"";position:absolute;left:-8px;top:0;width:12px;height:16px;
    background:var(--wa-in);clip-path:polygon(100% 0,100% 100%,0 0);
    border-top-left-radius:2px;filter:drop-shadow(-1px 1px 0 rgba(0,0,0,.12));
  }
  #mentor .mentor-msg.member:not(.sticker):not(.system)::before{
    content:"";position:absolute;right:-8px;top:0;width:12px;height:16px;
    background:var(--wa-out);clip-path:polygon(0 0,0 100%,100% 0);
    border-top-right-radius:2px;filter:drop-shadow(1px 1px 0 rgba(0,0,0,.12));
  }
  #mentor .mentor-community-sender{
    margin:0 18px 4px 1px!important;
    font-size:12px!important;font-weight:600!important;line-height:1.25!important;
    letter-spacing:-.01em;
  }
  #mentor .mentor-community-sender::before{content:"~ ";opacity:.72}
  #mentor .mentor-community-sender.tone-0{color:#ff73b9!important}
  #mentor .mentor-community-sender.tone-1{color:#53bdeb!important}
  #mentor .mentor-community-sender.tone-2{color:#d9a7ff!important}
  #mentor .mentor-community-sender.tone-3{color:#ffb86b!important}
  #mentor .mentor-community-sender.tone-4{color:#7ee0b8!important}
  #mentor .mentor-community-sender.tone-5{color:#ffd166!important}
  #mentor .mentor-community-sender.tone-6{color:#8fb8ff!important}
  #mentor .mentor-msg.mentor:not(.sticker):not(.system):has(.mentor-community-sender){
    padding-top:7px!important;
  }
  #mentor .mentor-msg.sticker::before,#mentor .mentor-msg.system::before{display:none!important}

  /* PENGUMUMAN BADAI — centered WhatsApp Community-style posts */
  #mentor .mentor-chat-card.announcement-thread .mentor-message-list{
    align-items:stretch!important;
    padding-left:12px!important;
    padding-right:12px!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg{
    width:min(92%,520px)!important;
    max-width:520px!important;
    align-self:center!important;
    justify-self:center!important;
    margin-left:auto!important;
    margin-right:auto!important;
    padding:7px 8px 5px!important;
    border:0!important;
    border-radius:8px!important;
    border-top-left-radius:8px!important;
    border-top-right-radius:8px!important;
    background:#202c33!important;
    color:#e9edef!important;
    box-shadow:0 1px 2px rgba(0,0,0,.34)!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg::before{
    display:none!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg .body{
    width:100%!important;
    padding:0!important;
    font-size:17px!important;
    line-height:1.55!important;
  }
  #mentor .mentor-announcement-head{
    width:calc(100% + 16px);
    display:grid;
    grid-template-columns:46px minmax(0,1fr);
    gap:11px;
    align-items:center;
    margin:-7px -8px 9px;
    padding:11px 12px;
    box-sizing:border-box;
    background:#1b252b;
    border-bottom:1px solid rgba(255,255,255,.06);
    border-radius:8px 8px 0 0;
  }
  #mentor .mentor-announcement-avatar{
    position:relative;
    width:46px;height:46px;
    display:grid;place-items:center;
    border-radius:999px;
    background:#374248;color:#fff;
    font-size:16px!important;font-weight:900!important;
  }
  #mentor .mentor-announcement-avatar img{
    width:46px;height:46px;display:block;object-fit:cover;border-radius:999px;
  }
  #mentor .mentor-announcement-avatar.verified::after{
    content:"✓";
    position:absolute;right:-3px;bottom:-2px;
    width:16px;height:16px;display:grid;place-items:center;
    border:2px solid #1b252b;border-radius:999px;
    background:#ff4fa3;color:#fff;
    font-size:9px!important;font-weight:950!important;
    box-sizing:border-box;
  }
  #mentor .mentor-announcement-copy{
    min-width:0;display:grid;gap:3px;
  }
  #mentor .mentor-announcement-copy b{
    color:#25d366!important;
    font-size:18px!important;
    line-height:1.15!important;
    font-weight:900!important;
  }
  #mentor .mentor-announcement-copy small{
    color:#b7c0c5!important;
    font-size:13px!important;
    line-height:1.2!important;
    font-weight:700!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg-image{
    width:100%!important;
    display:block!important;
    margin:0 0 7px!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg-image img{
    display:block!important;
    width:100%!important;
    max-width:none!important;
    max-height:520px!important;
    object-fit:contain!important;
    border:0!important;
    border-radius:6px!important;
    background:#111b21!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-image-caption{
    padding:9px 2px 2px!important;
    font-size:16px!important;
    line-height:1.5!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg-file{
    width:100%!important;
    box-sizing:border-box!important;
    padding:9px!important;
    border-radius:7px!important;
    background:rgba(11,20,26,.5)!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-msg-meta{
    margin-top:6px!important;
    color:#8696a0!important;
    font-size:11px!important;
  }
  #mentor .mentor-chat-card.announcement-thread .mentor-receipt{
    display:none!important;
  }
  @media(max-width:560px){
    #mentor .mentor-chat-card.announcement-thread .mentor-message-list{
      padding-left:7px!important;
      padding-right:7px!important;
    }
    #mentor .mentor-chat-card.announcement-thread .mentor-msg{
      width:96%!important;
      max-width:96%!important;
    }
    #mentor .mentor-chat-card.announcement-thread .mentor-msg .body{font-size:16px!important}
    #mentor .mentor-announcement-copy b{font-size:17px!important}
    #mentor .mentor-announcement-copy small{font-size:12px!important}
  }

  /* Group sender identity: initial avatar + bubble */
  #mentor .mentor-group-message-row{
    width:100%;display:flex;align-items:flex-start;gap:8px;align-self:flex-start;
  }
  #mentor .mentor-group-message-row .mentor-msg{
    align-self:flex-start!important;
    max-width:calc(79% - 38px)!important;
  }
  #mentor .mentor-group-initial{
    flex:0 0 30px;width:30px;height:30px;margin-top:1px;
    display:grid;place-items:center;border-radius:999px;
    border:1px solid rgba(255,255,255,.08);
    box-shadow:0 1px 3px rgba(0,0,0,.28);
    font-size:13px!important;font-weight:600!important;line-height:1!important;
    color:#e9edef;background:#374248;
  }
  #mentor .mentor-group-initial.tone-0{background:#4a2038;color:#ff91c8}
  #mentor .mentor-group-initial.tone-1{background:#123c49;color:#6bc9f2}
  #mentor .mentor-group-initial.tone-2{background:#342447;color:#dfb4ff}
  #mentor .mentor-group-initial.tone-3{background:#49301a;color:#ffc17f}
  #mentor .mentor-group-initial.tone-4{background:#183c32;color:#8be7c0}
  #mentor .mentor-group-initial.tone-5{background:#443b17;color:#ffda76}
  #mentor .mentor-group-initial.tone-6{background:#213654;color:#9fc3ff}
  #mentor .mentor-group-initial.has-photo{padding:0!important;overflow:hidden;background:#374248!important;color:transparent!important}
  #mentor .mentor-group-initial img{display:block;width:100%;height:100%;object-fit:cover;border-radius:999px}
  #mentor .mentor-group-initial,
  #mentor .mentor-mention-avatar{position:relative}
  #mentor .mentor-group-initial.verified::after,
  #mentor .mentor-mention-avatar.verified::after{
    content:"✓";position:absolute;right:-3px;bottom:-2px;width:13px;height:13px;display:grid;place-items:center;
    border:2px solid #0b141a;border-radius:999px;background:#ff4fa3;color:#fff;
    font-size:8px!important;font-weight:900!important;line-height:1!important;box-sizing:border-box
  }
  #mentor .mentor-mention-avatar.has-photo{padding:0!important;overflow:hidden;background:#374248!important;color:transparent!important}
  #mentor .mentor-mention-avatar img{display:block;width:100%;height:100%;object-fit:cover;border-radius:999px}
  @media(max-width:560px){
    #mentor .mentor-group-message-row{gap:7px}
    #mentor .mentor-group-initial{flex-basis:28px;width:28px;height:28px;font-size:12px!important}
    #mentor .mentor-group-message-row .mentor-msg{max-width:calc(84% - 35px)!important}
  }

  /* Group @mentions */
  #mentor .mentor-mention-btn{font-weight:700!important;font-size:18px!important}
  #mentor .mentor-mention-btn.hidden{display:none!important}

  /* Composer: Grup BADAI and Chat Mentor share the same visible controls */
  #mentor .mentor-composer > .hidden{display:none!important}
  #mentor .mentor-composer{
    grid-template-columns:34px 34px minmax(0,1fr) 38px!important;
    grid-auto-flow:row!important;
    grid-auto-rows:auto!important;
    gap:5px!important;
    min-height:56px!important;
    height:auto!important;
    padding:7px 8px!important;
    align-items:end!important;
  }
  #mentor .mentor-composer #mentorStickerBtn{
    display:grid!important;grid-column:1!important;grid-row:1!important
  }
  #mentor .mentor-composer #mentorAttachBtn{
    display:grid!important;grid-column:2!important;grid-row:1!important
  }
  #mentor .mentor-composer #mentorMentionBtn{
    display:none!important
  }
  #mentor .mentor-composer #mentorMessageInput{
    display:block!important;grid-column:3!important;grid-row:1!important;
    width:100%!important;min-width:0!important;height:38px;margin:0!important
  }
  #mentor .mentor-composer #mentorSendBtn{
    display:grid!important;grid-column:4!important;grid-row:1!important;
    align-self:end!important;margin:0!important
  }
  @media(max-width:560px){
    #mentor .mentor-composer{
      grid-template-columns:32px 32px minmax(0,1fr) 38px!important;
      min-height:52px!important
    }
  }

  /* @ mention is typing syntax only; no visible @ toolbar button */
  #mentor .mentor-mention-btn{display:none!important}
  #mentor .mentor-mention-picker{
    position:absolute;left:10px;right:10px;bottom:58px;z-index:70;
    max-height:270px;overflow-y:auto;padding:6px;border:1px solid #2b3942;border-radius:13px;
    background:#111b21;box-shadow:0 18px 48px rgba(0,0,0,.46);
    animation:badaiIosTrayIn .2s cubic-bezier(.22,.61,.36,1) both
  }
  #mentor .mentor-mention-picker.hidden{display:none!important}
  #mentor .mentor-mention-item{
    width:100%;min-height:54px;padding:7px 9px;display:grid;grid-template-columns:40px minmax(0,1fr);
    align-items:center;gap:9px;border:0;border-radius:9px;background:transparent;color:#e9edef;text-align:left
  }
  #mentor .mentor-mention-item:hover,#mentor .mentor-mention-item.active{background:#202c33}
  #mentor .mentor-mention-avatar{
    width:38px;height:38px;display:grid;place-items:center;border-radius:999px;background:#374248;color:#fff;
    font-size:12px!important;font-weight:500!important
  }
  #mentor .mentor-mention-copy{min-width:0;display:grid;gap:3px}
  #mentor .mentor-mention-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px!important;font-weight:500!important}
  #mentor .badai-pink-verified-inline{
    display:inline-grid;place-items:center;width:13px;height:13px;margin-left:3px;vertical-align:-2px;
    border-radius:999px;background:#ff4fa3;color:#fff;font-size:8px!important;font-weight:900!important
  }
  #mentor .mentor-mention-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8696a0;font-size:10px!important}
  #mentor .mentor-mention{
    display:inline-block;padding:0 2px;border-radius:3px;color:#53bdeb!important;background:rgba(83,189,235,.11);
    font-weight:500!important
  }

  /* Clickable chat header + WhatsApp-like info screen */
  #mentor .mentor-chat-card{position:relative!important}
  #mentor .mentor-wa-person,
  #mentor #mentorWaAvatar{cursor:pointer}
  #mentor .mentor-wa-person:active,
  #mentor #mentorWaAvatar:active{transform:scale(.985)}
  #mentor .mentor-chat-info-panel{
    position:absolute;inset:0;z-index:80;display:flex;flex-direction:column;
    background:#0b141a;color:#e9edef;overflow:hidden;
    transform:translate3d(100%,0,0);opacity:.45;
    transition:transform .32s cubic-bezier(.22,.61,.36,1),opacity .24s ease;
  }
  #mentor .mentor-chat-info-panel.open{transform:translate3d(0,0,0);opacity:1}
  #mentor .mentor-chat-info-panel.closing{transform:translate3d(100%,0,0);opacity:.5}
  #mentor .mentor-chat-info-panel.hidden{display:none!important}
  #mentor .mentor-chat-info-head{
    flex:0 0 auto;min-height:60px;display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:8px;
    padding:7px 10px;background:#202c33;border-bottom:1px solid #26343c
  }
  #mentor .mentor-chat-info-head button{
    width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:999px;background:transparent;
    color:#d1d7db;font-size:22px!important;transition:transform .16s ease,background .16s ease
  }
  #mentor .mentor-chat-info-head button:active{transform:scale(.9);background:#2a3942}
  #mentor .mentor-chat-info-head b{font-size:16px!important;font-weight:500!important}
  #mentor .mentor-chat-info-scroll{flex:1;min-height:0;overflow-y:auto;padding:22px 14px 28px}
  #mentor .mentor-chat-info-hero{
    display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 10px 24px
  }
  #mentor .mentor-chat-info-avatar{
    width:82px;height:82px;display:grid;place-items:center;border-radius:999px;background:#374248;
    border:2px solid #ff4fa3;color:#fff;font-size:28px!important;font-weight:500!important;
    box-shadow:0 10px 30px rgba(0,0,0,.3)
  }
  #mentor .mentor-chat-info-hero strong{margin-top:12px;font-size:22px!important;font-weight:500!important;line-height:1.2}
  #mentor .mentor-chat-info-hero span{margin-top:5px;color:#8696a0;font-size:12px!important;font-weight:300!important}
  #mentor .mentor-chat-info-card{
    margin:0 0 10px;padding:15px 16px;border:1px solid #26343c;border-radius:14px;background:#111b21;
    box-shadow:0 8px 22px rgba(0,0,0,.12)
  }
  #mentor .mentor-chat-info-card.note{background:#101d20}
  #mentor .mentor-chat-info-label{display:block;margin-bottom:7px;color:#53bdeb;font-size:10px!important;font-weight:600!important;letter-spacing:.08em}
  #mentor .mentor-chat-info-card p{margin:0;color:#d1d7db;font-size:14px!important;font-weight:300!important;line-height:1.55}
  @media(max-width:560px){
    #mentor .mentor-chat-info-scroll{padding:18px 12px 24px}
    #mentor .mentor-chat-info-avatar{width:76px;height:76px}
  }

  /* Member Avatar BADAI: five static preset characters, no member photo uploads */
  #akun .badai-profile-avatar-card{
    margin:0 0 12px;padding:14px;display:grid;grid-template-columns:76px minmax(0,1fr) auto;
    align-items:center;gap:12px;border:1px solid #292929;border-radius:18px;background:#101010
  }
  #akun .badai-profile-avatar-preview{
    width:76px;height:76px;display:grid;place-items:center;overflow:hidden;border-radius:999px;
    border:2px solid #ff4fa3;background:#16232b;box-shadow:0 0 0 4px rgba(255,79,163,.08)
  }
  #akun .badai-profile-avatar-preview img{width:100%;height:100%;object-fit:cover}
  #akun .badai-profile-avatar-copy{min-width:0;display:grid;gap:4px}
  #akun .badai-profile-avatar-copy b{color:#fff;font-size:14px!important;font-weight:700!important}
  #akun .badai-profile-avatar-copy span{color:#8f8f8f;font-size:10px!important;line-height:1.4}
  #akun .badai-avatar-choice-grid{
    grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:4px
  }
  #akun .badai-avatar-choice{
    min-width:0;padding:7px 5px 6px;display:grid;justify-items:center;gap:5px;border:1px solid #292929;
    border-radius:13px;background:#0a0f13;color:#aaa;cursor:pointer;transition:.16s ease
  }
  #akun .badai-avatar-choice:hover{border-color:#6b3b54;background:#13191d}
  #akun .badai-avatar-choice.selected{
    border-color:#ff4fa3;background:#1a1016;box-shadow:0 0 0 2px rgba(255,79,163,.11)
  }
  #akun .badai-avatar-choice img{
    width:52px;height:52px;border-radius:999px;object-fit:cover;background:#16232b
  }
  #akun .badai-avatar-choice span{
    width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    color:inherit;font-size:7px!important;font-weight:850!important;letter-spacing:.02em
  }
  #akun .badai-avatar-choice.selected span{color:#ff8fc5}
  #akun .badai-profile-avatar-actions{display:flex;align-items:center;gap:7px}
  #akun .badai-profile-avatar-btn{
    min-height:38px;padding:0 12px;border:0;border-radius:11px;background:#ff4fa3;color:#111;
    font-size:10px!important;font-weight:800!important;cursor:pointer
  }
  #akun .badai-profile-avatar-btn:disabled{opacity:.55;cursor:wait}
  #akun .badai-profile-avatar-status{grid-column:1/-1;color:#8696a0;font-size:9px!important;line-height:1.35}
  #akun .badai-profile-avatar-status.ok{color:#72d79a}
  #akun .badai-profile-avatar-status.err{color:#ff9292}
  @media(max-width:520px){
    #akun .badai-profile-avatar-card{grid-template-columns:64px minmax(0,1fr);gap:10px}
    #akun .badai-profile-avatar-preview{width:64px;height:64px}
    #akun .badai-profile-avatar-actions{grid-column:2}
    #akun .badai-avatar-choice-grid{grid-template-columns:repeat(5,minmax(50px,1fr));overflow-x:auto;padding-bottom:4px}
    #akun .badai-avatar-choice img{width:46px;height:46px}
  }


  @media(prefers-reduced-motion:reduce){
    .screen.active,
    #mentor.mentor-chat-thread-mode .mentor-chat-card,
    #mentor.mentor-chat-list-mode .mentor-chat-home,
    #mentor .mentor-msg-new,
    #mentor .mentor-reaction-chips,
    .mentor-message-menu,
    #mentor .mentor-sticker-tray:not(.hidden),
    #mentor .mentor-attach-menu:not(.hidden),
    #mentor .mentor-pending-attachment:not(.hidden),
    #mentor .mentor-reply-bar:not(.hidden),
    #mentor .mentor-chat-row-bottom>b:not(.hidden){
      animation:none!important;
      transition:none!important;
    }
    #mentor .mentor-chat-row-bottom>b.announcement-fire-unread{
      animation:none!important;
    }
  }

</style>`;

    const headerMarkup = String.raw`
<header class="badai-member-header" aria-label="Header Member Area BADAI">
  <a class="badai-member-header-logo" href="/akses" aria-label="BADAI Member Area"><img src="https://i.ibb.co.com/j9prt6Xr/BADAI-LOGO-HORIZONTAL-UNDER50-KB-1.webp" alt="BADAI"></a>
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


  var BADAI_AVATAR_KEYS=['male-korea','male-peci','female-longhair','female-shorthair','female-hijab'];
  var badaiSelectedAvatarKey='male-korea';

  function badaiAvatarUrl(key){
    key=BADAI_AVATAR_KEYS.indexOf(String(key||''))>=0?String(key):'male-korea';
    return '/avatars/'+key+'.svg'
  }
  function badaiAvatarStatus(message,type){
    var node=el('badaiProfileAvatarStatus');if(!node)return;
    node.textContent=message||'';
    node.classList.remove('ok','err');
    if(type)node.classList.add(type)
  }
  function badaiSetAvatarSelection(key){
    key=BADAI_AVATAR_KEYS.indexOf(String(key||''))>=0?String(key):'male-korea';
    badaiSelectedAvatarKey=key;
    var preview=el('badaiProfileAvatarPreview');
    if(preview)preview.innerHTML='<img src="'+badaiAvatarUrl(key)+'" alt="Avatar BADAI" loading="eager">';
    document.querySelectorAll('#badaiAvatarChoices [data-avatar-key]').forEach(function(btn){
      var selected=btn.getAttribute('data-avatar-key')===key;
      btn.classList.toggle('selected',selected);
      btn.setAttribute('aria-pressed',selected?'true':'false')
    })
  }
  async function badaiLoadMyAvatar(){
    var s=memberSession();
    if(!s||!s.access_token||!s.user||!s.user.id)return;
    try{
      var response=await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+encodeURIComponent(s.user.id)+'&select=full_name,avatar_key',{
        headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}
      });
      var rows=await response.json().catch(function(){return []});
      var row=Array.isArray(rows)?rows[0]:null;
      badaiSetAvatarSelection(row&&row.avatar_key);
      if(row&&row.full_name&&el('memberProfileDisplayName'))el('memberProfileDisplayName').textContent=row.full_name
    }catch(_){badaiSetAvatarSelection('male-korea')}
  }
  function ensureProfileAvatarEditor(){
    var card=el('badaiProfileAvatarCard');if(!card)return;
    document.querySelectorAll('#badaiAvatarChoices [data-avatar-key]').forEach(function(btn){
      if(btn.dataset.avatarBound==='1')return;
      btn.dataset.avatarBound='1';
      btn.addEventListener('click',function(){
        badaiSetAvatarSelection(btn.getAttribute('data-avatar-key'));
        badaiAvatarStatus('Pilihan avatar belum disimpan.')
      })
    });
    var saveBtn=el('badaiProfileAvatarSave');
    if(saveBtn&&saveBtn.dataset.avatarBound!=='1'){
      saveBtn.dataset.avatarBound='1';
      saveBtn.addEventListener('click',async function(){
        var s=memberSession();
        if(!s||!s.access_token){badaiAvatarStatus('Sesi login habis. Silakan login ulang.','err');return}
        var old=saveBtn.textContent;saveBtn.disabled=true;saveBtn.textContent='MENYIMPAN...';
        badaiAvatarStatus('Menyimpan Avatar BADAI...');
        try{
          var response=await fetch(SUPABASE_URL+'/rest/v1/rpc/member_avatar_set',{
            method:'POST',
            headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
            body:JSON.stringify({p_avatar_key:badaiSelectedAvatarKey})
          });
          var data=await response.json().catch(function(){return null});
          if(!response.ok)throw new Error((data&&(data.message||data.error))||'Gagal menyimpan avatar.');
          badaiAvatarStatus('Avatar BADAI berhasil diperbarui.','ok');
          communityParticipantsLoaded=false;
          loadCommunityParticipants(true).catch(function(){});
          if(mentorSelectedChat==='group')loadCommunityMessages('group').catch(function(){})
        }catch(err){
          badaiAvatarStatus(err.message||'Gagal menyimpan avatar.','err')
        }finally{
          saveBtn.disabled=false;saveBtn.textContent=old
        }
      })
    }
    badaiLoadMyAvatar()
  }

  var kelas=el('kelas');
  if(kelas&&!kelas.querySelector('.screen-heading')) kelas.insertAdjacentHTML('afterbegin','<div class="screen-heading badai-pemula-heading"><div class="badai-pemula-intro"><div class="badai-pemula-intro-title-row"><div class="badai-pemula-intro-title">MEMBER <span>PEMULA</span></div><span class="badai-pemula-update-badge">SELALU UPDATE</span></div></div><div class="badai-pemula-heading-actions"><div class="badai-pemula-bonus"><small>TOOLS BONUS</small><a href="https://gemini.google.com/share/8c83a628ffbd" target="_blank" rel="noopener noreferrer">TOOL VO <span>↗</span></a></div></div></div>');
  var bonus=el('jaluruntung');
  if(bonus&&!bonus.querySelector('.screen-heading')) bonus.insertAdjacentHTML('afterbegin','<div class="screen-heading"><h1>Untung BADAI</h1></div>');
  var akun=el('akun');
  if(akun){
    var accountTitle=akun.querySelector('.account-head h1');
    var accountDesc=akun.querySelector('.account-head p');
    if(accountTitle)accountTitle.textContent='Akun BADAI';
    if(accountDesc)accountDesc.textContent='Kelola avatar, data, dan keamanan akun Member BADAI.';
    ensureProfileAvatarEditor();
  }

  var pemulaMaterials=[
    {title:'BIKIN AI EDUKATOR',video:'https://youtu.be/uIVMayQodjI',description:'Bikin karakter AI edukator yang bisa menyampaikan materi, tips, atau penjelasan secara menarik dalam bentuk konten.',content:'Cara belajarnya mudah, lihat dulu video tutorialnya, dan klik tombol TOOLSnya',copyLabel:'CARA BELAJARNYA',guide:true,ready:true,toolLabel:'TOOLS AI EDUCATOR',toolUrl:'https://share.gemini.google/UAeV1F4ZAmzK'},
    {title:'BIKIN GEO-SPASIAL',video:'https://youtu.be/ZxoE9HJawnk',description:'Bikin konten peta, lokasi, dan visual geospasial yang menarik dengan bantuan AI.',content:'Cara belajarnya mudah, lihat dulu video tutorialnya, dan klik tombol TOOLSnya',copyLabel:'CARA BELAJARNYA',guide:true,ready:true,toolLabel:'TOOLS GEO-SPASIAL',toolUrl:'https://share.gemini.google/mPJoQiTzg6bT'},
    {title:'BIKIN AI INFLUENCER',video:'https://youtu.be/aAYxcLKzCTc',description:'Bikin AI Influencer dengan teknik pose mirroring di depan cermin, seolah sedang ngaca, untuk menghasilkan karakter dan konten visual yang lebih natural, estetik, dan konsisten.',content:'Cara belajarnya mudah, lihat video tutorialnya lalu klik tombol TOOLS untuk praktik.',ready:true,toolLabel:'TOOLS AI INFLUENCER',toolUrl:'https://share.gemini.google/seGz1fbfq0vy'},
    {title:'BIKIN AFFILIATE AI',video:'',description:'Bikin konten affiliate pakai AI dari nol: mulai dari cari angle produk, bikin hook dan konsep promosi, ubah foto produk jadi visual atau video jualan, sampai membuat CTA yang lebih menarik untuk bantu closing tanpa harus sering tampil di depan kamera.',content:'Klik tombol TOOLS untuk membuka tools Bikin Affiliate AI.',ready:true,toolLabel:'TOOLS BIKIN AFFILIATE AI',toolUrl:'https://share.gemini.google/NCwYnrLWzriC'},
    {title:'BIKIN DIY CRAFT',video:'',description:'Bikin proyek DIY Craft kreatif dengan bantuan AI, mulai dari mencari ide, menyusun konsep dan desain, sampai mengembangkan hasil kerajinan menjadi konten yang menarik.',content:'Klik tombol TOOLS untuk membuka tools Bikin DIY Craft.',ready:true,toolLabel:'TOOLS BIKIN DIY CRAFT',toolUrl:'https://share.gemini.google/zthNmDhwCaXG'},
    {title:'BIKIN ANIMASI PAPER',video:'',description:'Bikin animasi bergaya paper dengan bantuan AI, mulai dari ide visual, karakter dan elemen kertas, sampai adegan bergerak yang menarik untuk konten.',content:'Klik tombol TOOLS untuk membuka tools Bikin Animasi Paper.',ready:true,toolLabel:'TOOLS BIKIN ANIMASI PAPER',toolUrl:'https://share.gemini.google/UaAZSHnVR6jN'},
    {title:'BIKIN UNBOXING AI',video:'',description:'Bikin video unboxing produk dengan visual AI tanpa harus selalu merekam dari awal.',content:'Klik tombol TOOLS untuk membuka tools Unboxing AI.',ready:true,toolLabel:'TOOLS UNBOXING AI',toolUrl:'https://share.gemini.google/eULL8DIU4VgU'},
    {title:'BIKIN SQUIDGAME AI',video:'https://youtu.be/ToiBCQ-2lgA',description:'Bikin konten Squidgame AI dengan bantuan AI, mulai dari konsep adegan sampai hasil visual yang bisa dikembangkan menjadi konten.',content:'Klik tombol TOOLS untuk membuka tools Bikin Squidgame AI.',ready:true,toolLabel:'TOOLS BIKIN SQUIDGAME AI',toolUrl:'https://share.gemini.google/kYmkRlczGCV3'},
    {title:'BIKIN VIDEO MINIATUR',video:'https://youtu.be/2ygXpo_X0kI',description:'Bikin video miniatur dengan bantuan AI, mulai dari konsep dunia kecil, objek, karakter, hingga visual sinematik yang menarik untuk konten pendek dan media sosial.',content:'Klik tombol TOOLS untuk membuka tools Bikin Video Miniatur.',ready:true,toolLabel:'TOOLS BIKIN VIDEO MINIATUR',toolUrl:'https://share.gemini.google/ZE7JgN74Q7BZ'},
    {title:'BIKIN MOBIL KAYU',video:'https://youtu.be/MXmWSc1UNi8',description:'Bikin konsep mobil kayu kreatif dengan bantuan AI, mulai dari ide desain, bentuk kendaraan, detail material kayu, sampai visual hasil yang menarik untuk konten.',content:'Klik tombol TOOLS untuk membuka tools Bikin Mobil Kayu AI.',ready:true,toolLabel:'TOOLS BIKIN MOBIL KAYU AI',toolUrl:'https://share.gemini.google/TLek7dCbNRQN'}
  ];

  // Hard guard for active Pemula tools so this card cannot fall back to "SEGERA HADIR".
  var animasiPaperItem=pemulaMaterials.find(function(item){return item.title==='BIKIN ANIMASI PAPER'});
  if(animasiPaperItem){
    animasiPaperItem.toolUrl='https://share.gemini.google/UaAZSHnVR6jN';
    animasiPaperItem.toolLabel='TOOLS BIKIN ANIMASI PAPER';
    animasiPaperItem.ready=true;
    animasiPaperItem.content='Klik tombol TOOLS untuk membuka tools Bikin Animasi Paper.';
  }

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
    {title:'STRATEGI JAGO JUALAN DI WHATSAPP',video:'',materialUrl:'https://akses-jjwa.pebisnisdigital.chatgpt.site/',description:'Pelajari cara membangun percakapan dan penawaran yang lebih nyaman lewat WhatsApp.',content:''},
    {title:'CONTEKAN 3 PESAN BIAR KONTAK BARU LEBIH CEPAT JADI PEMBELI',video:'',materialUrl:'https://pebisnis.digital/contekan-3-pesan-biar-kontak-baru-lebih-cepat-jadi-pembeli',description:'Pelajari tiga pola pesan untuk menindaklanjuti kontak baru tanpa terasa memaksa.',content:''},
    {title:'BIKIN KELAS ONLINE',video:'https://youtu.be/I4NbR8jdEY0',description:'Susun materi, struktur, dan akses kelas online dari pengetahuan yang kamu punya.',content:''},
    {title:'5 STRATEGI DAPAT KONTAK BERKUALITAS',video:'',materialUrl:'https://pebisnis.digital/bonus1-5-strategi-dapat-kontak-berkualitas',description:'Pelajari cara mencari kontak yang lebih relevan dengan produk atau layananmu.',content:''},
    {title:'9 STRATEGI DAPAT RIBUAN KONTAK NON STOP',video:'',materialUrl:'https://pebisnis.digital/bonus2-9-strategi-dapat-ribuan-kontak-non-stop#akses',description:'Pelajari beberapa jalur untuk memperluas jaringan kontak secara konsisten.',content:''},
    {title:'DAPAT KONTAK LANGSUNG DAPAT TRANSFERAN',video:'',materialUrl:'https://pebisnis.digital/dapat-kontak-langsung-dapat-transferan',description:'Pelajari cara menghubungkan aktivitas mencari kontak dengan penawaran yang jelas dan terarah.',content:''}
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
    var displayItems=(items||[]).map(function(item,i){
      return {item:item,originalIndex:i}
    }).reverse();
    host.className='badai-material-card-grid';
    host.innerHTML=displayItems.map(function(entry){
      var item=entry.item;
      var number=String(firstNo+entry.originalIndex).padStart(3,'0');
      var hasMaterial=!!String(item.materialUrl||'').trim();
      var hasTool=!!String(item.toolUrl||'').trim();
      var hasVideo=!!String(item.video||'').trim();
      var ready=item.ready===true || hasMaterial || hasTool || hasVideo;
      var description=item.description
        ? item.description
        : (item.content ? item.content : 'Materi ini sedang disiapkan.');

      var primaryUrl=hasMaterial?item.materialUrl:item.toolUrl;
      var primaryLabel=hasMaterial?'BUKA MATERI':'BUKA TOOLS';
      var actionButtons=[];
      if(hasMaterial||hasTool){
        actionButtons.push('<a class="badai-card-action badai-card-action-tool" href="'+primaryUrl+'" target="_blank" rel="noopener noreferrer">'+primaryLabel+' <span>↗</span></a>');
      }
      if(hasVideo){
        actionButtons.push('<a class="badai-card-action badai-card-action-video" href="'+item.video+'" target="_blank" rel="noopener noreferrer">▶ TUTORIAL</a>');
      }
      var actionsHtml=actionButtons.length
        ? '<div class="badai-material-card-divider"></div><div class="badai-material-card-actions'+(actionButtons.length===1?' is-single':'')+'">'+actionButtons.join('')+'</div>'
        : '';

      return '<article class="badai-material-card'+(ready?' is-ready':' is-coming-soon')+'">'+
        (!ready?'<span class="badai-material-card-coming">SEGERA HADIR</span>':'')+
        '<div class="badai-material-card-number">#'+number+'</div>'+
        '<h3 class="badai-material-card-title">'+item.title+'</h3>'+
        '<p class="badai-material-card-desc">'+description+'</p>'+
        actionsHtml+
      '</article>';
    }).join('');
  }

  renderMemberMaterials('chapterGrid',pemulaMaterials,'Materi Pemula',1);
  renderMemberMaterials('profitRouteGrid',untungMaterials,'Materi Untung',11);

  [
    ['kelas','Pemula','fi fi-rr-square-1'],['jaluruntung','Untung','fi fi-rr-square-2'],['afiliasi','Afiliasi','fi fi-rr-square-3'],['mentor','Grup','fi fi-rr-square-4'],['akun','Akun','fi fi-rr-square-5']
  ].forEach(function(menu){var button=document.querySelector('.footer [data-screen="'+menu[0]+'"]');if(!button)return;var label=button.querySelector('.label');var emoji=button.querySelector('.emoji');if(label)label.textContent=menu[1];if(emoji)emoji.innerHTML='<i class="'+menu[2]+'" aria-hidden="true"></i>'});

  function lockAffiliateNav(){
    var btn=document.querySelector('.footer [data-screen="afiliasi"]');
    if(!btn)return;
    btn.disabled=true;
    btn.dataset.featureLocked='1';
    btn.dataset.planLocked='1';
    btn.setAttribute('aria-disabled','true');
    btn.setAttribute('title','Segera hadir');
    btn.classList.add('is-feature-coming-soon');
    btn.classList.remove('active');
    var label=btn.querySelector('.label');
    if(label)label.innerHTML='Afiliasi<small class="affiliate-soon-badge">SEGERA HADIR</small>';
  }
  lockAffiliateNav();

  function normalizePlan(plan){
    var value=String(plan||'').trim().toLowerCase().replace(/[_-]+/g,' ');
    if(['pro','untung','paket untung','member untung'].includes(value))return'pro';
    if(['free','gratis','gratisan','paket gratisan','member gratisan'].includes(value))return'free';
    return'newbie'
  }
  function levelFromPlan(plan){plan=normalizePlan(plan);if(plan==='pro')return 3;if(plan==='free')return 1;return 2}
  function currentPlan(){var stable=document.documentElement.dataset.membershipPlan;if(stable)return normalizePlan(stable);var text=String(el('memberPlanName')?el('memberPlanName').textContent:'').toUpperCase();if(text.indexOf('UNTUNG')!==-1)return'pro';if(text.indexOf('GRATIS')!==-1)return'free';return'newbie'}
  function planLabel(level){return level>=3?'MEMBER UNTUNG':level===1?'MEMBER GRATISAN':'MEMBER PEMULA'}
  function applyResolvedPlan(plan){
    plan=normalizePlan(plan);
    document.documentElement.dataset.membershipPlan=plan;
    var pn=el('memberPlanName'),pd=el('memberPlanDesc');
    if(pn)pn.textContent=plan==='pro'?'PAKET UNTUNG':plan==='free'?'PAKET GRATISAN':'PAKET PEMULA';
    if(pd)pd.textContent=plan==='pro'?'Ilmu + Bonus + Program Affiliasi':plan==='free'?'Komunitas + KulWA':'Belajar Ilmu AI + Update';
    syncPlanAccess()
  }

  var upgradeModal=null;
  function getUpgradeModal(){if(upgradeModal)return upgradeModal;upgradeModal=document.createElement('div');upgradeModal.className='badai-upgrade-modal';upgradeModal.innerHTML='<div class="badai-upgrade-card" role="dialog" aria-modal="true"><div class="badai-upgrade-lock">🔒</div><div class="badai-upgrade-kicker">AKSES TERKUNCI</div><h2 id="badaiUpgradeTitle">Menu ini masih terkunci</h2><p id="badaiUpgradeText">Naik paket untuk membuka akses ini.</p><div id="badaiUpgradeBenefits" class="badai-upgrade-benefits"></div><div class="badai-upgrade-actions"><a id="badaiUpgradeButton" href="#" target="_blank" rel="noopener noreferrer">UPGRADE SEKARANG</a><button type="button" data-close-upgrade>NANTI DULU</button></div></div>';document.body.appendChild(upgradeModal);upgradeModal.addEventListener('click',function(e){if(e.target===upgradeModal||(e.target.closest&&e.target.closest('[data-close-upgrade]')))upgradeModal.classList.remove('open')});return upgradeModal}
  function openUpgrade(feature,targetPackage){var modal=getUpgradeModal();var target=targetPackage==='Pemula'?'Paket Pemula':'Paket Untung';el('badaiUpgradeTitle').textContent=feature+' masih terkunci';el('badaiUpgradeText').textContent='Upgrade ke '+target+' untuk membuka menu '+feature+'.';el('badaiUpgradeBenefits').innerHTML=targetPackage==='Pemula'?'<span>✓ Buka seluruh menu Pemula</span><span>✓ Akses kelas dan update materi BADAI</span><span>✓ Tetap dapat Komunitas + KulWA</span>':'<span>✓ Menu Untung terbuka</span><span>✓ Program Affiliasi aktif</span><span>✓ Link afiliasi + bahan promosi + komisi</span>';var btn=el('badaiUpgradeButton');btn.textContent='UPGRADE KE '+target.toUpperCase();btn.href='https://wa.me/62881022445869?text='+encodeURIComponent('Halo Admin BADAI, saya ingin upgrade ke '+target+'.');modal.classList.add('open')}

  function syncPlanAccess(){var level=levelFromPlan(currentPlan());var req={kelas:2,jaluruntung:3,afiliasi:3};Object.keys(req).forEach(function(screen){var btn=document.querySelector('.footer [data-screen="'+screen+'"]');if(!btn)return;var featureLocked=screen==='afiliasi';var locked=featureLocked||level<req[screen];btn.classList.toggle('is-plan-locked',locked&&!featureLocked);btn.classList.toggle('is-feature-coming-soon',featureLocked);btn.dataset.planLocked=locked?'1':'0';btn.dataset.featureLocked=featureLocked?'1':'0';btn.setAttribute('aria-disabled',locked?'true':'false');if(featureLocked)btn.disabled=true});lockAffiliateNav();document.querySelectorAll('[data-member-level]').forEach(function(card){card.classList.toggle('active',Number(card.getAttribute('data-member-level'))===level)});var active=document.querySelector('#kelas.screen.active,#jaluruntung.screen.active,#afiliasi.screen.active');if(active&&((active.id==='afiliasi')||level<(req[active.id]||1))&&typeof window.show==='function')window.show('kelas')}

  document.addEventListener('click',function(e){var btn=e.target.closest?e.target.closest('.footer button'):null;if(!btn)return;var screen=btn.getAttribute('data-screen');if(screen==='afiliasi'){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();lockAffiliateNav();return}if(btn.dataset.planLocked!=='1')return;if(!['kelas','jaluruntung'].includes(screen))return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();if(screen==='kelas')openUpgrade('Pemula','Pemula');if(screen==='jaluruntung')openUpgrade('Untung','Untung')},true);

  async function resolveRealPlan(){
    try{
      var s=memberSession();if(!s||!s.access_token)return;
      var headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token};
      var userId='';
      var ur=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:headers,cache:'no-store'});
      if(ur.ok){var u=await ur.json();userId=u&&u.id?u.id:''}
      if(!userId&&s.user&&s.user.id)userId=s.user.id;
      if(!userId)return;

      var plan='';
      var pr=await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+encodeURIComponent(userId)+'&select=membership_plan',{headers:headers,cache:'no-store'});
      if(pr.ok){
        var rows=await pr.json();
        if(rows&&rows[0]&&rows[0].membership_plan)plan=rows[0].membership_plan
      }

      if(!plan){
        var rr=await fetch(SUPABASE_URL+'/rest/v1/registrations?user_id=eq.'+encodeURIComponent(userId)+'&member_status=eq.active&payment_status=eq.paid&select=membership_plan,activated_at&order=activated_at.desc&limit=1',{headers:headers,cache:'no-store'});
        if(rr.ok){
          var regs=await rr.json();
          if(regs&&regs[0]&&regs[0].membership_plan)plan=regs[0].membership_plan
        }
      }

      if(plan)applyResolvedPlan(plan)
    }catch(err){console.warn('BADAI plan sync:',err&&err.message?err.message:err)}
  }

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
  function ensurePayoutButton(){var commission=el('affiliateCommissionTotal');if(!commission)return;var card=commission.closest?commission.closest('.stat'):null;if(!card)return;card.classList.add('badai-affiliate-commission-card');if(el('badaiAffiliatePayout'))return;var host=el('badaiAffiliatePayoutRow')||card;var btn=document.createElement('a');btn.id='badaiAffiliatePayout';btn.className='badai-affiliate-payout';btn.href='#';btn.target='_blank';btn.rel='noopener noreferrer';btn.textContent='CAIRKAN KOMISI';btn.addEventListener('click',function(){var code=String(el('affiliateCode')?el('affiliateCode').textContent:'-').trim()||'-';var amount=String(commission.textContent||'Rp0').trim()||'Rp0';btn.href='https://wa.me/62881022445869?text='+encodeURIComponent('Halo Admin BADAI, saya ingin mencairkan komisi afiliasi saya.\n\nKode Afiliasi: '+code+'\nTotal Komisi: '+amount)});host.appendChild(btn)}
  function affiliateCode(){var code=String(el('affiliateCode')?el('affiliateCode').textContent:'').trim();if(code&&code!=='-'&&code.toLowerCase().indexOf('memuat')===-1)return code;var link=String(window.BADAI_AFFILIATE_LINK||'').trim();if(link){try{var parsed=new URL(link,location.origin);var seg=parsed.pathname.split('/').filter(Boolean).pop();if(seg)return decodeURIComponent(seg)}catch(_){}}return''}
  function affiliateUrl(code,type){var main=location.origin.replace(/\/$/,'')+'/'+encodeURIComponent(code);if(type==='free')return main+'?paket=gratisan';if(type==='newbie')return main+'?paket=pemula';if(type==='pro')return main+'?paket=untung';return main}
  function fallbackCopy(text,done){var t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');if(done)done()}catch(_){}t.remove()}
  function copyAffiliate(text,button){function ok(){var old=button.textContent;button.textContent='TERSALIN ✓';button.classList.add('copied');setTimeout(function(){button.textContent=old;button.classList.remove('copied')},1300)}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(ok).catch(function(){fallbackCopy(text,ok)});else fallbackCopy(text,ok)}
  function addAffiliateCard(container,cfg,code){var url=affiliateUrl(code,cfg.type);var card=document.createElement('div');card.className='badai-affiliate-link-card'+(cfg.featured?' is-featured':'');var badge=document.createElement('span');badge.className='badai-affiliate-link-badge';badge.textContent=cfg.badge;var h=document.createElement('h3');h.textContent=cfg.title;var p=document.createElement('p');p.textContent=cfg.desc;var c=document.createElement('code');c.className='badai-affiliate-url';c.textContent=url;var actions=document.createElement('div');actions.className='badai-affiliate-link-actions';var copy=document.createElement('button');copy.type='button';copy.className='badai-affiliate-copy';copy.textContent='SALIN LINK';copy.addEventListener('click',function(){copyAffiliate(url,copy)});var open=document.createElement('a');open.className='badai-affiliate-open';open.href=url;open.target='_blank';open.rel='noopener noreferrer';open.textContent='BUKA';actions.appendChild(copy);actions.appendChild(open);card.appendChild(badge);card.appendChild(h);card.appendChild(p);card.appendChild(c);card.appendChild(actions);container.appendChild(card)}
  async function renderAffiliateChoices(code){if(!code||affiliateRenderedCode===code)return;affiliateRenderedCode=code;var container=el('badaiAffiliateLinkChoices');if(!container)return;var settings={link_main_enabled:true,link_free_enabled:true,link_newbie_enabled:true,link_pro_enabled:true};try{var s=memberSession();if(s&&s.access_token){var r=await fetch(SUPABASE_URL+'/rest/v1/affiliate_settings?id=eq.1&select=link_main_enabled,link_free_enabled,link_newbie_enabled,link_pro_enabled',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token}});if(r.ok){var rows=await r.json();if(rows&&rows[0])settings=Object.assign(settings,rows[0])}}}catch(err){console.warn('BADAI affiliate links:',err&&err.message?err.message:err)}var configs=[{key:'link_main_enabled',type:'main',badge:'SEMUA PAKET',title:'Link Utama',desc:'Kirim ke LP utama. Calon member bebas memilih Gratisan, Pemula, atau Untung.',featured:true},{key:'link_free_enabled',type:'free',badge:'PAKET GRATISAN',title:'Ajak Masuk Gratis Dulu',desc:'Cocok untuk memperbanyak member dan membawa orang masuk komunitas tanpa hambatan.'},{key:'link_newbie_enabled',type:'newbie',badge:'PAKET PEMULA',title:'Langsung Jual Paket Pemula',desc:'Gunakan saat kamu memang menawarkan akses belajar Paket Pemula.'},{key:'link_pro_enabled',type:'pro',badge:'PAKET UNTUNG',title:'Langsung Jual Paket Untung',desc:'Gunakan untuk calon member yang siap ambil akses lengkap termasuk bonus dan affiliasi.'}];container.innerHTML='';var shown=0;configs.forEach(function(cfg){if(settings[cfg.key]===false)return;addAffiliateCard(container,cfg,code);shown++});if(!shown)container.innerHTML='<div class="badai-affiliate-empty">Belum ada link jualan yang diaktifkan Admin. Hubungi Admin BADAI.</div>'}
  function bootAffiliate(attempt){ensurePayoutButton();prepareAffiliateBox();var code=affiliateCode();if(code){renderAffiliateChoices(code);return}if((attempt||0)<50)setTimeout(function(){bootAffiliate((attempt||0)+1)},250)}

  var planNode=el('memberPlanName');if(planNode&&typeof MutationObserver!=='undefined')new MutationObserver(syncPlanAccess).observe(planNode,{childList:true,subtree:true,characterData:true});
  window.addEventListener('badai:membership-updated',function(e){
    var plan=e&&e.detail&&e.detail.plan?e.detail.plan:'';
    if(plan)applyResolvedPlan(plan)
  });
  var codeNode=el('affiliateCode');if(codeNode&&typeof MutationObserver!=='undefined')new MutationObserver(function(){affiliateRenderedCode='';bootAffiliate(0)}).observe(codeNode,{childList:true,subtree:true,characterData:true});


  var mentorConversationId='';
  var mentorPollTimer=null;
  var mentorLastKey='';
  var mentorUnreadInitialized=false;
  var mentorUnreadCount=0;
  var mentorOverviewBusy=false;
  var mentorToastTimer=null;
  var mentorLastReadAt=null;
  var mentorTypingTimer=null;
  var mentorPendingFile=null;
  var mentorPendingObjectUrl='';
  var mentorInitialRender=true;
  var mentorMessageRows=new Map();
  var mentorUiState=new Map();
  var mentorReply=null;
  var mentorMessageMenu=null;
  var mentorAnimatedMessageIds=new Set();
  var mentorView='list';
  var mentorSelectedChat='mentor';
  var communityOverviewMap=new Map();
  var communityUnreadTotal=0;
  var communityOverviewBusy=false;
  var communityParticipants=[];
  var communityParticipantsLoaded=false;
  var communityMentionIndex=0;
  var communityMentionState=null;
  var mentorDraftKey='badai_mentor_draft';
  var mentorMemberPresenceLastTouch=0;
  var mentorWorkHoursStatus=null;
  var mentorWorkHoursLastFetch=0;
  var mentorWorkHoursBusy=false;
  var mentorLastOverviewRow=null;
  var mentorIdentity={display_name:'MENTOR BADAI',avatar_url:'',updated_at:null};
  var mentorIdentityLastFetch=0;

  function mentorIdentityPhoto(){
    return String(mentorIdentity&&mentorIdentity.avatar_url||'').trim()
  }
  function setMentorIdentityAvatarNode(node,fallback){
    if(!node)return;
    var url=mentorIdentityPhoto();
    if(url){
      node.innerHTML='<img src="'+mentorEsc(url)+'" alt="Mentor BADAI" loading="lazy">';
      node.classList.add('has-photo')
    }else{
      node.textContent=fallback||'M';
      node.classList.remove('has-photo')
    }
  }
  function applyMentorIdentityUi(){
    var name=mentorIdentity&&mentorIdentity.display_name?mentorIdentity.display_name:'MENTOR BADAI';
    var url=mentorIdentityPhoto();
    if(el('mentorChatRowName'))el('mentorChatRowName').textContent=name;
    var rowAvatar=document.querySelector('#mentor [data-chat-kind="mentor"] .mentor-chat-row-avatar');
    if(rowAvatar){
      if(url){rowAvatar.innerHTML='<img src="'+mentorEsc(url)+'" alt="Mentor BADAI" loading="eager">';rowAvatar.classList.add('shared-mentor-photo','has-photo')}
      else{rowAvatar.textContent='M';rowAvatar.classList.remove('shared-mentor-photo','has-photo')}
    }
    document.querySelectorAll('#mentor [data-shared-mentor-avatar]').forEach(function(node){
      if(url){node.innerHTML='<img src="'+mentorEsc(url)+'" alt="Mentor BADAI" loading="eager">';node.classList.add('has-photo')}
      else{node.textContent='M';node.classList.remove('has-photo')}
    });
    document.querySelectorAll('#mentor [data-shared-mentor-name]').forEach(function(node){node.textContent=name});
    if(mentorSelectedChat==='mentor'){
      if(el('mentorWaName'))el('mentorWaName').textContent=name;
      setMentorIdentityAvatarNode(el('mentorWaAvatar'),'M');
      var infoAvatar=el('mentorChatInfoAvatar');
      if(infoAvatar)setMentorIdentityAvatarNode(infoAvatar,'M')
    }
  }
  async function loadMentorIdentity(force){
    var now=Date.now();
    if(!force&&mentorIdentityLastFetch&&now-mentorIdentityLastFetch<30000){applyMentorIdentityUi();return mentorIdentity}
    try{
      var rows=await mentorFetch('/rest/v1/rpc/mentor_identity_get',{method:'POST',body:'{}'});
      var row=Array.isArray(rows)?rows[0]:rows;
      if(row)mentorIdentity={display_name:row.display_name||'MENTOR BADAI',avatar_url:row.avatar_url||'',updated_at:row.updated_at||null};
      mentorIdentityLastFetch=Date.now();applyMentorIdentityUi()
    }catch(_){}
    return mentorIdentity
  }

  function mentorEsc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]
    })
  }
  function mentorHeaders(json){
    var s=memberSession();
    var h={apikey:SUPABASE_KEY,Authorization:'Bearer '+(s&&s.access_token?s.access_token:'')};
    if(json!==false)h['Content-Type']='application/json';
    return h
  }
  async function mentorFetch(path,options){
    var res=await fetch(SUPABASE_URL+path,Object.assign({},options||{},{headers:Object.assign(mentorHeaders(true),(options&&options.headers)||{})}));
    var text=await res.text(),data=null;
    if(text){try{data=JSON.parse(text)}catch(_){data=text}}
    if(!res.ok)throw new Error((data&&(data.message||data.error||data.msg))||'Gagal memuat Mentor');
    return data
  }
  function mentorClock(value){
    try{return new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch(_){return ''}
  }
  function mentorDateKey(value){
    try{
      var d=new Date(value);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
    }catch(_){return ''}
  }
  function mentorDateLabel(value){
    try{
      var d=new Date(value),now=new Date(),y=new Date(now);y.setDate(now.getDate()-1);
      if(mentorDateKey(d)===mentorDateKey(now))return 'HARI INI';
      if(mentorDateKey(d)===mentorDateKey(y))return 'KEMARIN';
      return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:d.getFullYear()!==now.getFullYear()?'numeric':undefined}).format(d).toUpperCase()
    }catch(_){return ''}
  }
  function mentorSize(bytes){
    bytes=Number(bytes||0);if(!bytes)return '';
    if(bytes<1024)return bytes+' B';
    if(bytes<1024*1024)return Math.round(bytes/1024)+' KB';
    return (bytes/(1024*1024)).toFixed(1)+' MB'
  }
  function mentorReceipt(createdAt){
    var read=mentorLastReadAt&&new Date(mentorLastReadAt).getTime()>=new Date(createdAt).getTime();
    return '<span class="mentor-receipt '+(read?'read':'')+'" title="'+(read?'Dibaca':'Terkirim')+'">✓✓</span>'
  }
  function mentorNearBottom(list){
    return !list || list.scrollHeight-list.scrollTop-list.clientHeight<90
  }
  function mentorScrollBottom(force,smooth){
    var list=el('mentorMessageList');if(!list)return;
    if(force||mentorNearBottom(list)){
      var top=list.scrollHeight;
      if(typeof list.scrollTo==='function')list.scrollTo({top:top,behavior:smooth?'smooth':'auto'});else list.scrollTop=top;
      el('mentorJumpLatest')&&el('mentorJumpLatest').classList.add('hidden')
    }
  }
  function mentorFormatText(value){
    var safe=mentorEsc(value==null?'':String(value)).replace(/\r\n?/g,'\n');
    var blocks=[];
    safe=safe.replace(new RegExp('\\x60\\x60\\x60([\\s\\S]*?)\\x60\\x60\\x60','g'),function(_,code){
      var token='@@BADAI_WA_CODE_'+blocks.length+'@@';
      blocks.push('<pre class="mentor-wa-code"><code>'+code.replace(/^\n|\n$/g,'')+'</code></pre>');
      return token
    });
    function inline(text){
      var out=String(text||'');
      out=out.replace(new RegExp('\\x60([^\\x60\\n]+)\\x60','g'),'<code class="mentor-wa-inline-code">$1</code>');
      out=out.replace(/\*([^*\n]+)\*/g,'<strong>$1</strong>');
      out=out.replace(/_([^_\n]+)_/g,'<em>$1</em>');
      out=out.replace(/~([^~\n]+)~/g,'<del>$1</del>');
      out=out.replace(/@@BADAI_WA_CODE_(\d+)@@/g,function(_,i){return blocks[Number(i)]||''});
      return out
    }
    var lines=safe.split('\n'),html='',i=0;
    while(i<lines.length){
      var line=lines[i];
      if(/^[-*]\s+/.test(line)){
        html+='<ul class="mentor-wa-list">';
        while(i<lines.length&&/^[-*]\s+/.test(lines[i])){
          html+='<li>'+inline(lines[i].replace(/^[-*]\s+/,''))+'</li>';i++
        }
        html+='</ul>';continue
      }
      if(/^\d+\.\s+/.test(line)){
        html+='<ol class="mentor-wa-list">';
        while(i<lines.length&&/^\d+\.\s+/.test(lines[i])){
          html+='<li>'+inline(lines[i].replace(/^\d+\.\s+/,''))+'</li>';i++
        }
        html+='</ol>';continue
      }
      if(/^&gt;\s+/.test(line)){
        html+='<blockquote class="mentor-wa-quote">'+inline(line.replace(/^&gt;\s+/,''))+'</blockquote>';i++;continue
      }
      if(/^@@BADAI_WA_CODE_\d+@@$/.test(line.trim())){
        html+=inline(line.trim());i++;continue
      }
      html+='<div class="mentor-wa-line">'+(line?inline(line):'<br>')+'</div>';i++
    }
    return html
  }

  function communityFormatText(value){
    var raw=String(value==null?'':value),tokens=[];
    communityParticipants
      .slice()
      .sort(function(a,b){return String(b.display_name||'').length-String(a.display_name||'').length})
      .forEach(function(p){
        var name=String(p.display_name||'').trim();if(!name)return;
        var escaped=name.replace(/[.*+?^$()|[\]\\{}]/g,'\\  function mentorMessageSummary(m){');
        var re=new RegExp('(^|[\\s(])@'+escaped+'(?=$|[\\s.,!?;:)\\]])','gi');
        raw=raw.replace(re,function(match,prefix){
          var token='BADAIUSERMENTIONTOKEN'+tokens.length+'XZ';
          tokens.push({token:token,label:match.slice(prefix.length)});
          return prefix+token
        })
      });
    var html=mentorFormatText(raw);
    tokens.forEach(function(item){
      html=html.split(item.token).join('<span class="mentor-mention">'+mentorEsc(item.label)+'</span>')
    });
    return html
  }

  async function loadCommunityParticipants(force){
    if(communityParticipantsLoaded&&!force)return communityParticipants;
    try{
      var rows=await mentorFetch('/rest/v1/rpc/community_chat_participants_v3',{method:'POST',body:JSON.stringify({p_query:null,p_limit:300})});
      communityParticipants=Array.isArray(rows)?rows:[];
      communityParticipantsLoaded=true
    }catch(_){communityParticipants=[]}
    return communityParticipants
  }

  function closeCommunityMentionPicker(){
    var picker=el('mentorMentionPicker');
    if(picker)picker.classList.add('hidden');
    communityMentionState=null;communityMentionIndex=0
  }

  function ensureCommunityMentionUi(){
    var input=el('mentorMessageInput'),card=el('mentorChatCard');
    if(!input||!card)return;

    /* @ is a typing command, not a toolbar button. */
    var staleBtn=el('mentorMentionBtn');
    if(staleBtn)staleBtn.remove();

    var picker=el('mentorMentionPicker');
    if(!picker){
      picker=document.createElement('div');
      picker.id='mentorMentionPicker';picker.className='mentor-mention-picker hidden';
      picker.setAttribute('role','listbox');
      card.appendChild(picker);
      picker.addEventListener('mousedown',function(e){e.preventDefault()});
      picker.addEventListener('click',function(e){
        var item=e.target.closest('[data-community-mention-index]');if(!item)return;
        chooseCommunityMention(Number(item.getAttribute('data-community-mention-index')||0))
      })
    }
  }

  function communityMentionContext(input){
    if(!input)return null;
    var cursor=input.selectionStart==null?input.value.length:input.selectionStart;
    var before=input.value.slice(0,cursor),at=before.lastIndexOf('@');
    if(at<0)return null;
    if(at>0&&!/\\s/.test(before.charAt(at-1)))return null;
    var query=before.slice(at+1);
    if(query.indexOf('\\n')>=0||query.length>60)return null;
    return {at:at,cursor:cursor,query:query.trim().toLowerCase()}
  }

  async function updateCommunityMentionPicker(){
    var input=el('mentorMessageInput'),picker=el('mentorMentionPicker');
    if(!input||!picker||mentorSelectedChat!=='group'){closeCommunityMentionPicker();return}
    var state=communityMentionContext(input);
    if(!state){closeCommunityMentionPicker();return}
    await loadCommunityParticipants(false);
    var items=communityParticipants.filter(function(p){
      return !state.query||String(p.display_name||'').toLowerCase().includes(state.query)
    }).slice(0,8);
    if(!items.length){closeCommunityMentionPicker();return}
    communityMentionState={at:state.at,cursor:state.cursor,items:items};
    communityMentionIndex=Math.min(communityMentionIndex,items.length-1);
    picker.innerHTML=items.map(function(p,i){
      var initials=String(p.display_name||'M').trim().split(/\\s+/).slice(0,2).map(function(x){return x.charAt(0)}).join('').toUpperCase();
      var avatar=p.verified&&p.avatar_url
        ? '<span class="mentor-mention-avatar has-photo verified"><img src="'+mentorEsc(p.avatar_url)+'" alt="" loading="lazy"></span>'
        : p.avatar_key
          ? '<span class="mentor-mention-avatar has-photo"><img src="'+mentorEsc(badaiAvatarUrl(p.avatar_key))+'" alt="" loading="lazy"></span>'
          : '<span class="mentor-mention-avatar">'+mentorEsc(initials||'M')+'</span>';
      return '<button type="button" class="mentor-mention-item '+(i===communityMentionIndex?'active':'')+'" data-community-mention-index="'+i+'">'+
        avatar+
        '<span class="mentor-mention-copy"><b>'+mentorEsc(p.display_name||'Member BADAI')+(p.verified?' <span class="badai-pink-verified-inline">✓</span>':'')+'</b><small>'+mentorEsc(p.subtitle||'Member BADAI')+'</small></span>'+
      '</button>'
    }).join('');
    picker.classList.remove('hidden')
  }

  function chooseCommunityMention(index){
    var state=communityMentionState,input=el('mentorMessageInput');if(!state||!input)return;
    var p=state.items[index];if(!p)return;
    var name=String(p.display_name||'').trim(),before=input.value.slice(0,state.at),after=input.value.slice(state.cursor);
    var inserted='@'+name+' ';
    input.value=before+inserted+after;
    var pos=before.length+inserted.length;input.setSelectionRange(pos,pos);input.focus();
    closeCommunityMentionPicker();mentorGrowInput();
    try{localStorage.setItem(mentorDraftKey,input.value||'')}catch(_){}
  }

  function mentorMessageSummary(m){
    if(!m)return 'Pesan';
    if(m.message_type==='sticker')return m.sticker_key||'Stiker';
    if(m.message_type==='image')return (m.body?m.body+' · ':'')+'Foto';
    if(m.message_type==='file')return m.body||m.file_name||'Dokumen';
    return String(m.body||'Pesan').replace(/\s+/g,' ').trim()||'Pesan'
  }
  function mentorReactionHtml(state){
    var counts=state&&state.reaction_counts?state.reaction_counts:{};
    return Object.keys(counts).map(function(emoji){
      return '<button type="button" class="mentor-reaction-chip '+(state&&state.my_reaction===emoji?'mine':'')+'" data-mentor-react-chip="'+mentorEsc(emoji)+'">'+mentorEsc(emoji)+' <span>'+Number(counts[emoji]||0)+'</span></button>'
    }).join('')
  }
  function mentorReplyHtml(m,rowMap){
    if(!m||!m.reply_to_message_id)return '';
    var target=rowMap.get(m.reply_to_message_id);
    var label=target?(target.sender_kind==='member'?'Anda':'MENTOR BADAI'):'Pesan';
    var summary=target?mentorMessageSummary(target):'Pesan sebelumnya';
    return '<button type="button" class="mentor-reply-quote" data-mentor-jump-message="'+mentorEsc(m.reply_to_message_id)+'"><b>'+mentorEsc(label)+'</b><span>'+mentorEsc(summary.slice(0,120))+'</span></button>'
  }
  function closeMentorMessageMenu(){
    if(mentorMessageMenu){mentorMessageMenu.remove();mentorMessageMenu=null}
  }
  function setMentorReply(messageId){
    var m=mentorMessageRows.get(messageId);if(!m)return;
    mentorReply={id:m.id,summary:mentorMessageSummary(m)};
    var bar=el('mentorReplyBar');
    if(bar){
      var title=el('mentorReplyTitle'),txt=el('mentorReplyText'),replyLabel='Mentor';
      if(mentorSelectedChat==='group'){
        var sess=memberSession(),uid=sess&&sess.user?sess.user.id:'';
        replyLabel=m.sender_kind==='staff'?'MENTOR BADAI':(String(m.sender_user_id||'')===String(uid||'')?'pesan Anda':String(m.sender_name||'Member BADAI'))
      }else{
        replyLabel=m.sender_kind==='member'?'pesan Anda':'MENTOR BADAI'
      }
      if(title)title.textContent='Membalas '+replyLabel;
      if(txt)txt.textContent=mentorReply.summary.slice(0,130);
      bar.classList.remove('mentor-reply-closing','hidden')
    }
    el('mentorMessageInput')&&el('mentorMessageInput').focus()
  }
  function clearMentorReply(){
    mentorReply=null;
    var bar=el('mentorReplyBar');if(!bar)return;
    if(bar.classList.contains('hidden')){bar.classList.remove('mentor-reply-closing');return}
    bar.classList.add('mentor-reply-closing');
    setTimeout(function(){bar.classList.add('hidden');bar.classList.remove('mentor-reply-closing')},180)
  }
  async function mentorMessageAction(messageId,action,emoji){
    var m=mentorMessageRows.get(messageId);if(!m)return;
    var state=mentorUiState.get(messageId)||{};
    var communityMode=mentorSelectedChat==='group';
    if(action==='reply'){setMentorReply(messageId);return}
    if(action==='copy'){
      var text=mentorMessageSummary(m);
      try{await navigator.clipboard.writeText(text);mentorToast('Pesan disalin')}catch(_){mentorToast('Gagal menyalin pesan')}
      return
    }
    if(action==='react'){
      var next=state.my_reaction===emoji?'':emoji;
      await mentorFetch(communityMode?'/rest/v1/rpc/community_chat_message_react':'/rest/v1/rpc/mentor_message_react',{method:'POST',body:JSON.stringify({p_message_id:messageId,p_emoji:next||null})});
      mentorLastKey='';
      if(communityMode)await loadCommunityMessages('group');else await loadMentorMessages();
      return
    }
    if(action==='star'){
      await mentorFetch(communityMode?'/rest/v1/rpc/community_chat_message_star':'/rest/v1/rpc/mentor_message_star',{method:'POST',body:JSON.stringify({p_message_id:messageId,p_star:!state.starred})});
      mentorLastKey='';
      if(communityMode)await loadCommunityMessages('group');else await loadMentorMessages();
      mentorToast(state.starred?'Bintang dihapus':'Pesan diberi bintang');return
    }
    if(action==='delete'){
      await mentorFetch(communityMode?'/rest/v1/rpc/community_chat_message_hide':'/rest/v1/rpc/mentor_message_hide',{method:'POST',body:JSON.stringify({p_message_id:messageId})});
      mentorLastKey='';
      if(communityMode)await loadCommunityMessages('group');else await loadMentorMessages();
      mentorToast('Pesan dihapus dari tampilan');return
    }
  }
  function openMentorMessageMenu(button,messageId){
    closeMentorMessageMenu();
    var state=mentorUiState.get(messageId)||{};
    var menu=document.createElement('div');
    menu.className='mentor-message-menu';menu.dataset.messageId=messageId;
    menu.innerHTML=
      '<button type="button" data-msg-action="reply"><span>↩</span>Balas</button>'+
      '<button type="button" data-msg-action="copy"><span>▣</span>Salin</button>'+
      '<button type="button" data-msg-action="reaction"><span>☺</span>Reaksi</button>'+
      '<div class="mentor-menu-reactions hidden">'+['👍','❤️','😂','😮','😢','🙏'].map(function(x){return '<button type="button" data-msg-emoji="'+x+'">'+x+'</button>'}).join('')+'</div>'+
      '<button type="button" data-msg-action="star"><span>☆</span>'+(state.starred?'Hapus bintang':'Beri bintang')+'</button>'+
      '<button type="button" class="danger" data-msg-action="delete"><span>⌫</span>Hapus</button>';
    document.body.appendChild(menu);
    var r=button.getBoundingClientRect(),mw=210,mh=280;
    menu.style.left=Math.max(8,Math.min(window.innerWidth-mw-8,r.right-mw))+'px';
    menu.style.top=Math.max(8,Math.min(window.innerHeight-mh-8,r.bottom+5))+'px';
    mentorMessageMenu=menu
  }

  function renderMentorMessages(rows){
    var list=el('mentorMessageList');if(!list)return;
    var wasNear=mentorNearBottom(list);
    rows=rows||[];
    mentorMessageRows=new Map(rows.map(function(x){return [x.id,x]}));
    var visible=rows.filter(function(x){var s=mentorUiState.get(x.id);return !(s&&s.hidden)});
    var stateKey=Array.from(mentorUiState.values()).map(function(x){return x.message_id+':'+JSON.stringify(x.reaction_counts||{})+':'+String(x.my_reaction||'')+':'+String(x.starred)+':'+String(x.hidden)}).join('|');
    var key=visible.map(function(x){return x.id}).join(',')+'|'+stateKey+'|'+String(mentorLastReadAt||'');
    if(key===mentorLastKey)return;
    var hadMessages=mentorLastKey!=='';
    mentorLastKey=key;
    if(!visible.length){
      list.innerHTML='<div class="mentor-empty">Belum ada percakapan. Kirim pertanyaan pertama kamu 👇</div>';
      return
    }
    var html='',lastDay='';
    visible.forEach(function(m){
      var day=mentorDateKey(m.created_at);
      if(day!==lastDay){html+='<div class="mentor-date-sep">'+mentorDateLabel(m.created_at)+'</div>';lastDay=day}
      var body='',label=m.file_name||'Lampiran',link=m.drive_web_view_link||'#';
      var state=mentorUiState.get(m.id)||{};
      var reply=mentorReplyHtml(m,mentorMessageRows);
      if(m.message_type==='sticker'){
        body='<div class="body">'+mentorEsc(m.sticker_key||'✨')+'</div>';
      }else if(m.message_type==='image'){
        body='<div class="body"><a class="mentor-msg-image" href="'+mentorEsc(link)+'" target="_blank" rel="noopener"><img src="'+mentorEsc(link)+'" alt="'+mentorEsc(label)+'" loading="lazy"></a>'+
          (m.body?'<div class="mentor-image-caption">'+mentorFormatText(m.body)+'</div>':'')+'</div>';
      }else if(m.message_type==='file'){
        body='<div class="body"><a class="mentor-msg-file" href="'+mentorEsc(link)+'" target="_blank" rel="noopener"><span class="mentor-file-icon">📄</span><span class="mentor-file-copy"><b>'+mentorEsc(label)+'</b><small>'+mentorEsc(mentorSize(m.file_size)||String(m.file_mime||'Dokumen'))+'</small></span></a>'+
          (m.body?'<div class="mentor-image-caption">'+mentorFormatText(m.body)+'</div>':'')+'</div>';
      }else{
        body='<div class="body mentor-wa-formatted">'+mentorFormatText(m.body||'')+'</div>';
      }
      var receipt=m.sender_kind==='member'?mentorReceipt(m.created_at):'';
      var reactions=mentorReactionHtml(state);
      var animateMsg=!mentorAnimatedMessageIds.has(m.id)&&Date.now()-new Date(m.created_at).getTime()<15000;
      if(animateMsg)mentorAnimatedMessageIds.add(m.id);
      html+='<div id="mentor-msg-'+mentorEsc(m.id)+'" class="mentor-msg '+mentorEsc(m.sender_kind)+' '+mentorEsc(m.message_type)+(animateMsg?' mentor-msg-new':'')+(mentorChatSelectedIds.has(String(m.id))?' chat-selected':'')+'" data-message-id="'+mentorEsc(m.id)+'">'+
        '<button type="button" class="mentor-bubble-menu-btn" data-mentor-message-menu="'+mentorEsc(m.id)+'" aria-label="Opsi pesan">⌄</button>'+
        (state.starred?'<span class="mentor-message-star" title="Pesan berbintang">★</span>':'')+
        (m.is_ai_reply?'<span class="mentor-ai-reply-badge" title="Dibalas AI Mentor">AI</span>':'')+reply+body+
        '<div class="mentor-msg-meta"><span>'+mentorClock(m.created_at)+'</span>'+receipt+'</div>'+
        (reactions?'<div class="mentor-reaction-chips">'+reactions+'</div>':'')+'</div>'
    });
    list.innerHTML=html;updateMentorChatSelectionUi();
    if(mentorInitialRender||wasNear){mentorScrollBottom(true)}
    else if(hadMessages){el('mentorJumpLatest')&&el('mentorJumpLatest').classList.remove('hidden')}
    mentorInitialRender=false
  }
  function mentorToast(message){
    var node=el('mentorToast');
    if(!node){node=document.createElement('div');node.id='mentorToast';node.className='mentor-toast';document.body.appendChild(node)}
    node.textContent=message;node.classList.add('show');clearTimeout(mentorToastTimer);
    mentorToastTimer=setTimeout(function(){node.classList.remove('show')},3200)
  }
  function mentorRelativeLastSeen(value){
    if(!value)return 'offline';
    var sec=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
    if(sec<120)return 'terakhir dilihat baru saja';
    var min=Math.floor(sec/60);if(min<60)return 'terakhir dilihat '+min+' menit lalu';
    var hour=Math.floor(min/60);if(hour<24)return 'terakhir dilihat '+hour+' jam lalu';
    return 'terakhir dilihat '+new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(new Date(value))
  }
  function renderTotalChatUnread(){
    var total=Math.max(0,Number(mentorUnreadCount||0)+Number(communityUnreadTotal||0));
    var badge=el('mentorUnreadBadge');
    if(badge){badge.textContent=total>99?'99+':String(total);badge.classList.toggle('hidden',total<1)}
  }

  function communityRowIds(slug){
    return slug==='announcement'
      ? {preview:'announcementChatRowPreview',time:'announcementChatRowTime',unread:'announcementChatRowUnread'}
      : {preview:'groupChatRowPreview',time:'groupChatRowTime',unread:'groupChatRowUnread'}
  }

  async function refreshCommunityOverview(){
    if(communityOverviewBusy)return;
    communityOverviewBusy=true;
    try{
      var rows=await mentorFetch('/rest/v1/rpc/community_chat_overview',{method:'POST',body:'{}'});
      communityOverviewMap=new Map((rows||[]).map(function(x){return [x.channel_slug,x]}));
      communityUnreadTotal=0;
      (rows||[]).forEach(function(row){
        var ids=communityRowIds(row.channel_slug);
        var p=el(ids.preview),t=el(ids.time),u=el(ids.unread);
        if(p)p.textContent=row.last_message||row.subtitle||'';
        if(t)t.textContent=row.last_message_at?mentorClock(row.last_message_at):'';
        var n=Math.max(0,Number(row.unread_count||0));communityUnreadTotal+=n;
        if(u){u.textContent=n>99?'99+':String(n);u.classList.toggle('hidden',n<1)}
      });
      renderTotalChatUnread()
    }catch(_){}
    finally{communityOverviewBusy=false}
  }

  function mentorChatInfoData(){
    if(mentorSelectedChat==='announcement')return {
      avatar:'📢',title:'PENGUMUMAN BADAI',subtitle:'Channel resmi • Satu arah',
      desc:'Semua informasi penting komunitas BADAI dikirim oleh tim menggunakan satu identitas MENTOR BADAI. Member hanya membaca agar pengumuman penting tidak tenggelam.',
      note:'Gunakan channel ini sebagai sumber informasi resmi BADAI.'
    };
    if(mentorSelectedChat==='group')return {
      avatar:'G',title:'Grup BADAI',subtitle:'Diskusi komunitas • Semua member',
      desc:'Ruang ngobrol bersama seluruh Member BADAI dan tim BADAI. Gunakan untuk bertanya, berbagi progres, diskusi karya, dan saling bantu selama belajar.',
      note:'Jaga diskusi tetap relevan, nyaman, dan saling menghargai.'
    };
    return {
      avatar:'M',title:'Mentor BADAI',subtitle:'Konsultasi privat • Tim Mentor BADAI',
      desc:'Percakapan pribadi antara kamu dan MENTOR BADAI. Seluruh admin aktif dapat membantu membalas, tetapi identitas layanan yang terlihat selalu satu: MENTOR BADAI.',
      note:'Chat ini bersifat privat antara kamu dan tim BADAI.'
    };
  }

  function ensureMentorChatInfoPanel(){
    var card=el('mentorChatCard');if(!card)return null;
    var panel=el('mentorChatInfoPanel');if(panel)return panel;
    panel=document.createElement('section');
    panel.id='mentorChatInfoPanel';
    panel.className='mentor-chat-info-panel hidden';
    panel.setAttribute('aria-hidden','true');
    panel.innerHTML=
      '<div class="mentor-chat-info-head"><button id="mentorChatInfoBack" type="button" aria-label="Kembali">←</button><b>Info Chat</b></div>'+
      '<div class="mentor-chat-info-scroll">'+
        '<div class="mentor-chat-info-hero"><div id="mentorChatInfoAvatar" class="mentor-chat-info-avatar">M</div><strong id="mentorChatInfoTitle">Mentor BADAI</strong><span id="mentorChatInfoSubtitle"></span></div>'+
        '<div class="mentor-chat-info-card"><span class="mentor-chat-info-label">DESKRIPSI</span><p id="mentorChatInfoDesc"></p></div>'+
        '<div class="mentor-chat-info-card note"><span class="mentor-chat-info-label">INFO</span><p id="mentorChatInfoNote"></p></div>'+
      '</div>';
    card.appendChild(panel);
    var back=panel.querySelector('#mentorChatInfoBack');
    if(back)back.addEventListener('click',closeMentorChatInfo);
    return panel
  }

  function openMentorChatInfo(){
    if(mentorView!=='thread')return;
    var panel=ensureMentorChatInfoPanel();if(!panel)return;
    var data=mentorChatInfoData();
    var av=el('mentorChatInfoAvatar'),title=el('mentorChatInfoTitle'),sub=el('mentorChatInfoSubtitle'),desc=el('mentorChatInfoDesc'),note=el('mentorChatInfoNote');
    if(av){if(mentorSelectedChat==='mentor')setMentorIdentityAvatarNode(av,'M');else{av.textContent=data.avatar;av.classList.remove('has-photo')}}
    if(title)title.textContent=mentorSelectedChat==='mentor'?(mentorIdentity&&mentorIdentity.display_name?mentorIdentity.display_name:'MENTOR BADAI'):data.title;if(sub)sub.textContent=data.subtitle;if(desc)desc.textContent=data.desc;if(note)note.textContent=data.note;
    panel.classList.remove('hidden','closing');
    panel.setAttribute('aria-hidden','false');
    requestAnimationFrame(function(){panel.classList.add('open')})
  }

  function closeMentorChatInfo(){
    var panel=el('mentorChatInfoPanel');if(!panel||panel.classList.contains('hidden'))return;
    panel.classList.remove('open');panel.classList.add('closing');
    setTimeout(function(){panel.classList.add('hidden');panel.classList.remove('closing');panel.setAttribute('aria-hidden','true')},260)
  }

  var mentorChatSelectMode=false;
  var mentorChatSelectedIds=new Set();

  function mentorCurrentManageScope(){
    if(mentorSelectedChat==='announcement'||mentorSelectedChat==='group'){
      return {kind:'community',key:mentorSelectedChat}
    }
    if(mentorSelectedChat==='mentor'&&mentorConversationId){
      return {kind:'mentor',key:String(mentorConversationId)}
    }
    return null
  }

  function ensureMentorChatManageUi(){
    var card=el('mentorChatCard');if(!card)return;
    var menu=el('mentorChatManageMenu');
    if(!menu){
      menu=document.createElement('div');
      menu.id='mentorChatManageMenu';menu.className='mentor-chat-manage-menu hidden';
      menu.innerHTML='<button type="button" data-chat-manage="clear" class="danger">⌫ <span>Bersihkan semua chat</span></button>'+
        '<button type="button" data-chat-manage="select">☑ <span>Hapus beberapa chat</span></button>';
      card.appendChild(menu)
    }
    var bar=el('mentorChatSelectBar');
    if(!bar){
      bar=document.createElement('div');bar.id='mentorChatSelectBar';bar.className='mentor-chat-select-bar hidden';
      bar.innerHTML='<button type="button" id="mentorChatSelectCancel">×</button><b><span id="mentorChatSelectedCount">0</span> pesan dipilih</b><button type="button" id="mentorChatDeleteSelected" class="delete-selected">HAPUS</button>';
      card.appendChild(bar)
    }
  }

  function updateMentorChatSelectionUi(){
    ensureMentorChatManageUi();
    var card=el('mentorChatCard'),bar=el('mentorChatSelectBar'),count=el('mentorChatSelectedCount');
    if(card)card.classList.toggle('chat-select-mode',mentorChatSelectMode);
    if(bar)bar.classList.toggle('hidden',!mentorChatSelectMode);
    if(count)count.textContent=String(mentorChatSelectedIds.size);
    document.querySelectorAll('#mentorMessageList .mentor-msg[data-message-id]').forEach(function(node){
      node.classList.toggle('chat-selected',mentorChatSelectedIds.has(node.getAttribute('data-message-id')))
    })
  }

  function closeMentorChatManageMenu(){
    var menu=el('mentorChatManageMenu');if(menu)menu.classList.add('hidden')
  }

  function exitMentorChatSelection(){
    mentorChatSelectMode=false;mentorChatSelectedIds.clear();updateMentorChatSelectionUi()
  }

  async function reloadManagedMemberChat(){
    mentorLastKey='';
    if(mentorSelectedChat==='announcement'||mentorSelectedChat==='group'){
      await loadCommunityMessages(mentorSelectedChat);await refreshCommunityOverview()
    }else if(mentorConversationId){
      await loadMentorMessages();await refreshMentorOverview()
    }
  }

  async function clearCurrentMemberChat(){
    var scope=mentorCurrentManageScope();
    if(!scope){mentorToast('Chat belum siap.');return}
    if(!window.confirm('Bersihkan semua chat ini dari tampilan akun kamu? Pesan baru setelah ini tetap akan muncul.'))return;
    await mentorFetch('/rest/v1/rpc/chat_clear_for_me',{method:'POST',body:JSON.stringify({p_scope_kind:scope.kind,p_scope_key:scope.key})});
    exitMentorChatSelection();closeMentorChatManageMenu();mentorLastKey='';
    await reloadManagedMemberChat();
    mentorToast('Chat sudah dibersihkan dari akun kamu')
  }

  async function deleteSelectedMemberChat(){
    if(!mentorChatSelectedIds.size){mentorToast('Pilih minimal satu pesan.');return}
    var scope=mentorCurrentManageScope();if(!scope)return;
    var ids=Array.from(mentorChatSelectedIds);
    await mentorFetch('/rest/v1/rpc/chat_hide_messages_for_me',{method:'POST',body:JSON.stringify({p_scope_kind:scope.kind,p_message_ids:ids})});
    exitMentorChatSelection();mentorLastKey='';
    await reloadManagedMemberChat();
    mentorToast(ids.length+' pesan dihapus dari tampilan')
  }

  function setMemberChatChrome(kind){
    if(mentorSelectedChat!==kind)exitMentorChatSelection();
    mentorSelectedChat=kind||'mentor';
    var avatar=el('mentorWaAvatar'),name=el('mentorWaName'),sub=el('mentorWaSubstatus');
    var composer=el('mentorComposer'),stickers=el('mentorStickerTray'),attach=el('mentorAttachMenu');
    var chatCard=el('mentorChatCard');
    if(composer)composer.dataset.chatKind=mentorSelectedChat;
    if(chatCard){
      chatCard.classList.toggle('announcement-thread',mentorSelectedChat==='announcement');
      chatCard.classList.toggle('group-thread',mentorSelectedChat==='group');
    }
    ensureCommunityMentionUi();
    var notice=el('mentorReadOnlyNotice'),attachBtn=el('mentorAttachBtn'),stickerBtn=el('mentorStickerBtn');
    if(stickers)stickers.classList.add('hidden');if(attach)attach.classList.add('hidden');clearMentorPending();clearMentorReply();closeCommunityMentionPicker();
    if(kind==='announcement'){
      if(avatar)avatar.textContent='📢';if(name)name.textContent='PENGUMUMAN BADAI';if(sub)sub.textContent='Info resmi dari tim BADAI';
      if(composer)composer.classList.add('hidden');if(notice)notice.classList.remove('hidden');
    }else if(kind==='group'){
      if(avatar)avatar.textContent='G';if(name)name.textContent='Grup BADAI';if(sub)sub.textContent='Diskusi semua member BADAI';
      if(composer)composer.classList.remove('hidden');if(notice)notice.classList.add('hidden');
      if(attachBtn)attachBtn.classList.remove('hidden');if(stickerBtn)stickerBtn.classList.remove('hidden');loadCommunityParticipants(false).catch(function(){})
    }else{
      setMentorIdentityAvatarNode(avatar,'M');if(name)name.textContent=mentorIdentity&&mentorIdentity.display_name?mentorIdentity.display_name:'MENTOR BADAI';if(notice)notice.classList.add('hidden');if(composer)composer.classList.remove('hidden');
      if(attachBtn)attachBtn.classList.remove('hidden');if(stickerBtn)stickerBtn.classList.remove('hidden');
      refreshMentorWorkHours(false).catch(function(){});
      refreshMentorOverview().catch(function(){})
    }
    applyMemberMentorWorkHoursUi();
  }

  function communitySenderTone(name){
    var s=String(name||''),sum=0;
    for(var i=0;i<s.length;i++)sum=(sum+s.charCodeAt(i)*(i+1))%7;
    return 'tone-'+sum
  }

  function renderCommunityMessages(rows,slug){
    var list=el('mentorMessageList');if(!list)return;
    var wasNear=mentorNearBottom(list),s=memberSession(),uid=s&&s.user?s.user.id:'';
    rows=rows||[];
    mentorMessageRows=new Map(rows.map(function(m){return [m.id,m]}));
    var visible=rows.filter(function(m){var state=mentorUiState.get(m.id);return !(state&&state.hidden)});
    var html='',lastDay='',rowMap=new Map(rows.map(function(m){return [m.id,m]}));
    if(!visible.length){
      list.innerHTML='<div class="mentor-empty">'+(slug==='announcement'?'Belum ada pengumuman dari tim BADAI.':'Belum ada pesan di Grup BADAI. Jadi yang pertama ngobrol 👋')+'</div>';
      return
    }
    visible.forEach(function(m){
      var day=mentorDateKey(m.created_at);
      if(day!==lastDay){html+='<div class="mentor-date-sep">'+mentorDateLabel(m.created_at)+'</div>';lastDay=day}
      var own=String(m.sender_user_id||'')===String(uid||''),side=own?'member':'mentor';
      var staffMessage=m.sender_kind==='staff';
      var senderName=staffMessage?'MENTOR BADAI':(m.sender_name||'Member BADAI');
      var state=mentorUiState.get(m.id)||{};
      var sender=(slug==='group'&&!own)?'<div class="mentor-community-sender '+communitySenderTone(senderName)+'">'+mentorEsc(senderName)+(m.sender_verified?' <span class="badai-pink-verified-inline">✓</span>':'')+'</div>':'';
      var senderInitial=String(senderName||'A').trim().charAt(0).toUpperCase()||'A';
      var sharedMentorAvatar=mentorIdentityPhoto();
      var announcementAvatar=staffMessage
        ? ((sharedMentorAvatar||m.sender_avatar_url)?'<div class="mentor-announcement-avatar verified"><img src="'+mentorEsc(sharedMentorAvatar||m.sender_avatar_url)+'" alt="Mentor BADAI" loading="lazy"></div>':'<div class="mentor-announcement-avatar verified">M</div>')
        : (m.sender_verified&&m.sender_avatar_url
          ? '<div class="mentor-announcement-avatar verified"><img src="'+mentorEsc(m.sender_avatar_url)+'" alt="" loading="lazy"></div>'
          : '<div class="mentor-announcement-avatar">'+mentorEsc(senderInitial)+'</div>');
      var announcementHead=slug==='announcement'
        ? '<div class="mentor-announcement-head">'+announcementAvatar+
            '<div class="mentor-announcement-copy"><b>'+mentorEsc(senderName)+(m.sender_verified?' <span class="badai-pink-verified-inline">✓</span>':'')+'</b><small>Mentor BADAI</small></div>'+
          '</div>'
        : '';
      var body='';
      if(m.message_type==='sticker')body='<div class="body">'+mentorEsc(m.sticker_key||'✨')+'</div>';
      else if(m.message_type==='image')body='<div class="body"><a class="mentor-msg-image" href="'+mentorEsc(m.drive_web_view_link||'#')+'" target="_blank" rel="noopener"><img src="'+mentorEsc(m.drive_web_view_link||'#')+'" alt="" loading="lazy"></a>'+(m.body?'<div class="mentor-image-caption">'+mentorFormatText(m.body)+'</div>':'')+'</div>';
      else if(m.message_type==='file')body='<div class="body"><a class="mentor-msg-file" href="'+mentorEsc(m.drive_web_view_link||'#')+'" target="_blank" rel="noopener"><span class="mentor-file-icon">📄</span><span class="mentor-file-copy"><b>'+mentorEsc(m.file_name||'Dokumen')+'</b><small>'+mentorEsc(mentorSize(m.file_size)||String(m.file_mime||'Dokumen'))+'</small></span></a>'+(m.body?'<div class="mentor-image-caption">'+mentorFormatText(m.body)+'</div>':'')+'</div>';
      else body='<div class="body mentor-wa-formatted">'+(slug==='group'?communityFormatText(m.body||''):mentorFormatText(m.body||''))+'</div>';
      var reply='';
      if(m.reply_to_message_id){
        var target=rowMap.get(m.reply_to_message_id);
        var label=target?(target.sender_kind==='staff'?'MENTOR BADAI':(String(target.sender_user_id||'')===String(uid||'')?'Anda':String(target.sender_name||'Member BADAI'))):'Pesan';
        var summary=target?mentorMessageSummary(target):'Pesan sebelumnya';
        reply='<button type="button" class="mentor-reply-quote" data-mentor-jump-message="'+mentorEsc(m.reply_to_message_id)+'"><b>'+mentorEsc(label)+'</b><span>'+mentorEsc(summary.slice(0,120))+'</span></button>'
      }
      var reactions=slug==='group'?mentorReactionHtml(state):'';
      var animateMsg=!mentorAnimatedMessageIds.has(m.id)&&Date.now()-new Date(m.created_at).getTime()<15000;
      if(animateMsg)mentorAnimatedMessageIds.add(m.id);
      var bubble='<div id="mentor-msg-'+mentorEsc(m.id)+'" data-message-id="'+mentorEsc(m.id)+'" class="mentor-msg '+side+' '+mentorEsc(m.message_type)+(animateMsg?' mentor-msg-new':'')+(mentorChatSelectedIds.has(String(m.id))?' chat-selected':'')+'">'+
        (slug==='group'?'<button type="button" class="mentor-bubble-menu-btn" data-mentor-message-menu="'+mentorEsc(m.id)+'" aria-label="Opsi pesan">⌄</button>':'')+
        (slug==='group'&&state.starred?'<span class="mentor-message-star" title="Pesan berbintang">★</span>':'')+
        announcementHead+sender+reply+body+
        '<div class="mentor-msg-meta"><span>'+mentorClock(m.created_at)+'</span>'+(own&&slug!=='announcement'?'<span class="mentor-receipt read">✓✓</span>':'')+'</div>'+
        (reactions?'<div class="mentor-reaction-chips">'+reactions+'</div>':'')+'</div>';
      if(slug==='group'&&!own){
        var tone=communitySenderTone(senderName);
        var avatar=staffMessage&&sharedMentorAvatar
          ? '<div class="mentor-group-initial has-photo verified"><img src="'+mentorEsc(sharedMentorAvatar)+'" alt="Mentor BADAI" loading="lazy"></div>'
          : m.sender_verified&&m.sender_avatar_url
            ? '<div class="mentor-group-initial has-photo verified"><img src="'+mentorEsc(m.sender_avatar_url)+'" alt="" loading="lazy"></div>'
          : m.sender_avatar_key
            ? '<div class="mentor-group-initial has-photo"><img src="'+mentorEsc(badaiAvatarUrl(m.sender_avatar_key))+'" alt="" loading="lazy"></div>'
            : '<div class="mentor-group-initial '+tone+'">'+mentorEsc(senderInitial)+'</div>';
        html+='<div class="mentor-group-message-row">'+avatar+bubble+'</div>'
      }else html+=bubble
    });
    list.innerHTML=html;updateMentorChatSelectionUi();
    if(wasNear||mentorInitialRender)mentorScrollBottom(true);
    mentorInitialRender=false
  }

  async function loadCommunityMessages(slug){
    if(!slug||slug==='mentor')return;
    await loadMentorIdentity(false);
    if(slug==='group')await loadCommunityParticipants(false);
    var pair=await Promise.all([
      mentorFetch('/rest/v1/rpc/community_chat_messages_list_v5',{method:'POST',body:JSON.stringify({p_channel_slug:slug,p_limit:120})}),
      mentorFetch('/rest/v1/rpc/community_chat_message_ui_state',{method:'POST',body:JSON.stringify({p_channel_slug:slug})}).catch(function(){return []})
    ]);
    var rows=pair[0]||[],uiRows=pair[1]||[];
    mentorUiState=new Map(uiRows.map(function(x){return [x.message_id,x]}));
    renderCommunityMessages(rows,slug);
    if(mentorView==='thread'){
      await mentorFetch('/rest/v1/rpc/community_chat_mark_read',{method:'POST',body:JSON.stringify({p_channel_slug:slug})}).catch(function(){});
      await refreshCommunityOverview()
    }
  }

  async function sendCommunityPayload(type,body,sticker,fileData){
    if(mentorSelectedChat!=='group')return;
    await mentorFetch('/rest/v1/rpc/community_chat_send_v2',{method:'POST',body:JSON.stringify({
      p_channel_slug:'group',p_message_type:type,p_body:body||null,p_sticker_key:sticker||null,
      p_drive_file_id:fileData&&fileData.id?fileData.id:null,
      p_drive_web_view_link:fileData&&fileData.url?fileData.url:null,
      p_file_name:fileData&&fileData.name?fileData.name:null,
      p_file_mime:fileData&&fileData.mime?fileData.mime:null,
      p_file_size:fileData&&fileData.size?fileData.size:null,
      p_reply_to_message_id:mentorReply&&mentorReply.id?mentorReply.id:null
    })});
    clearMentorReply();
    await loadCommunityMessages('group');await refreshCommunityOverview();mentorScrollBottom(true)
  }

  function setMentorView(view){
    mentorView=view==='thread'?'thread':'list';
    var screen=el('mentor');
    if(screen){
      screen.classList.toggle('mentor-chat-list-mode',mentorView==='list');
      screen.classList.toggle('mentor-chat-thread-mode',mentorView==='thread')
    }
    if(mentorView==='thread'){
      mentorInitialRender=true;mentorLastKey='';
      setMemberChatChrome(mentorSelectedChat);
      if(mentorSelectedChat==='mentor'){
        touchMentorMemberPresence(true);
        loadMentorMessages().then(function(){mentorScrollBottom(true)}).catch(function(){})
      }else loadCommunityMessages(mentorSelectedChat).then(function(){mentorScrollBottom(true)}).catch(function(){});
      if(mentorSelectedChat!=='announcement')setTimeout(function(){var input=el('mentorMessageInput');if(input)input.focus()},40)
    }else{
      closeMentorChatInfo();
      mentorSetTyping(false);closeMentorMessageMenu();clearMentorReply();
      refreshCommunityOverview().catch(function(){});refreshMentorOverview().catch(function(){})
    }
  }

  function updateMentorChatRow(rows){
    rows=rows||[];
    var row=rows.length?rows[rows.length-1]:null;
    var preview=el('mentorChatRowPreview'),time=el('mentorChatRowTime');
    if(preview){
      if(row){
        var prefix=row.sender_kind==='member'?'Anda: ':'';
        preview.textContent=prefix+mentorMessageSummary(row)
      }else preview.textContent='Mulai percakapan dengan Mentor BADAI'
    }
    if(time)time.textContent=row?mentorClock(row.created_at):''
  }

  function setMentorUnread(count){
    count=Math.max(0,Number(count||0));
    var rowBadge=el('mentorChatRowUnread');
    if(rowBadge){rowBadge.textContent=count>99?'99+':String(count);rowBadge.classList.toggle('hidden',count<1)}
    if(mentorUnreadInitialized&&count>mentorUnreadCount){
      mentorToast('💬 Ada pesan baru dari Mentor BADAI');
      if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&document.visibilityState!=='visible'){
        try{new Notification('Mentor BADAI',{body:'Ada balasan baru dari mentor.'})}catch(_){}
      }
    }
    mentorUnreadCount=count;mentorUnreadInitialized=true;renderTotalChatUnread()
  }
  function mentorWorkNextLabel(value){
    if(!value)return '';
    try{
      return new Intl.DateTimeFormat('id-ID',{
        weekday:'long',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'
      }).format(new Date(value)).replace('.',':')+' WIB'
    }catch(_){return ''}
  }

  function mentorWorkHoursClosed(){
    return !!(mentorWorkHoursStatus&&mentorWorkHoursStatus.enabled!==false&&!mentorWorkHoursStatus.is_open)
  }

  function applyMemberMentorWorkHoursUi(){
    var closed=mentorSelectedChat==='mentor'&&mentorWorkHoursClosed();
    var card=el('mentorChatCard'),notice=el('mentorWorkHoursNotice'),text=el('mentorWorkHoursNoticeText');
    if(card)card.classList.toggle('mentor-after-hours',closed);
    if(notice)notice.classList.toggle('hidden',!closed);
    if(text&&closed){
      var next=mentorWorkNextLabel(mentorWorkHoursStatus&&mentorWorkHoursStatus.next_open_at);
      text.textContent='Mentor sedang di luar jam kerja. Pesan kamu tetap bisa dikirim'+
        (next?' dan akan dibalas setelah '+next+'.':'. Mentor akan membalas saat jam kerja buka kembali.');
    }
  }

  async function refreshMentorWorkHours(force){
    var now=Date.now();
    if(mentorWorkHoursBusy)return mentorWorkHoursStatus;
    if(!force&&mentorWorkHoursStatus&&now-mentorWorkHoursLastFetch<30000){
      applyMemberMentorWorkHoursUi();
      if(mentorLastOverviewRow)setMentorStatus(mentorLastOverviewRow);
      return mentorWorkHoursStatus
    }
    mentorWorkHoursBusy=true;
    try{
      var rows=await mentorFetch('/rest/v1/rpc/mentor_work_hours_status',{method:'POST',body:'{}'});
      mentorWorkHoursStatus=Array.isArray(rows)?rows[0]:rows;
      mentorWorkHoursLastFetch=Date.now();
      applyMemberMentorWorkHoursUi();
      if(mentorLastOverviewRow)setMentorStatus(mentorLastOverviewRow);
      return mentorWorkHoursStatus
    }catch(_){return mentorWorkHoursStatus}
    finally{mentorWorkHoursBusy=false}
  }

  function setMentorStatus(row){
    mentorLastOverviewRow=row||mentorLastOverviewRow;
    var status=el('mentorMemberStatus'),sub=el('mentorWaSubstatus'),name=el('mentorWaName');
    /* Member-facing identity stays unified as Mentor BADAI, regardless of which staff account replies. */
    var displayName=mentorIdentity&&mentorIdentity.display_name?mentorIdentity.display_name:'MENTOR BADAI';
    if(mentorSelectedChat==='mentor'&&name)name.textContent=displayName;
    if(el('mentorChatRowName'))el('mentorChatRowName').textContent=displayName;
    var text='offline',typing=false,online=false;
    if(mentorWorkHoursClosed()){
      var next=mentorWorkNextLabel(mentorWorkHoursStatus&&mentorWorkHoursStatus.next_open_at);
      text='di luar jam kerja'+(next?' • buka '+next:'');
      typing=false;online=false;
    }else if(row&&row.mentor_typing){text='sedang mengetik...';typing=true;online=true}
    else if(row&&row.mentor_online){text='online';online=true}
    else if(row){text=mentorRelativeLastSeen(row.mentor_last_seen_at)}
    if(mentorSelectedChat==='mentor'&&sub){sub.textContent=text;sub.classList.toggle('typing',typing)}
    var rowPreview=el('mentorChatRowPreview');
    if(rowPreview&&typing)rowPreview.textContent='sedang mengetik...';
    if(status){
      status.textContent=mentorWorkHoursClosed()?'○ DI LUAR JAM KERJA':(typing?'MENGETIK...':(online?'● MENTOR ONLINE':'○ MENTOR OFFLINE'));
      status.classList.toggle('online',online);
      status.classList.toggle('offline',!online)
    }
    applyMemberMentorWorkHoursUi();
  }
  async function refreshMentorOverview(){
    if(mentorOverviewBusy)return;
    mentorOverviewBusy=true;
    try{
      var rows=await mentorFetch('/rest/v1/rpc/mentor_member_overview',{method:'POST',body:'{}'});
      var row=Array.isArray(rows)?rows[0]:rows;
      if(!row)return;
      await loadMentorIdentity(false);
      if(row.conversation_id&&!mentorConversationId)mentorConversationId=row.conversation_id;
      setMentorUnread(row.unread_count||0);
      if(String(row.mentor_last_read_at||'')!==String(mentorLastReadAt||'')){mentorLastReadAt=row.mentor_last_read_at||null;mentorLastKey=''}
      await refreshMentorWorkHours(false);
      setMentorStatus(row)
    }catch(_){}
    finally{mentorOverviewBusy=false}
  }
  async function mentorSetTyping(value){
    if(!mentorConversationId)return;
    mentorFetch('/rest/v1/rpc/mentor_set_typing',{method:'POST',body:JSON.stringify({p_conversation_id:mentorConversationId,p_is_typing:Boolean(value)})}).catch(function(){})
  }
  function touchMentorMemberPresence(force){
    if(!mentorConversationId)return;
    var now=Date.now();if(!force&&now-mentorMemberPresenceLastTouch<20000)return;
    mentorMemberPresenceLastTouch=now;
    mentorFetch('/rest/v1/rpc/mentor_touch_member_presence',{method:'POST',body:JSON.stringify({p_conversation_id:mentorConversationId})}).catch(function(){})
  }
  function mentorTypingPulse(){
    mentorSetTyping(true);clearTimeout(mentorTypingTimer);
    mentorTypingTimer=setTimeout(function(){mentorSetTyping(false)},3200)
  }
  async function loadMentorMessages(){
    if(!mentorConversationId)return;
    var rows=await mentorFetch('/rest/v1/mentor_messages?conversation_id=eq.'+encodeURIComponent(mentorConversationId)+'&select=id,sender_kind,message_type,body,sticker_key,drive_web_view_link,file_name,file_mime,file_size,reply_to_message_id,is_ai_reply,created_at&order=created_at.desc&limit=80');
    var states=await mentorFetch('/rest/v1/rpc/mentor_message_ui_state',{method:'POST',body:JSON.stringify({p_conversation_id:mentorConversationId})}).catch(function(){return []});
    mentorUiState=new Map((states||[]).map(function(x){return [x.message_id,x]}));
    rows=(rows||[]).reverse();
    updateMentorChatRow(rows);
    renderMentorMessages(rows);
    var screen=el('mentor');
    if(screen&&screen.classList.contains('active')&&mentorView==='thread'){
      await mentorFetch('/rest/v1/rpc/mentor_mark_read',{method:'POST',body:JSON.stringify({p_conversation_id:mentorConversationId})}).catch(function(){});
      setMentorUnread(0)
    }
  }
  async function bootMentor(){
    var status=el('mentorMemberStatus');if(status){status.textContent='Menghubungkan...';status.classList.remove('online','offline')}
    try{
      await loadMentorIdentity(false);
      var rows=await mentorFetch('/rest/v1/rpc/mentor_get_or_create_conversation',{method:'POST',body:'{}'});
      var row=Array.isArray(rows)?rows[0]:rows;mentorConversationId=row&&row.conversation_id?row.conversation_id:'';
      if(!mentorConversationId)throw new Error('Percakapan belum tersedia');
      touchMentorMemberPresence(true);
      await refreshMentorWorkHours(true);
      await refreshMentorOverview();await loadMentorMessages();
      fetch('/api/mentor/status').then(function(r){return r.ok?r.json():null}).then(function(info){
        var note=el('mentorUploadNote');if(!note)return;
        note.textContent=info&&info.drive_configured?'':'Lampiran sementara belum tersedia.'
      }).catch(function(){})
    }catch(err){
      if(status){status.textContent='GAGAL TERHUBUNG';status.classList.remove('online','offline')}
      var list=el('mentorMessageList');if(list)list.innerHTML='<div class="mentor-empty">'+mentorEsc(err.message||'Gagal membuka Mentor')+'</div>'
    }
  }
  async function sendMentorPayload(type,body,sticker,fileData){
    if(!mentorConversationId)await bootMentor();if(!mentorConversationId)return;
    await mentorFetch('/rest/v1/rpc/mentor_send_message_v2',{method:'POST',body:JSON.stringify({
      p_conversation_id:mentorConversationId,p_message_type:type,p_body:body||null,p_sticker_key:sticker||null,
      p_drive_file_id:fileData&&fileData.id?fileData.id:null,p_drive_web_view_link:fileData&&fileData.url?fileData.url:null,
      p_file_name:fileData&&fileData.name?fileData.name:null,p_file_mime:fileData&&fileData.mime?fileData.mime:null,
      p_file_size:fileData&&fileData.size?fileData.size:null,p_reply_to_message_id:mentorReply&&mentorReply.id?mentorReply.id:null
    })});
    clearMentorReply();
    mentorSetTyping(false);mentorLastKey='';await loadMentorMessages();mentorScrollBottom(true)
  }
  async function uploadMentorFile(file){
    if(!file)return;if(file.size>10*1024*1024)throw new Error('File maksimal 10 MB.');
    var s=memberSession();if(!s||!s.access_token)throw new Error('Session member tidak tersedia.');
    var fd=new FormData();fd.append('file',file);fd.append('conversation_id',mentorConversationId||'');
    var res=await fetch('/api/mentor/upload',{method:'POST',headers:{Authorization:'Bearer '+s.access_token},body:fd});
    var data=await res.json().catch(function(){return null});
    if(!res.ok)throw new Error((data&&(data.error||data.message))||'Upload gagal.');return data
  }
  async function uploadCommunityFile(file){
    if(!file)return;if(file.size>10*1024*1024)throw new Error('File maksimal 10 MB.');
    var s=memberSession();if(!s||!s.access_token)throw new Error('Session member tidak tersedia.');
    var fd=new FormData();fd.append('file',file);fd.append('channel_slug','group');
    var res=await fetch('/api/community/upload',{method:'POST',headers:{Authorization:'Bearer '+s.access_token},body:fd});
    var data=await res.json().catch(function(){return null});
    if(!res.ok)throw new Error((data&&(data.error||data.message))||'Upload ke Grup BADAI gagal.');return data
  }
  function clearMentorPending(){
    if(mentorPendingObjectUrl){try{URL.revokeObjectURL(mentorPendingObjectUrl)}catch(_){}}
    mentorPendingObjectUrl='';mentorPendingFile=null;
    var box=el('mentorPendingAttachment');if(box)box.classList.add('hidden');
    var image=el('mentorImageInput'),file=el('mentorFileInput');if(image)image.value='';if(file)file.value=''
  }
  function setMentorPending(file){
    if(!file)return;if(file.size>10*1024*1024){mentorToast('File maksimal 10 MB');return}
    clearMentorPending();mentorPendingFile=file;
    var box=el('mentorPendingAttachment'),preview=el('mentorPendingPreview');
    if(box)box.classList.remove('hidden');
    if(el('mentorPendingName'))el('mentorPendingName').textContent=file.name||'Lampiran';
    if(el('mentorPendingSize'))el('mentorPendingSize').textContent=mentorSize(file.size);
    if(preview){
      if(file.type&&file.type.indexOf('image/')===0){
        mentorPendingObjectUrl=URL.createObjectURL(file);preview.innerHTML='<img src="'+mentorEsc(mentorPendingObjectUrl)+'" alt="">'
      }else preview.textContent='📄'
    }
    el('mentorAttachMenu')&&el('mentorAttachMenu').classList.add('hidden');
    el('mentorMessageInput')&&el('mentorMessageInput').focus()
  }
  function mentorGrowInput(){
    var input=el('mentorMessageInput');if(!input)return;
    input.style.height='38px';input.style.height=Math.min(input.scrollHeight,108)+'px'
  }

  var mentorNav=el('mentorNavButton');
  if(mentorNav)mentorNav.addEventListener('click',function(){
    if(typeof Notification!=='undefined'&&Notification.permission==='default'){try{Notification.requestPermission().catch(function(){})}catch(_){}}
    setMentorView('list');
    setTimeout(function(){bootMentor()},30)
  });

  document.querySelectorAll('#mentor [data-chat-kind]').forEach(function(row){
    row.addEventListener('click',function(){
      mentorSelectedChat=row.getAttribute('data-chat-kind')||'mentor';
      setMentorView('thread')
    })
  });
  var mentorChatBackBtn=el('mentorChatBackBtn');
  if(mentorChatBackBtn)mentorChatBackBtn.addEventListener('click',function(){setMentorView('list')});
  var mentorHeadPerson=document.querySelector('#mentor .mentor-wa-person');
  var mentorHeadAvatar=el('mentorWaAvatar');
  if(mentorHeadPerson)mentorHeadPerson.addEventListener('click',openMentorChatInfo);
  if(mentorHeadAvatar)mentorHeadAvatar.addEventListener('click',openMentorChatInfo);
  var mentorChatSearch=el('mentorChatSearch');
  if(mentorChatSearch)mentorChatSearch.addEventListener('input',function(){
    var q=String(mentorChatSearch.value||'').trim().toLowerCase();
    document.querySelectorAll('#mentor [data-chat-kind]').forEach(function(row){
      row.classList.toggle('hidden',!!q&&!String(row.textContent||'').toLowerCase().includes(q))
    })
  });
  var input=el('mentorMessageInput');
  if(input){
    try{input.value=localStorage.getItem(mentorDraftKey)||''}catch(_){}
    mentorGrowInput();
    input.addEventListener('input',function(){
      mentorGrowInput();mentorTypingPulse();
      if(mentorSelectedChat==='group')updateCommunityMentionPicker();else closeCommunityMentionPicker();
      try{localStorage.setItem(mentorDraftKey,input.value||'')}catch(_){}
    });
    input.addEventListener('keydown',function(e){
      var picker=el('mentorMentionPicker'),open=picker&&!picker.classList.contains('hidden')&&communityMentionState;
      if(open&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
        e.preventDefault();
        var len=communityMentionState.items.length;
        communityMentionIndex=(communityMentionIndex+(e.key==='ArrowDown'?1:-1)+len)%len;
        updateCommunityMentionPicker();return
      }
      if(open&&(e.key==='Enter'||e.key==='Tab')){
        e.preventDefault();chooseCommunityMention(communityMentionIndex);return
      }
      if(open&&e.key==='Escape'){e.preventDefault();closeCommunityMentionPicker();return}
      var coarse=window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;
      if(e.key==='Enter'&&!e.shiftKey&&!coarse){e.preventDefault();mentorForm&&mentorForm.requestSubmit()}
    });
    input.addEventListener('paste',function(e){
      var items=e.clipboardData&&e.clipboardData.items?Array.from(e.clipboardData.items):[];
      var imageItem=items.find(function(x){return x.type&&x.type.indexOf('image/')===0});
      if(imageItem){var file=imageItem.getAsFile();if(file){e.preventDefault();setMentorPending(file)}}
    })
  }
  var mentorForm=el('mentorComposer');
  if(mentorForm)mentorForm.addEventListener('submit',async function(e){
    e.preventDefault();
    var text=String(input&&input.value||'').trim();if(!text&&!mentorPendingFile)return;
    var btn=el('mentorSendBtn');if(btn)btn.disabled=true;
    try{
      if(mentorPendingFile){
        var pending=mentorPendingFile;var note=el('mentorUploadNote');if(note)note.textContent='Mengunggah '+pending.name+'...';
        var messageType=pending.type&&pending.type.indexOf('image/')===0?'image':'file';
        if(mentorSelectedChat==='group'){
          var groupData=await uploadCommunityFile(pending);
          await sendCommunityPayload(messageType,text,null,groupData);
        }else{
          if(!mentorConversationId)await bootMentor();
          var data=await uploadMentorFile(pending);
          await sendMentorPayload(messageType,text,null,data);
        }
        clearMentorPending();if(note)note.textContent=''
      }else if(mentorSelectedChat==='group') await sendCommunityPayload('text',text,null,null);
      else await sendMentorPayload('text',text,null,null);
      if(input){input.value='';mentorGrowInput()}try{localStorage.removeItem(mentorDraftKey)}catch(_){}
    }catch(err){mentorToast(err.message||'Pesan gagal dikirim.')}
    finally{if(btn)btn.disabled=false}
  });
  var stickerBtn=el('mentorStickerBtn'),stickerTray=el('mentorStickerTray');
  if(stickerBtn&&stickerTray)stickerBtn.addEventListener('click',function(){
    stickerTray.classList.toggle('hidden');el('mentorAttachMenu')&&el('mentorAttachMenu').classList.add('hidden')
  });
  document.querySelectorAll('[data-mentor-sticker]').forEach(function(btn){
    btn.addEventListener('click',async function(){
      try{
        var emoji=btn.getAttribute('data-mentor-sticker');
        if(mentorSelectedChat==='group')await sendCommunityPayload('sticker',null,emoji);
        else if(mentorSelectedChat==='mentor')await sendMentorPayload('sticker',null,emoji,null);
        stickerTray&&stickerTray.classList.add('hidden')
      }catch(err){mentorToast(err.message||'Stiker gagal dikirim.')}
    })
  });
  var attachBtn=el('mentorAttachBtn'),attachMenu=el('mentorAttachMenu');
  if(attachBtn&&attachMenu)attachBtn.addEventListener('click',function(){
    attachMenu.classList.toggle('hidden');stickerTray&&stickerTray.classList.add('hidden')
  });
  ['mentorImageInput','mentorFileInput'].forEach(function(id){
    var picker=el(id);if(picker)picker.addEventListener('change',function(){var file=picker.files&&picker.files[0];if(file)setMentorPending(file)})
  });
  el('mentorPendingCancel')&&el('mentorPendingCancel').addEventListener('click',clearMentorPending);
  el('mentorReplyCancel')&&el('mentorReplyCancel').addEventListener('click',clearMentorReply);

  ensureMentorChatManageUi();
  var mentorMoreBtn=el('mentorChatMoreBtn');
  if(mentorMoreBtn)mentorMoreBtn.addEventListener('click',function(e){
    e.stopPropagation();ensureMentorChatManageUi();
    var menu=el('mentorChatManageMenu');if(menu)menu.classList.toggle('hidden')
  });
  var manageMenu=el('mentorChatManageMenu');
  if(manageMenu)manageMenu.addEventListener('click',async function(e){
    var btn=e.target.closest?e.target.closest('[data-chat-manage]'):null;if(!btn)return;
    var action=btn.getAttribute('data-chat-manage');
    try{
      if(action==='clear')await clearCurrentMemberChat();
      if(action==='select'){closeMentorChatManageMenu();mentorChatSelectMode=true;mentorChatSelectedIds.clear();updateMentorChatSelectionUi()}
    }catch(err){mentorToast(err.message||'Gagal mengatur chat.')}
  });
  el('mentorChatSelectCancel')&&el('mentorChatSelectCancel').addEventListener('click',exitMentorChatSelection);
  el('mentorChatDeleteSelected')&&el('mentorChatDeleteSelected').addEventListener('click',async function(){
    try{await deleteSelectedMemberChat()}catch(err){mentorToast(err.message||'Gagal menghapus pesan.')}
  });

  var mentorMessageList=el('mentorMessageList');
  if(mentorMessageList)mentorMessageList.addEventListener('click',async function(e){
    if(mentorChatSelectMode){
      var selectable=e.target.closest?e.target.closest('.mentor-msg[data-message-id]'):null;
      if(selectable){
        e.preventDefault();e.stopPropagation();
        var sid=selectable.getAttribute('data-message-id');
        if(mentorChatSelectedIds.has(sid))mentorChatSelectedIds.delete(sid);else mentorChatSelectedIds.add(sid);
        updateMentorChatSelectionUi();return
      }
    }
    var menuBtn=e.target.closest?e.target.closest('[data-mentor-message-menu]'):null;
    if(menuBtn){e.stopPropagation();openMentorMessageMenu(menuBtn,menuBtn.getAttribute('data-mentor-message-menu'));return}
    var chip=e.target.closest?e.target.closest('[data-mentor-react-chip]'):null;
    if(chip){
      var bubble=chip.closest('[data-message-id]');
      if(bubble){try{await mentorMessageAction(bubble.getAttribute('data-message-id'),'react',chip.getAttribute('data-mentor-react-chip'))}catch(err){mentorToast(err.message||'Reaksi gagal')}}
      return
    }
    var jump=e.target.closest?e.target.closest('[data-mentor-jump-message]'):null;
    if(jump){
      var node=document.getElementById('mentor-msg-'+jump.getAttribute('data-mentor-jump-message'));
      if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.add('mentor-msg-highlight');setTimeout(function(){node.classList.remove('mentor-msg-highlight')},900)}
    }
  });

  document.addEventListener('click',async function(e){
    if(!(e.target.closest&&e.target.closest('#mentorChatManageMenu'))&&!(e.target.closest&&e.target.closest('#mentorChatMoreBtn')))closeMentorChatManageMenu();
    var menu=e.target.closest?e.target.closest('.mentor-message-menu'):null;
    if(menu&&mentorMessageMenu){
      var id=mentorMessageMenu.dataset.messageId;
      var actionNode=e.target.closest?e.target.closest('[data-msg-action]'):null;
      var emojiNode=e.target.closest?e.target.closest('[data-msg-emoji]'):null;
      var action=actionNode?actionNode.getAttribute('data-msg-action'):'';
      var emoji=emojiNode?emojiNode.getAttribute('data-msg-emoji'):'';
      if(action==='reaction'){var picker=mentorMessageMenu.querySelector('.mentor-menu-reactions');if(picker)picker.classList.toggle('hidden');return}
      if(emoji){try{await mentorMessageAction(id,'react',emoji)}catch(err){mentorToast(err.message||'Reaksi gagal')}closeMentorMessageMenu();return}
      if(action){try{await mentorMessageAction(id,action)}catch(err){mentorToast(err.message||'Aksi pesan gagal')}closeMentorMessageMenu();return}
    }
    if(!(e.target.closest&&e.target.closest('[data-mentor-message-menu]')))closeMentorMessageMenu()
  });

  el('mentorJumpLatest')&&el('mentorJumpLatest').addEventListener('click',function(){mentorScrollBottom(true,true)});
  var messageList=el('mentorMessageList');
  if(messageList)messageList.addEventListener('scroll',function(){
    var jump=el('mentorJumpLatest');if(jump)jump.classList.toggle('hidden',mentorNearBottom(messageList))
  });

  function refreshAllChatUnread(){
    if(document.visibilityState!=='visible')return;
    refreshMentorWorkHours(false).catch(function(){});
    refreshMentorOverview().catch(function(){});
    refreshCommunityOverview().catch(function(){});
  }

  mentorPollTimer=setInterval(function(){
    if(document.visibilityState!=='visible')return;

    /* Unread badge is global: update it even while member is on Pemula/Untung/Afiliasi/Akun. */
    refreshAllChatUnread();

    var screen=el('mentor');
    if(screen&&screen.classList.contains('active')){
      touchMentorMemberPresence(false);
      if(mentorView==='thread'&&mentorSelectedChat!=='mentor')loadCommunityMessages(mentorSelectedChat).catch(function(){});
      else if(mentorConversationId)loadMentorMessages().catch(function(){});else bootMentor()
    }
  },2000);

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible')refreshAllChatUnread()
  });
  window.addEventListener('focus',refreshAllChatUnread);

  setTimeout(refreshAllChatUnread,350);
  setTimeout(refreshAllChatUnread,1200);


  setupAffiliateTabs();syncPlanAccess();setTimeout(resolveRealPlan,250);setTimeout(resolveRealPlan,1500);setTimeout(function(){bootAffiliate(0)},350);
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
