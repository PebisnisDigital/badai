const landingHandler = require('./landing-v5.js');

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

    const style = String.raw`
<style id="badai-social-proof-v6-style">
#badaiSocialProof{display:none!important}
#badaiSocialProofV6{
  position:fixed;z-index:100060;width:min(370px,calc(100vw - 28px));
  opacity:0;pointer-events:none;transform:translateY(12px) scale(.98);
  transition:opacity .25s ease,transform .25s ease;
  font-family:"Nunito",Arial,sans-serif
}
#badaiSocialProofV6.show{opacity:1;transform:translateY(0) scale(1)}
#badaiSocialProofV6.top-left{top:76px;left:18px}
#badaiSocialProofV6.top-center{top:76px;left:50%;transform:translate(-50%,12px) scale(.98)}
#badaiSocialProofV6.top-center.show{transform:translate(-50%,0) scale(1)}
#badaiSocialProofV6.top-right{top:76px;right:18px}
#badaiSocialProofV6.bottom-left{bottom:20px;left:18px}
#badaiSocialProofV6.bottom-center{bottom:20px;left:50%;transform:translate(-50%,12px) scale(.98)}
#badaiSocialProofV6.bottom-center.show{transform:translate(-50%,0) scale(1)}
#badaiSocialProofV6.bottom-right{bottom:20px;right:18px}
.badai-sp6-card{
  display:flex;align-items:center;gap:11px;padding:12px 13px;
  border:1px solid rgba(255,79,163,.35);border-radius:16px;
  background:rgba(15,12,14,.97);box-shadow:0 18px 50px rgba(0,0,0,.42);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)
}
.badai-sp6-icon{
  width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;
  overflow:hidden;border-radius:13px;background:#ff4fa3;color:#0a0a0a;font-size:21px
}
.badai-sp6-icon img{width:100%;height:100%;object-fit:contain;display:block}
.badai-sp6-copy{min-width:0}
.badai-sp6-copy b{display:block;color:#fff;font-family:"Raleway",Arial,sans-serif;font-size:12px;line-height:1.38;font-weight:800}
.badai-sp6-copy small{display:block;margin-top:3px;color:#8d8d8d;font-size:9px;line-height:1.35}
.badai-sp6-ok{color:#82dda0}.badai-sp6-new{color:#ff9aca}
@media(max-width:520px){
  #badaiSocialProofV6{width:calc(100vw - 24px)}
  #badaiSocialProofV6.top-left,#badaiSocialProofV6.top-right,#badaiSocialProofV6.top-center{top:68px;left:12px;right:12px;transform:translateY(10px) scale(.98)}
  #badaiSocialProofV6.bottom-left,#badaiSocialProofV6.bottom-right,#badaiSocialProofV6.bottom-center{bottom:12px;left:12px;right:12px;transform:translateY(10px) scale(.98)}
  #badaiSocialProofV6.show,#badaiSocialProofV6.top-center.show,#badaiSocialProofV6.bottom-center.show{transform:translateY(0) scale(1)}
}
</style>`;

    const script = String.raw`
<script id="badai-social-proof-v6-script">
(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  let settings = null;
  let feed = [];
  let idx = 0;
  let showTimer = null;
  let hideTimer = null;
  let refreshTimer = null;
  let box = null;

  function planName(plan){ return plan === 'pro' ? 'Paket Untung' : 'Paket Pemula'; }

  function relativeTime(value){
    const time = new Date(value).getTime();
    if(!Number.isFinite(time)) return '';
    const diff = Math.max(0,Date.now()-time);
    const minute=60000,hour=60*minute,day=24*hour,week=7*day,month=30*day,year=365*day;
    if(diff < minute) return 'kurang dari 1 menit yang lalu';
    if(diff < hour) return Math.max(1,Math.floor(diff/minute)) + ' menit yang lalu';
    if(diff < day) return Math.max(1,Math.floor(diff/hour)) + ' jam yang lalu';
    if(diff < week) return Math.max(1,Math.floor(diff/day)) + ' hari yang lalu';
    if(diff < month) return Math.max(1,Math.floor(diff/week)) + ' minggu yang lalu';
    if(diff < year) return Math.max(1,Math.floor(diff/month)) + ' bulan yang lalu';
    return Math.max(1,Math.floor(diff/year)) + ' tahun yang lalu';
  }

  function modalOpen(){ return !!document.getElementById('registrationModal')?.classList.contains('open'); }
  function allowed(){
    if(!settings?.enabled) return false;
    if(settings.target === 'both') return true;
    if(settings.target === 'registration') return modalOpen();
    return !modalOpen();
  }

  function ensureBox(){
    if(box) return box;
    box = document.createElement('div');
    box.id = 'badaiSocialProofV6';
    box.setAttribute('aria-live','polite');
    box.innerHTML = '<div class="badai-sp6-card"><div class="badai-sp6-icon" id="badaiSp6Icon">🔥</div><div class="badai-sp6-copy"><b id="badaiSp6Text"></b><small id="badaiSp6Meta"></small></div></div>';
    document.body.appendChild(box);
    return box;
  }

  function setPosition(){
    const el = ensureBox();
    ['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right'].forEach(c=>el.classList.remove(c));
    el.classList.add(settings?.placement || 'bottom-left');
  }

  function renderIcon(){
    const el = document.getElementById('badaiSp6Icon');
    if(!el) return;
    const fallback = settings?.icon || '🔥';
    const url = String(settings?.icon_url || '').trim();
    el.textContent='';
    if(/^https?:\/\//i.test(url)){
      const img=document.createElement('img');
      img.src=url; img.alt='Icon notifikasi';
      img.onerror=()=>{el.textContent=fallback};
      el.appendChild(img);
    }else el.textContent=fallback;
  }

  function render(item){
    const el = ensureBox();
    setPosition();
    renderIcon();
    const when = relativeTime(item.occurred_at);
    const template = String(settings?.message_template || '[nama] daftar [paket] • [waktu]');
    const text = template
      .split('[nama]').join(item.display_name || 'Member BADAI')
      .split('[paket]').join(planName(item.membership_plan))
      .split('[waktu]').join(when);
    const copy = document.getElementById('badaiSp6Text');
    const meta = document.getElementById('badaiSp6Meta');
    if(copy) copy.textContent=text;
    if(meta){
      if(item.payment_status === 'paid') meta.innerHTML='<span class="badai-sp6-ok">✓ Pembelian terverifikasi</span> • '+when;
      else meta.innerHTML='<span class="badai-sp6-new">◉ Baru mendaftar</span> • '+when;
    }
    el.classList.add('show');
  }

  function hide(){ if(box) box.classList.remove('show'); }
  function schedule(delay){ clearTimeout(showTimer); showTimer=setTimeout(cycle,delay); }

  function cycle(){
    clearTimeout(hideTimer);
    if(!settings?.enabled || !feed.length){ hide(); return; }
    if(!allowed()){ hide(); schedule(700); return; }
    render(feed[idx % feed.length]);
    idx=(idx+1)%feed.length;
    hideTimer=setTimeout(()=>{
      hide();
      schedule(Math.max(2,Number(settings.interval_seconds || 9))*1000);
    },Math.max(2,Number(settings.duration_seconds || 5))*1000);
  }

  async function rpc(name,payload){
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name,{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify(payload || {})
    });
    const data=await r.json().catch(()=>[]);
    if(!r.ok) throw new Error((data && (data.message||data.error)) || ('RPC '+name+' gagal'));
    return data;
  }

  async function load(){
    try{
      const sRows=await rpc('get_social_proof_settings',{});
      settings=Array.isArray(sRows)?sRows[0]:sRows;
      if(!settings?.enabled){ hide(); return; }
      const rows=await rpc('get_social_proof_feed',{p_limit:Number(settings.max_items||20)});
      feed=Array.isArray(rows)?rows:[];
      if(!feed.length){ hide(); return; }
      ensureBox(); setPosition(); schedule(700);

      const modal=document.getElementById('registrationModal');
      if(modal && !modal.__badaiSp6Observed){
        modal.__badaiSp6Observed=true;
        new MutationObserver(()=>{
          if(!allowed()) hide();
          else schedule(250);
        }).observe(modal,{attributes:true,attributeFilter:['class']});
      }
    }catch(err){
      hide();
      console.error('BADAI Social Proof:',err);
    }
  }

  function refresh(){
    clearTimeout(showTimer);clearTimeout(hideTimer);hide();
    settings=null;feed=[];idx=0;load();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();

  window.addEventListener('focus',()=>{ if(document.visibilityState==='visible') refresh(); });
  refreshTimer=setInterval(refresh,60000);
})();
</script>`;


    const registrationModeStyle = String.raw`
<style id="badai-registration-mode-style">
.badai-registration-closed [data-package-select],
.badai-registration-closed .register-submit{
  min-height:78px!important;
  padding:18px 20px!important;
  opacity:1!important;
  filter:none!important;
  cursor:not-allowed!important;
  animation:none!important;
  box-shadow:0 12px 30px rgba(255,79,163,.18)!important;
  font-family:"Raleway",Arial,sans-serif!important;
  font-size:22px!important;
  line-height:1.08!important;
  font-weight:950!important;
  letter-spacing:.025em!important;
  text-align:center!important;
}
.badai-registration-closed #dynamicNewbiePrice,
.badai-registration-closed #dynamicProPrice,
.badai-registration-closed #selectedPackagePrice{
  letter-spacing:.01em!important;
}
#badaiRegistrationClosedNotice{
  margin:14px auto 18px;
  max-width:680px;
  padding:13px 15px;
  border:1px solid #5a2944;
  border-radius:14px;
  background:linear-gradient(135deg,#180d13,#0d0d0d);
  color:#ddd;
  text-align:center;
  font-family:"Nunito",Arial,sans-serif;
  font-size:11px;
  line-height:1.45;
}
#badaiRegistrationClosedNotice b{
  display:block;
  margin-bottom:3px;
  color:#ff86c1;
  font-family:"Raleway",Arial,sans-serif;
  font-size:12px;
  font-weight:900;
}
@media(max-width:560px){
  .badai-registration-closed [data-package-select],
  .badai-registration-closed .register-submit{
    min-height:70px!important;
    padding:16px 14px!important;
    font-size:19px!important;
  }
  #badaiRegistrationClosedNotice{font-size:10.5px;padding:12px 13px}
  #badaiRegistrationClosedNotice b{font-size:11.5px}
}
</style>`;

    const registrationModeScript = String.raw`
<script id="badai-registration-mode-script">
(function(){
  const SUPABASE_URL='https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY='sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  let registrationOpen=true;
  let closedNewbiePrice=0;
  let closedProPrice=0;
  let busy=false;

  function priceMask(amount, fallbackText){
    const numeric = Math.round(Math.abs(Number(amount || 0)));
    let digits = numeric > 0
      ? String(numeric)
      : String(fallbackText || '').replace(/\D/g,'');
    if(!digits) digits='0';
    return 'Rp ' + digits
      .replace(/\B(?=(\d{3})+(?!\d))/g,'.')
      .replace(/\d/g,'x');
  }

  function realPrice(amount){
    return 'Rp' + new Intl.NumberFormat('id-ID',{
      maximumFractionDigits:0
    }).format(Number(amount || 0));
  }

  function ensureClosedNotice(){
    const pricing=document.getElementById('pricing');
    if(!pricing) return;
    let note=document.getElementById('badaiRegistrationClosedNotice');
    if(!note){
      note=document.createElement('div');
      note.id='badaiRegistrationClosedNotice';
      note.innerHTML='<b>PENDAFTARAN SEDANG DITUTUP</b><span>BADAI sedang diperkenalkan lebih dulu. Harga dan tombol pendaftaran akan dibuka kembali saat periode pendaftaran dimulai.</span>';
      const grid=pricing.querySelector('.package-pricing-grid');
      if(grid) grid.insertAdjacentElement('beforebegin',note);
      else pricing.querySelector('.container')?.prepend(note);
    }
    note.style.display=registrationOpen?'none':'block';
  }

  function setTextIfChanged(el,value){
    if(el && el.textContent !== value) el.textContent=value;
  }

  function maskPrices(){
    const newbieEl=document.getElementById('dynamicNewbiePrice');
    const proEl=document.getElementById('dynamicProPrice');
    const selectedEl=document.getElementById('selectedPackagePrice');
    const selectedPlan=document.getElementById('selectedPackage')?.value === 'pro' ? 'pro' : 'newbie';

    if(!registrationOpen){
      setTextIfChanged(newbieEl,priceMask(closedNewbiePrice,newbieEl?.textContent));
      setTextIfChanged(proEl,priceMask(closedProPrice,proEl?.textContent));
      if(selectedEl){
        const selectedAmount=selectedPlan === 'pro' ? closedProPrice : closedNewbiePrice;
        setTextIfChanged(selectedEl,priceMask(selectedAmount,selectedEl.textContent));
      }
    }else{
      if(newbieEl && closedNewbiePrice > 0) setTextIfChanged(newbieEl,realPrice(closedNewbiePrice));
      if(proEl && closedProPrice > 0) setTextIfChanged(proEl,realPrice(closedProPrice));
      if(selectedEl){
        const selectedAmount=selectedPlan === 'pro' ? closedProPrice : closedNewbiePrice;
        if(selectedAmount > 0) setTextIfChanged(selectedEl,realPrice(selectedAmount));
      }
    }

    const advantage=document.getElementById('proPriceAdvantageCopy');
    const smart=document.getElementById('proSmartSaving');

    if(!registrationOpen){
      setTextIfChanged(advantage,'Harga akan diumumkan saat pendaftaran dibuka.');
      setTextIfChanged(smart,'PENDAFTARAN BELUM DIBUKA');
    }else if(closedNewbiePrice > 0 && closedProPrice > 0){
      if(closedNewbiePrice > closedProPrice){
        const saving=realPrice(closedNewbiePrice - closedProPrice);
        setTextIfChanged(advantage,'Lebih lengkap • Hemat ' + saving + ' dibanding Paket Pemula');
        setTextIfChanged(smart,'PALING LENGKAP • HEMAT ' + saving + ' vs PEMULA');
      }else{
        setTextIfChanged(advantage,'Semua materi + jalur cuan + program afiliasi');
        setTextIfChanged(smart,'PAKET PALING LENGKAP');
      }
    }
  }

  function syncButtons(){
    document.querySelectorAll('[data-package-select]').forEach(btn=>{
      btn.disabled=!registrationOpen;
      btn.setAttribute('aria-disabled',registrationOpen?'false':'true');
      if(!btn.dataset.openLabel) btn.dataset.openLabel=btn.textContent.trim();
      btn.textContent=registrationOpen?btn.dataset.openLabel:'PENDAFTARAN BELUM DIBUKA';
    });

    const submit=document.querySelector('.register-submit');
    if(submit){
      if(!submit.dataset.openLabel) submit.dataset.openLabel=submit.textContent.trim();
      submit.disabled=!registrationOpen;
      if(!registrationOpen) submit.textContent='PENDAFTARAN BELUM DIBUKA';
      else if(submit.textContent==='PENDAFTARAN BELUM DIBUKA') submit.textContent=submit.dataset.openLabel;
    }
  }

  function applyMode(){
    document.documentElement.classList.toggle('badai-registration-closed',!registrationOpen);
    ensureClosedNotice();
    syncButtons();
    maskPrices();

    if(!registrationOpen){
      const modal=document.getElementById('registrationModal');
      if(modal?.classList.contains('open')){
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
      }
    }
  }

  async function loadMode(){
    if(busy) return;
    busy=true;
    try{
      const r=await fetch(SUPABASE_URL+'/rest/v1/marketing_public_config?id=eq.1&select=registration_open,newbie_price,pro_price',{
        headers:{apikey:SUPABASE_KEY},
        cache:'no-store'
      });
      if(!r.ok) return;
      const rows=await r.json();
      const config=rows?.[0] || {};
      registrationOpen=config.registration_open!==false;
      closedNewbiePrice=Number(config.newbie_price || 0);
      closedProPrice=Number(config.pro_price || 0);
      window.BADAI_REGISTRATION_OPEN=registrationOpen;
      applyMode();
    }catch(_){
    }finally{
      busy=false;
    }
  }

  document.addEventListener('click',function(e){
    if(registrationOpen) return;
    const trigger=e.target.closest?.('[data-package-select],.register-submit');
    if(!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    applyMode();
  },true);

  document.addEventListener('submit',function(e){
    if(registrationOpen || e.target?.id!=='badaiRegisterForm') return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    applyMode();
  },true);

  const observer=new MutationObserver(()=>{ if(!registrationOpen) maskPrices(); });
  function boot(){
    applyMode();
    loadMode();
    ['dynamicNewbiePrice','dynamicProPrice','selectedPackagePrice'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) observer.observe(el,{childList:true,subtree:true,characterData:true});
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.addEventListener('focus',loadMode);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadMode()});
  setInterval(loadMode,10000);
})();
</script>`;

    body = body.replace('</head>', style + '\n' + registrationModeStyle + '\n</head>');
    body = body.replace('</body>', script + '\n' + registrationModeScript + '\n</body>');

    Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(statusCode).send(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI landing v6 gagal dimuat: ' + String(error?.message || error));
  }
};
