module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/akses/index.html`;
    const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Member-Area/1.0' } });

    if (!source.ok) throw new Error(`Gagal memuat member area (${source.status})`);

    let html = await source.text();

    const flaticonUicons = '<link rel="stylesheet" href="https://cdn-uicons.flaticon.com/3.0.0/uicons-regular-rounded/css/uicons-regular-rounded.css">';

    const style = String.raw`
<style id="badai-member-v3-style">
  .hero{display:none!important}

  #chapterGrid .card .meta,
  #chapterGrid .card p,
  #chapterGrid .card .arrow{display:none!important}
  #chapterGrid .card h3{margin:9px 1px 2px!important;line-height:1.2!important}
  #chapterGrid .card{padding-bottom:11px!important}

  .footer{
    background:rgba(0,0,0,.98)!important;
    border-top:1px solid #1f1f1f!important;
    box-shadow:0 -8px 24px rgba(0,0,0,.18)!important;
    grid-template-columns:repeat(5,minmax(0,1fr))!important;
  }
  .footer #affiliateNavButton{display:flex!important}
  .footer button{background:transparent!important;color:#fff!important}
  .footer button:hover,.footer button.active{background:#ff4fa3!important;color:#111!important}
  .footer .label{
    color:inherit!important;
    font-family:"Nunito",Arial,sans-serif!important;
    font-size:11px!important;
    font-weight:600!important;
    line-height:1.05!important;
    letter-spacing:0!important;
  }
  .footer .emoji .fi{display:block;font-size:17px;line-height:1;color:currentColor}
  .footer button.is-plan-locked{position:relative;opacity:.46}
  .footer button.is-plan-locked::after{
    content:"🔒";position:absolute;top:4px;right:calc(50% - 24px);font-size:8px;line-height:1
  }
  .footer button.is-plan-locked:hover{opacity:.72}

  .badai-member-header{
    position:sticky;top:0;z-index:80;width:100%;min-height:64px;
    display:flex;align-items:center;justify-content:space-between;gap:14px;
    padding:10px 14px;background:rgba(7,7,7,.96);border-bottom:1px solid #242424;
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)
  }
  .badai-member-header-logo{display:flex;align-items:center;min-width:0;text-decoration:none}
  .badai-member-header-logo img{display:block;width:auto;height:34px;max-width:210px;object-fit:contain}
  .badai-member-help{
    flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;
    min-height:40px;padding:0 14px;border-radius:999px;background:#25D366;color:#07170d;
    text-decoration:none;font-family:"Nunito",Arial,sans-serif;font-size:10px;font-weight:700;
    box-shadow:0 8px 24px rgba(37,211,102,.22);border:1px solid rgba(255,255,255,.08)
  }

  .community-wrap{display:grid;gap:11px}
  .community-hero{
    position:relative;overflow:hidden;padding:20px;border-radius:24px;
    background:linear-gradient(145deg,#151515,#090909);border:1px solid #282828;
    box-shadow:0 16px 46px rgba(0,0,0,.28)
  }
  .community-hero::after{
    content:"";position:absolute;width:130px;height:130px;border-radius:50%;right:-62px;top:-70px;
    background:rgba(255,79,163,.18);filter:blur(2px)
  }
  .community-kicker{position:relative;z-index:1;color:#ff8fc5;font:700 9px "Nunito",Arial,sans-serif;letter-spacing:.08em}
  .community-hero h1{position:relative;z-index:1;margin:6px 0 7px;color:#fff;font:800 28px "Raleway",Arial,sans-serif;line-height:1.02;letter-spacing:-.045em}
  .community-hero p{position:relative;z-index:1;margin:0;color:#aaa;font:500 11px "Nunito",Arial,sans-serif;line-height:1.5;max-width:470px}
  .community-plan-pill{
    position:relative;z-index:1;display:inline-flex;align-items:center;gap:6px;margin-top:14px;
    min-height:30px;padding:0 11px;border-radius:999px;background:#24101a;border:1px solid #64304c;
    color:#ff91c6;font:700 9px "Nunito",Arial,sans-serif
  }

  .community-wa{
    padding:16px;border-radius:21px;background:#111;border:1px solid #252525;
    display:grid;grid-template-columns:46px 1fr;gap:12px;align-items:center
  }
  .community-wa-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:#0d2818;font-size:23px}
  .community-wa h2{margin:0 0 3px;color:#fff;font:800 16px "Raleway",Arial,sans-serif}
  .community-wa p{margin:0;color:#999;font:500 10px "Nunito",Arial,sans-serif;line-height:1.45}
  .community-wa a{
    grid-column:1/-1;display:flex;align-items:center;justify-content:center;min-height:44px;
    border-radius:13px;background:#25D366;color:#07170d;text-decoration:none;
    font:800 11px "Nunito",Arial,sans-serif
  }

  .community-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .community-card{padding:15px;border-radius:20px;background:#111;border:1px solid #252525}
  .community-card .ico{font-size:22px;margin-bottom:7px}
  .community-card .eyebrow{color:#ff8fc5;font:700 8px "Nunito",Arial,sans-serif;letter-spacing:.06em}
  .community-card h3{margin:4px 0 5px;color:#fff;font:800 14px "Raleway",Arial,sans-serif;line-height:1.15}
  .community-card p{margin:0;color:#949494;font:500 9px "Nunito",Arial,sans-serif;line-height:1.5}

  .community-levels{padding:15px;border-radius:21px;background:#0d0d0d;border:1px solid #242424}
  .community-levels-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}
  .community-levels-head h3{margin:0;color:#fff;font:800 15px "Raleway",Arial,sans-serif}
  .community-levels-head span{color:#777;font:500 9px "Nunito",Arial,sans-serif}
  .community-level-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .community-level{
    min-height:86px;padding:10px;border-radius:15px;background:#151515;border:1px solid #242424;
    display:flex;flex-direction:column;justify-content:space-between
  }
  .community-level.active{border-color:#ff4fa3;background:#201018;box-shadow:0 0 0 1px rgba(255,79,163,.15) inset}
  .community-level small{color:#777;font:700 7px "Nunito",Arial,sans-serif;letter-spacing:.05em}
  .community-level b{display:block;margin-top:4px;color:#fff;font:800 11px "Raleway",Arial,sans-serif;line-height:1.1}
  .community-level span{display:block;margin-top:7px;color:#919191;font:500 8px "Nunito",Arial,sans-serif;line-height:1.35}
  .community-level.active small{color:#ff8fc5}

  .screen-heading{margin-bottom:12px}
  .screen-heading .kicker{color:#ff8fc5;font:700 8px "Nunito",Arial,sans-serif;letter-spacing:.08em}
  .screen-heading h1{margin:4px 0 5px;color:#fff;font:800 25px "Raleway",Arial,sans-serif;letter-spacing:-.04em}
  .screen-heading p{margin:0;color:#999;font:500 10px "Nunito",Arial,sans-serif;line-height:1.45}

  .badai-upgrade-modal{
    display:none;position:fixed;inset:0;z-index:9999999;padding:18px;background:rgba(0,0,0,.80);
    align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)
  }
  .badai-upgrade-modal.open{display:flex}
  .badai-upgrade-card{width:min(100%,420px);border:1px solid #303030;border-radius:22px;background:#111;color:#fff;padding:21px;box-shadow:0 28px 80px rgba(0,0,0,.55)}
  .badai-upgrade-lock{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;margin-bottom:12px;background:#25101a;border:1px solid #65304d;font-size:21px}
  .badai-upgrade-kicker{color:#ff8fc5;font:700 9px "Nunito",Arial,sans-serif;letter-spacing:.05em}
  .badai-upgrade-card h2{margin:5px 0 8px;font:800 23px "Nunito",Arial,sans-serif;line-height:1.08}
  .badai-upgrade-card p{margin:0;color:#aaa;font:500 12px "Nunito",Arial,sans-serif;line-height:1.55}
  .badai-upgrade-benefits{display:grid;gap:7px;margin-top:14px;padding:12px 13px;border-radius:14px;background:#090909;border:1px solid #252525;color:#ddd;font:500 11px "Nunito",Arial,sans-serif}
  .badai-upgrade-actions{display:grid;gap:8px;margin-top:15px}
  .badai-upgrade-actions a,.badai-upgrade-actions button{min-height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;text-decoration:none;font:700 11px "Nunito",Arial,sans-serif;cursor:pointer}
  .badai-upgrade-actions a{border:0;background:#25D366;color:#07170d}
  .badai-upgrade-actions button{border:1px solid #303030;background:#181818;color:#ddd}

  @media(max-width:420px){
    .badai-member-header{padding:9px 10px;min-height:58px}
    .badai-member-header-logo img{height:30px;max-width:174px}
    .badai-member-help{min-height:37px;padding:0 11px;font-size:9px}
    .footer .label{font-size:9.7px!important}
    .community-hero{padding:17px}
    .community-hero h1{font-size:24px}
    .community-two{gap:7px}
    .community-card{padding:12px}
    .community-level{padding:8px;min-height:82px}
  }
</style>`;

    const headerMarkup = String.raw`
<header class="badai-member-header" aria-label="Header Member Area BADAI">
  <a class="badai-member-header-logo" href="/akses" aria-label="BADAI Member Area">
    <img src="https://i.ibb.co.com/j9prt6Xr/BADAI-LOGO-HORIZONTAL-UNDER50-KB-1.webp" alt="BADAI — Belajar Apa Saja Dengan Artificial Intelligence">
  </a>
  <a class="badai-member-help" href="https://wa.me/6281237523626?text=Halo%20Admin%20BADAI%2C%20saya%20butuh%20bantuan%20di%20Member%20Area." target="_blank" rel="noopener noreferrer">
    <span>💬</span><span>HUBUNGI ADMIN</span>
  </a>
</header>`;

    const enhancement = String.raw`
<script id="badai-member-v3-enhancement">
document.addEventListener('DOMContentLoaded', function(){
  var community = document.getElementById('carapakai');
  if(community){
    community.innerHTML =
      '<div class="community-wrap">' +
        '<div class="community-hero">' +
          '<div class="community-kicker">SELAMAT DATANG DI BADAI</div>' +
          '<h1>Belajar bareng, naik level bareng.</h1>' +
          '<p>Mulai dari komunitas, ikuti KulWA rutin, lalu buka lebih banyak akses saat kamu siap naik paket.</p>' +
          '<div class="community-plan-pill">⚡ STATUS: <strong id="communityPlanName">MEMBER PEMULA</strong></div>' +
        '</div>' +
        '<div class="community-wa">' +
          '<div class="community-wa-icon">💬</div>' +
          '<div><h2>Grup WhatsApp BADAI</h2><p>Tempat KulWA, pengumuman, sharing, dan info terbaru dari BADAI.</p></div>' +
          '<a id="communityWhatsappLink" href="https://wa.me/6281237523626?text=Halo%20Admin%20BADAI%2C%20saya%20sudah%20jadi%20member%20dan%20ingin%20masuk%20Grup%20WhatsApp%20BADAI." target="_blank" rel="noopener noreferrer">MASUK GRUP WHATSAPP</a>' +
        '</div>' +
        '<div class="community-two">' +
          '<div class="community-card"><div class="ico">📚</div><div class="eyebrow">KULWA RUTIN</div><h3>Belajar via WhatsApp</h3><p>Jadwal dan materi KulWA diumumkan langsung di grup BADAI.</p></div>' +
          '<div class="community-card"><div class="ico">📣</div><div class="eyebrow">INFO TERBARU</div><h3>Pantau Pengumuman</h3><p>Update kelas, agenda, dan kabar member akan dibagikan melalui komunitas.</p></div>' +
        '</div>' +
        '<div class="community-levels">' +
          '<div class="community-levels-head"><h3>Level Member BADAI</h3><span>Naik paket = makin banyak akses</span></div>' +
          '<div class="community-level-grid">' +
            '<div class="community-level" data-member-level="1"><div><small>LEVEL 1</small><b>GRATISAN</b></div><span>Komunitas + KulWA</span></div>' +
            '<div class="community-level" data-member-level="2"><div><small>LEVEL 2</small><b>PEMULA</b></div><span>Buka semua ILMU</span></div>' +
            '<div class="community-level" data-member-level="3"><div><small>LEVEL 3</small><b>UNTUNG</b></div><span>Ilmu + Bonus + Affiliasi</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  var kelas = document.getElementById('kelas');
  if(kelas && !kelas.querySelector('.screen-heading')){
    kelas.insertAdjacentHTML('afterbegin','<div class="screen-heading"><div class="kicker">PERPUSTAKAAN BADAI</div><h1>Ilmu</h1><p>Kumpulan kelas dan materi AI untuk dipelajari langkah demi langkah.</p></div>');
  }

  var bonus = document.getElementById('jaluruntung');
  if(bonus && !bonus.querySelector('.screen-heading')){
    bonus.insertAdjacentHTML('afterbegin','<div class="screen-heading"><div class="kicker">KHUSUS MEMBER UNTUNG</div><h1>Bonus</h1><p>Materi tambahan dan jalur praktik untuk membantu ilmu BADAI dipakai menghasilkan.</p></div>');
  }

  var footerMenus = [
    {screen:'carapakai', label:'Gratisan', icon:'fi fi-rr-square-1'},
    {screen:'kelas', label:'Pemula', icon:'fi fi-rr-square-2'},
    {screen:'jaluruntung', label:'Untung', icon:'fi fi-rr-square-3'},
    {screen:'afiliasi', label:'Affiliasi', icon:'fi fi-rr-square-4'},
    {screen:'akun', label:'Akun', icon:'fi fi-rr-square-5'}
  ];

  footerMenus.forEach(function(menu){
    var button = document.querySelector('.footer [data-screen="' + menu.screen + '"]');
    if(!button) return;
    var label = button.querySelector('.label');
    var emoji = button.querySelector('.emoji');
    if(label) label.textContent = menu.label;
    if(emoji) emoji.innerHTML = '<i class="' + menu.icon + '" aria-hidden="true"></i>';
  });

  var upgradeModal = null;

  function getPlanLevel(){
    var planName = document.getElementById('memberPlanName');
    var text = String(planName ? planName.textContent : '').trim().toUpperCase();
    if(text.indexOf('UNTUNG') !== -1) return 3;
    if(text.indexOf('GRATIS') !== -1) return 1;
    return 2;
  }

  function planLabel(level){
    if(level >= 3) return 'MEMBER UNTUNG';
    if(level === 1) return 'MEMBER GRATISAN';
    return 'MEMBER PEMULA';
  }

  function getUpgradeModal(){
    if(upgradeModal) return upgradeModal;
    upgradeModal = document.createElement('div');
    upgradeModal.id = 'badaiUpgradeModal';
    upgradeModal.className = 'badai-upgrade-modal';
    upgradeModal.setAttribute('aria-hidden','true');
    upgradeModal.innerHTML =
      '<div class="badai-upgrade-card" role="dialog" aria-modal="true" aria-labelledby="badaiUpgradeTitle">' +
        '<div class="badai-upgrade-lock">🔒</div>' +
        '<div id="badaiUpgradeKicker" class="badai-upgrade-kicker">AKSES TERKUNCI</div>' +
        '<h2 id="badaiUpgradeTitle">Menu ini masih terkunci</h2>' +
        '<p id="badaiUpgradeText">Naik paket untuk membuka akses ini.</p>' +
        '<div id="badaiUpgradeBenefits" class="badai-upgrade-benefits"></div>' +
        '<div class="badai-upgrade-actions">' +
          '<a id="badaiUpgradeButton" href="#" target="_blank" rel="noopener noreferrer">UPGRADE SEKARANG</a>' +
          '<button type="button" data-close-upgrade>NANTI DULU</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(upgradeModal);
    upgradeModal.addEventListener('click', function(e){
      if(e.target === upgradeModal || (e.target.closest && e.target.closest('[data-close-upgrade]'))){
        upgradeModal.classList.remove('open');
        upgradeModal.setAttribute('aria-hidden','true');
      }
    });
    return upgradeModal;
  }

  function openUpgrade(feature, targetPackage){
    var modal = getUpgradeModal();
    var title = modal.querySelector('#badaiUpgradeTitle');
    var text = modal.querySelector('#badaiUpgradeText');
    var benefits = modal.querySelector('#badaiUpgradeBenefits');
    var button = modal.querySelector('#badaiUpgradeButton');
    var target = targetPackage === 'Pemula' ? 'Paket Pemula' : 'Paket Untung';

    if(title) title.textContent = feature + ' masih terkunci';
    if(text) text.textContent = 'Upgrade ke ' + target + ' untuk membuka menu ' + feature + '.';
    if(benefits){
      benefits.innerHTML = targetPackage === 'Pemula'
        ? '<span>✓ Buka seluruh menu ILMU</span><span>✓ Akses kelas dan update materi BADAI</span><span>✓ Tetap dapat Komunitas + KulWA</span>'
        : '<span>✓ BONUS khusus terbuka</span><span>✓ Program Affiliasi aktif</span><span>✓ Link afiliasi + bahan promosi + komisi</span>';
    }
    if(button){
      button.textContent = 'UPGRADE KE ' + target.toUpperCase();
      button.href = 'https://wa.me/6281237523626?text=' + encodeURIComponent('Halo Admin BADAI, saya ingin upgrade ke ' + target + '.');
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  function syncPlanAccess(){
    var level = getPlanLevel();
    var requirements = {kelas:2,jaluruntung:3,afiliasi:3};

    Object.keys(requirements).forEach(function(screen){
      var btn = document.querySelector('.footer [data-screen="' + screen + '"]');
      if(!btn) return;
      var locked = level < requirements[screen];
      btn.classList.toggle('is-plan-locked', locked);
      btn.dataset.planLocked = locked ? '1' : '0';
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    });

    var planText = document.getElementById('communityPlanName');
    if(planText) planText.textContent = planLabel(level);

    document.querySelectorAll('[data-member-level]').forEach(function(card){
      card.classList.toggle('active', Number(card.getAttribute('data-member-level')) === level);
    });

    var activeRestricted = document.querySelector('#kelas.screen.active,#jaluruntung.screen.active,#afiliasi.screen.active');
    if(activeRestricted){
      var activeId = activeRestricted.id;
      var need = requirements[activeId] || 1;
      if(level < need && typeof window.show === 'function') window.show('carapakai');
    }
  }

  document.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('.footer button') : null;
    if(!btn || btn.dataset.planLocked !== '1') return;
    var screen = btn.getAttribute('data-screen');
    if(screen !== 'kelas' && screen !== 'jaluruntung' && screen !== 'afiliasi') return;

    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    if(screen === 'kelas') openUpgrade('Ilmu','Pemula');
    if(screen === 'jaluruntung') openUpgrade('Bonus','Untung');
    if(screen === 'afiliasi') openUpgrade('Affiliasi','Untung');
  }, true);

  var planName = document.getElementById('memberPlanName');
  if(planName && typeof MutationObserver !== 'undefined'){
    new MutationObserver(syncPlanAccess).observe(planName,{childList:true,subtree:true,characterData:true});
  }

  syncPlanAccess();
});
</script>`;

    html = html.replace('</head>', flaticonUicons + '\n' + style + '\n</head>');
    html = html.replace('</body>', enhancement + '\n</body>');

    if (html.includes('<div class="app">')) {
      html = html.replace('<div class="app">', '<div class="app">\n' + headerMarkup);
    } else {
      html = html.replace('<body>', '<body>\n' + headerMarkup);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI member area gagal dimuat: ' + String(error && error.message ? error.message : error));
  }
};
