/* UI accordion Marketing BADAI, 51 Conversion Cards */
(function(root){
 "use strict";
 root.BADAI_MARKETING_RENDER=function(m,i,ctx){
  const d=ctx.document.createElement("details");
  d.className="marketing-card";
  d.dataset.marketingSearch=(String(m.marketing.name||"")+" "+String(m.text||"")).toLowerCase();
  const n=Number(m.marketing.number)||i+1,name=String(m.marketing.name||"CONVERSION CARD");
  const src=typeof m.imageUrl==="string"&&/^https:\/\/[a-z0-9][a-z0-9.-]+(?:\/|$)/i.test(m.imageUrl)&&m.imageUrl.length<=1000?m.imageUrl:"";
  // Gambar hanya ditampilkan jika tim sudah mengisi aset asli.
  const image=src?
    '<div class="marketing-image"><img loading="lazy" src="'+ctx.esc(src)+'" alt="Gambar promosi '+ctx.esc(name)+'"><a href="'+ctx.esc(src)+'" target="_blank" rel="noopener noreferrer">Lihat gambar</a></div>':"";
  d.innerHTML='<summary class="marketing-summary"><span class="marketing-card-number">'+String(n).padStart(2,"0")+'</span><strong class="marketing-card-title">'+ctx.esc(name)+'</strong><span class="marketing-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="bubble marketing-bubble">'+image+
  '<div class="message">'+ctx.fmt(m.text||"")+'</div><div class="bubble-meta">'+
  '<button class="bubble-copy" type="button" data-copy-index="'+i+'">⧉ Salin WA</button>'+  (src?'<button class="marketing-download" type="button" data-marketing-download="'+n+'">↓ Unduh Gambar</button>':"")+
  (ctx.editor?ctx.editor.button(i):"")+'</div></div>';
  return d;
 };
 root.BADAI_MARKETING_SEARCH=function(chat,input,count){
  input.addEventListener("input",function(){
   const q=String(input.value||"").toLowerCase().trim();
   input.closest(".marketing-toolbar")?.classList.toggle("has-query",Boolean(q));
   let visible=0;
   chat.querySelectorAll(".marketing-card").forEach(function(el){
    const show=!q||String(el.dataset.marketingSearch||"").includes(q);
    el.hidden=!show;if(show)visible++;
   });
   count.textContent=visible+" dari 51 copywriting";
  });
  chat.addEventListener("click",async function(ev){
   const trigger=ev.target.closest("button[data-marketing-download]");
   if(!trigger)return;
   ev.preventDefault();
   const card=trigger.closest(".marketing-card");
   const src=card?.querySelector(".marketing-image img")?.src;
   const num=Number(trigger.dataset.marketingDownload);
   if(!src||!/^[1-9]\d*$/.test(String(num)))return;
   const original=trigger.textContent;
   trigger.disabled=true;trigger.textContent="Menyiapkan gambar...";
   try{
    const res=await fetch(src,{mode:"cors"});
    if(!res.ok)throw new Error("Gambar tidak bisa diunduh ("+res.status+")");
    const image=await res.blob();
    if(image.type&&image.type!=="image/webp")throw new Error("Berkas bukan WebP");
    const url=URL.createObjectURL(image);
    const a=document.createElement("a");
    a.href=url;a.download="BADAI_Conversion_Card_"+String(num).padStart(2,"0")+".webp";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
   }catch(e){
    trigger.textContent="Gagal unduh • buka gambar di atas";
    return;
   }finally{
    trigger.disabled=false;
    if(trigger.textContent==="Menyiapkan gambar...")trigger.textContent=original;
   }
  });
  chat.addEventListener("toggle",function(ev){
   if(!ev.target.matches?.(".marketing-card")||!ev.target.open)return;
   chat.querySelectorAll(".marketing-card[open]").forEach(function(el){if(el!==ev.target)el.open=false;});
  },true);
 };
})(window);
