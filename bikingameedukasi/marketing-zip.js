/* BADAI: unzip numbered WebP creatives for team import. No third-party zip library. */
(function(root){
"use strict";
function fail(message){throw new Error(message)}
function word(d,o){return d.getUint16(o,true)}
function dword(d,o){return d.getUint32(o,true)}
function webp(a){return a.length>=20&&String.fromCharCode(...a.slice(0,4))==="RIFF"&&String.fromCharCode(...a.slice(8,12))==="WEBP"}
async function inflate(raw){
 try{
  const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buf=await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
 }catch(e){fail("Browser tidak mendukung ekstraksi ZIP ini. Gunakan Chrome terbaru. ("+String(e.message).slice(0,100)+")")}
}
async function extract(file){
 if(!file||!/\.zip$/i.test(file.name))fail("Pilih file ZIP 51 Poster BADAI.");
 if(file.size>20000000)fail("File ZIP lebih dari batas 20 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length<22)fail("ZIP tidak lengkap.");
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65558);i--){if(dword(dv,i)===0x06054b50){eocd=i;break}}
 if(eocd<0)fail("Bagian indeks ZIP tidak ditemukan.");
 const total=word(dv,eocd+10),directory=dword(dv,eocd+16);
 if(total>200||total<51||directory>=bytes.length)fail("Jumlah file ZIP tidak sesuai.");
 const decoder=new TextDecoder("utf-8"),images=new Map();
 let offset=directory;
 for(let i=0;i<total;i++){
  if(offset+46>bytes.length||dword(dv,offset)!==0x02014b50)fail("ZIP rusak (daftar file).");
  const method=word(dv,offset+10),csize=dword(dv,offset+20),usize=dword(dv,offset+24);
  const flen=word(dv,offset+28),extra=word(dv,offset+30),comment=word(dv,offset+32);
  const local=dword(dv,offset+42),end=offset+46+flen+extra+comment;
  if(end>bytes.length||local+30>bytes.length)fail("ZIP rusak (lokasi file).");
  const name=decoder.decode(bytes.slice(offset+46,offset+46+flen));
  offset=end;
  const match=name.match(/(?:^|\/)BADAI_Conversion_Card_(\d{2})\.webp$/i);
  if(!match)continue;
  const n=Number(match[1]);
  if(n<1||n>51||images.has(n))fail("Nomor kartu duplikat/tidak valid: "+match[1]);
  if(usize>1000000||usize<1000||csize>1000000)fail("Ukuran gambar #"+n+" tidak wajar.");
  if(dword(dv,local)!==0x04034b50)fail("ZIP rusak (gambar #"+n+").");
  const localName=word(dv,local+26),localExtra=word(dv,local+28),start=local+30+localName+localExtra;
  if(start+csize>bytes.length)fail("ZIP rusak (data gambar #"+n+").");
  const zipped=bytes.slice(start,start+csize);
  let image;
  if(method===0)image=zipped;
  else if(method===8)image=await inflate(zipped);
  else fail("Metode kompresi ZIP tidak didukung.");
  if(image.length!==usize||!webp(image))fail("Gambar #"+n+" tidak valid sebagai WebP.");
  images.set(n,image);
 }
 if(images.size!==51)fail("ZIP hanya berisi "+images.size+" gambar bernomor. Diperlukan 51.");
 return [...images.entries()].sort((a,b)=>a[0]-b[0]).map(([number,bytes])=>({number,bytes}));
}
async function upload(images,credentials,onProgress){
 const endpoint=credentials.sbURL.replace(/\/$/,""),result=[];
 let next=0,done=0;
 async function worker(){
  while(next<images.length){
   const job=images[next++],n=job.number;
   const digest=await crypto.subtle.digest("SHA-256",job.bytes);
   const hash=Array.from(new Uint8Array(digest)).slice(0,8).map(x=>x.toString(16).padStart(2,"0")).join("");
   const name="card-"+String(n).padStart(2,"0")+"-"+hash+".webp";
   const path="badai-marketing-posters/"+name;
   const session=await credentials.session();
   const response=await fetch(endpoint+"/storage/v1/object/"+path,{
    method:"POST",
    headers:{"apikey":credentials.pubKey,"Authorization":"Bearer "+session.access_token,"Content-Type":"image/webp","x-upsert":"true","cache-control":"31536000"},
    body:new Blob([job.bytes],{type:"image/webp"})
   });
   if(!response.ok){
    const t=await response.text();
    throw new Error("Gagal unggah gambar #"+n+" ("+response.status+"): "+t.slice(0,150));
   }
   result[n]=endpoint+"/storage/v1/object/public/"+path;
   done++;onProgress(done,images.length);
  }
 }
 await Promise.all(Array.from({length:Math.min(4,images.length)},()=>worker()));
 return result;
}
root.BADAI_MARKETING_ZIP={extract,upload};
})(window);
