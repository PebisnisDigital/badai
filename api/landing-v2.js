const landingHandler = require('./landing.js');

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

    await landingHandler(req, capture);

    const contentType = String(headers['content-type'] || '');
    if (statusCode >= 400 || !contentType.includes('text/html')) {
      Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
      res.status(statusCode).send(body);
      return;
    }

    const socialStyle = String.raw`
<style id="badai-social-proof-style">
#badaiSocialProof{
  position:fixed;z-index:100050;width:min(360px,calc(100vw - 28px));
  pointer-events:none;opacity:0;transform:translateY(12px) scale(.98);
  transition:opacity .28s ease,transform .28s ease;
  font-family:"Nunito",Arial,sans-serif
}
#badaiSocialProof.show{opacity:1;transform:translateY(0) scale(1)}
#badaiSocialProof.top-left{top:76px;left:18px}
#badaiSocialProof.top-center{top:76px;left:50%;transform:translate(-50%,12px) scale(.98)}
#badaiSocialProof.top-center.show{transform:translate(-50%,0) scale(1)}
#badaiSocialProof.top-right{top:76px;right:18px}
#badaiSocialProof.bottom-left{bottom:20px;left:18px}
#badaiSocialProof.bottom-center{bottom:20px;left:50%;transform:translate(-50%,12px) scale(.98)}
#badaiSocialProof.bottom-center.show{transform:translate(-50%,0) scale(1)}
#badaiSocialProof.bottom-right{bottom:20px;right:18px}
.badai-social-card{
  display:flex;align-items:center;gap:11px;padding:12px 13px;
  border:1px solid rgba(255,79,163,.35);border-radius:16px;
  background:rgba(15,12,14,.96);box-shadow:0 18px 50px rgba(0,0,0,.42);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)
}
.badai-social-icon{
  width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;
  border-radius:13px;background:#ff4fa3;color:#0a0a0a;font-size:21px;
  box-shadow:0 8px 20px rgba(255,79,163,.18)
}
.badai-social-copy{min-width:0}
.badai-social-copy b{display:block;color:#fff;font-family:"Raleway",Arial,sans-serif;font-size:12px;line-height:1.38;font-weight:800}
.badai-social-copy small{display:block;margin-top:3px;color:#888;font-size:9px;line-height:1.3}
.badai-social-verified{color:#82dda0}
@media(max-width:520px){
  #badaiSocialProof{width:calc(100vw - 24px)}
  #badaiSocialProof.top-left,#badaiSocialProof.top-right,#badaiSocialProof.top-center{top:68px;left:12px;right:12px;transform:translateY(10px) scale(.98)}
  #badaiSocialProof.bottom-left,#badaiSocialProof.bottom-right,#badaiSocialProof.bottom-center{bottom:12px;left:12px;right:12px;transform:translateY(10px) scale(.98)}
  #badaiSocialProof.show,#badaiSocialProof.top-center.show,#badaiSocialProof.bottom-center.show{transform:translateY(0) scale(1)}
  .badai-social-card{padding:11px 12px;border-radius:14px}
  .badai-social-icon{width:37px;height:37px;flex-basis:37px;font-size:19px}
}
</style>`;

    const socialScript = String.raw`
<script id="badai-social-proof-script">
(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  let settings = null;
  let feed = [];
  let index = 0;
  let timer = null;
  let hideTimer = null;
  let box = null;

  function planName(plan){ return plan === 'pro' ? 'Paket Untung' : 'Paket Pemula'; }

  function relativeTime(value){
    const time = new Date(value).getTime();
    if(!Number.isFinite(time)) return 'baru saja';
    const diff = Math.max(0, Date.now() - time);
    const minute = 60000, hour = 3600000, day = 86400000;
    if(diff < minute) return 'baru saja';
    if(diff < hour) return Math.max(1,Math.floor(diff/minute)) + ' menit lalu';
    if(diff < day) return Math.max(1,Math.floor(diff/hour)) + ' jam lalu';
    const days = Math.max(1,Math.floor(diff/day));
    return days === 1 ? 'kemarin' : days + ' hari lalu';
  }

  function modalOpen(){
    return !!document.getElementById('registrationModal')?.classList.contains('open');
  }

  function targetAllows(){
    if(!settings?.enabled) return false;
    if(settings.target === 'both') return true;
    if(settings.target === 'registration') return modalOpen();
    return !modalOpen();
  }

  function ensureBox(){
    if(box) return box;
    box = document.createElement('div');
    box.id = 'badaiSocialProof';
    box.setAttribute('aria-live','polite');
    box.innerHTML = '<div class="badai-social-card"><div class="badai-social-icon" id="badaiSocialIcon">🔥</div><div class="badai-social-copy"><b id="badaiSocialText"></b><small id="badaiSocialMeta"></small></div></div>';
    document.body.appendChild(box);
    return box;
  }

  function applyPosition(){
    const el = ensureBox();
    ['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right'].forEach(c => el.classList.remove(c));
    el.classList.add(settings?.placement || 'bottom-left');
  }

  function renderItem(item){
    const el = ensureBox();
    applyPosition();
    const when = relativeTime(item.occurred_at);
    const plan = planName(item.membership_plan);
    const template = String(settings?.message_template || '[nama] baru bergabung di [paket] 🎉');
    const text = template
      .split('[nama]').join(item.display_name || 'Member BADAI')
      .split('[paket]').join(plan)
      .split('[waktu]').join(when);
    const icon = document.getElementById('badaiSocialIcon');
    const copy = document.getElementById('badaiSocialText');
    const meta = document.getElementById('badaiSocialMeta');
    if(icon) icon.textContent = settings?.icon || '🔥';
    if(copy) copy.textContent = text;
    if(meta) meta.innerHTML = '<span class="badai-social-verified">✓ Pembelian terverifikasi</span> • ' + when;
    el.classList.add('show');
  }

  function hide(){ if(box) box.classList.remove('show'); }

  function scheduleNext(delay){
    clearTimeout(timer);
    timer = setTimeout(cycle, delay);
  }

  function cycle(){
    clearTimeout(hideTimer);
    if(!settings?.enabled || !feed.length){ hide(); return; }
    if(!targetAllows()){
      hide();
      scheduleNext(900);
      return;
    }
    const item = feed[index % feed.length];
    index = (index + 1) % feed.length;
    renderItem(item);
    hideTimer = setTimeout(() => {
      hide();
      scheduleNext(Math.max(3,Number(settings.interval_seconds || 9)) * 1000);
    }, Math.max(2,Number(settings.duration_seconds || 5)) * 1000);
  }

  async function load(){
    try{
      const settingsRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_social_proof_settings', {
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:'{}'
      });
      const settingsRows = await settingsRes.json().catch(()=>[]);
      settings = Array.isArray(settingsRows) ? settingsRows[0] : settingsRows;
      if(!settingsRes.ok || !settings?.enabled){ hide(); return; }

      const feedRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_social_proof_feed', {
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({p_limit:Number(settings.max_items || 20)})
      });
      feed = await feedRes.json().catch(()=>[]);
      if(!feedRes.ok || !Array.isArray(feed) || !feed.length){ hide(); return; }

      ensureBox();
      applyPosition();
      scheduleNext(1200);

      const modal = document.getElementById('registrationModal');
      if(modal){
        new MutationObserver(() => {
          if(!targetAllows()) hide();
          else if(!box?.classList.contains('show')) scheduleNext(350);
        }).observe(modal,{attributes:true,attributeFilter:['class']});
      }
    }catch(_){ hide(); }
  }

  function refresh(){
    clearTimeout(timer);clearTimeout(hideTimer);hide();
    settings=null;feed=[];index=0;
    load();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();

  window.addEventListener('focus', () => {
    if(document.visibilityState === 'visible') refresh();
  });
})();
</script>`;

    body = body.replace('</head>', socialStyle + '\n</head>');
    body = body.replace('</body>', socialScript + '\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI landing social proof gagal dimuat: ' + String(error?.message || error));
  }
};
