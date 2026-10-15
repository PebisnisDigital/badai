/* BADAI Channel and Group editor. All delivery work runs on the server. */
(function(){
'use strict';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={empty:'Kosong',scheduled:'Terjadwal',queued:'Terjadwal',preparing:'Menyiapkan',dispatching:'Mengirim',api_accepted:'Diterima API',delivered:'Terkirim',failed:'Gagal',unknown:'Belum pasti',cancelled:'Dibatalkan',missed:'Terlewat'};
const zones={'Asia/Jakarta':'WIB','Asia/Makassar':'WITA','Asia/Jayapura':'WIT','UTC':'UTC'};
const dateIn=(zone,date=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const addDays=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const dayDiff=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
const formatText=text=>esc(text).replace(/```([\s\S]+?)```/g,'<code>$1</code>').replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/_([^_\n]+)_/g,'<i>$1</i>').replace(/~([^~\n]+)~/g,'<s>$1</s>');
const defaultSettings=target=>({id:crypto.randomUUID(),target_id:target||'',enabled:false,duration_days:365,start_date:dateIn('Asia/Jakarta'),timezone:'Asia/Jakarta',send_times:['06:00'],loop:true,version:0});
function create(api,options={}){
  const kind=options.kind==='group'?'group':'channel',label=kind==='group'?'Grup':'Channel';
  const domId=id=>kind==='group'?id.replace(/^wc/,'wg'):id;
  const copy=value=>kind==='group'?String(value).replace(/Channel/g,label):value;
  const originalDb=api.db;
  api={...api,db:(path,...args)=>originalDb(path.replaceAll('wa_channel_','wa_'+kind+'_'),...args)};
  const markup=html=>kind==='group'?html.replace(/\bid="wc/g,'id="wg'):html;
  function renderRoot(html){root.innerHTML=markup(html);}

  let host,root,targetManager,targets=[],contents=[],settings=[],logs=[],draft,slots=[],page=0,dirty=false,loaded=false,loading=false,working=false,selectedSlot=null,clipboard=null,bankPage=0,loadError='';
  let editor={id:null,title:'',caption:'',image_path:null},file=null,previewUrl='',imageGeneration=0;
  let capabilities={ready:false,scheduler_enabled:false,verified_types:[]};
  let capabilityFlight=null,capabilityGeneration=0;
  const historyKeys=new Set();
  const q=id=>root?.querySelector('#'+domId(id));
  const rpc=(name,args)=>api.db('rpc/'+name,'POST',args);
  function message(text,error=false){const el=q('wcMessage');if(el){el.textContent=copy(text);el.classList.toggle('error',error);}}
  function changed(){dirty=true;updateSummary();}
  function normalTime(t){return t.slice(0,5);}
  function saved(){return settings.find(s=>s.id===draft?.id);}
  function availableTargets(){return targets.filter(t=>t.kind===kind&&t.enabled);}
  function valid(){
    if(!draft.target_id)throw Error('Pilih Channel aktif terlebih dahulu. Sinkronkan atau kelola Channel di pengaturan automasi.');
    if(!Number.isInteger(draft.duration_days)||draft.duration_days<1||draft.duration_days>10000)throw Error('Durasi harus 1–10.000 hari.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.start_date)||!Number.isFinite(Date.parse(draft.start_date)))throw Error('Tanggal mulai tidak valid.');
    if(!draft.send_times.length||draft.send_times.length>24||draft.send_times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('Isi 1–24 jam pengiriman yang valid.');
    if(new Set(draft.send_times).size!==draft.send_times.length)throw Error('Jam pengiriman tidak boleh sama.');
  }
  function chooseTarget(id){
    const row=settings.find(s=>s.target_id===id);
    draft=row?{...row,send_times:row.send_times.map(normalTime)}:defaultSettings(id);
    slots=(row?.calendar_slots||[]).map(s=>({...s,send_time:normalTime(s.send_time)}));
    page=0;dirty=false;selectedSlot=null;render();if(loaded)refreshCapabilities();
  }
  async function readAll(table,select,order){
    let result=[],offset=0;
    while(true){
      const rows=await api.db(table+'?select='+select+'&order='+order+'&limit=500&offset='+offset,'GET');
      if(!Array.isArray(rows))throw Error('Respons data Channel tidak valid.');
      result.push(...rows);if(rows.length<500)break;offset+=rows.length;
    }
    return result;
  }
  async function load(){
    if(loading)return;loading=true;loadError='';
    try{
      const [cs,ss,ls,allSlots]=await Promise.all([
        readAll('wa_channel_contents','id,title,caption,image_path,created_at,updated_at','updated_at.desc,id.asc'),
        readAll('wa_channel_settings','*','created_at.asc,id.asc'),
        api.db('wa_channel_delivery_logs?select=id,settings_id,content_id,day_number,send_time,cycle_number,local_date,status,error_code,provider_response,created_at,updated_at&order=created_at.desc&limit=300','GET'),
        readAll('wa_channel_calendar_slots','settings_id,day_number,send_time,content_id','settings_id.asc,day_number.asc,send_time.asc')
      ]);
      contents=cs;settings=ss.map(s=>({...s,calendar_slots:allSlots.filter(x=>x.settings_id===s.id)}));logs=ls;loaded=true;
      if(!draft)chooseTarget(availableTargets()[0]?.id||'');
      else {render();refreshCapabilities();}
    }catch(error){loadError=error.message;render();message('Data Channel belum dapat dimuat. '+error.message,true);}
    finally{loading=false;}
  }
  function refreshCapabilities(){
    const target=draft?.target_id;
    if(!target){capabilityGeneration++;capabilities={ready:false,scheduler_enabled:false,verified_types:[]};updateSummary();return Promise.resolve();}
    if(capabilityFlight?.target===target && capabilityFlight.generation===capabilityGeneration)return capabilityFlight.promise;
    const generation=++capabilityGeneration;
    capabilities={ready:false,scheduler_enabled:false,verified_types:[]};updateSummary();
    const promise=(async()=>{
      let result={ready:false,scheduler_enabled:false,verified_types:[]};
      try{
        const r=await fetch(api.base+'/functions/v1/badai-wa-'+kind+'?target_id='+encodeURIComponent(target),{headers:{apikey:api.key,Authorization:'Bearer '+api.token()},cache:'no-store',signal:AbortSignal.timeout(20000)});
        const data=await r.json();if(!r.ok)throw Error(data.error);
        result={...data,ready:data.ready===true&&(data.verified_types||[]).some(p=>p.target_kind===kind)};
      }catch(_){}
      if(generation===capabilityGeneration && draft?.target_id===target){capabilities=result;updateSummary();}
    })();
    capabilityFlight={target,promise,generation};
    promise.finally(()=>{if(capabilityFlight?.promise===promise)capabilityFlight=null;});
    return promise;
  }
  function currentDay(){
    const elapsed=dayDiff(dateIn(draft.timezone),draft.start_date);
    if(elapsed<0||(!draft.loop&&elapsed>=draft.duration_days))return null;
    return {day:elapsed%draft.duration_days+1,cycle:Math.floor(elapsed/draft.duration_days)+1};
  }
  function slot(day,time){return slots.find(s=>s.day_number===day&&s.send_time===time);}
  function slotLog(day,time){
    const cycle=currentDay()?.cycle||1;
    return logs.find(l=>l.settings_id===draft.id&&l.day_number===day&&normalTime(l.send_time)===time&&l.cycle_number===cycle);
  }
  function slotStatus(day,time){return slotLog(day,time)?.status||(slot(day,time)?'scheduled':'empty');}
  function content(id){return contents.find(c=>c.id===id);}
  function assign(day,time,id){
    if(!content(id))return;
    const existing=slot(day,time);
    if(existing&&existing.content_id!==id&&!confirm('Ganti konten yang sudah ada pada slot ini?'))return;
    slots=slots.filter(s=>s.day_number!==day||s.send_time!==time);
    slots.push({day_number:day,send_time:time,content_id:id});selectedSlot=null;changed();renderCalendar();renderBank();
  }
  function render(){
    if(!root)return;
    if(!loaded&&!draft){renderRoot(copy('<div class="wc-card"><h3>Channel Automation</h3><p>'+(loadError?'Gagal memuat data Channel.':'Memuat pengaturan dan bank konten…')+'</p><button id="wcRetry" type="button">Muat ulang</button><div id="wcMessage" role="status" class="wc-notice"></div></div>'));q('wcRetry').onclick=load;return;}
    renderRoot(`<article class="wc-card wc-settings">
      <div class="wc-settings-title"><div class="wc-eyebrow">PENGATURAN CEPAT</div><span id="wcRunning" class="wc-badge">${draft.enabled?'BERJALAN':'NONAKTIF'}</span><h3>Jadwal<br>Konten</h3><div class="wc-presets">${[10,30,365,1000].map(n=>`<button type="button" data-duration="${n}" class="${draft.duration_days===n?'selected':''}">${n} hari</button>`).join('')}</div></div>
      <div class="wc-settings-main"><section class="wc-destination" aria-label="Koneksi dan tujuan ${label}"><label>${label} tujuan<select id="wcTarget"><option value="">Pilih ${label}</option>${availableTargets().map(t=>`<option value="${esc(t.id)}" ${t.id===draft.target_id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><div id="wcTargetManager"></div></section><div class="wc-settings-top"><label class="wc-switch wc-toggle-box"><input id="wcEnabled" type="checkbox" ${draft.enabled?'checked':''}><span>Otomatis</span><b id="wcOnLabel">${draft.enabled?'ON':'OFF'}</b></label>
      <label>Jumlah hari<input id="wcCustom" type="number" min="1" max="10000" value="${draft.duration_days}"><select id="wcDuration" hidden aria-label="Pilihan durasi">${[10,30,365,1000].map(n=>`<option value="${n}" ${n===draft.duration_days?'selected':''}>${n} hari</option>`).join('')}<option value="custom" ${![10,30,365,1000].includes(draft.duration_days)?'selected':''}>Custom</option></select></label>
      <label>Zona waktu<select id="wcZone">${Object.entries(zones).map(([z,n])=>`<option value="${z}" ${draft.timezone===z?'selected':''}>${n} — ${z==='Asia/Jakarta'?'Jakarta':z.split('/').pop()}</option>`).join('')}</select></label>
      <label class="wc-switch wc-toggle-box"><input id="wcLoop" type="checkbox" ${draft.loop?'checked':''}><span>Ulang Hari 1</span><small>LOOP</small></label><button id="wcSave" class="wc-primary" type="button">Simpan Jadwal</button></div>
      <div class="wc-settings-bottom"><label>Mulai Hari 1<input id="wcStart" type="date" value="${esc(draft.start_date)}"></label><button id="wcSend" class="wc-primary" type="button">Kirim Sekarang</button><div class="wc-last"><small>STATUS TERAKHIR</small><b id="wcLast"></b><small id="wcServerState"></small></div></div>
      <div class="wc-send-times"><b>Pengiriman per hari <span id="wcDailyCount"></span></b><div id="wcTimes" class="wc-times"></div><button id="wcVerify" type="button">Uji & verifikasi ${label}</button><button id="wcHistory" type="button">Riwayat pengiriman</button></div></div>
      <div id="wcMessage" class="wc-notice" role="status" aria-live="polite"></div></article>
      <article class="wc-progress-card"><div class="wc-head"><div><h4>Progres penyusunan</h4><small id="wcProgressLabel"></small></div><strong id="wcPercent">0%</strong></div><progress id="wcProgress" value="0" max="100" aria-label="Progres penyusunan konten"></progress><small id="wcSaveState"></small></article>
      <div class="wc-steps"><span>1 · Pilih bagian</span><span>2 · Buat konten / cari draft</span><span>3 · Tarik kartu</span><span>4 · Lepas ke hari dan jam</span></div>
      <div class="wc-layout"><article class="wc-card wc-calendar-panel"><label class="wc-eyebrow">BAGIAN KONTEN</label><div class="wc-navigation"><button id="wcPrevious" type="button" aria-label="30 hari sebelumnya">‹</button><select id="wcPageSelect" aria-label="Pilih bagian kalender"></select><button id="wcNext" type="button" aria-label="30 hari berikutnya">›</button></div><p id="wcPageLabel"></p><div class="wc-legend">${['empty','scheduled','delivered','failed'].map(st=>`<span class="wc-badge ${st}">${labels[st]}</span>`).join('')}</div><div id="wcCalendar" class="wc-calendar"></div><div id="wcDaySummary" class="wc-day-summary">Pilih hari untuk mengatur seluruh slot pengiriman.</div></article>
      <aside class="wc-bank"><article class="wc-card"><div class="wc-eyebrow">RIWAYAT KONTEN</div><div class="wc-head"><h3>Konten Tersedia</h3><span id="wcCount" class="wc-badge"></span><button id="wcNew" type="button">+ Buat Konten</button></div>
      <details id="wcComposer" class="wc-composer" ${contents.length?'':'open'}><summary>Buat atau edit konten</summary>
      <form id="wcEditor" class="wc-editor"><label>Judul<input id="wcTitle" required maxlength="140" value="${esc(editor.title)}" placeholder="Edukasi bisnis hari ini"></label><label>Caption<textarea id="wcCaption" rows="6" maxlength="12000" placeholder="Tulis pesan untuk ${label} BADAI…">${esc(editor.caption)}</textarea></label><div class="wc-format" aria-label="Format teks WhatsApp"><button data-format="*" type="button" aria-label="Bold"><b>B</b></button><button data-format="_" type="button" aria-label="Italic"><i>I</i></button><button data-format="~" type="button" aria-label="Strikethrough"><s>S</s></button><button data-format="&#96;&#96;&#96;" type="button" aria-label="Monospace">&lt;/&gt;</button></div><label>Gambar · JPG, PNG, WEBP · maks. 20 MB<input id="wcImage" type="file" accept="image/jpeg,image/png,image/webp"></label><button id="wcRemoveImage" type="button" ${!editor.image_path&&!file?'hidden':''}>Lepaskan gambar</button><small>Preview WhatsApp</small><div id="wcPreview" class="wc-preview"></div><button id="wcSaveDraft" class="wc-primary" type="submit">${editor.id?'Simpan Perubahan':'Simpan Draft'}</button><div id="wcEditorMessage" role="status"></div></form>
      </details><div id="wcReleaseZone" class="wc-release-zone"><b>Lepaskan di kanan untuk melepaskan dari kalender</b><small>Draft tetap tersimpan dan dapat digunakan lagi.</small></div><div class="wc-search"><input id="wcSearch" aria-label="Cari konten" placeholder="Cari judul, caption, atau status…"><select id="wcFilter" aria-label="Filter status konten"><option value="all">Semua status</option><option value="draft">Draft</option><option value="scheduled">Dijadwalkan</option><option value="delivered">Terpublikasi</option><option value="failed">Gagal</option></select></div><small>Desktop: tarik kartu ke hari dan jam di kiri. Mobile: pilih slot lalu tekan Gunakan.</small><div id="wcBankList" class="wc-list"></div><div class="wc-row"><button id="wcBankPrev" type="button">‹</button><small id="wcBankPage"></small><button id="wcBankNext" type="button">›</button><button id="wcReload" type="button" aria-label="Perbarui status pengiriman">Perbarui status</button></div></article></aside></div>
      <dialog id="wcDialog"><h3 id="wcDialogTitle"></h3><div id="wcDialogBody" class="wc-dialog-body"></div><div class="wc-row"><button id="wcDialogCancel" type="button">Batal</button><button id="wcDialogApply" class="wc-primary" type="button">Terapkan</button></div></dialog>`);
    // Keep catalog controls and their listeners when the schedule editor rerenders.
    q('wcTargetManager').replaceWith(targetManager);
    bind();renderTimes();renderCalendar();renderBank();updateSummary();updatePreview();
  }
  function bind(){
    q('wcTarget').onchange=e=>{if(dirty&&!confirm('Buang perubahan jadwal yang belum disimpan?')){e.target.value=draft.target_id;return;}chooseTarget(e.target.value);};
    q('wcEnabled').onchange=e=>{draft.enabled=e.target.checked;q('wcOnLabel').textContent=draft.enabled?'ON':'OFF';changed();};
    q('wcDuration').onchange=e=>{if(e.target.value!=='custom')resizeDuration(Number(e.target.value));};
    root.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>resizeDuration(Number(b.dataset.duration)));
    q('wcPageSelect').onchange=e=>{page=Number(e.target.value);renderCalendar();};
    q('wcVerify').onclick=()=>sendNow(true);
    q('wcCustom').onchange=e=>resizeDuration(Number(e.target.value));
    q('wcStart').onchange=e=>{draft.start_date=e.target.value;changed();renderCalendar();};
    q('wcZone').onchange=e=>{draft.timezone=e.target.value;changed();renderCalendar();};
    q('wcLoop').onchange=e=>{draft.loop=e.target.checked;changed();renderCalendar();};
    q('wcSave').onclick=saveSchedule;q('wcSend').onclick=()=>sendNow(false);
    q('wcHistory').onclick=showHistory;
    const release=q('wcReleaseZone');
    release.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-badai-content')){e.preventDefault();release.classList.add('over');}};
    release.ondragleave=()=>release.classList.remove('over');
    release.ondrop=e=>{e.preventDefault();release.classList.remove('over');let data;try{data=JSON.parse(e.dataTransfer.getData('application/x-badai-content'));}catch(_){return;}if(data.day){slots=slots.filter(s=>s.day_number!==data.day||s.send_time!==data.time);changed();renderCalendar();renderBank();message('Konten dilepaskan dari kalender. Draft tetap tersedia.');}};
    q('wcPrevious').onclick=()=>{page--;renderCalendar();};q('wcNext').onclick=()=>{page++;renderCalendar();};
    q('wcEditor').onsubmit=saveContent;
    q('wcTitle').oninput=e=>{editor.title=e.target.value;};
    q('wcCaption').oninput=e=>{editor.caption=e.target.value;updatePreview();};
    root.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{
      const el=q('wcCaption'),start=el.selectionStart,end=el.selectionEnd,mark=b.dataset.format;
      el.setRangeText(mark+el.value.slice(start,end)+mark,start,end,'select');editor.caption=el.value;el.focus();updatePreview();
    });
    q('wcImage').onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>20*1024*1024){message('Gunakan gambar JPG, PNG, atau WEBP maksimal 20 MB.',true);e.target.value='';return;}
      file=f;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(f);q('wcRemoveImage').hidden=false;updatePreview();
    };
    q('wcRemoveImage').onclick=()=>{file=null;editor.image_path=null;q('wcImage').value='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';q('wcRemoveImage').hidden=true;updatePreview();};
    q('wcNew').onclick=()=>editContent(null);
    q('wcSearch').oninput=q('wcFilter').onchange=()=>{bankPage=0;renderBank();};
    q('wcBankPrev').onclick=()=>{bankPage--;renderBank();};q('wcBankNext').onclick=()=>{bankPage++;renderBank();};
    q('wcReload').onclick=async()=>{try{logs=await api.db('wa_channel_delivery_logs?select=*&order=created_at.desc&limit=300','GET');historyKeys.clear();await refreshCapabilities();renderCalendar();message('Status pengiriman diperbarui.');}catch(e){message(e.message,true);}};
  }
  function resizeDuration(n){
    if(!Number.isInteger(n)||n<1||n>10000){message('Durasi harus 1–10.000 hari.',true);q('wcCustom').value=draft.duration_days;return;}
    if(slots.some(s=>s.day_number>n)&&!confirm('Durasi lebih pendek akan melepaskan konten di luar rentang hari baru. Draft dan riwayat tetap tersimpan. Lanjutkan?')){q('wcDuration').value=String(draft.duration_days);q('wcCustom').value=draft.duration_days;return;}
    q('wcCustom').value=n;q('wcDuration').value=[10,30,365,1000].includes(n)?String(n):'custom';root.querySelectorAll('[data-duration]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.duration)===n));
    draft.duration_days=n;slots=slots.filter(s=>s.day_number<=n);page=Math.min(page,Math.ceil(n/30)-1);changed();renderCalendar();
  }
  function renderTimes(){
    q('wcTimes').innerHTML=markup(draft.send_times.map((t,i)=>`<div class="wc-time"><input type="time" value="${esc(t)}" data-time-index="${i}" aria-label="Jam kirim ${i+1}"><button data-remove-time="${i}" type="button" aria-label="Hapus jam ${esc(t)}" ${draft.send_times.length===1?'disabled':''}>×</button></div>`).join('')+'<button id="wcAddTime" type="button" '+(draft.send_times.length>=24?'disabled':'')+'>+ Tambah Jam</button>');
    q('wcTimes').querySelectorAll('[data-time-index]').forEach(el=>el.onchange=()=>{
      const index=Number(el.dataset.timeIndex),old=draft.send_times[index],value=el.value;
      if(!value||draft.send_times.some((t,i)=>i!==index&&t===value)){message('Jam kirim harus valid dan berbeda.',true);el.value=old;return;}
      draft.send_times[index]=value;slots.forEach(s=>{if(s.send_time===old)s.send_time=value;});changed();renderCalendar();
    });
    q('wcTimes').querySelectorAll('[data-remove-time]').forEach(b=>b.onclick=()=>{
      const index=Number(b.dataset.removeTime),time=draft.send_times[index];
      if(slots.some(s=>s.send_time===time)&&!confirm('Hapus jam '+time+' dan lepaskan konten pada jam ini dari kalender?'))return;
      draft.send_times.splice(index,1);slots=slots.filter(s=>s.send_time!==time);changed();renderTimes();renderCalendar();renderBank();
    });
    q('wcAddTime').onclick=()=>{let hour=9;while(draft.send_times.includes(String(hour%24).padStart(2,'0')+':00'))hour++;draft.send_times.push(String(hour%24).padStart(2,'0')+':00');changed();renderTimes();renderCalendar();};
  }
  function updateSummary(){
    if(!draft||!q('wcProgress'))return;
    const total=draft.duration_days*draft.send_times.length,count=slots.length;
    q('wcProgressLabel').textContent=count+' dari '+total+' slot terisi · '+draft.duration_days+' hari';q('wcProgress').value=count/total*100;q('wcPercent').textContent=Math.round(count/total*100)+'%';q('wcDailyCount').textContent='· '+draft.send_times.length+' konten';q('wcRunning').textContent=draft.enabled?'BERJALAN':'NONAKTIF';
    q('wcSaveState').textContent=dirty?'Ada perubahan yang belum disimpan.':saved()?'Jadwal tersimpan.':'Jadwal belum disimpan.';
    const latest=logs.find(l=>l.settings_id===draft.id);
    q('wcLast').textContent=latest?(labels[latest.status]||latest.status)+' · '+new Intl.DateTimeFormat('id-ID',{timeZone:draft.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(latest.updated_at))+(latest.error_code?' · '+latest.error_code:''):'Belum ada pengiriman.';
    const complete=!draft.loop&&dayDiff(dateIn(draft.timezone),draft.start_date)>=draft.duration_days;
    q('wcServerState').textContent=!capabilities.ready||!capabilities.scheduler_enabled?`Pengiriman otomatis menunggu koneksi dan verifikasi API ${label}.`:complete?'Jadwal selesai. Loop OFF; pengiriman berhenti.':draft.enabled?'Otomatis ON setelah jadwal disimpan.':'Otomatis OFF. Aktifkan dan simpan untuk mulai.';
    q('wcSend').disabled=working||!saved()||dirty;
    q('wcVerify').disabled=working||!saved()||dirty;
    q('wcSave').disabled=working||!loaded;
  }
  function renderCalendar(){
    root.classList.toggle('wc-pasting',Boolean(clipboard));
    const start=page*30+1,end=Math.min(start+29,draft.duration_days),now=currentDay();
    q('wcPageSelect').innerHTML=Array.from({length:Math.ceil(draft.duration_days/30)},(_,i)=>`<option value="${i}" ${i===page?'selected':''}>Bagian ${i+1} · Hari ${i*30+1}–${Math.min(i*30+30,draft.duration_days)}</option>`).join('');
    q('wcPageLabel').textContent='Hari '+start+'–'+end+' dari '+draft.duration_days+' · Siklus '+(now?.cycle||1)+' · '+zones[draft.timezone];
    q('wcPrevious').disabled=page===0;q('wcNext').disabled=end>=draft.duration_days;
    q('wcCalendar').innerHTML=Array.from({length:end-start+1},(_,i)=>{
      const day=start+i,date=addDays(draft.start_date,day-1+((now?.cycle||1)-1)*draft.duration_days);
      return `<div class="wc-day ${now?.day===day?'today':''}"><button class="wc-day-title" data-edit-day="${day}" type="button"><span>HARI</span><strong>${day}</strong><small>${esc(date)}</small></button>${[...draft.send_times].sort().map(time=>{
        const s=slot(day,time),c=content(s?.content_id),status=slotStatus(day,time);
        return `<div class="wc-slot ${c?'filled':''}" data-day="${day}" data-time="${time}" ${c?'draggable="true"':''} tabindex="0" role="group" aria-label="Hari ${day} jam ${time}, ${esc(labels[status])}"><small>${time}</small><span class="wc-badge ${status}">${labels[status]||esc(status)}</span>${c?`<b>${esc(c.title)}</b><div class="wc-slot-tools"><button type="button" data-copy-slot aria-label="Gandakan konten Hari ${day} jam ${time}">Salin</button><button type="button" data-move-slot aria-label="Pindahkan konten Hari ${day} jam ${time}">Pindah</button><button type="button" data-detach-slot aria-label="Lepaskan konten Hari ${day} jam ${time}">×</button></div>`:'<small>Tarik konten ke sini</small>'}<button type="button" data-pick-slot>${clipboard?'Tempel di sini':'Pilih slot'}</button></div>`;
      }).join('')}</div>`;
    }).join('');
    q('wcCalendar').querySelectorAll('[data-edit-day]').forEach(b=>b.onclick=()=>editDay(Number(b.dataset.editDay)));
    q('wcCalendar').querySelectorAll('.wc-slot').forEach(el=>{
      const day=Number(el.dataset.day),time=el.dataset.time;
      el.ondragstart=e=>{if(e.target.closest('button'))return;e.dataTransfer.setData('application/x-badai-content',JSON.stringify({contentId:slot(day,time)?.content_id,day,time}));e.dataTransfer.effectAllowed='copyMove';};
      el.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-badai-content')){e.preventDefault();el.classList.add('over');}};
      el.ondragleave=()=>el.classList.remove('over');
      el.ondrop=e=>{
        e.preventDefault();el.classList.remove('over');let data;try{data=JSON.parse(e.dataTransfer.getData('application/x-badai-content'));}catch(_){return;}
        if(!content(data.contentId)||(data.day===day&&data.time===time))return;
        assign(day,time,data.contentId);
        if(data.day&&!e.ctrlKey&&!e.altKey&&slot(day,time)?.content_id===data.contentId){slots=slots.filter(s=>s.day_number!==data.day||s.send_time!==data.time);changed();renderCalendar();}
      };
      el.querySelector('[data-copy-slot]')?.addEventListener('click',()=>{clipboard={contentId:slot(day,time).content_id};message('Pilih Tempel di sini pada slot tujuan untuk menggandakan konten.');renderCalendar();});
      el.querySelector('[data-move-slot]')?.addEventListener('click',()=>{clipboard={contentId:slot(day,time).content_id,day,time};message('Pilih Tempel di sini pada slot tujuan untuk memindahkan konten.');renderCalendar();});
      el.querySelector('[data-detach-slot]')?.addEventListener('click',()=>{slots=slots.filter(s=>s.day_number!==day||s.send_time!==time);changed();renderCalendar();renderBank();});
      el.querySelector('[data-pick-slot]').onclick=()=>{
        if(clipboard){const data=clipboard;if(data.day===day&&data.time===time)return;assign(day,time,data.contentId);if(slot(day,time)?.content_id===data.contentId){if(data.day)slots=slots.filter(s=>s.day_number!==data.day||s.send_time!==data.time);clipboard=null;changed();renderCalendar();renderBank();}}
        else{selectedSlot={day,time};message('Slot Hari '+day+' jam '+time+' dipilih. Tekan Gunakan pada konten di bank.');renderBank();}
      };
      el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.querySelector('[data-pick-slot]').click();}};
    });
    updateSummary();
    loadSlotHistory(start,end,now?.cycle||1);
  }
  async function loadSlotHistory(start,end,cycle){
    if(!saved())return;
    const id=draft.id,key=[id,start,end,cycle].join(':');if(historyKeys.has(key))return;historyKeys.add(key);
    try{
      const rows=await api.db('wa_channel_delivery_logs?select=*&settings_id=eq.'+encodeURIComponent(id)+'&day_number=gte.'+start+'&day_number=lte.'+end+'&cycle_number=eq.'+cycle+'&order=created_at.desc&limit=1000','GET');
      if(!Array.isArray(rows))return;
      const ids=new Set(rows.map(r=>r.id));logs=[...rows,...logs.filter(r=>!ids.has(r.id))].sort((a,b)=>b.created_at.localeCompare(a.created_at));
      if(draft.id===id)renderCalendar();
    }catch(error){message('Riwayat slot belum diperbarui. '+error.message,true);}
  }
  function renderBank(){
    const search=q('wcSearch').value.toLocaleLowerCase(),filter=q('wcFilter').value;
    const used=new Set([...settings.filter(s=>s.id!==draft.id).flatMap(s=>s.calendar_slots||[]),...slots].map(s=>s.content_id));
    const list=contents.filter(c=>(c.title+' '+c.caption).toLocaleLowerCase().includes(search)&&(filter==='all'||(filter==='draft'?!used.has(c.id):filter==='scheduled'?used.has(c.id):logs.some(l=>l.content_id===c.id&&l.status===filter))));
    bankPage=Math.max(0,Math.min(bankPage,Math.ceil(list.length/20)-1));
    q('wcCount').textContent='('+contents.length+')';q('wcBankPage').textContent=(list.length?bankPage*20+1:0)+'–'+Math.min((bankPage+1)*20,list.length)+' / '+list.length;
    q('wcBankPrev').disabled=bankPage===0;q('wcBankNext').disabled=(bankPage+1)*20>=list.length;
    q('wcBankList').innerHTML=list.slice(bankPage*20,bankPage*20+20).map(c=>`<div class="wc-content" draggable="true" data-content="${esc(c.id)}"><div class="wc-head"><b>${esc(c.title)}</b><span class="wc-badge ${used.has(c.id)?'scheduled':''}">${used.has(c.id)?'Dijadwalkan':'Draft'}</span></div><p>${esc(c.caption||'Konten gambar')}</p><small>${c.image_path?'▧ Gambar · ':''}Tarik ke kalender</small><div class="wc-row"><button data-use type="button">Gunakan</button><button data-edit type="button">Edit</button><button data-duplicate type="button">Duplikat</button><button data-delete class="wc-danger" type="button">Hapus</button></div></div>`).join('')||'<div class="wc-empty">'+(search?'Konten tidak ditemukan.':'Belum ada konten. Buat dan simpan draft pertama.')+'</div>';
    q('wcBankList').querySelectorAll('[data-content]').forEach(el=>{
      const id=el.dataset.content;
      el.ondragstart=e=>{e.dataTransfer.setData('application/x-badai-content',JSON.stringify({contentId:id}));e.dataTransfer.effectAllowed='copy';};
      el.querySelector('[data-use]').onclick=()=>{if(selectedSlot)assign(selectedSlot.day,selectedSlot.time,id);else{clipboard={contentId:id};message('Pilih Tempel di sini pada slot kalender untuk menggunakan konten.');renderCalendar();}};
      el.querySelector('[data-edit]').onclick=()=>editContent(id);
      el.querySelector('[data-duplicate]').onclick=()=>{if(!editContent(id))return;editor.id=null;editor.title=(editor.title+' (salinan)').slice(0,140);q('wcTitle').value=editor.title;q('wcSaveDraft').textContent='Simpan Draft';};
      el.querySelector('[data-delete]').onclick=()=>deleteContent(id);
    });
  }
  function editContent(id){
    const original=content(editor.id);
    const unsaved=file||(!original&&(editor.title||editor.caption))||(original&&(editor.title!==original.title||editor.caption!==original.caption||editor.image_path!==original.image_path));
    if(unsaved&&!confirm('Ganti isi editor? Pastikan perubahan draft sudah disimpan.'))return false;
    editor=id?{...content(id)}:{id:null,title:'',caption:'',image_path:null};file=null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';
    q('wcComposer').open=true;q('wcTitle').value=editor.title;q('wcCaption').value=editor.caption;q('wcImage').value='';q('wcRemoveImage').hidden=!editor.image_path;q('wcSaveDraft').textContent=id?'Simpan Perubahan':'Simpan Draft';q('wcTitle').focus();updatePreview();return true;
  }
  async function updatePreview(){
    const generation=++imageGeneration,el=q('wcPreview');if(!el)return;
    el.innerHTML=formatText(editor.caption)||'<small>Caption akan tampil di sini.</small>';
    let url=previewUrl;
    if(!url&&editor.image_path){
      try{
        const r=await fetch(api.base+'/storage/v1/object/sign/wa-marketing-media/'+editor.image_path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{apikey:api.key,Authorization:'Bearer '+api.token(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});
        if(!r.ok)throw Error('Preview gambar tidak tersedia');const data=await r.json();
        url=new URL(data.signedURL.startsWith('/object/')?'/storage/v1'+data.signedURL:data.signedURL,api.base).href;
        if(new URL(url).origin!==new URL(api.base).origin)url='';
      }catch(_){if(generation===imageGeneration)el.insertAdjacentHTML('afterbegin','<small>Gambar tersimpan; preview belum tersedia.</small>');}
    }
    if(url&&generation===imageGeneration){const img=document.createElement('img');img.src=url;img.alt='Preview gambar konten';el.prepend(img);}
  }
  async function saveContent(event){
    event.preventDefault();if(working)return;
    if(!editor.title.trim()||(!editor.caption.trim()&&!file&&!editor.image_path)){message('Isi judul dan caption atau unggah gambar.',true);return;}
    working=true;q('wcSaveDraft').disabled=true;
    try{
      const id=editor.id||crypto.randomUUID();let path=editor.image_path;
      if(file){
        const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];path='campaigns/'+id+'/'+crypto.randomUUID()+'.'+ext;
        const r=await fetch(api.base+'/storage/v1/object/wa-marketing-media/'+path,{method:'POST',headers:{apikey:api.key,Authorization:'Bearer '+api.token(),'Content-Type':file.type,'x-upsert':'false'},body:file});
        if(!r.ok)throw Error('Unggah gambar gagal ('+r.status+').');
      }
      const payload={id,title:editor.title.trim(),caption:editor.caption,image_path:path};
      const rows=await api.db('wa_channel_contents'+(editor.id?'?id=eq.'+encodeURIComponent(id):''),editor.id?'PATCH':'POST',{...payload,updated_at:new Date().toISOString()});
      if(!Array.isArray(rows)||!rows.length)throw Error('Draft tidak tersimpan. Periksa izin akun admin.');
      contents=contents.filter(c=>c.id!==id);contents.unshift(rows[0]);editor={...rows[0]};file=null;message('Draft disimpan. Konten bisa digunakan berulang.');q('wcSaveDraft').textContent='Simpan Perubahan';q('wcComposer').open=false;renderBank();updatePreview();
    }catch(error){message(error.message,true);}finally{working=false;q('wcSaveDraft').disabled=false;updateSummary();}
  }
  async function deleteContent(id){
    if(working)return;
    if(!confirm('Hapus konten ini dan lepaskan dari seluruh kalender? Riwayat pengiriman tetap tersimpan.'))return;
    working=true;
    try{
      const versions=await rpc('wa_channel_delete_content',{p_content_id:id});contents=contents.filter(c=>c.id!==id);slots=slots.filter(s=>s.content_id!==id);
      (versions||[]).forEach(v=>{const row=settings.find(s=>s.id===v.id);if(row)row.version=v.version;if(draft.id===v.id)draft.version=v.version;});
      settings.forEach(s=>{s.calendar_slots=(s.calendar_slots||[]).filter(x=>x.content_id!==id);});
      if(editor.id===id){editor={id:null,title:'',caption:'',image_path:null};render();}else{renderCalendar();renderBank();}
      message('Konten dihapus. Simpan ulang jadwal bila ada perubahan lain.');
    }catch(error){message(error.message,true);}finally{working=false;updateSummary();}
  }
  function dialog(title,html,apply,label='Terapkan'){
    q('wcDialogTitle').textContent=copy(title);q('wcDialogBody').innerHTML=markup(html);q('wcDialogApply').textContent=label;
    q('wcDialogCancel').onclick=()=>q('wcDialog').close();q('wcDialogApply').onclick=apply;q('wcDialog').showModal();
  }
  function editDay(day){
    q('wcDaySummary').textContent='HARI '+day+' · '+draft.send_times.map(time=>time+' '+(content(slot(day,time)?.content_id)?.title||'Kosong')).join(' / ');
    dialog('Edit seluruh slot · Hari '+day,[...draft.send_times].sort().map(time=>`<label>${time} ${zones[draft.timezone]}<select data-day-time="${time}"><option value="">Kosong</option>${contents.map(c=>`<option value="${esc(c.id)}" ${slot(day,time)?.content_id===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>`).join(''),()=>{
      slots=slots.filter(s=>s.day_number!==day);q('wcDialogBody').querySelectorAll('[data-day-time]').forEach(el=>{if(el.value)slots.push({day_number:day,send_time:el.dataset.dayTime,content_id:el.value});});changed();q('wcDialog').close();renderCalendar();renderBank();
    });
  }
  function showHistory(){
    const rows=logs.filter(l=>l.settings_id===draft.id).slice(0,50);
    dialog('Riwayat Pengiriman',rows.map(l=>`<div class="wc-content"><div class="wc-head"><b>${esc(l.local_date)} · ${normalTime(l.send_time)} · Hari ${l.day_number} · Siklus ${l.cycle_number}</b><span class="wc-badge ${esc(l.status)}">${esc(labels[l.status]||l.status)}</span></div><small>${esc(l.provider_response?.message_id||l.error_code||'Menunggu worker server')}</small>${['api_accepted','unknown'].includes(l.status)?`<button type="button" data-confirm-received="${esc(l.id)}">Konfirmasi sudah terlihat di ${label}</button>`:''}${l.delivery_evidence?`<small>Bukti admin: ${esc(l.delivery_evidence)}</small>`:''}</div>`).join('')||'<p>Belum ada riwayat pengiriman.</p>',()=>q('wcDialog').close(),'Tutup');
    q('wcDialogBody').querySelectorAll('[data-confirm-received]').forEach(b=>b.onclick=async()=>{
      const evidence=prompt(copy('Tulis bukti pesan sudah terlihat di Channel (minimal 10 karakter). Ini akan menandai pengiriman sebagai Terkirim.'));if(!evidence)return;
      b.disabled=true;
      try{await rpc('wa_channel_confirm_received',{p_id:b.dataset.confirmReceived,p_evidence:evidence});const l=logs.find(x=>x.id===b.dataset.confirmReceived);l.status='delivered';l.delivery_evidence=evidence;q('wcDialog').close();renderCalendar();await refreshCapabilities();message('Penerimaan dikonfirmasi. Simpan jadwal dengan Otomatis ON untuk mulai publikasi.');}catch(error){q('wcDialog').close();message(error.message,true);}finally{b.disabled=false;}
    });
  }
  async function saveSchedule(){
    if(working)return;
    try{valid();}catch(error){message(error.message,true);return;}
    let confirmEnable=false;
    if(draft.enabled&&!saved()?.enabled){
      if(!capabilities.ready){message('Simpan dengan Otomatis OFF, lalu klik Uji & verifikasi Channel. Setelah pesan terlihat, konfirmasi penerimaan di Riwayat pengiriman.',true);return;}
      confirmEnable=confirm(copy('Aktifkan pengiriman WhatsApp nyata untuk Channel ini sesuai jadwal yang disimpan?'));if(!confirmEnable)return;
    }
    working=true;updateSummary();
    try{
      const data=await rpc('wa_channel_save_schedule',{p_settings:{id:draft.id,target_id:draft.target_id,enabled:draft.enabled,duration_days:draft.duration_days,start_date:draft.start_date,timezone:draft.timezone,send_times:draft.send_times,loop:draft.loop},p_slots:slots,p_expected_version:draft.version,p_confirm_enable:confirmEnable});
      const row=Array.isArray(data)?data[0]:data;draft={...row,send_times:row.send_times.map(normalTime)};settings=settings.filter(s=>s.id!==row.id);settings.push({...row,calendar_slots:slots.map(s=>({...s}))});dirty=false;message('Jadwal disimpan. '+(draft.enabled?'Pengiriman otomatis aktif.':'Otomatis OFF.'));renderBank();
    }catch(error){message(error.message,true);}finally{working=false;updateSummary();}
  }
  function sendNow(isTest=false){
    if(working||dirty||!saved())return;
    const options=slots.filter(s=>content(s.content_id));if(!options.length){message('Isi dan simpan minimal satu slot kalender.',true);return;}
    if(!isTest&&!capabilities.ready){message('Channel sesi aktif belum terverifikasi. Gunakan Uji & verifikasi Channel dahulu.',true);return;}
    dialog(isTest?`Uji kirim ke ${label}`:'Kirim Sekarang',`<p>Pilih satu slot tersimpan untuk dikirim sungguhan ke ${label} ${esc(targets.find(t=>t.id===draft.target_id)?.name||'terpilih')}.</p><label>Konten<select id="wcNowSlot">${options.map((s,i)=>`<option value="${i}">Hari ${s.day_number} · ${s.send_time} · ${esc(content(s.content_id).title)}</option>`).join('')}</select></label><small>${isTest?`Pesan ini benar-benar dikirim. Setelah terlihat di ${label}, konfirmasi di Riwayat untuk membuka pengiriman otomatis.`:'Pengiriman ini tercatat terpisah dari jadwal otomatis.'}</small>`,async()=>{
      if(working)return;working=true;q('wcDialogApply').disabled=true;
      try{
        const s=options[Number(q('wcNowSlot').value)],storageKey=['badai_'+kind+'_send',draft.id,draft.version,s.day_number,s.send_time,isTest?'test':'live'].join(':');
        let key=sessionStorage.getItem(storageKey);if(!key){key=crypto.randomUUID();sessionStorage.setItem(storageKey,key);}
        await rpc(isTest?'wa_channel_send_test':'wa_channel_send_now',{p_settings_id:draft.id,p_day_number:s.day_number,p_send_time:s.send_time,p_request_key:key,p_confirm:true});sessionStorage.removeItem(storageKey);
      q('wcDialog').close();message('Permintaan masuk antrean server. Perbarui status, lalu konfirmasi penerimaan di Riwayat setelah pesan terlihat.');
      }catch(error){q('wcDialog').close();message(error.message,true);}finally{working=false;q('wcDialogApply').disabled=false;updateSummary();}
    },'Konfirmasi Kirim Nyata');
  }
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  return {mount(container,catalog){
    targets=catalog;
    if(!host){host=container;targetManager=document.createElement('div');targetManager.id=domId('wcTargetManager');host.innerHTML='<div id="'+domId('wcAutomation')+'" class="wc"></div>';root=host.querySelector('#'+domId('wcAutomation'));render();load();}
    else if(draft&&q('wcTarget')){q('wcTarget').innerHTML=`<option value="">Pilih ${label}</option>`+availableTargets().map(t=>`<option value="${esc(t.id)}" ${t.id===draft.target_id?'selected':''}>${esc(t.name)}</option>`).join('');}
    return targetManager;
  }};
}
window.BadaiChannel={create};
})();
