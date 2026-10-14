/* BADAI WA Marketing — target catalog and draft campaigns.
   Zawa discovery + sending are NOT enabled. No timers, no auto-publication. */
(function(){
'use strict';
const BASE = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
const KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
const STORAGE = 'badai_admin_session';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog = [], campaigns = [], links = [], planRows = [], selected = null, calendarCampaign = null, busy = false, loaded = false;
const syncFeedback={group:'',channel:''};

function token(){
  let session = null;
  try { session = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch (_) {}
  if(!session || !session.access_token) throw new Error('Silakan login ke Admin BADAI kembali.');
  return session.access_token;
}
async function db(path,method,body){
  const headers = {apikey:KEY,Authorization:'Bearer '+token(),Accept:'application/json'};
  if(method !== 'GET'){
    headers['Content-Type']='application/json';
    headers.Prefer='return=representation';
  }
  const result=await fetch(BASE+'/rest/v1/'+path,{method:method||'GET',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const txt=await result.text();
  let data=null;try{data=txt?JSON.parse(txt):null}catch(_){data=txt}
  if(!result.ok) throw new Error(data?.message||data?.error||'Gagal menyimpan data WA Marketing ('+result.status+').');
  return data;
}
function note(message,isError){
  const el=$('waCampaignMessage');
  if(el){el.textContent=message||'';el.style.color=isError?'#ff8585':'#8ce5af';}
}
async function syncTargets(kind){
  if(busy)return;
  busy=true;
  const btn=document.querySelector('[data-wa-sync="'+kind+'"]');
  if(btn){btn.disabled=true;btn.textContent='MENYINKRONKAN...';}
  syncFeedback[kind]='Meminta daftar '+(kind==='group'?'Grup':'Channel')+' dari Zawa...';
  const msg=document.querySelector('[data-wa-sync-note="'+kind+'"]');
  if(msg)msg.textContent=syncFeedback[kind];
  try{
    const response=await fetch('https://tlvxlekqrllkvcpgwmic.supabase.co/functions/v1/badai-zawa-sync',{
      method:'POST',cache:'no-store',
      headers:{apikey:KEY,Authorization:'Bearer '+token(),'Content-Type':'application/json'},
      body:JSON.stringify({kind})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error((result.error||'Gagal mengambil daftar tujuan.')+
      (result.tested?' Detail pemeriksaan API: '+result.tested:''));
    syncFeedback[kind]='✓ Ditemukan '+result.found+' '+(kind==='group'?'grup':'Channel')+
      ', '+result.added+' baru, '+result.preserved+' sudah ada. '+
      (result.truncated?'Daftar dibatasi; hubungi admin bila ada tujuan yang belum tampil. ':'')+
      'Tujuan baru tidak otomatis diaktifkan.';
    await refresh();
  }catch(error){
    syncFeedback[kind]='✕ '+(error.message||'Sinkronisasi gagal.');
    if(msg){msg.textContent=syncFeedback[kind];msg.style.color='#ff9595';}
    if(btn){btn.disabled=false;btn.textContent='COBA SINKRONKAN LAGI';}
  }finally{busy=false}
}
function renderTarget(kind){
  const root=document.querySelector('[data-wa-content="'+(kind==='group'?'groups':'channel')+'"]');
  if(!root)return;
  const targets=catalog.filter(t=>t.kind===kind);
  root.innerHTML=
    '<div class="wa-feature-card"><h3>'+ (kind==='group'?'Grup WhatsApp':'WhatsApp Channel')+'</h3>'+
    '<p>Ambil daftar nama dan ID '+(kind==='group'?'grup':'Channel')+' langsung dari WhatsApp yang terhubung ke Zawa. Pilih tujuan aktif sesuai kampanye. Jika ada tujuan yang belum ditemukan, masih bisa ditambahkan manual.</p>'+
    '<div class="wa-sync-row"><button type="button" class="wa-primary-link" data-wa-sync="'+kind+'">↻ SINKRONKAN DARI ZAWA</button><small data-wa-sync-note="'+kind+'" aria-live="polite">'+escapeHtml(syncFeedback[kind]||'Tidak mengambil daftar anggota/pesan. Pengiriman otomatis tetap nonaktif.')+'</small></div>'+
    '<form class="wa-target-form" data-wa-target-form="'+kind+'">'+
      '<label>Nama '+(kind==='group'?'grup':'Channel')+'<input name="targetName" maxlength="140" required placeholder="'+(kind==='group'?'BADAI Grup 1':'Channel BADAI')+'"></label>'+
      '<label>ID WhatsApp tujuan<input name="targetId" maxlength="200" minlength="3" required placeholder="'+(kind==='group'?'...@g.us':'...@newsletter')+'"></label>'+
      '<button type="submit" class="wa-primary-link">TAMBAH TUJUAN</button>'+
    '</form>'+
    '<div class="wa-target-list">'+(targets.length?targets.map(t=>
      '<div class="wa-target-item"><div><b>'+escapeHtml(t.name)+'</b>'+
      '<small>'+escapeHtml(t.external_id)+'</small><small>'+(t.origin==='sync'?'Hasil sinkronisasi':'Ditambahkan manual')+'</small></div>'+
      '<div class="wa-target-actions"><label><input type="checkbox" data-wa-enable="'+escapeHtml(t.id)+'" '+(t.enabled?'checked':'')+'> Aktif</label>'+
      '<button type="button" data-wa-remove="'+escapeHtml(t.id)+'" class="wa-danger-button">HAPUS</button></div></div>'
    ).join(''):'<p>Belum ada '+(kind==='group'?'grup':'Channel')+' yang ditambahkan.</p>')+'</div>'+
    '<div class="wa-alert">Tujuan baru dari Zawa disimpan <b>nonaktif</b> sampai Teh Vini mengaktifkan dan memilihnya dalam kampanye. Penyelarasan ini hanya membaca daftar; pengiriman, broadcast, dan scheduler tetap nonaktif.</div></div>';
  root.querySelector('[data-wa-sync]')?.addEventListener('click',()=>syncTargets(kind));
  const form=root.querySelector('[data-wa-target-form]');
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy)return;
    const fd=new FormData(form), name=String(fd.get('targetName')||'').trim(),external=String(fd.get('targetId')||'').trim();
    if(!name||external.length<3)return;
    busy=true;const button=form.querySelector('[type=submit]');button.disabled=true;
    try{
      await db('wa_marketing_targets','POST',{name,external_id:external,kind,origin:'manual',enabled:true});
      await refresh();note('Tujuan berhasil ditambahkan.');
    }catch(error){alert(error.message)}finally{busy=false;button.disabled=false}
  });
  root.querySelectorAll('[data-wa-enable]').forEach(input=>input.addEventListener('change',async()=>{
    input.disabled=true;
    try{await db('wa_marketing_targets?id=eq.'+encodeURIComponent(input.dataset.waEnable),'PATCH',{enabled:input.checked});await db('wa_marketing_delivery_plan?target_id=eq.'+encodeURIComponent(input.dataset.waEnable),'DELETE');await refresh()}
    catch(error){alert(error.message);input.checked=!input.checked}finally{input.disabled=false}
  }));
  root.querySelectorAll('[data-wa-remove]').forEach(button=>button.addEventListener('click',async()=>{
    if(!confirm('Hapus tujuan ini dari katalog dan dari seluruh draft kampanye?'))return;
    button.disabled=true;
    try{await db('wa_marketing_targets?id=eq.'+encodeURIComponent(button.dataset.waRemove),'DELETE');await refresh();note('Tujuan dihapus.')}
    catch(error){alert(error.message)}finally{button.disabled=false}
  }));
}

function renderStory(){
  const root=document.querySelector('[data-wa-content="story"]');
  if(!root)return;
  const target=catalog.find(t=>t.kind==='status');
  root.innerHTML='<article class="wa-feature-card"><h3>Story / Status WhatsApp BADAI</h3>'+
    '<p>Status bisa dijadikan tujuan tersendiri pada setiap kampanye. Nantinya Status menggunakan metode posting khusus Zawa, bukan ID grup/Channel. Pengiriman belum diaktifkan.</p>'+
    '<label class="wa-story-switch"><input type="checkbox" id="waStoryEnabled" '+(target?.enabled?'checked':'')+' '+(target?'':'disabled')+'>'+
      'Sertakan Story sebagai pilihan target kampanye</label>'+
    '<div class="wa-alert">Setelah dicentang, Status WA muncul di pilihan tujuan kampanye. Ini hanya menyimpan rencana. Tidak ada Story dipublikasikan.</div></article>';
  $('waStoryEnabled')?.addEventListener('change',async(event)=>{
    const enabled=event.target.checked;
    event.target.disabled=true;
    try{
      await db('wa_marketing_targets?id=eq.'+encodeURIComponent(target.id),'PATCH',{enabled});
      await db('wa_marketing_delivery_plan?target_id=eq.'+encodeURIComponent(target.id),'DELETE');
      await refresh();
    }catch(error){alert(error.message);await refresh().catch(()=>{})}
  });
}

function selectedLinks(){
  return links.filter(link=>link.campaign_id===selected);
}
function targetsMarkup(){
  const enabled=catalog.filter(t=>t.enabled);
  const chosen=selectedLinks();
  if(!enabled.length)return '<p>Belum ada tujuan aktif. Tambahkan Grup atau Channel terlebih dahulu.</p>';
  return enabled.map(target=>{
    const match=chosen.find(x=>x.target_id===target.id);
    return '<div class="wa-campaign-target"><label><input type="checkbox" data-wa-select="'+escapeHtml(target.id)+'" '+(match?'checked':'')+'>'+
      '<b>'+escapeHtml(target.name)+'</b> <small>'+(target.kind==='group'?'GRUP':target.kind==='status'?'STORY':'CHANNEL')+'</small></label>'+
      '<input aria-label="Jeda khusus '+escapeHtml(target.name)+'" type="number" min="30" max="3600" step="1" data-wa-override="'+escapeHtml(target.id)+'" placeholder="Ikuti jeda kampanye" value="'+(match?.delay_seconds??'')+'">'+
      '</div>';
  }).join('');
}
function renderCampaigns(){
  const root=document.querySelector('[data-wa-content="campaigns"]');if(!root)return;
  root.innerHTML=
  '<div class="wa-layout wa-compose-layout"><article class="wa-feature-card"><h3>Daftar Kampanye</h3>'+
    '<p>Kelola dan edit kampanye BADAI. Pengiriman nyata menunggu API Zawa terverifikasi.</p>'+
    '<div class="wa-campaign-list">'+(campaigns.length?campaigns.map(c=>
      '<button type="button" class="wa-campaign-list-button '+(c.id===selected?'active':'')+'" data-wa-campaign="'+escapeHtml(c.id)+'">'+
      '<b>'+escapeHtml(c.name)+'</b><small>'+Number(c.delay_seconds)+' detik / tujuan · '+(c.status==='paused'?'PAUSE':'DRAFT')+'</small></button>'
    ).join(''):'<p>Belum ada kampanye.</p>')+'</div>'+
    '<button class="wa-secondary-link" type="button" id="waNewCampaign">+ KAMPANYE BARU</button>'+
    '<div class="wa-alert">Konten bisa disiapkan sekarang. Pengiriman nyata belum diaktifkan; tidak ada pesan keluar hanya karena draft disimpan.</div>'+
  '</article><article class="wa-feature-card wa-compose-card"><h3>Pengaturan Pengiriman Kampanye</h3>'+
    '<form id="waCampaignForm" class="wa-campaign-form">'+
      '<label>Nama kampanye (opsional sebagai label internal)<input id="waCampaignName" maxlength="140" required placeholder="Promosi BADAI Hari Jumat"></label>'+
      '<label>Pengirim / perangkat WhatsApp<input id="waSenderDevice" readonly value="WhatsApp BADAI — sesi Zawa" aria-label="Nomor pengirim dari sesi Zawa"></label>'+
      '<label>Jenis tujuan<select id="waRecipientType"><option value="all">Semua tujuan terdaftar</option><option value="group">Grup WhatsApp</option><option value="channel">Channel WhatsApp</option><option value="status">Story / Status WA</option></select></label>'+
      '<div class="wa-campaign-pick"><b>Pilih penerima / tujuan</b><p>Centang tujuan yang dikelola BADAI. Pilihan yang disembunyikan oleh filter tetap tersimpan.</p><div id="waCampaignTargets">'+targetsMarkup()+'</div></div>'+
      '<label>Jenis pesan<select id="waMessageType"><option value="text">Teks</option><option value="media">Teks + Gambar/Video/Dokumen</option></select></label>'+
      '<label>Isi pesan / Caption<textarea id="waCampaignText" rows="7" maxlength="12000" placeholder="Tulis konten promosi dan ajakan bergabung ke BADAI..."></textarea></label>'+
      '<div id="waMediaUploadWrap" class="wa-media-box" hidden><label>File media (JPG, PNG, WEBP, MP4, PDF — maks. 20 MB)<input id="waCampaignFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"></label><small id="waMediaUploadInfo">Media disimpan privat di Supabase ketika draft disimpan.</small></div>'+
      '<label>Link ajakan daftar BADAI (opsional)<input id="waCampaignCta" type="url" placeholder="https://badai.vercel.app"></label>'+
      '<fieldset class="wa-send-mode"><legend>Waktu pengiriman</legend>'+
         '<label><input type="radio" name="waDeliveryMode" value="scheduled" checked> Jadwalkan</label>'+
         '<label><input type="radio" name="waDeliveryMode" value="now_test"> Kirim sekarang</label>'+
       '</fieldset>'+
       '<div id="waCampaignDateWrap"><label>Rencana tanggal & jam (WIB)<input id="waCampaignDate" type="datetime-local"></label></div>'+
       '<p class="wa-mode-help" id="waModeHint">Pilih tanggal dan jam untuk membuat rencana antrean.</p>'+
      '<div class="wa-two-cols" id="waCampaignTimingFields"><label>Delay minimum (detik)<input id="waCampaignDelayMin" type="number" min="30" max="3600" value="30" required></label>'+
      '<label>Delay maksimum (detik)<input id="waCampaignDelayMax" type="number" min="30" max="3600" value="60" required></label></div>'+
      '<label>Status<select id="waCampaignStatus"><option value="draft">DRAFT</option><option value="paused">PAUSE</option></select></label>'+
      '<div class="wa-alert" id="waCampaignPreview">Pratinjau urutan pengiriman akan muncul di sini. Tidak ada posting yang dijalankan.</div>'+
      '<div class="wa-alert"><b>Pengiriman langsung belum aktif:</b> format API Zawa harus diverifikasi sebelum tombol kirim diaktifkan. Simpan dahulu konten, media dan tujuan sebagai DRAFT. Tombol Kirim Sekarang tidak akan mensimulasikan pengiriman.</div>'+
      '<div class="wa-actions"><button type="submit" class="wa-secondary-link" id="waSaveCampaign">SIMPAN KAMPANYE</button>'+
        '<button type="button" id="waSendReal" disabled title="Menunggu verifikasi API kirim Zawa" class="wa-primary-link">KIRIM PESAN — BELUM AKTIF</button>'+
        '<button type="button" class="wa-secondary-link" id="waResetCampaign">BARU</button>'+
        '<button type="button" class="wa-danger-button" id="waDeleteCampaign" '+(selected?'':'disabled')+'>HAPUS</button></div>'+
      '<p id="waCampaignMessage" aria-live="polite"></p>'+
    '</form></article></div>';
  const c=campaigns.find(x=>x.id===selected);
  if(c){
    $('waCampaignName').value=c.name;
    $('waCampaignText').value=c.content_text||'';
    $('waCampaignDate').value=c.scheduled_at?toWibLocal(c.scheduled_at):'';
    $('waCampaignDelayMin').value=String(c.delay_min_seconds??c.delay_seconds??30);
    $('waCampaignDelayMax').value=String(c.delay_max_seconds??Math.max(60,(c.delay_seconds??30)+(c.jitter_seconds??0)));
    $('waMessageType').value=c.message_type==='media'?'media':'text';
    $('waCampaignCta').value=c.cta_url||'';
    $('waMediaUploadInfo').textContent=c.media_path?'Media tersimpan: '+c.media_path.split('/').pop():'Media disimpan privat di Supabase ketika draft disimpan.';
    $('waCampaignStatus').value=c.status;
    const mode=c.delivery_mode==='now_test'?'now_test':'scheduled';
    const input=root.querySelector('input[name="waDeliveryMode"][value="'+mode+'"]');
    if(input)input.checked=true;
  }
  root.querySelectorAll('input[name="waDeliveryMode"]').forEach(input=>input.addEventListener('change',updateDeliveryMode));
  $('waRecipientType').addEventListener('change',updateRecipientFilter);
  $('waMessageType').addEventListener('change',updateMessageType);
  updateRecipientFilter();
  updateMessageType();
  updateDeliveryMode();
  $('waCampaignForm').addEventListener('submit',saveCampaign);
  $('waResetCampaign').addEventListener('click',()=>{selected=null;renderCampaigns()});
  $('waNewCampaign').addEventListener('click',()=>{selected=null;renderCampaigns()});
  $('waDeleteCampaign').addEventListener('click',deleteCampaign);
  root.querySelectorAll('[data-wa-campaign]').forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.waCampaign;renderCampaigns();
  }));
  root.querySelectorAll('[data-wa-select], [data-wa-override]').forEach(input=>input.addEventListener('input',renderPreview));
  ['waCampaignDate','waCampaignDelayMin','waCampaignDelayMax'].forEach(id=>$(id).addEventListener('input',renderPreview));
  renderPreview();
}

function renderCalendar(){
  const root=document.querySelector('[data-wa-content="calendar"]');
  if(!root)return;
  if(!calendarCampaign||!campaigns.some(c=>c.id===calendarCampaign)) calendarCampaign=selected||campaigns[0]?.id||null;
  const rows=planRows.filter(r=>r.campaign_id===calendarCampaign);
  const campaign=campaigns.find(c=>c.id===calendarCampaign);
  const active=rows.filter(r=>r.status==='planned');
  const items=rows.length?rows.map((r,i)=>
    '<div class="wa-plan-item '+(r.status==='cancelled'?'cancelled':'')+'">'+
      '<span class="wa-plan-position">'+(i+1)+'</span><div><b>'+escapeHtml(r.target_name)+'</b>'+
      '<small>'+(r.target_kind==='group'?'GRUP':r.target_kind==='status'?'STORY':'CHANNEL')+' • '+new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(r.send_after))+' WIB</small>'+
      '<small>Jeda: '+r.interval_seconds+' detik • '+(r.status==='planned'?'RENCANA':'DIBATALKAN')+'</small>'+
      '</div></div>'
  ).join(''):'<p>Belum ada rencana antrean untuk kampanye ini.</p>';
  root.innerHTML=
    '<article class="wa-feature-card"><h3>Antrean Pengiriman per Kampanye</h3>'+
    '<p>Susun rencana antrean lengkap dengan jeda dan waktu WIB. Tombol <b>BUAT RENCANA</b> hanya menyimpan rencana, <b>bukan</b> mengirim pesan WhatsApp.</p>'+
    '<div class="wa-plan-toolbar"><label>Pilih kampanye <select id="waCalendarCampaign">'+campaigns.map(c=>'<option value="'+escapeHtml(c.id)+'" '+(c.id===calendarCampaign?'selected':'')+'>'+escapeHtml(c.name)+'</option>').join('')+'</select></label>'+
    '<div class="wa-actions"><button type="button" id="waBuildPlan" class="wa-primary-link" '+(campaign?'':'disabled')+'>BUAT RENCANA</button>'+
    '<button type="button" id="waCancelPlan" class="wa-danger-button" '+(active.length?'':'disabled')+'>BATALKAN RENCANA</button></div></div>'+
    '<div class="wa-alert"><b>Pengiriman: NONAKTIF.</b> Ini adalah rencana antrean dengan isi pesan tersimpan sebagai snapshot. Mesin pengirim dan penghubung Zawa belum diaktifkan.</div>'+
    '<div id="waCalendarMessage" role="status"></div><div class="wa-plan-list">'+items+'</div></article>';
  $('waCalendarCampaign')?.addEventListener('change',event=>{calendarCampaign=event.target.value;renderCalendar()});
  $('waBuildPlan')?.addEventListener('click',async()=>{
    if(busy||!calendarCampaign)return;
    busy=true;
    const button=$('waBuildPlan');button.disabled=true;
    try{
      const result=await db('rpc/wa_marketing_build_plan','POST',{p_campaign_id:calendarCampaign});
      await refresh();
      const state=$('waCalendarMessage');
      if(state)state.textContent=(Array.isArray(result)?result.length:0)+' tujuan berhasil dimasukkan ke RENCANA. Belum ada pesan dikirim.';
    }catch(error){
      if($('waCalendarMessage')){$('waCalendarMessage').textContent=error.message;$('waCalendarMessage').style.color='#ff8d8d'}
    }finally{busy=false;if(button.isConnected)button.disabled=false}
  });
  $('waCancelPlan')?.addEventListener('click',async()=>{
    if(busy||!calendarCampaign)return;
    if(!confirm('Batalkan seluruh rencana antrean kampanye ini?'))return;
    busy=true;
    try{await db('rpc/wa_marketing_cancel_plan','POST',{p_campaign_id:calendarCampaign});await refresh();
      if($('waCalendarMessage'))$('waCalendarMessage').textContent='Rencana antrean telah dibatalkan.';}
    catch(error){if($('waCalendarMessage')){$('waCalendarMessage').textContent=error.message;$('waCalendarMessage').style.color='#ff8d8d'}}
    finally{busy=false}
  });
}
function renderReports(){
  const root=document.querySelector('[data-wa-content="reports"]');if(!root)return;
  const pending=planRows.filter(x=>x.status==='planned').length;
  const cancelled=planRows.filter(x=>x.status==='cancelled').length;
  root.innerHTML='<article class="wa-feature-card"><h3>Laporan WhatsApp Marketing</h3>'+
    '<p>Ringkasan data perencanaan, bukan hasil pengiriman WhatsApp.</p>'+
    '<div class="wa-report-grid">'+
    '<div><small>Target terdaftar</small><strong>'+catalog.length+'</strong></div>'+
    '<div><small>Kampanye draft</small><strong>'+campaigns.length+'</strong></div>'+
    '<div><small>Rencana tujuan</small><strong>'+pending+'</strong></div>'+
    '<div><small>Dibatalkan</small><strong>'+cancelled+'</strong></div></div>'+
    '<div class="wa-alert">Laporan pengiriman, status sukses/gagal, dan konversi BADAI akan tersedia setelah integrasi Zawa dan tracking pembelian diuji. Tidak ada klaim pesan terkirim dari rencana ini.</div></article>';
}

