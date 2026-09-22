module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/akses/index.html`;
    const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Member-Area/1.0' } });

    if (!source.ok) throw new Error(`Gagal memuat member area (${source.status})`);

    let html = await source.text();

    const flaticonUicons = '<link rel="stylesheet" href="https://cdn-uicons.flaticon.com/3.0.0/uicons-regular-rounded/css/uicons-regular-rounded.css">';

    const headerStyle = String.raw`
<style id="badai-member-header-style">
  .hero{display:none!important}
  .guide-steps{display:none!important}

  /* Video Cara Belajar dibuat menyatu di dalam kartu pembuka */
  #carapakai .guide-hero{
    padding-bottom:14px!important;
  }
  #carapakai .guide-hero .guide-video{
    width:100%;
    margin:14px 0 0!important;
    border-radius:17px!important;
    border:1px solid #2b2b2b!important;
    box-shadow:none!important;
    background:#080808!important;
  }

  /* Kartu BAB dibuat lebih clean: cover + nama bahasan saja */
  #chapterGrid .card .meta,
  #chapterGrid .card p,
  #chapterGrid .card .arrow{
    display:none!important;
  }
  #chapterGrid .card h3{
    margin:9px 1px 2px!important;
    line-height:1.2!important;
  }
  #chapterGrid .card{
    padding-bottom:11px!important;
  }

  /* Sticky footer menyatu dengan body hitam; active/hover tetap pink */
  .footer{
    background:rgba(0,0,0,.98)!important;
    border-top:1px solid #1f1f1f!important;
    box-shadow:0 -8px 24px rgba(0,0,0,.18)!important;
  }
  .footer button{
    background:transparent!important;
    color:#fff!important;
  }
  .footer button:hover{
    background:#ff4fa3!important;
    color:#111!important;
  }
  .footer button.active{
    background:#ff4fa3!important;
    color:#111!important;
  }
  .footer .label{
    color:inherit!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:11.2px!important;
    font-weight:600!important;
    line-height:1.05!important;
    letter-spacing:0!important;
  }
  .footer .emoji .fi{
    display:block;
    font-size:17px;
    line-height:1;
    color:currentColor;
  }

  /* Affiliasi selalu terlihat. Paket Pemula dibuat terkunci. */
  .footer #affiliateNavButton.is-affiliate-locked{
    position:relative;
    opacity:.62;
  }
  .footer #affiliateNavButton.is-affiliate-locked::after{
    content:"🔒";
    position:absolute;
    top:5px;
    right:calc(50% - 22px);
    font-size:8px;
    line-height:1;
    filter:saturate(.8);
  }
  .footer #affiliateNavButton.is-affiliate-locked:hover{
    opacity:1;
    background:#ff4fa3!important;
    color:#111!important;
  }

  .badai-upgrade-modal{
    display:none;
    position:fixed;
    inset:0;
    z-index:9999999;
    padding:18px;
    background:rgba(0,0,0,.76);
    align-items:center;
    justify-content:center;
    backdrop-filter:blur(8px);
    -webkit-backdrop-filter:blur(8px);
  }
  .badai-upgrade-modal.open{display:flex}
  .badai-upgrade-card{
    width:min(100%,420px);
    border-radius:22px;
    border:1px solid #303030;
    background:#111;
    padding:21px;
    color:#fff;
    box-shadow:0 28px 80px rgba(0,0,0,.55);
  }
  .badai-upgrade-lock{
    width:48px;
    height:48px;
    border-radius:15px;
    display:grid;
    place-items:center;
    margin-bottom:13px;
    background:#23101a;
    border:1px solid #632c4b;
    font-size:22px;
  }
  .badai-upgrade-kicker{
    color:#ff8fc5;
    font:700 9px "Nunito",Arial,sans-serif;
    letter-spacing:.06em;
  }
  .badai-upgrade-card h2{
    margin:5px 0 8px;
    font:800 24px "Nunito",Arial,sans-serif;
    line-height:1.08;
  }
  .badai-upgrade-card p{
    margin:0;
    color:#aaa;
    font:500 12px "Nunito",Arial,sans-serif;
    line-height:1.55;
  }
  .badai-upgrade-benefit{
    margin:14px 0 0;
    padding:12px 13px;
    border-radius:14px;
    background:#0a0a0a;
    border:1px solid #252525;
    color:#ddd;
    font:500 11px "Nunito",Arial,sans-serif;
    line-height:1.55;
  }
  .badai-upgrade-actions{
    display:grid;
    grid-template-columns:1fr;
    gap:8px;
    margin-top:15px;
  }
  .badai-upgrade-actions a,
  .badai-upgrade-actions button{
    min-height:44px;
    border-radius:13px;
    display:flex;
    align-items:center;
    justify-content:center;
    text-decoration:none;
    font:700 11px "Nunito",Arial,sans-serif;
    cursor:pointer;
  }
  .badai-upgrade-actions a{
    border:0;
    background:#25D366;
    color:#07170d;
  }
  .badai-upgrade-actions button{
    border:1px solid #303030;
    background:#171717;
    color:#ddd;
  }

  .badai-member-header{
    position:sticky;top:0;z-index:80;
    width:100%;
    min-height:64px;
    display:flex;align-items:center;justify-content:space-between;gap:14px;
    padding:10px 14px;
    background:rgba(7,7,7,.96);
    border-bottom:1px solid #242424;
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
  }
  .badai-member-header-logo{
    display:flex;align-items:center;min-width:0;text-decoration:none;
  }
  .badai-member-header-logo img{
    display:block;width:auto;height:34px;max-width:210px;object-fit:contain;
  }
  .badai-member-help{
    flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;
    min-height:40px;padding:0 14px;border-radius:999px;
    background:#25D366;color:#07170d;text-decoration:none;
    font-family:"Raleway",Arial,sans-serif;font-size:10px;font-weight:900;
    letter-spacing:.02em;box-shadow:0 8px 24px rgba(37,211,102,.22);
    border:1px solid rgba(255,255,255,.08);
  }
  .badai-member-help:hover{filter:brightness(1.05)}
  .badai-member-help-icon{font-size:14px;line-height:1}
  @media(max-width:420px){
    .badai-member-header{padding:9px 10px;min-height:58px}
    .badai-member-header-logo img{height:30px;max-width:174px}
    .badai-member-help{min-height:37px;padding:0 11px;font-size:9px}
    #carapakai .guide-hero .guide-video{margin-top:12px!important;border-radius:15px!important}
    .footer .label{font-size:10.8px!important}
  }
