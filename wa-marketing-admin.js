/* BADAI WA Marketing — target catalog and draft campaigns.
   Zawa discovery + sending are NOT enabled. No timers, no auto-publication. */
(function(){
'use strict';
const BASE = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
const KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
const STORAGE = 'badai_admin_session';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog = [], campaigns = [], links = [], selected = null, busy = false, loaded = false;

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
function renderTarget(kind){
  const root=document.querySelector('[data-wa-content="'+(kind==='group'?'groups':'channel')+'"]');
  if(!root)return;
  const targets=catalog.filter(t=>t.kind===kind);
  root.innerHTML=
    '<div class="wa-feature-card"><h3>'+ (kind==='group'?'Grup WhatsApp':'WhatsApp Channel')+'</h3>'+
    '<p><b>Daftar otomatis:</b> belum tersedia melalui endpoint Zawa yang terdokumentasi. Untuk sementara, masukkan tujuan milik BADAI dari ID yang valid. Hanya tujuan yang terdaftar yang bisa dipilih dalam draft kampanye.</p>'+
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
    '<div class="wa-alert">Sinkronisasi otomatis, pengiriman dan broadcast <b>belum diaktifkan</b>. ID yang dimasukkan belum diverifikasi terhadap WhatsApp.</div></div>';
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
    try{await db('wa_marketing_targets?id=eq.'+encodeURIComponent(input.dataset.waEnable),'PATCH',{enabled:input.checked});await refresh()}
    catch(error){alert(error.message);input.checked=!input.checked}finally{input.disabled=false}
  }));
  root.querySelectorAll('[data-wa-remove]').forEach(button=>button.addEventListener('click',async()=>{
    if(!confirm('Hapus tujuan ini dari katalog dan dari seluruh draft kampanye?'))return;
    button.disabled=true;
    try{await db('wa_marketing_targets?id=eq.'+encodeURIComponent(button.dataset.waRemove),'DELETE');await refresh();note('Tujuan dihapus.')}
    catch(error){alert(error.message)}finally{button.disabled=false}
  }));
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
      '<b>'+escapeHtml(target.name)+'</b> <small>'+(target.kind==='group'?'GRUP':'CHANNEL')+'</small></label>'+
      '<input aria-label="Jeda khusus '+escapeHtml(target.name)+'" type="number" min="30" max="3600" step="1" data-wa-override="'+escapeHtml(target.id)+'" placeholder="Ikuti jeda kampanye" value="'+(match?.delay_seconds??'')+'">'+
      '</div>';
  }).join('');
}
function renderCampaigns(){
  const root=document.querySelector('[data-wa-content="campaigns"]');if(!root)return;
  root.innerHTML=
  '<div class="wa-layout"><article class="wa-feature-card"><h3>Kelola Kampanye</h3>'+
    '<p>Tiap kampanye memiliki konten, tujuan, jadwal, dan jeda sendiri. Semua kampanye saat ini hanya <b>DRAFT</b> atau <b>PAUSE</b>; belum bisa menerbitkan pesan.</p>'+
    '<div class="wa-campaign-list">'+(campaigns.length?campaigns.map(c=>
      '<button type="button" class="wa-campaign-list-button '+(c.id===selected?'active':'')+'" data-wa-campaign="'+escapeHtml(c.id)+'">'+
      '<b>'+escapeHtml(c.name)+'</b><small>'+Number(c.delay_seconds)+' detik / tujuan · '+(c.status==='paused'?'PAUSE':'DRAFT')+'</small></button>'
    ).join(''):'<p>Belum ada kampanye.</p>')+'</div>'+
    '<button class="wa-secondary-link" type="button" id="waNewCampaign">+ KAMPANYE BARU</button>'+
    '<div class="wa-alert">Sinkronisasi target otomatis dan posting aktif akan ditambahkan setelah API Zawa terverifikasi. Tidak ada pengiriman otomatis dari halaman ini.</div>'+
  '</article><article class="wa-feature-card"><h3>Pengaturan Kampanye</h3>'+
    '<form id="waCampaignForm" class="wa-campaign-form">'+
      '<label>Nama kampanye<input id="waCampaignName" maxlength="140" required placeholder="Edukasi BADAI Pagi"></label>'+
      '<label>Konten promosi<textarea id="waCampaignText" rows="6" maxlength="12000" placeholder="Tulis caption promosi BADAI..."></textarea></label>'+
      '<label>Rencana tanggal & jam (WIB)<input id="waCampaignDate" type="datetime-local"></label>'+
      '<div class="wa-two-cols"><label>Delay antar tujuan (detik)<input id="waCampaignDelay" type="number" min="30" max="3600" value="90" required></label>'+
      '<label>Variasi jeda maksimum (detik)<input id="waCampaignJitter" type="number" min="0" max="120" value="0" required></label></div>'+
      '<label>Status<select id="waCampaignStatus"><option value="draft">DRAFT</option><option value="paused">PAUSE</option></select></label>'+
      '<div class="wa-campaign-pick"><b>Pilih grup / Channel</b><p>Jeda khusus per tujuan bersifat opsional. Kosongkan untuk mengikuti delay kampanye.</p><div id="waCampaignTargets">'+targetsMarkup()+'</div></div>'+
      '<div class="wa-alert" id="waCampaignPreview">Pratinjau urutan pengiriman akan muncul di sini. Tidak ada posting yang dijalankan.</div>'+
      '<div class="wa-actions"><button type="submit" class="wa-primary-link" id="waSaveCampaign">SIMPAN DRAFT</button>'+
        '<button type="button" class="wa-secondary-link" id="waResetCampaign">BARU</button>'+
        '<button type="button" class="wa-danger-button" id="waDeleteCampaign" '+(selected?'':'disabled')+'>HAPUS</button></div>'+
      '<p id="waCampaignMessage" aria-live="polite"></p>'+
    '</form></article></div>';
  const c=campaigns.find(x=>x.id===selected);
  if(c){
    $('waCampaignName').value=c.name;
    $('waCampaignText').value=c.content_text||'';
    $('waCampaignDate').value=c.scheduled_at?toWibLocal(c.scheduled_at):'';
    $('waCampaignDelay').value=String(c.delay_seconds);
    $('waCampaignJitter').value=String(c.jitter_seconds);
    $('waCampaignStatus').value=c.status;
  }
  $('waCampaignForm').addEventListener('submit',saveCampaign);
  $('waResetCampaign').addEventListener('click',()=>{selected=null;renderCampaigns()});
  $('waNewCampaign').addEventListener('click',()=>{selected=null;renderCampaigns()});
  $('waDeleteCampaign').addEventListener('click',deleteCampaign);
  root.querySelectorAll('[data-wa-campaign]').forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.waCampaign;renderCampaigns();
  }));
  root.querySelectorAll('[data-wa-select], [data-wa-override]').forEach(input=>input.addEventListener('input',renderPreview));
  ['waCampaignDate','waCampaignDelay','waCampaignJitter'].forEach(id=>$(id).addEventListener('input',renderPreview));
  renderPreview();
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
function renderPreview(){
  const root=$('waCampaignPreview');if(!root)return;
  const delay=Number($('waCampaignDelay')?.value||90),jitter=Number($('waCampaignJitter')?.value||0);
  let choices=[];
  try{choices=draftSelections()}catch(error){root.textContent=error.message;return}
  if(!choices.length){root.textContent='Belum ada tujuan dipilih. Tidak ada pengiriman yang berjalan.';return}
  let seconds=0;
  root.innerHTML='<b>Simulasi jadwal (bukan pengiriman):</b><div class="wa-preview-list">'+choices.map((link,index)=>{
    if(index>0) seconds+=(link.delay_seconds??delay);
    const target=catalog.find(t=>t.id===link.target_id);
    const earliest=Math.max(0,seconds);
    const latest=earliest+index*jitter;
    return '<div>'+(index+1)+'. '+escapeHtml(target?.name||'Tujuan')+
      ' — setelah '+earliest+'–'+latest+' detik dari awal</div>';
  }).join('')+'</div><small>Variasi jeda adalah rentang perencanaan; tidak menjamin keamanan dari pembatasan WhatsApp.</small>';
}
async function refresh(){
  const [targetRows,campaignRows,linkRows]=await Promise.all([
    db('wa_marketing_targets?select=id,kind,external_id,name,origin,enabled&order=name.asc','GET'),
    db('wa_marketing_campaigns?select=id,name,content_text,scheduled_at,status,delay_seconds,jitter_seconds&order=created_at.desc','GET'),
    db('wa_marketing_campaign_targets?select=campaign_id,target_id,position,delay_seconds&order=position.asc','GET')
  ]);
  catalog=Array.isArray(targetRows)?targetRows:[];
  campaigns=Array.isArray(campaignRows)?campaignRows:[];
  links=Array.isArray(linkRows)?linkRows:[];
  if(selected&&!campaigns.some(c=>c.id===selected))selected=null;
  renderTarget('group');renderTarget('channel');renderCampaigns();
  loaded=true;
}
async function saveCampaign(event){
  event.preventDefault();
  if(busy)return;
  let payload,chosen;
  try{
    const name=$('waCampaignName').value.trim();
    if(!name)throw new Error('Nama kampanye wajib diisi.');
    payload={
      name,
      content_text:$('waCampaignText').value,
      scheduled_at:parseWib($('waCampaignDate').value),
      delay_seconds:Number($('waCampaignDelay').value),
      jitter_seconds:Number($('waCampaignJitter').value),
      status:$('waCampaignStatus').value
    };
    if(!Number.isInteger(payload.delay_seconds)||payload.delay_seconds<30||payload.delay_seconds>3600)throw new Error('Delay kampanye minimal 30 dan maksimal 3600 detik.');
    if(!Number.isInteger(payload.jitter_seconds)||payload.jitter_seconds<0||payload.jitter_seconds>120)throw new Error('Variasi jeda 0–120 detik.');
    chosen=draftSelections();
  }catch(error){note(error.message,true);return}
  busy=true;$('waSaveCampaign').disabled=true;
  try{
    const isUpdate=Boolean(selected);
    const rows=await db('wa_marketing_campaigns'+(isUpdate?'?id=eq.'+encodeURIComponent(selected):''),isUpdate?'PATCH':'POST',payload);
    const id=isUpdate?selected:rows?.[0]?.id;
    if(!id)throw new Error('Kampanye tersimpan, tetapi ID tidak dikembalikan server.');
    await db('wa_marketing_campaign_targets?campaign_id=eq.'+encodeURIComponent(id),'DELETE');
    if(chosen.length)await db('wa_marketing_campaign_targets','POST',chosen.map(row=>Object.assign({campaign_id:id},row)));
    selected=id;
    await refresh();note('Draft dan delay kampanye tersimpan. Pengiriman belum aktif.');
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
    '#pageWamarketing .wa-campaign-pick{padding:12px;border:1px solid #333;border-radius:12px}',
    '#pageWamarketing .wa-campaign-pick>b{font-size:12px}',
    '#pageWamarketing .wa-campaign-pick p{font-size:10px;margin:3px 0 12px}',
    '#pageWamarketing .wa-campaign-target{display:grid;grid-template-columns:1fr 135px;gap:10px;align-items:center;margin:7px 0}',
    '#pageWamarketing .wa-campaign-target label{display:flex;align-items:center;gap:6px}',
    '#pageWamarketing .wa-campaign-target label input{width:auto}',
    '#pageWamarketing .wa-campaign-target small{font-size:9px;color:#ff9aca}',
    '#pageWamarketing .wa-preview-list{margin:8px 0;font-size:11px;line-height:1.8}',
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
