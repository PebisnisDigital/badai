(function(root){
"use strict";
const KEY="badai-training-editor-v1",MAX=2500000;
const COPY=x=>JSON.parse(JSON.stringify(x));
const validTime=x=>typeof x==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const minutes=x=>Number(x.slice(0,2))*60+Number(x.slice(3));
const TYPES=["divider","system","hostnote","prompt","guide","quiz","text"];
const layouts=["normal","wide","compact"],aligns=["left","center","right"];
function verifyItem(x){
 if(!x||typeof x!=="object"||Array.isArray(x)||!validTime(x.at))throw Error("Isi pesan atau jam tidak valid");
 if(x.who&&!["nonny","vini"].includes(x.who))throw Error("Pengirim tidak valid");
 if(x.type&&!TYPES.includes(x.type))throw Error("Tipe pesan tidak valid");
 if(typeof x.text!=="undefined"&&(typeof x.text!=="string"||x.text.length>85000))throw Error("Teks terlalu panjang");
 if(typeof x.title!=="undefined"&&(typeof x.title!=="string"||x.title.length>500))throw Error("Judul tidak valid");
 if(!x.who&&!x.type)throw Error("Pesan tanpa jenis");
 if(x.testimonial&&(!/^https:\/\/i\.ibb\.co(?:\.com)?\/[A-Za-z0-9/_\-.]+$/.test(x.testimonial.url||"")))throw Error("Alamat testimoni tidak aman");
 if(x.lpVideos&&(!Array.isArray(x.lpVideos)||x.lpVideos.some(v=>!/^[a-zA-Z0-9_-]{11}$/.test(v.id||""))))throw Error("Video tidak valid");
 if(x.demo&&!/^[a-z0-9-]+$/.test(x.demo.slug||""))throw Error("Nama ilustrasi tidak valid");
 return x;
}
function readJSON(txt){
 if(!txt||txt.length>MAX)throw Error("Ukuran backup terlalu besar");
 const obj=JSON.parse(txt);
 if(!obj||obj.version!==1||!obj.days)throw Error("Format backup tidak dikenali");
 for(const k of ["1","2"]){
  if(!Array.isArray(obj.days[k])||obj.days[k].length>900||!obj.days[k].length)throw Error("Daftar pesan Hari "+k+" tidak valid");
  obj.days[k].forEach(verifyItem);
 }
 return obj.days;
}
root.BadaiEditor={create:function(ctx){
 const original={1:COPY(ctx.catalog[1]),2:COPY(ctx.catalog[2])};
 const panel=ctx.document.getElementById("scriptEditor"),toggle=ctx.document.getElementById("editorToggle"),actions=ctx.document.getElementById("editorActions"),status=ctx.document.getElementById("editorStatus"),file=ctx.document.getElementById("editorImportFile");
 let on=false,open=null,timer=null,authorized=false,teamUserId="",loading=false;
 const sbURL="https://tlvxlekqrllkvcpgwmic.supabase.co";
 const pubKey="sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R";
 const allowedRoles=["owner","super_admin","admin","marketing","mentor"];
 const revisions={1:0,2:0},saving={1:false,2:false},dirty={1:false,2:false},conflicts={1:false,2:false};
 const day=()=>ctx.getDay(),current=()=>ctx.catalog[day()],locate=m=>current()?.indexOf(m)??-1;
 function state(t){status.textContent=t}
 async function session(){
  let data;
  try{data=JSON.parse(root.localStorage.getItem("badai_admin_session")||"null")}catch(e){}
  if(!data||!data.access_token||!data.user?.id)throw Error("Login dulu lewat halaman /admin");
  if(Number(data.expires_at||0)*1000<Date.now()+45000){
   if(!data.refresh_token)throw Error("Sesi admin habis, silakan login ulang");
   const r=await fetch(sbURL+"/auth/v1/token?grant_type=refresh_token",{
    method:"POST",headers:{"apikey":pubKey,"Content-Type":"application/json"},
    body:JSON.stringify({refresh_token:data.refresh_token})});
   if(!r.ok)throw Error("Sesi admin habis, login ulang");
   data=await r.json();root.localStorage.setItem("badai_admin_session",JSON.stringify(data));
  }
  return data;
 }
 async function api(path,opts){
  const auth=await session();
  const headers=Object.assign({"apikey":pubKey,"Authorization":"Bearer "+auth.access_token,"Content-Type":"application/json"},opts?.headers||{});
  const response=await fetch(sbURL+path,{method:opts?.method||"GET",headers:headers,body:opts?.body,cache:"no-store"});
  const raw=await response.text();let json=null;
  try{json=raw?JSON.parse(raw):null}catch(e){}
  if(!response.ok){
   const err=new Error(json?.message||json?.msg||"Server gagal ("+response.status+")");
   err.status=response.status;throw err;
  }
  return json;
 }
 async function authorize(){
  const auth=await session();
  const person=await api("/auth/v1/user");
  if(person?.id!==auth.user.id)throw Error("Identitas sesi tidak cocok");
  const team=await api("/rest/v1/admin_team_members?auth_user_id=eq."+encodeURIComponent(auth.user.id)+"&select=role,status");
  if(!Array.isArray(team)||!team.some(x=>x.status==="active"&&allowedRoles.includes(x.role)))throw Error("Akun bukan editor tim BADAI aktif");
  teamUserId=auth.user.id;authorized=true;
  toggle.hidden=false;
 }
 async function pull(showStatus){
  if(!authorized)return;
  try{
   const rows=await api("/rest/v1/training_script_documents?select=day,revision,content,updated_at");
   if(!Array.isArray(rows))throw Error("Respons naskah salah format");
   let hasUpdate=false;
   for(const row of rows){
    const k=String(row.day);
    if(k!=="1"&&k!=="2")continue;
    if(!Array.isArray(row.content)||row.content.length<1||row.content.length>900)throw Error("Naskah bersama tidak valid");
    row.content.forEach(verifyItem);
    if(row.revision>revisions[k]){
     if(dirty[k]||saving[k]||(open&&k===String(day()))){
      conflicts[k]=true;
      state("⚠ Rekan tim telah mengubah Hari "+k+". Unduh backup, lalu Muat Terbaru.");
      continue;
     }
     ctx.catalog[k].splice(0,ctx.catalog[k].length,...COPY(row.content));
     revisions[k]=row.revision;hasUpdate=true;
    }
   }
   if(hasUpdate)ctx.render();
   if(showStatus)state("✓ Naskah tim terhubung • revisi bersama siap diedit");
  }catch(e){state("Gagal sinkron: "+e.message)}
 }
 async function saveDay(k){
  if(!authorized){state("Login tim dibutuhkan untuk menyimpan");return}
  if(conflicts[k]){state("⚠ Konflik naskah Hari "+k+". Simpan backup dan Muat Terbaru.");return}
  if(saving[k])return;
  saving[k]=true;
  try{
   while(dirty[k]){
    dirty[k]=false;
    const body=COPY(ctx.catalog[k]);body.forEach(verifyItem);
    if(body.length>900||JSON.stringify(body).length>950000)throw Error("Naskah terlalu besar");
    state("Menyimpan naskah bersama Hari "+k+"...");
    if(!revisions[k]){
     const result=await api("/rest/v1/training_script_documents",{
      method:"POST",headers:{"Prefer":"return=representation"},
      body:JSON.stringify({day:Number(k),content:body,updated_by:teamUserId})});
     if(!result?.[0]?.revision)throw Error("Simpan awal tidak terkonfirmasi");
     revisions[k]=result[0].revision;
    }else{
     const result=await api("/rest/v1/rpc/save_training_script",{
      method:"POST",
      body:JSON.stringify({p_day:Number(k),p_expected_revision:revisions[k],p_content:body})});
     if(!result?.length){conflicts[k]=true;throw Error("Versi naskah sudah diubah rekan tim. Muat Terbaru untuk melihatnya.")}
     revisions[k]=result[0].revision;
    }
    state("✓ Tersimpan untuk tim • Hari "+k+" revisi "+revisions[k]);
   }
  }catch(e){
   if(e.status===409)conflicts[k]=true;
   dirty[k]=true;state("⚠ Belum tersimpan: "+e.message);
  }finally{saving[k]=false}
 }
 function persist(){
  root.clearTimeout(timer);
  const k=String(day());
  dirty[k]=true;void saveDay(k);
 }
 function soon(){
  root.clearTimeout(timer);
  dirty[String(day())]=true;
  timer=root.setTimeout(persist,1300);
 }
 async function reload(){
  if((dirty[1]||dirty[2]||open)&&!root.confirm("Ambil versi tim terbaru? Perubahan yang belum tersimpan akan hilang. Unduh backup dahulu."))return;
  open=null;root.clearTimeout(timer);
  dirty[1]=false;dirty[2]=false;conflicts[1]=false;conflicts[2]=false;
  revisions[1]=0;revisions[2]=0;
  ctx.catalog[1].splice(0,ctx.catalog[1].length,...COPY(original[1]));
  ctx.catalog[2].splice(0,ctx.catalog[2].length,...COPY(original[2]));
  await pull(true);ctx.render();
 }
 function rerender(m){
  ctx.render();
  if(m){const i=ctx.getItems().indexOf(m),node=ctx.document.getElementById("message-"+i);if(node)node.scrollIntoView({behavior:"smooth",block:"center"})}
 }
 function preview(){
  if(!open)return;
  const text=open.el.querySelector("[data-se-text]"),box=open.el.querySelector("[data-se-preview]");
  if(text&&box)box.innerHTML=ctx.format(text.value)||"<i>Pratinjau akan muncul di sini.</i>";
 }
 function save(closeEditor){
  if(!open)return;
  const el=open.el,m=open.msg,oldTime=m.at,area=el.querySelector("[data-se-text]"),at=el.querySelector("[data-se-at]"),title=el.querySelector("[data-se-title]"),who=el.querySelector("[data-se-who]"),layout=el.querySelector("[data-se-layout]"),align=el.querySelector("[data-se-align]");
  if(area)m.text=area.value;
  if(title)m.title=title.value;
  if(at&&validTime(at.value))m.at=at.value;
  if(who)m.who=who.value==="nonny"?"nonny":"vini";
  if(layout)m.layout=layouts.includes(layout.value)?layout.value:"normal";
  if(align)m.align=aligns.includes(align.value)?align.value:"left";
  if(m.at!==oldTime){
   const arr=current(),ix=arr.indexOf(m);if(ix>=0)arr.splice(ix,1);
   const target=arr.findIndex(x=>x.at&&validTime(x.at)&&minutes(x.at)>minutes(m.at));
   if(target<0)arr.push(m);else arr.splice(target,0,m);
  }
  if(closeEditor){open=null;persist();rerender(m)}
  else soon();
 }
 function close(){if(open)save(true)}
 function wrap(kind){
  if(!open)return;
  const el=open.el.querySelector("[data-se-text]"),a=el.selectionStart,b=el.selectionEnd,selected=el.value.slice(a,b);
  let replacement="",cursor=a;
  const symbol={bold:"*",italic:"_",strike:"~",mono:"\x60\x60\x60"}[kind];
  if(symbol){replacement=symbol+(selected||"teks")+symbol;cursor=a+symbol.length+(selected||"teks").length}
  else if(["quote","point","number"].includes(kind)){
   replacement=(selected||"tulis kalimat di sini").split("\n").map((x,i)=>(kind==="quote"?"> ":kind==="point"?"• ":(i+1)+". ")+x).join("\n");
   cursor=a+replacement.length;
  }else if(kind==="enter"){replacement="\n";cursor=a+1}else return;
  el.value=el.value.slice(0,a)+replacement+el.value.slice(b);
  el.focus();el.setSelectionRange(cursor,cursor);
  save(false);preview();
 }
 function edit(index){
  if(!on)return;
  close();
  const m=ctx.getItems()[index],node=ctx.document.getElementById("message-"+index);
  if(!node||!m||(!m.who&&m.type!=="hostnote"))return;
  const target=node.querySelector(".bubble")||node;
  const div=ctx.document.createElement("div");div.className="script-inline-edit";
  div.innerHTML='<div class="se-title"><b>✎ Edit '+(m.type==="hostnote"?"catatan host":"bubble WhatsApp")+'</b><small>Tersimpan untuk seluruh tim</small></div>'+
   '<div class="se-fields">'+(m.who?'<label>Pengirim<select data-se-who><option value="vini">Teh Vini</option><option value="nonny">Mbak Nonny</option></select></label>':"")+
   '<label>Jam<input type="time" data-se-at></label>'+
   ((m.type==="hostnote"||m.title!==undefined)?'<label class="se-full">Judul<input data-se-title type="text" maxlength="500"></label>':"")+
   '<label>Lebar<select data-se-layout><option value="normal">Normal</option><option value="wide">Lebar</option><option value="compact">Ringkas</option></select></label>'+
   '<label>Rata teks<select data-se-align><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></label></div>'+
   '<div class="se-format"><button data-se-format="bold"><b>B</b></button><button data-se-format="italic"><i>I</i></button><button data-se-format="strike"><s>S</s></button><button data-se-format="mono">Kode</button><button data-se-format="quote">❞ Quote</button><button data-se-format="point">• Poin</button><button data-se-format="number">1.2.3.</button><button data-se-format="enter">↵</button></div>'+
   '<textarea data-se-text rows="7" maxlength="85000" aria-label="Edit tulisan WhatsApp"></textarea>'+
   '<div class="se-preview-label">PREVIEW FORMAT WHATSAPP</div><div class="se-preview" data-se-preview></div>'+
   '<div class="se-commands"><button class="se-save" data-se-save>Simpan</button><button data-se-close>Tutup</button><button data-se-move="-1">↑ Naik</button><button data-se-move="1">↓ Turun</button><button data-se-dup>Duplikat</button><button data-se-add>+ Di bawah</button><button class="se-danger" data-se-delete>Hapus</button></div>';
  target.appendChild(div);open={el:div,msg:m};
  const select=(key,value)=>{const elem=div.querySelector("[data-se-"+key+"]");if(elem)elem.value=value};
  select("text",m.text||"");select("at",m.at);
  select("title",m.title||"");select("who",m.who||"vini");
  select("layout",layouts.includes(m.layout)?m.layout:"normal");select("align",aligns.includes(m.align)?m.align:"left");
  preview();div.scrollIntoView({block:"nearest",behavior:"smooth"});
  div.querySelector("[data-se-text]").focus();
 }
 function move(m,dir){
  close();const arr=current(),ix=arr.indexOf(m);if(ix<0)return;
  let to=-1;
  for(let i=ix+dir;i>=0&&i<arr.length;i+=dir){
   if(arr[i].who&&arr[i].at===m.at){to=i;break}
   if(arr[i].at&&arr[i].at!==m.at)break;
  }
  if(to<0){state("Untuk pindah sesi, edit jam bubble dulu.");return}
  const other=arr[to];arr[to]=m;arr[ix]=other;
  persist();rerender(m);
 }
 function add(after){
  close();
  const arr=current(),idx=after?arr.indexOf(after):-1;
  const m={who:after?.who||"vini",at:after?.at||"19:30",text:"Tulis pesan baru..."};
  if(idx<0)arr.push(m);else arr.splice(idx+1,0,m);
  persist();rerender(m);const ix=ctx.getItems().indexOf(m);if(ix>=0)edit(ix);
 }
 function duplicate(m){
  close();const arr=current(),idx=arr.indexOf(m);if(idx<0)return;
  const copy=COPY(m);arr.splice(idx+1,0,copy);persist();rerender(copy);
 }
 function remove(m){
  if(!root.confirm("Hapus pesan ini dari naskah bersama tim BADAI?"))return;
  close();const arr=current(),idx=arr.indexOf(m);if(idx>=0)arr.splice(idx,1);
  persist();rerender();
 }
 function exportData(){
  close();
  const data=JSON.stringify({version:1,exportedAt:new Date().toISOString(),days:{"1":ctx.catalog[1],"2":ctx.catalog[2]}},null,2);
  const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
  const a=ctx.document.createElement("a");a.href=url;a.download="BADAI-backup-naskah.json";ctx.document.body.appendChild(a);a.click();a.remove();
  root.setTimeout(()=>URL.revokeObjectURL(url),4000);
  state("Backup naskah bersama berhasil diunduh.");
 }
 async function importData(){
  const f=file.files&&file.files[0];if(!f)return;
  try{
   if(f.size>MAX)throw Error("File terlalu besar");
   const days=readJSON(await f.text());
   if(!root.confirm("Timpa naskah bersama Hari 1 dan Hari 2 dengan file backup ini?"))return;
   close();["1","2"].forEach(k=>{ctx.catalog[k].splice(0,ctx.catalog[k].length,...days[k]);dirty[k]=true;void saveDay(k)});rerender();
   state("✓ Berhasil mengimpor backup naskah.");
  }catch(e){state("Gagal impor: "+e.message)}finally{file.value=""}
 }
 function reset(){
  if(!root.confirm("Kembalikan naskah BERSAMA Hari "+day()+" ke versi awal website?"))return;
  close();const arr=current();arr.splice(0,arr.length,...COPY(original[day()]));persist();rerender();
 }
 function act(ev){
  if(!open)return;
  const el=ev.target.closest("[data-se-format],[data-se-save],[data-se-close],[data-se-move],[data-se-dup],[data-se-add],[data-se-delete]");
  if(!el)return;
  ev.preventDefault();const m=open.msg;
  if(el.dataset.seFormat){wrap(el.dataset.seFormat);return}
  if(el.hasAttribute("data-se-close")||el.hasAttribute("data-se-save")){close();return}
  if(el.hasAttribute("data-se-move")){move(m,Number(el.dataset.seMove));return}
  if(el.hasAttribute("data-se-dup")){duplicate(m);return}
  if(el.hasAttribute("data-se-add")){add(m);return}
  if(el.hasAttribute("data-se-delete")){remove(m);return}
 }
 async function mount(){
  toggle.hidden=true;actions.hidden=true;
  state("Memeriksa login tim BADAI...");
  try{await authorize();await pull(true)}
  catch(e){state("Mode baca • "+e.message+". Silakan login di /admin.");toggle.hidden=true}
  root.setInterval(function(){if(authorized&&!on&&!open&&!dirty[1]&&!dirty[2])void pull(false)},25000);
  toggle.addEventListener("click",function(){
   close();on=!on;panel.classList.toggle("editing",on);
   toggle.textContent=on?"✓ Selesai Edit":"✎ Mode Edit";
   toggle.setAttribute("aria-pressed",String(on));actions.hidden=!on;
   state(on?"Mode Edit tim aktif • perubahan otomatis disimpan di database BADAI":"Mode baca • naskah bersama tetap tersimpan");
   ctx.render();
  });
  actions.addEventListener("click",function(ev){
   const el=ev.target.closest("[data-editor-action]");if(!el)return;
   const op=el.dataset.editorAction;
   if(op==="add")add();else if(op==="export")exportData();else if(op==="import")file.click();else if(op==="reset")reset();else if(op==="reload")void reload();
  });
  file.addEventListener("change",importData);
  ctx.chat.addEventListener("click",function(ev){
   if(!on)return;
   if(ev.target.closest(".script-inline-edit")){act(ev);return}
   const el=ev.target.closest("[data-editor-open],[data-editor-add]");
   if(!el)return;const index=Number(el.dataset.editorOpen||el.dataset.editorAdd);
   const m=ctx.getItems()[index];
   if(el.hasAttribute("data-editor-add")){if(m?.who)add(m)}else edit(index);
  });
  ctx.chat.addEventListener("input",function(ev){
   if(!on||!open||!open.el.contains(ev.target))return;
   save(false);preview();
  });
  ctx.chat.addEventListener("change",function(ev){
   if(!on||!open||!open.el.contains(ev.target))return;
   save(false);preview();
  });
  ctx.chat.addEventListener("keydown",function(ev){
   if(!on||!open||ev.target!==open.el.querySelector("[data-se-text]"))return;
   if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="b"){ev.preventDefault();wrap("bold")}
   if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="i"){ev.preventDefault();wrap("italic")}
   if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();close()}
   if(ev.key==="Escape"){ev.preventDefault();close()}
  });
 }
 return{mount:mount,isOn:()=>on,
 button:index=>on?'<button type="button" class="se-quick" data-editor-open="'+index+'">✎ Edit</button><button type="button" class="se-quick secondary" data-editor-add="'+index+'">+ Bawah</button>':"",
 bubbleClass:m=>"se-layout-"+(layouts.includes(m.layout)?m.layout:"normal")+" se-align-"+(aligns.includes(m.align)?m.align:"left"),
 onDaySwitch:()=>close()};
}};
})(window);