function toWibLocal(iso){
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime()))return '';
  const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  return fmt.format(date).replace(' ','T');
}
function parseWib(value){
  if(!value)return null;
  const ms=Date.parse(value+':00+07:00');
  if(!Number.isFinite(ms))throw new Error('Tanggal/jam WIB tidak valid.');
  return new Date(ms).toISOString();
}
function draftSelections(){
  return Array.from(document.querySelectorAll('[data-wa-select]:checked')).map((input,index)=>{
    const override=document.querySelector('[data-wa-override="'+input.dataset.waSelect+'"]')?.value.trim()||'';
    const delay=override===''?null:Number(override);
    if(delay!==null&&(!Number.isInteger(delay)||delay<30||delay>3600))throw new Error('Delay tujuan harus 30–3600 detik.');
    return {target_id:input.dataset.waSelect,position:index,delay_seconds:delay};
  });
}

function updateRecipientFilter(){
  const kind=$('waRecipientType')?.value||'all';
  document.querySelectorAll('#waCampaignTargets [data-wa-select]').forEach(input=>{
    const target=catalog.find(t=>t.id===input.dataset.waSelect);
    const row=input.closest('.wa-campaign-target');
    if(row)row.hidden=kind!=='all'&&target?.kind!==kind;
  });
}
function updateMessageType(){
  const isMedia=$('waMessageType')?.value==='media';
  if($('waMediaUploadWrap'))$('waMediaUploadWrap').hidden=!isMedia;
  if($('waCampaignFile'))$('waCampaignFile').disabled=!isMedia;
}
async function uploadMedia(file,id){
  const types=['image/jpeg','image/png','image/webp','video/mp4','application/pdf'];
  if(!types.includes(file.type))throw Error('Format media tidak didukung.');
  if(file.size>20*1024*1024)throw Error('Media melebihi 20 MB.');
  const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp',
    'video/mp4':'mp4','application/pdf':'pdf' })[file.type];
  const path='campaigns/'+id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;
  const headers={apikey:KEY,Authorization:'Bearer '+token(),
    'Content-Type':file.type,'x-upsert':'false'};
  const res=await fetch(BASE+'/storage/v1/object/wa-marketing-media/'+path,{
    method:'POST',headers,body:file
  });
  if(!res.ok){
    const j=await res.json().catch(()=>({}));
    throw Error(j.message||j.error||'Media gagal diunggah.');
  }
  return path;
}

