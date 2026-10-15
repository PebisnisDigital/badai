/* BADAI Zawa QR pairing: admin-only interface, never stores provider secrets in browser. */
(function(){
'use strict';
const ENDPOINT='https://tlvxlekqrllkvcpgwmic.supabase.co/functions/v1/badai-zawa-connect';
const PUBLISHABLE='sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
const $=id=>document.getElementById(id);
let busy=false;
let active=false;
let watch=null;
let watchDeadline=0;
let lastCheckAt=0;
const WATCH_WINDOW=5*60*1000;

function getToken(){
  let session=null;
  try{session=JSON.parse(localStorage.getItem('badai_admin_session')||'null')}catch(_){}
  if(!session?.access_token)throw Error('Sesi Admin BADAI habis. Silakan login ulang.');
  return session.access_token;
}
function setText(id,v){if($(id))$(id).textContent=v;}
function report(message,error){
  setText('waPairHint',message||'');
  if($('waPairHint'))$('waPairHint').style.color=error?'#ff8989':'#bfa8b4';
}
async function call(action){
  const method=action?'POST':'GET';
  const response=await fetch(ENDPOINT,{
    method,cache:'no-store',signal:AbortSignal.timeout(20000),
    headers:{
      Authorization:'Bearer '+getToken(),apikey:PUBLISHABLE,
      Accept:'application/json',...(action?{'Content-Type':'application/json'}:{})
    },
    body:action?JSON.stringify(action):undefined
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Gagal menghubungkan Zawa.');
  return data;
}
function stopWatch(){
  if(watch){clearTimeout(watch);watch=null}
}
function setWatch(enabled){
  stopWatch();
  if(!enabled){watchDeadline=0;return;}
  if(!watchDeadline)watchDeadline=Date.now()+WATCH_WINDOW;
  const remaining=watchDeadline-Date.now();
  if(remaining<=0){report('Pemeriksaan QR otomatis dijeda setelah 5 menit. Tekan PERIKSA KONEKSI untuk melanjutkan.');return;}
  if(document.hidden || !active || $('pageWamarketing')?.classList.contains('hidden') || !document.querySelector('[data-wa-content="connection"]')?.classList.contains('active'))return;
  watch=setTimeout(()=>refresh(true),Math.min(12000,remaining));
}
function updateStatus(data){
  const state=String(data?.connection_state||'not_created');
  const qr=$('waPairQr'),wrap=$('waQrBox');
  const messages={
    not_created:['BELUM TERHUBUNG','Nomor WhatsApp marketing belum dibuat.'],
    unverified:['BELUM TERVERIFIKASI','Sesi ada, tetapi status WA belum diperiksa.'],
    created:['SESI DIBUAT','Sesi tersimpan. Tunggu QR dari Zawa.'],
    qr_ready:['QR TERSEDIA','Buka WhatsApp di HP → Perangkat tertaut → Tautkan perangkat → Scan QR ini.'],
    waiting_for_qr:['MENUNGGU QR','Zawa belum mengembalikan QR. Perbarui status setelah beberapa saat.'],
    connected:['TERHUBUNG','Nomor WhatsApp berhasil tertaut menurut status sesi Zawa.'],
    not_found:['SESI TIDAK ADA','Sesi tidak ditemukan di Zawa. Buat sesi baru setelah memastikan koneksi lama tidak dipakai.'],
    provider_error:['GAGAL BACA STATUS','Zawa belum dapat memberikan status sesi.'],
    provider_unavailable:['GAGAL MENGHUBUNGI ZAWA','Status atau QR dari Zawa belum dapat dipastikan.']
  };
  const [label,detail]=messages[state]||['STATUS BELUM DIKENAL','Periksa koneksi Zawa.'];
  setText('waStatusLabel',label);
  setText('waStatusHeading',label);
  setText('waStatusDetail',detail);
  setText('waPairState',label);
  $('waPairState')?.classList.toggle('connected',state==='connected');
  $('waPairCreate').hidden=Boolean(data?.exists);
  $('waPairReplace').hidden=!Boolean(data?.exists);
  const source=typeof data?.qr==='string'?data.qr:'';
  const valid=/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(source);
  if(state==='qr_ready'&&valid){
    qr.src=source;qr.hidden=false;wrap.hidden=false;
  }else{
    qr.removeAttribute('src');qr.hidden=true;wrap.hidden=true;
  }
  if(data?.message)report(data.message);
  else report('Koneksi ini memakai layanan Zawa tidak resmi. Untuk keamanan, gunakan nomor khusus marketing.');
  if(state==='qr_ready'||state==='waiting_for_qr'||state==='created')setWatch(true);
  else setWatch(false);
}
async function refresh(silent,force=false){
  if(busy)return;
  if(silent && watchDeadline && Date.now()>=watchDeadline){setWatch(true);return;}
  if(!silent && !force && lastCheckAt && Date.now()-lastCheckAt<15000){setWatch(Boolean(watchDeadline));return;}
  if(!silent)watchDeadline=Date.now()+WATCH_WINDOW;
  lastCheckAt=Date.now();
  busy=true;const button=$('waCheckConnection');
  if(button)button.disabled=true;
  if(!silent)report('Memeriksa status dan QR ke server Zawa...');
  try{
    const result=await call();
    updateStatus(result);
  }catch(error){
    setText('waStatusLabel','TIDAK DAPAT DIPERIKSA');
    setText('waStatusHeading','Status tidak tersedia');
    setText('waStatusDetail',error.message);
    report(error.message,true);
    setWatch(false);
  }finally{
    busy=false;
    if(button)button.disabled=false;
  }
}
async function create(replace){
  if(busy)return;
  if(replace && !confirm('Buat sesi Zawa yang baru? Sesi lama tidak otomatis logout dari WhatsApp. Jika masih tertaut, putuskan terlebih dahulu dari WhatsApp → Perangkat tertaut.'))return;
  busy=true;
  watchDeadline=Date.now()+WATCH_WINDOW;
  const start=$('waPairCreate'),other=$('waPairReplace');
  if(start)start.disabled=true;if(other)other.disabled=true;
  report('Membuat sesi WhatsApp di Zawa...');
  try{
    const result=await call(replace?{action:'replace',confirm:true}:{action:'create'});
    updateStatus(result);
  }catch(error){
    report(error.message,true);
  }finally{
    busy=false;
    if(start)start.disabled=false;if(other)other.disabled=false;
  }
}
function boot(){
  const slot=document.querySelector('[data-wa-content="connection"]');
  if(!slot)return;
  slot.innerHTML=
    '<div class="wa-layout"><article class="wa-feature-card"><h3>Hubungkan WhatsApp lewat QR</h3>'+
    '<p>Scan QR langsung dari dashboard ini menggunakan nomor khusus marketing BADAI. Tidak perlu menyalin ID sesi atau membuka dashboard Zawa.</p>'+
    '<div class="wa-pair-state" id="waPairState">MEMERIKSA...</div>'+
    '<div class="wa-pair-buttons">'+
      '<button type="button" id="waPairCreate" class="wa-primary-link">BUAT QR KONEKSI</button>'+
      '<button type="button" id="waPairReplace" class="wa-secondary-link" hidden>BUAT SESI BARU</button>'+
    '</div>'+
    '<div class="wa-qr-box" id="waQrBox" hidden>'+
      '<img id="waPairQr" alt="QR koneksi WhatsApp BADAI dari Zawa" width="300" height="300" hidden>'+
      '<small>QR ini hanya untuk menghubungkan nomor WA Teh Vini sendiri ke Zawa. Jangan bagikan QR ke orang lain.</small>'+
    '</div>'+
    '<p id="waPairHint" aria-live="polite">Memeriksa koneksi...</p>'+
    '</article><article class="wa-feature-card"><h3>Cara Scan QR</h3>'+
    '<div class="wa-step"><b>1</b><span>Klik <strong>BUAT QR KONEKSI</strong> di sini.</span></div>'+
    '<div class="wa-step"><b>2</b><span>Buka WhatsApp di HP yang ingin digunakan untuk marketing.</span></div>'+
    '<div class="wa-step"><b>3</b><span>Pilih <strong>Perangkat tertaut → Tautkan perangkat</strong>, lalu arahkan kamera ke QR di dashboard.</span></div>'+
    '<div class="wa-step"><b>4</b><span>Status diperiksa setiap 12 detik, maksimal 5 menit. Tekan PERIKSA KONEKSI untuk memeriksa lagi.</span></div>'+
    '<div class="wa-alert">Integrasi ini menggunakan Zawa, layanan pihak ketiga tidak resmi Meta. Sesi dapat terputus dan pemakaian berisiko pembatasan akun WhatsApp. Fitur pengiriman pesan BADAI tetap belum aktif.</div>'+
    '<a href="https://azickri.gitbook.io/zawa/session-api/buat-session" rel="noopener noreferrer" target="_blank" class="wa-secondary-link">PANDUAN ZAWA ↗</a>'+
    '</article></div>';
  const style=document.createElement('style');
  style.textContent=[
    '#pageWamarketing .wa-pair-state{display:inline-flex;padding:8px 13px;border:1px solid #714155;color:#ff9bcc;border-radius:999px;font-size:11px;font-weight:900;margin:5px 0 15px}',
    '#pageWamarketing .wa-pair-state.connected{color:#93e3bb;border-color:#417659}',
    '#pageWamarketing .wa-pair-buttons{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 18px}',
    '#pageWamarketing .wa-pair-buttons button[hidden]{display:none}',
    '#pageWamarketing .wa-qr-box[hidden]{display:none}',
    '#pageWamarketing .wa-qr-box{background:#fff;border-radius:16px;padding:18px;max-width:342px;margin:0 0 15px;display:grid;justify-items:center;gap:8px}',
    '#pageWamarketing .wa-qr-box img{width:min(300px,100%);height:auto;aspect-ratio:1/1;object-fit:contain;display:block}',
    '#pageWamarketing .wa-qr-box small{font-size:10px;color:#222;text-align:center}',
    '#pageWamarketing #waPairHint{font-size:12px;color:#ba9aaa}'
  ].join('\n');
  document.head.appendChild(style);
  $('waPairCreate').addEventListener('click',()=>create(false));
  $('waPairReplace').addEventListener('click',()=>create(true));
  $('waCheckConnection')?.addEventListener('click',()=>refresh(false,true));
  window.__BADAI_WA_LOAD__=()=>{active=true;refresh(false)};
  $('tabWaMarketing')?.addEventListener('click',()=>{active=true;refresh(false)});
  document.querySelectorAll('[data-page]').forEach(btn=>{
    if(btn.dataset.page!=='wamarketing')btn.addEventListener('click',()=>{active=false;stopWatch()});
  });
  document.querySelectorAll('[data-wa-section]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.dataset.waSection!=='connection')stopWatch();
    else if(watchDeadline)setWatch(true);
  }));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopWatch();else if(watchDeadline)setWatch(true);
  });
  window.addEventListener('pagehide',stopWatch);
  window.addEventListener('pageshow',()=>{if(watchDeadline)setWatch(true)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
