const memberHandler = require('./akses-v2.js');

module.exports = async function handler(req, res) {
  try {
    let statusCode = 200;
    const headers = {};
    let body = '';

    const capture = {
      setHeader(name, value){ headers[String(name).toLowerCase()] = value; return this; },
      status(code){ statusCode = code; return this; },
      send(payload){ body = payload == null ? '' : String(payload); return this; }
    };

    await memberHandler(req, capture);

    const contentType = String(headers['content-type'] || '');
    if (statusCode >= 400 || !contentType.includes('text/html')) {
      Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
      res.status(statusCode).send(body);
      return;
    }

    const style = String.raw`
<style id="badai-affiliate-multilink-style">
  .badai-affiliate-multilink-box{padding:16px!important}
  .badai-affiliate-multilink-box>h2{margin-bottom:5px!important}
  .badai-affiliate-multilink-box>.badai-affiliate-link-intro{
    margin:0 0 12px;color:#aaa;font-size:10px;line-height:1.5
  }
  .badai-affiliate-link-list{display:grid;gap:8px;margin-top:10px}
  .badai-affiliate-link-card{
    padding:12px;border:1px solid #2a2a2a;border-radius:15px;background:#0b0b0b
  }
  .badai-affiliate-link-card.is-featured{border-color:#66324e;background:#160d12}
  .badai-affiliate-link-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .badai-affiliate-link-badge{
    display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border-radius:999px;
    border:1px solid #553047;background:#211018;color:#ff92c7;
    font:800 7px "Nunito",Arial,sans-serif;letter-spacing:.06em
  }
  .badai-affiliate-link-card h3{margin:7px 0 3px;color:#fff;font:800 13px "Raleway",Arial,sans-serif}
  .badai-affiliate-link-card p{margin:0;color:#858585;font:500 9px "Nunito",Arial,sans-serif;line-height:1.45}
  .badai-affiliate-url{
    display:block;margin-top:9px;padding:9px 10px;border-radius:10px;border:1px solid #222;
    background:#050505;color:#d9d9d9;font:600 8px ui-monospace,SFMono-Regular,Menlo,monospace;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis
  }
  .badai-affiliate-link-actions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}
  .badai-affiliate-copy,.badai-affiliate-open,.badai-affiliate-edit-code{
    min-height:38px;border-radius:10px;font:800 9px "Nunito",Arial,sans-serif;cursor:pointer
  }
  .badai-affiliate-copy{border:0;background:#ff4fa3;color:#090909;padding:0 12px}
  .badai-affiliate-open{
    min-width:66px;padding:0 12px;display:flex;align-items:center;justify-content:center;
    border:1px solid #333;background:#151515;color:#fff;text-decoration:none
  }
  .badai-affiliate-copy.copied{background:#25D366;color:#07170d}
  .badai-affiliate-edit-wrap{margin-top:10px;padding-top:10px;border-top:1px solid #242424}
  .badai-affiliate-edit-code{width:100%;border:1px solid #333;background:#111;color:#ddd}
  .badai-affiliate-loading{
    padding:13px;border:1px dashed #333;border-radius:13px;color:#888;text-align:center;
    font:600 9px "Nunito",Arial,sans-serif
  }
  .badai-affiliate-empty{
    padding:13px;border-radius:13px;background:#120d10;border:1px solid #33232b;
    color:#aaa;font:600 9px "Nunito",Arial,sans-serif;line-height:1.5
  }
</style>`;

    const script = String.raw`
<script id="badai-affiliate-multilink-script">
(function(){
  var SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  var STORAGE_KEY = 'badai_member_session';
  var loadedForCode = '';

  function el(id){ return document.getElementById(id); }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')}catch(_){return null}
  }

  async function api(path){
    var session = getSession();
    if(!session || !session.access_token) throw new Error('Sesi member belum siap.');
    var response = await fetch(SUPABASE_URL + path, {
      headers:{
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer ' + session.access_token,
        'Content-Type':'application/json'
      }
    });
    var raw = await response.text();
    var data = null;
    if(raw){try{data=JSON.parse(raw)}catch(_){data=raw}}
    if(!response.ok) throw new Error((data && (data.message || data.error)) || 'Gagal memuat pengaturan link.');
    return data;
  }

  function prepareCard(){
    var legacyLink = el('affiliateLink');
    if(!legacyLink) return null;
    var box = legacyLink.closest ? legacyLink.closest('.affbox') : null;
    if(!box) return null;
    if(box.dataset.multiLinkReady === '1') return box;

    box.dataset.multiLinkReady = '1';
    box.classList.add('badai-affiliate-multilink-box');
    box.innerHTML =
      '<div class="affiliate-pro-pill">PAKET UNTUNG • AKTIF</div>' +
      '<h2>Pilih Link Jualan Kamu</h2>' +
      '<p class="badai-affiliate-link-intro">Mau ajak orang masuk gratis dulu atau langsung jual paket? Pilih link sesuai cara jualanmu.</p>' +
      '<div id="badaiAffiliateLinkChoices" class="badai-affiliate-link-list"><div class="badai-affiliate-loading">Menyiapkan link jualan...</div></div>' +
      '<div id="affiliateLink" class="linkbox" style="display:none">Memuat link afiliasi...</div>' +
      '<div class="badai-affiliate-edit-wrap"><button class="badai-affiliate-edit-code" type="button" id="badaiEditAffiliateCode">EDIT KODE AFFILIASI</button></div>';

    var edit = el('badaiEditAffiliateCode');
    if(edit){
      edit.addEventListener('click', function(){
        if(typeof window.openAffiliateEditor === 'function') window.openAffiliateEditor();
      });
    }
    return box;
  }

  function getAffiliateCode(){
    var code = String(el('affiliateCode') ? el('affiliateCode').textContent : '').trim();
    if(code && code !== '-' && code.toLowerCase().indexOf('memuat') === -1) return code;

    var link = String(window.BADAI_AFFILIATE_LINK || '').trim();
    if(link){
      try{
        var parsed = new URL(link, location.origin);
        var segment = parsed.pathname.split('/').filter(Boolean).pop();
        if(segment) return decodeURIComponent(segment);
      }catch(_){}
    }
    return '';
  }

  function linkFor(code, type){
    var main = location.origin.replace(/\/$/,'') + '/' + encodeURIComponent(code);
    if(type === 'free') return main + '?paket=gratisan';
    if(type === 'newbie') return main + '?paket=pemula';
    if(type === 'pro') return main + '?paket=untung';
    return main;
  }

  function copyText(text, button){
    function success(){
      if(!button) return;
      var old = button.textContent;
      button.textContent = 'TERSALIN ✓';
      button.classList.add('copied');
      setTimeout(function(){ button.textContent = old; button.classList.remove('copied'); },1400);
    }

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(success).catch(function(){ fallbackCopy(text,success); });
      return;
    }
    fallbackCopy(text,success);
  }

  function fallbackCopy(text, done){
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try{document.execCommand('copy'); if(done) done();}catch(_){}
    area.remove();
  }

  function addCard(container, config, code){
    var url = linkFor(code,config.type);
    var card = document.createElement('div');
    card.className = 'badai-affiliate-link-card' + (config.featured ? ' is-featured' : '');

    var top = document.createElement('div');
    top.className = 'badai-affiliate-link-top';
    var badge = document.createElement('span');
    badge.className = 'badai-affiliate-link-badge';
    badge.textContent = config.badge;
    top.appendChild(badge);

    var title = document.createElement('h3');
    title.textContent = config.title;
    var desc = document.createElement('p');
    desc.textContent = config.desc;
    var codeBox = document.createElement('code');
    codeBox.className = 'badai-affiliate-url';
    codeBox.textContent = url;

    var actions = document.createElement('div');
    actions.className = 'badai-affiliate-link-actions';
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'badai-affiliate-copy';
    copy.textContent = 'SALIN LINK';
    copy.addEventListener('click', function(){ copyText(url,copy); });
    var open = document.createElement('a');
    open.className = 'badai-affiliate-open';
    open.href = url;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'BUKA';
    actions.appendChild(copy);
    actions.appendChild(open);

    card.appendChild(top);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(codeBox);
    card.appendChild(actions);
    container.appendChild(card);
  }

  async function renderChoices(code){
    if(!code || loadedForCode === code) return;
    loadedForCode = code;
    var container = el('badaiAffiliateLinkChoices');
    if(!container) return;

    var settings = {
      link_main_enabled:true,
      link_free_enabled:true,
      link_newbie_enabled:true,
      link_pro_enabled:true
    };

    try{
      var rows = await api('/rest/v1/affiliate_settings?id=eq.1&select=link_main_enabled,link_free_enabled,link_newbie_enabled,link_pro_enabled');
      if(rows && rows[0]) settings = Object.assign(settings,rows[0]);
    }catch(err){
      console.warn('BADAI link affiliate: memakai setting default.',err && err.message ? err.message : err);
    }

    var configs = [
      {key:'link_main_enabled',type:'main',badge:'SEMUA PAKET',title:'Link Utama',desc:'Kirim ke LP utama. Calon member bebas memilih Gratisan, Pemula, atau Untung.',featured:true},
      {key:'link_free_enabled',type:'free',badge:'PAKET GRATISAN',title:'Ajak Masuk Gratis Dulu',desc:'Cocok untuk memperbanyak member dan membawa orang masuk komunitas tanpa hambatan.'},
      {key:'link_newbie_enabled',type:'newbie',badge:'PAKET PEMULA',title:'Langsung Jual Paket Pemula',desc:'Gunakan saat konten atau chat kamu memang menawarkan akses belajar Paket Pemula.'},
      {key:'link_pro_enabled',type:'pro',badge:'PAKET UNTUNG',title:'Langsung Jual Paket Untung',desc:'Gunakan untuk calon member yang siap ambil akses lengkap termasuk bonus dan affiliasi.'}
    ];

    container.innerHTML = '';
    var shown = 0;
    configs.forEach(function(config){
      if(settings[config.key] === false) return;
      addCard(container,config,code);
      shown += 1;
    });

    if(!shown){
      container.innerHTML = '<div class="badai-affiliate-empty">Belum ada link jualan yang diaktifkan Admin. Hubungi Admin BADAI.</div>';
    }
  }

  function boot(attempt){
    prepareCard();
    var code = getAffiliateCode();
    if(code){
      renderChoices(code);
      return;
    }
    if((attempt || 0) < 50){
      setTimeout(function(){boot((attempt || 0) + 1);},250);
    }
  }

  function init(){
    setTimeout(function(){boot(0);},250);
    var codeNode = el('affiliateCode');
    if(codeNode && typeof MutationObserver !== 'undefined'){
      new MutationObserver(function(){ loadedForCode=''; boot(0); }).observe(codeNode,{childList:true,subtree:true,characterData:true});
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
</script>`;

    body = body.replace('</head>', style + '\n</head>');
    body = body.replace('</body>', script + '\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI member area v3 gagal dimuat: ' + String(error && error.message ? error.message : error));
  }
};