function deliveryMode(){
  return document.querySelector('input[name="waDeliveryMode"]:checked')?.value==='now_test'?'now_test':'scheduled';
}
function updateDeliveryMode(){
  const now=deliveryMode()==='now_test';
  const wrap=$('waCampaignDateWrap'),date=$('waCampaignDate'),hint=$('waModeHint'),timing=$('waCampaignTimingFields');
  if(wrap)wrap.hidden=now;
  if(timing)timing.hidden=false;
  if(date){date.required=!now;date.disabled=now;}
  if(hint)hint.textContent=now
    ?'Kirim sekarang dipilih. Pengiriman nyata belum aktif; tombol kirim dikunci sampai API Zawa terverifikasi.'
    :'Pilih tanggal dan jam (WIB). Pengiriman otomatis belum aktif; jadwal baru tersimpan sebagai draft.';
  const save=$('waSaveCampaign');
  if(save)save.textContent='SIMPAN KAMPANYE';
  renderPreview();
}

function renderPreview(){
  const root=$('waCampaignPreview');if(!root)return;
  const delay=Number($('waCampaignDelayMin')?.value||30),max=Number($('waCampaignDelayMax')?.value||60),jitter=Math.max(0,max-delay);
  const isNowTest=deliveryMode()==='now_test';
  let choices=[];
  try{choices=draftSelections()}catch(error){root.textContent=error.message;return}
  if(!choices.length){root.textContent='Belum ada tujuan dipilih. Tidak ada pengiriman yang berjalan.';return}
  let seconds=0;
  root.innerHTML='<b>'+(isNowTest?'Penerima terpilih — belum dikirim:':'Pratinjau urutan rencana:')+'</b><div class="wa-preview-list">'+choices.map((link,index)=>{
    if(index>0) seconds+=(link.delay_seconds??delay);
    const target=catalog.find(t=>t.id===link.target_id);
    const earliest=Math.max(0,seconds);
    const latest=earliest+index*Math.min(120,jitter);
    return '<div>'+(index+1)+'. '+escapeHtml(target?.name||'Tujuan')+
      ' — setelah '+earliest+'–'+latest+' detik dari awal</div>';
  }).join('')+'</div><small>Variasi jeda adalah rentang perencanaan; tidak menjamin keamanan dari pembatasan WhatsApp.</small>';
}
async function refresh(){
  const [targetRows,campaignRows,linkRows,plannedRows]=await Promise.all([
    db('wa_marketing_targets?select=id,kind,external_id,name,origin,enabled&order=name.asc','GET'),
    db('wa_marketing_campaigns?select=id,name,content_text,scheduled_at,delivery_mode,status,delay_seconds,jitter_seconds,delay_min_seconds,delay_max_seconds,message_type,media_path,cta_url&order=created_at.desc','GET'),
    db('wa_marketing_campaign_targets?select=campaign_id,target_id,position,delay_seconds&order=position.asc','GET'),
    db('wa_marketing_delivery_plan?select=campaign_id,target_id,target_name,target_kind,send_after,position,interval_seconds,status&order=send_after.asc','GET')
  ]);
  catalog=Array.isArray(targetRows)?targetRows:[];
  campaigns=Array.isArray(campaignRows)?campaignRows:[];
  links=Array.isArray(linkRows)?linkRows:[];
  planRows=Array.isArray(plannedRows)?plannedRows:[];
  if(selected&&!campaigns.some(c=>c.id===selected))selected=null;
  renderTarget('group');renderTarget('channel');renderStory();renderCampaigns();renderCalendar();renderReports();
  loaded=true;
}
async function saveCampaign(event){
  event.preventDefault();
  if(busy)return;
  let payload,chosen;
  try{
    const name=$('waCampaignName').value.trim();
    if(!name)throw new Error('Nama kampanye wajib diisi.');
    const mode=deliveryMode();
    payload={
      name,
      content_text:$('waCampaignText').value,
      delivery_mode:mode,
      scheduled_at:mode==='now_test'?null:parseWib($('waCampaignDate').value),
      delay_seconds:Number($('waCampaignDelayMin').value),
      jitter_seconds:Number($('waCampaignDelayMax').value)-Number($('waCampaignDelayMin').value),
      delay_min_seconds:Number($('waCampaignDelayMin').value),
      delay_max_seconds:Number($('waCampaignDelayMax').value),
      message_type:$('waMessageType').value,
      cta_url:$('waCampaignCta').value.trim()||null,
      media_path:$('waMessageType').value==='media'?(campaigns.find(c=>c.id===selected)?.media_path||null):null,
      status:$('waCampaignStatus').value
    };
    if(!Number.isInteger(payload.delay_seconds)||payload.delay_seconds<30||payload.delay_seconds>3600)throw new Error('Delay kampanye minimal 30 dan maksimal 3600 detik.');
    if(!Number.isInteger(payload.jitter_seconds)||payload.jitter_seconds<0||payload.jitter_seconds>120)
      throw new Error('Delay maksimum harus di atas minimum, dengan selisih paling banyak 120 detik.');
    if(payload.message_type==='media'&&!$('waCampaignFile').files?.[0]&&!payload.media_path)
      throw new Error('Pilih file media sebelum menyimpan kampanye media.');
    if(payload.cta_url&&!/^https:\/\//i.test(payload.cta_url))throw new Error('Link CTA harus menggunakan HTTPS.');
    chosen=draftSelections();
    if(payload.delivery_mode==='scheduled'&&!payload.scheduled_at)throw new Error('Isi tanggal dan jam WIB, atau pilih Kirim Sekarang (Tes).');
    if(payload.delivery_mode==='now_test'&&chosen.length!==1)throw new Error('Untuk kirim sekarang, pilih tepat SATU tujuan.');
    if(payload.delivery_mode==='now_test'&&!String(payload.content_text||'').trim())throw new Error('Tulis konten sebelum menyimpan.');
  }catch(error){note(error.message,true);return}
  busy=true;$('waSaveCampaign').disabled=true;
  try{
    const isUpdate=Boolean(selected);
    const rows=await db('wa_marketing_campaigns'+(isUpdate?'?id=eq.'+encodeURIComponent(selected):''),isUpdate?'PATCH':'POST',payload);
    const id=isUpdate?selected:rows?.[0]?.id;
    if(!id)throw new Error('Kampanye tersimpan, tetapi ID tidak dikembalikan server.');
    await db('wa_marketing_campaign_targets?campaign_id=eq.'+encodeURIComponent(id),'DELETE');
    if(chosen.length)await db('wa_marketing_campaign_targets','POST',chosen.map(row=>Object.assign({campaign_id:id},row)));
    const mediaFile=$('waCampaignFile')?.files?.[0];
    if(payload.message_type==='media'&&mediaFile){
      const path=await uploadMedia(mediaFile,id);
      await db('wa_marketing_campaigns?id=eq.'+encodeURIComponent(id),'PATCH',{media_path:path});
    }
    // Content, date and target changes invalidate a prior dry-run queue snapshot.
    await db('wa_marketing_delivery_plan?campaign_id=eq.'+encodeURIComponent(id),'DELETE');
    selected=id;
    calendarCampaign=id;
    await refresh();
    note('Kampanye berhasil disimpan sebagai DRAFT. Belum ada pesan dikirim ke WhatsApp.');
  }catch(error){note(error.message,true);await refresh().catch(()=>{})}
  finally{busy=false;if($('waSaveCampaign'))$('waSaveCampaign').disabled=false}
}
async function deleteCampaign(){
  if(!selected||busy)return;
  if(!confirm('Hapus draft kampanye ini beserta pilihan tujuannya?'))return;
  busy=true;
  try{await db('wa_marketing_campaigns?id=eq.'+encodeURIComponent(selected),'DELETE');selected=null;await refresh();note('Kampanye dihapus.')}
  catch(error){note(error.message,true)}finally{busy=false}
}
function attachStyle(){
  const style=document.createElement('style');style.id='wa-campaign-editor-style';
  style.textContent=[
    '#pageWamarketing .wa-target-form,#pageWamarketing .wa-campaign-form{display:grid;gap:11px}',
    '#pageWamarketing .wa-target-form{grid-template-columns:1fr 1fr auto;align-items:end;margin:16px 0}',
    '#pageWamarketing .wa-target-form label,#pageWamarketing .wa-campaign-form label{display:grid;gap:5px;color:#bbb;font-size:11px;font-weight:800}',
    '#pageWamarketing .wa-target-form input,#pageWamarketing .wa-campaign-form input,#pageWamarketing .wa-campaign-form textarea,#pageWamarketing .wa-campaign-form select{min-width:0;width:100%;background:#080808;border:1px solid #383038;border-radius:9px;padding:10px;color:#fff;font-size:12px;font-weight:500}',
    '#pageWamarketing .wa-campaign-form textarea{resize:vertical;font-family:inherit}',
    '#pageWamarketing .wa-target-list{display:grid;gap:7px;margin-top:15px}',
    '#pageWamarketing .wa-sync-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:11px 0 17px}',
    '#pageWamarketing .wa-sync-row small{font-size:11px;color:#bbb;flex:1;min-width:180px;overflow-wrap:anywhere}',
    '#pageWamarketing .wa-target-item{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:11px;border:1px solid #303030;border-radius:11px}',
    '#pageWamarketing .wa-target-item b,#pageWamarketing .wa-target-item small{display:block;overflow-wrap:anywhere}',
    '#pageWamarketing .wa-target-item b{font-size:12px}',
    '#pageWamarketing .wa-target-item small{font-size:10px;color:#888}',
    '#pageWamarketing .wa-target-actions{display:flex;align-items:center;gap:12px;font-size:11px}',
    '#pageWamarketing .wa-danger-button{border:1px solid #7d3741;border-radius:9px;background:#2a1419;color:#ffacb2;padding:10px 12px;cursor:pointer;font-size:10px;font-weight:900}',
    '#pageWamarketing .wa-danger-button:disabled{opacity:.3;cursor:not-allowed}',
    '#pageWamarketing .wa-campaign-list{display:grid;gap:7px;margin:14px 0}',
    '#pageWamarketing .wa-campaign-list-button{border:1px solid #333;background:#171717;color:#fff;text-align:left;padding:12px;border-radius:11px;display:grid;gap:4px;cursor:pointer}',
    '#pageWamarketing .wa-campaign-list-button.active{border-color:#ff4fa3}',
    '#pageWamarketing .wa-campaign-list-button b{font-size:12px}',
    '#pageWamarketing .wa-campaign-list-button small{font-size:10px;color:#aaa}',
    '#pageWamarketing .wa-two-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '#pageWamarketing .wa-compose-layout{grid-template-columns:minmax(180px,.62fr) minmax(0,1.55fr)}',
    '#pageWamarketing .wa-compose-card{padding:20px}',
    '#pageWamarketing .wa-media-box{border:1px dashed #78445d;border-radius:12px;padding:13px;background:#1a1117}',
    '#pageWamarketing .wa-media-box[hidden]{display:none}',
    '#pageWamarketing .wa-media-box small{font-size:10px;color:#c8a8ba}',
    '#pageWamarketing [data-wa-content="campaigns"] button:disabled{opacity:.5;cursor:not-allowed}',
    '#pageWamarketing .wa-campaign-target[hidden]{display:none}',

    '#pageWamarketing .wa-send-mode{border:1px solid #393039;border-radius:12px;padding:12px;display:flex;gap:16px;flex-wrap:wrap;align-items:center}',
    '#pageWamarketing .wa-send-mode legend{color:#ddd;font-size:11px;font-weight:900;padding:0 5px}',
    '#pageWamarketing .wa-send-mode label{display:flex;flex-direction:row;align-items:center;gap:7px;font-size:12px;color:#eee;cursor:pointer}',
    '#pageWamarketing .wa-send-mode input{width:auto;min-width:unset;accent-color:#ff4fa3}',
    '#pageWamarketing #waCampaignDateWrap[hidden],#pageWamarketing #waCampaignTimingFields[hidden]{display:none}',
    '#pageWamarketing .wa-mode-help{font-size:11px;color:#aaa;line-height:1.5;margin:0}',
    '#pageWamarketing .wa-campaign-pick{padding:12px;border:1px solid #333;border-radius:12px}',
    '#pageWamarketing .wa-campaign-pick>b{font-size:12px}',
    '#pageWamarketing .wa-campaign-pick p{font-size:10px;margin:3px 0 12px}',
    '#pageWamarketing .wa-campaign-target{display:grid;grid-template-columns:1fr 135px;gap:10px;align-items:center;margin:7px 0}',
    '#pageWamarketing .wa-campaign-target label{display:flex;align-items:center;gap:6px}',
    '#pageWamarketing .wa-campaign-target label input{width:auto}',
    '#pageWamarketing .wa-campaign-target small{font-size:9px;color:#ff9aca}',
    '#pageWamarketing .wa-preview-list{margin:8px 0;font-size:11px;line-height:1.8}',
    '#pageWamarketing .wa-story-switch{display:flex;align-items:center;gap:9px;font-size:12px;color:#fff;font-weight:900}',
    '#pageWamarketing .wa-plan-toolbar{display:flex;gap:12px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap}',
    '#pageWamarketing .wa-plan-toolbar label{display:grid;gap:5px;font-size:11px;color:#aaa}',
    '#pageWamarketing .wa-plan-toolbar select{background:#0a0a0a;color:#fff;padding:10px;border:1px solid #333;border-radius:10px;max-width:100%}',
    '#pageWamarketing .wa-plan-list{display:grid;gap:8px;margin-top:14px}',
    '#pageWamarketing .wa-plan-item{display:flex;gap:12px;align-items:center;padding:11px;border:1px solid #303030;border-radius:11px}',
    '#pageWamarketing .wa-plan-item.cancelled{opacity:.55}',
    '#pageWamarketing .wa-plan-position{width:27px;height:27px;background:#352037;color:#ff9ccb;border-radius:9px;display:grid;place-items:center;font-weight:900}',
    '#pageWamarketing .wa-plan-item b,#pageWamarketing .wa-plan-item small{display:block}',
    '#pageWamarketing .wa-plan-item b{font-size:12px}',
    '#pageWamarketing .wa-plan-item small{font-size:10px;color:#999}',
    '#pageWamarketing .wa-report-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}',
    '#pageWamarketing .wa-report-grid>div{padding:13px;border:1px solid #353535;border-radius:11px;display:grid;gap:5px}',
    '#pageWamarketing .wa-report-grid small{color:#999;font-size:10px}',
    '#pageWamarketing .wa-report-grid strong{font-size:23px}',
    '@media(max-width:600px){#pageWamarketing .wa-report-grid{grid-template-columns:repeat(2,1fr)}}',
    '@media(max-width:750px){#pageWamarketing .wa-target-form{grid-template-columns:1fr}#pageWamarketing .wa-campaign-target{grid-template-columns:1fr}#pageWamarketing .wa-target-item{flex-direction:column;align-items:stretch}}'
  ].join('\n');
  document.head.appendChild(style);
}
function bootstrap(){
  if(!$('tabWaMarketing'))return;
  attachStyle();
  const tab=$('tabWaMarketing');
  const load=()=>{if(!loaded)refresh().catch(error=>alert(error.message))};
  tab.addEventListener('click',load);
  document.querySelectorAll('[data-wa-section]').forEach(btn=>btn.addEventListener('click',load));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap);else bootstrap();
})();
