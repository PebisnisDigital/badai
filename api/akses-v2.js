module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/akses/index.html`;
    const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Member-Area/1.0' } });

    if (!source.ok) throw new Error(`Gagal memuat member area (${source.status})`);

    let html = await source.text();

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

  /* Sticky footer member area: putih, teks hitam, active/hover pink */
  .footer{
    background:rgba(255,255,255,.98)!important;
    border-top:1px solid #e7e7e7!important;
    box-shadow:0 -8px 24px rgba(0,0,0,.08)!important;
  }
  .footer button{
    background:transparent!important;
    color:#111!important;
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
  }
  .footer .emoji .badai-nav-icon{
    display:block;
    width:17px;
    height:17px;
    object-fit:contain;
  }

  .flaticon-credit{
    margin:8px 0 0;
    text-align:center;
    font:600 7px "Nunito",Arial,sans-serif;
    line-height:1.3;
    opacity:.42;
  }
  .flaticon-credit a{
    color:#aaa;
    text-decoration:none;
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

  document.querySelectorAll('.footer .label').forEach(function(label){
    var text = String(label.textContent || '').trim().toLowerCase();

    if(text === 'cara belajar'){
      var button = label.closest('button');
      var emoji = button ? button.querySelector('.emoji') : null;
      if(emoji){
        emoji.innerHTML = '<img class="badai-nav-icon" src="https://cdn-icons-png.flaticon.com/512/10905/10905175.png" alt="" aria-hidden="true">';
      }
    }

    if(text === 'kelas') label.textContent = 'ILMU';
    if(text === 'jalur untung') label.textContent = 'BONUS';
  });

  if(hero && !document.getElementById('flaticonCredit')){
    var credit = document.createElement('div');
    credit.id = 'flaticonCredit';
    credit.className = 'flaticon-credit';
    credit.innerHTML = '<a href="https://www.flaticon.com/free-icons/htc-one" title="htc one icons" target="_blank" rel="noopener noreferrer">Htc one icons created by iconographics - Flaticon</a>';
    hero.appendChild(credit);
  }
});
</script>`;

    html = html.replace('</head>', headerStyle + '\n</head>');
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