</style>`;

    const headerMarkup = String.raw`
<header class="badai-member-header" aria-label="Header Member Area BADAI">
  <a class="badai-member-header-logo" href="/akses" aria-label="BADAI Member Area">
    <img src="https://i.ibb.co.com/j9prt6Xr/BADAI-LOGO-HORIZONTAL-UNDER50-KB-1.webp" alt="BADAI — Belajar Apa Saja Dengan Artificial Intelligence">
  </a>
  <a class="badai-member-help" href="https://wa.me/6281237523626?text=Halo%20Admin%20BADAI%2C%20saya%20butuh%20bantuan%20di%20Member%20Area." target="_blank" rel="noopener noreferrer">
    <span class="badai-member-help-icon">💬</span>
    <span>HUBUNGI ADMIN</span>
  </a>
</header>`;

    const memberEnhancement = String.raw`
<script id="badai-member-layout-enhancement">
document.addEventListener('DOMContentLoaded', function(){
  var hero = document.querySelector('#carapakai .guide-hero');
  var video = document.querySelector('#carapakai .guide-video');
  if(hero && video && video.parentElement !== hero){
    hero.appendChild(video);
  }

  var footerMenus = [
    {match:['cara belajar','aturan'], label:'Aturan', icon:'fi fi-rr-square-1'},
    {match:['kelas','ilmu'], label:'Ilmu', icon:'fi fi-rr-square-2'},
    {match:['jalur untung','bonus'], label:'Bonus', icon:'fi fi-rr-square-3'},
    {match:['afiliasi','affiliasi'], label:'Affiliasi', icon:'fi fi-rr-square-4'},
    {match:['akun'], label:'Akun', icon:'fi fi-rr-square-5'}
  ];

  document.querySelectorAll('.footer .label').forEach(function(label){
    var text = String(label.textContent || '').trim().toLowerCase();
    var menu = footerMenus.find(function(item){ return item.match.indexOf(text) !== -1; });
    if(!menu) return;

    label.textContent = menu.label;

    var button = label.closest('button');
    var emoji = button ? button.querySelector('.emoji') : null;
    if(emoji){
      emoji.innerHTML = '<i class="' + menu.icon + '" aria-hidden="true"></i>';
    }
  });

  function ensureUpgradeModal(){
    var existing = document.getElementById('badaiAffiliateUpgradeModal');
    if(existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'badaiAffiliateUpgradeModal';
    modal.className = 'badai-upgrade-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `
      <div class="badai-upgrade-card" role="dialog" aria-modal="true" aria-labelledby="badaiUpgradeTitle">
        <div class="badai-upgrade-lock">🔒</div>
        <div class="badai-upgrade-kicker">FITUR PAKET UNTUNG</div>
        <h2 id="badaiUpgradeTitle">Affiliasi masih terkunci</h2>
        <p>Menu Affiliasi hanya terbuka untuk member Paket Untung. Upgrade paket supaya kamu bisa mulai memakai program affiliasi BADAI.</p>
        <div class="badai-upgrade-benefit">Dapat link affiliasi pribadi, bahan promosi dari admin, data penjualan, dan komisi dari penjualan yang valid.</div>
        <div class="badai-upgrade-actions">
          <a href="https://wa.me/6281237523626?text=Halo%20Admin%20BADAI%2C%20saya%20member%20Paket%20Pemula%20dan%20ingin%20upgrade%20ke%20Paket%20Untung%20agar%20fitur%20Affiliasi%20terbuka." target="_blank" rel="noopener noreferrer">UPGRADE PAKET UNTUNG</a>
          <button type="button" data-close-upgrade>NANTI DULU</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e){
      if(e.target === modal || e.target.closest('[data-close-upgrade]')){
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
      }
    });

    return modal;
  }

  function openUpgradeModal(){
    var modal = ensureUpgradeModal();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  function isProPlan(){
    var planName = document.getElementById('memberPlanName');
    var text = String(planName ? planName.textContent : '').trim().toUpperCase();
    return text.indexOf('UNTUNG') !== -1;
  }

  var syncBusy = false;
  function syncAffiliateAccess(){
    if(syncBusy) return;
    syncBusy = true;

    try{
      var nav = document.getElementById('affiliateNavButton');
      var footer = document.querySelector('.footer');
      if(!nav) return;

      if(nav.style.display === 'none') nav.style.display = '';
      if(footer && footer.style.getPropertyValue('--member-nav-count') !== '5'){
        footer.style.setProperty('--member-nav-count','5');
      }

      var locked = !isProPlan();
      nav.classList.toggle('is-affiliate-locked', locked);
      nav.setAttribute('aria-disabled', locked ? 'true' : 'false');
      nav.dataset.affiliateLocked = locked ? '1' : '0';
      nav.title = locked ? 'Upgrade ke Paket Untung untuk membuka Affiliasi' : '';
    }finally{
      syncBusy = false;
    }
  }

  document.addEventListener('click', function(e){
    var nav = e.target.closest ? e.target.closest('#affiliateNavButton') : null;
    if(!nav || nav.dataset.affiliateLocked !== '1') return;

    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    openUpgradeModal();
  }, true);

  var planName = document.getElementById('memberPlanName');
  var affiliateNav = document.getElementById('affiliateNavButton');
  var footer = document.querySelector('.footer');

  var observer = new MutationObserver(function(){
    window.requestAnimationFrame(syncAffiliateAccess);
  });

  if(planName) observer.observe(planName,{childList:true,subtree:true,characterData:true});
  if(affiliateNav) observer.observe(affiliateNav,{attributes:true,attributeFilter:['style','class']});
  if(footer) observer.observe(footer,{attributes:true,attributeFilter:['style']});

  syncAffiliateAccess();
  setTimeout(syncAffiliateAccess,250);
  setTimeout(syncAffiliateAccess,900);
});
</script>`;

    html = html.replace('</head>', flaticonUicons + '\n' + headerStyle + '\n</head>');
    html = html.replace('</body>', memberEnhancement + '\n</body>');

    if (html.includes('<div class="app">')) {
      html = html.replace('<div class="app">', '<div class="app">\n' + headerMarkup);
    } else {
      html = html.replace('<body>', '<body>\n' + headerMarkup);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('BADAI member area gagal dimuat: ' + String(error?.message || error));
  }
};
