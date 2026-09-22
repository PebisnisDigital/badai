module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/akses/auth.js`;
    const source = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'BADAI-Member-Auth/1.0' }
    });

    if (!source.ok) {
      throw new Error(`Gagal memuat auth member (${source.status})`);
    }

    const authSource = await source.text();

    const navStability = String.raw`

/* BADAI member nav stability patch */
(function(){
  var style = document.createElement('style');
  style.id = 'badai-member-nav-stability';
  style.textContent = [
    '.footer{grid-template-columns:repeat(5,minmax(0,1fr))!important;}',
    '.footer #affiliateNavButton{display:flex!important;}'
  ].join('');
  document.head.appendChild(style);
})();
`;

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.status(200).send(authSource + navStability);
  } catch (error) {
    res.status(500).setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(`console.error(${JSON.stringify('BADAI member auth gagal dimuat: ' + String(error?.message || error))});`);
  }
};
