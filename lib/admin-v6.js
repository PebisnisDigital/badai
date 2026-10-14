// BADAI WA Marketing: a non-destructive layer on the existing Admin v5.
module.exports = function wrapAdmin(upstream) {
  return async function handler(req, res) {
  try {
    let statusCode = 200, body = '';
    const headers = {};
    const capture = {
      setHeader(k,v) { headers[String(k).toLowerCase()] = v; return this; },
      status(v) { statusCode = v; return this; },
      send(v) { body = v == null ? '' : String(v); return this; }
    };
    await upstream(req, capture);
    if(statusCode >= 400 || !String(headers['content-type'] || '').includes('text/html')){
      Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
      return res.status(statusCode).send(body);
    }
    function patch(needle, replacement){
      if(!body.includes(needle)) throw new Error('Admin WA anchor tidak ditemukan: ' + needle.slice(0, 70));
      body = body.replace(needle,replacement);
    }

    const tab = [
      '      <button id="tabWaMarketing" class="admin-tab hidden" data-page="wamarketing" type="button" aria-label="WA Marketing">',
      '        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v13H8l-4 3z"/><path d="M8 10h8M8 13h5"/></svg>',
      '        <span class="nav-label">WA Marketing</span>',
      '      </button>\n'
    ].join('\n');
    patch('      <button id="tabMentor" class="admin-tab',tab+'      <button id="tabMentor" class="admin-tab');

    const page = [
      '<section id="pageWamarketing" class="admin-page hidden">',
      '  <div class="page-title"><div><h2>WA Marketing Automation</h2><p>Channel, Grup, dan Story — satu tujuan: pendaftaran BADAI.</p></div></div>',
      '  <div class="wa-panel-status">',
      '    <div><b id="waStatusLabel">BELUM TERHUBUNG</b><strong id="waStatusHeading">Memeriksa Zawa...</strong><small id="waStatusDetail">Posting dan penjadwalan belum diaktifkan.</small></div>',
      '    <button id="waCheckConnection" type="button" class="secondary">PERIKSA KONEKSI</button>',
      '  </div>',
      '  <nav class="wa-subnav" aria-label="WhatsApp Marketing">',
      '    <button type="button" class="active" data-wa-section="connection">Koneksi WA</button>',
      '    <button type="button" data-wa-section="channel">Channel</button>',
      '    <button type="button" data-wa-section="groups">Grup</button>',
      '    <button type="button" data-wa-section="story">Status WA</button>',
      '    <button type="button" data-wa-section="calendar">Kalender</button>',
      '    <button type="button" data-wa-section="campaigns">Kampanye</button>',
      '    <button type="button" data-wa-section="reports">Laporan</button>',
      '  </nav>',
      '  <div class="wa-content active" data-wa-content="connection">',
      '    <div class="wa-layout">',
      '      <article class="wa-feature-card"><h3>Hubungkan Nomor Marketing</h3>',
      '        <p>Mulai dari satu nomor WhatsApp khusus. Buat sesi Zawa dan pindai kode QR melalui WhatsApp → Perangkat Tertaut.</p>',
      '        <div class="wa-step"><b>1</b><span>Buka Zawa dan buat sesi WhatsApp BADAI.</span></div>',
      '        <div class="wa-step"><b>2</b><span>Scan QR di situs Zawa menggunakan nomor marketing.</span></div>',
      '        <div class="wa-step"><b>3</b><span>Simpan ID sesi sebagai secret Vercel, bukan di chat atau halaman publik.</span></div>',
      '        <div class="wa-actions"><a href="https://zawa.azickri.com/" target="_blank" rel="noopener noreferrer" class="wa-primary-link">BUKA ZAWA ↗</a><a href="https://azickri.gitbook.io/zawa" target="_blank" rel="noopener noreferrer" class="wa-secondary-link">PANDUAN API ↗</a></div>',
      '      </article>',
      '      <article class="wa-feature-card"><h3>Pengaturan Koneksi</h3>',
      '        <p>Di Vercel → Project badai → Settings → Environment Variables, isi dua variabel berikut sebagai secret server.</p>',
      '        <div class="wa-var"><code>ZAWA_ID</code><span id="waIdState">Menunggu</span></div>',
      '        <div class="wa-var"><code>ZAWA_SESSION_ID</code><span id="waSessionState">Menunggu</span></div>',
      '        <div class="wa-alert">Scan QR langsung dari halaman BADAI belum diaktifkan sampai endpoint QR resmi diverifikasi. Status kredensial tersimpan tidak berarti WhatsApp sudah tersambung.</div>',
      '      </article>',
      '    </div>',
      '  </div>',
      '  <div class="wa-content" data-wa-content="channel"><article class="wa-feature-card"><h3>Channel WhatsApp</h3><p>Posting edukasi, cerita member, bukti hasil, dan ajakan bergabung ke Channel yang dikelola BADAI.</p><b class="wa-pending">BELUM AKTIF — MENUNGGU KONEKSI</b></article></div>',
      '  <div class="wa-content" data-wa-content="groups"><article class="wa-feature-card"><h3>Grup WhatsApp</h3><p>Distribusi terjadwal ke grup BADAI dengan antrean, jeda, dan pencegahan posting ganda.</p><b class="wa-pending">BELUM AKTIF — MENUNGGU KONEKSI</b></article></div>',
      '  <div class="wa-content" data-wa-content="story"><article class="wa-feature-card"><h3>Story / Status WhatsApp</h3><p>Konten visual harian untuk memancing rasa penasaran dan mengarahkan calon member ke BADAI.</p><b class="wa-pending">BELUM AKTIF — MENUNGGU KONEKSI</b></article></div>',
      '  <div class="wa-content" data-wa-content="calendar"><article class="wa-feature-card"><h3>Kalender 365 Hari</h3><p>Jadwal publikasi WIB, pengulangan konten, antrian pengiriman dan tombol jeda.</p><b class="wa-pending">SCHEDULER BELUM AKTIF</b></article></div>',
      '  <div class="wa-content" data-wa-content="campaigns"><article class="wa-feature-card"><h3>Kampanye Pendaftaran BADAI</h3><p>Tujuan utama: landing page BADAI → checkout → pembelian. Link tracking per media disiapkan pada tahap berikutnya.</p><a class="wa-secondary-link" target="_blank" rel="noopener noreferrer" href="/">LIHAT LANDING PAGE ↗</a></article></div>',
      '  <div class="wa-content" data-wa-content="reports"><article class="wa-feature-card"><h3>Laporan Aktivitas</h3><p>Riwayat posting, gagal/kirim, klik, dan konversi setelah integrasi dijalankan.</p><b class="wa-pending">BELUM ADA PENGIRIMAN</b></article></div>',
      '</section>'
    ].join('\n');
    patch('    <section id="pageMarketing" class="admin-page hidden">',page+'\n    <section id="pageMarketing" class="admin-page hidden">');

    body = body.replaceAll("return ['sales','finance','marketing','mentor','team'];","return ['sales','finance','marketing','wamarketing','mentor','team'];");
    patch("return ['marketing','mentor','team'];","return ['marketing','wamarketing','mentor','team'];");
    patch(
      "$('tabMarketing').classList.toggle('hidden', !allowed.includes('marketing'));",
      "$('tabMarketing').classList.toggle('hidden', !allowed.includes('marketing'));\n    $('tabWaMarketing').classList.toggle('hidden', !allowed.includes('wamarketing'));"
    );
    patch("marketing:'Marketing BADAI',","marketing:'Marketing BADAI',\n      wamarketing:'WA Marketing BADAI',");
    patch("['sales','finance','marketing','mentor','team'].forEach(name => {","['sales','finance','marketing','wamarketing','mentor','team'].forEach(name => {");
    patch("name === 'marketing' ? $('tabMarketing') :","name === 'marketing' ? $('tabMarketing') :\n        name === 'wamarketing' ? $('tabWaMarketing') :");
    patch("if(page === 'mentor'){\n      loadMentorInbox();","if(page === 'wamarketing' && window.__BADAI_WA_LOAD__) window.__BADAI_WA_LOAD__();\n    if(page === 'mentor'){\n      loadMentorInbox();");

    const css = [
      '<style id="wa-marketing-css">',
      '#pageWamarketing .wa-panel-status{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:15px;border:1px solid #4a3040;border-radius:16px;background:#1c1118;margin:12px 0}',
      '#pageWamarketing .wa-panel-status>div{display:grid;gap:5px}',
      '#pageWamarketing .wa-panel-status b{font-size:10px;font-weight:900;color:#ff83ba;letter-spacing:.07em}',
      '#pageWamarketing .wa-panel-status strong{font-size:14px;color:#fff}',
      '#pageWamarketing .wa-panel-status small{font-size:11px;color:#aaa}',
      '#pageWamarketing .wa-subnav{display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;margin:15px 0;padding-bottom:5px}',
      '#pageWamarketing .wa-subnav button{flex:0 0 auto;border:1px solid #383838;background:#161616;color:#bbb;border-radius:11px;padding:10px 12px;font-size:11px;font-weight:900}',
      '#pageWamarketing .wa-subnav button.active{background:#ff4fa3;border-color:#ff4fa3;color:#080808}',
      '#pageWamarketing .wa-content{display:none}',
      '#pageWamarketing .wa-content.active{display:block}',
      '#pageWamarketing .wa-layout{display:grid;grid-template-columns:1.1fr 1fr;gap:12px}',
      '#pageWamarketing .wa-feature-card{padding:19px;border:1px solid #333;background:#121212;border-radius:17px}',
      '#pageWamarketing .wa-feature-card h3{font-size:16px;margin:0 0 9px}',
      '#pageWamarketing .wa-feature-card p{font-size:12px;color:#aaa;line-height:1.6;margin:0 0 14px}',
      '#pageWamarketing .wa-step{display:flex;align-items:flex-start;gap:12px;margin:11px 0;color:#ddd;font-size:12px}',
      '#pageWamarketing .wa-step b{flex:0 0 22px;height:22px;border-radius:8px;display:grid;place-items:center;background:#472238;color:#ff9ccc}',
      '#pageWamarketing .wa-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:17px}',
      '#pageWamarketing .wa-primary-link,#pageWamarketing .wa-secondary-link{display:inline-flex;align-items:center;padding:11px 13px;border-radius:10px;background:#ff4fa3;color:#080808;font-size:11px;font-weight:900;text-decoration:none}',
      '#pageWamarketing .wa-secondary-link{background:#222;color:#fff;border:1px solid #444}',
      '#pageWamarketing .wa-var{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #393939;border-radius:10px;padding:11px;margin:8px 0}',
      '#pageWamarketing .wa-var code{font-size:12px;color:#eee}',
      '#pageWamarketing .wa-var span{font-size:11px;color:#ff8cc1}',
      '#pageWamarketing .wa-alert{font-size:11px;line-height:1.55;color:#edccdd;background:#281923;border:1px solid #503449;border-radius:10px;padding:12px;margin-top:14px}',
      '#pageWamarketing .wa-pending{color:#ff8cc1;font-size:10px}',
      '@media(max-width:640px){#pageWamarketing .wa-layout{grid-template-columns:1fr}#pageWamarketing .wa-panel-status{flex-direction:column;align-items:flex-start}}',
      '</style>'
    ].join('\n');
    patch('</head>',css+'\n</head>');

    const script = [
      '<script id="badai-wa-marketing">',
      '(function(){',
      "const el=id=>document.getElementById(id);",
      "document.querySelectorAll('[data-wa-section]').forEach(btn=>btn.addEventListener('click',()=>{",
      "  document.querySelectorAll('[data-wa-section]').forEach(x=>x.classList.toggle('active',x===btn));",
      "  document.querySelectorAll('[data-wa-content]').forEach(x=>x.classList.toggle('active',x.dataset.waContent===btn.dataset.waSection));",
      '}));',
      'let busy=false;',
      'window.__BADAI_WA_LOAD__=async function(){',
      '  if(busy)return;',
      '  busy=true;',
      "  el('waStatusHeading').textContent='Memeriksa konfigurasi...';",
      '  try{',
      "    const session=JSON.parse(localStorage.getItem('badai_admin_session')||'null');",
      "    if(!session?.access_token)throw new Error('Sesi admin habis. Login ulang.');",
      "    const response=await fetch('/api/wa-marketing',{cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}});",
      '    const data=await response.json().catch(()=>({}));',
      "    if(!response.ok)throw new Error(data.error||'Gagal memeriksa koneksi.');",
      "    el('waStatusLabel').textContent=data.configured?'TERKONFIGURASI':'BELUM TERHUBUNG';",
      "    el('waStatusHeading').textContent=data.configured?'Kredensial tersedia — perangkat belum diverifikasi':'Belum ada koneksi Zawa';",
      "    el('waStatusDetail').textContent=data.next_step||'Posting tetap tidak aktif';",
      "    el('waIdState').textContent=data.configured?'Tersimpan di server':'Belum diatur';",
      "    el('waSessionState').textContent=data.configured?'Tersimpan di server':'Belum diatur';",
      '  }catch(err){',
      "    el('waStatusLabel').textContent='BELUM DIPASTIKAN';",
      "    el('waStatusHeading').textContent=err.message||'Pemeriksaan gagal';",
      "    el('waStatusDetail').textContent='Tidak ada pesan yang dikirim';",
      '  }finally{busy=false}',
      '};',
      "el('waCheckConnection').addEventListener('click',window.__BADAI_WA_LOAD__);",
      '})();',
      '</script>'
    ].join('\n');
    patch('</body>',script+'\n</body>');
    patch('</body>','<script src="/wa-marketing-admin.js" defer></script>\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    return res.status(statusCode).send(body);
  }catch(error){
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    return res.status(500).send('BADAI Admin WA Marketing gagal dimuat: '+String(error?.message||error));
  }
};
};
