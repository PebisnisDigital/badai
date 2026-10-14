// BADAI Zawa destination sync: group and channel directory only, no sending, no members/messages.
const PROJECT = Deno.env.get("SUPABASE_URL") || "https://tlvxlekqrllkvcpgwmic.supabase.co";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const PROVIDER = "https://api-zawa.azickri.com";
const ALLOWED_ORIGINS = new Set([
  "https://badai.vercel.app",
  "https://badai-cuanify25-2175s-projects.vercel.app",
  "https://badai-git-main-cuanify25-2175s-projects.vercel.app",
  ...(Deno.env.get("WA_MARKETING_ALLOWED_ORIGINS")||"").split(",").filter(Boolean)
]);
const ALLOWED_ROLES = new Set(["owner","super_admin"]);
type Obj = Record<string,unknown>;
function record(x:unknown):Obj {return x&&typeof x==="object"&&!Array.isArray(x)?x as Obj:{}}
function value(x:unknown):string {
  if(typeof x==="string")return x.trim();
  if(typeof x==="number"&&Number.isFinite(x))return String(x);
  if(x&&typeof x==="object"){const o=record(x);return value(o._serialized||o.id||o.jid);}
  return "";
}
function cors(origin:string):Record<string,string>{
  return {"Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(origin)?origin:"https://badai.vercel.app",
    "Access-Control-Allow-Methods":"OPTIONS, POST",
    "Access-Control-Allow-Headers":"apikey,authorization,content-type,x-client-info",
    "Access-Control-Max-Age":"600","Vary":"Origin",
    "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
}
function reply(origin:string,status:number,data:Obj):Response{
  return new Response(JSON.stringify(data),{status,headers:cors(origin)});
}
async function request(url:string,options:RequestInit={},timeoutMs=13000,maxLen=650000):Promise<{code:number,ok:boolean,data:unknown}>{
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const resp=await fetch(url,{...options,signal:ctrl.signal,cache:"no-store"});
    const body=await resp.text();
    if(body.length>maxLen)throw Error("Ukuran respons penyedia melebihi batas");
    let parsed:unknown=null;
    if(body){try{parsed=JSON.parse(body)}catch{parsed=null}}
    return {code:resp.status,ok:resp.ok,data:parsed};
  }finally{clearTimeout(timer);}
}
async function db(method:string,path:string,body?:unknown,prefer?:string):Promise<unknown>{
  if(!SERVICE)throw Error("Konfigurasi Supabase belum lengkap");
  const headers:Record<string,string>={apikey:SERVICE,Authorization:"Bearer "+SERVICE,"Content-Type":"application/json",Accept:"application/json"};
  if(prefer)headers.Prefer=prefer;
  const res=await request(PROJECT+"/rest/v1/"+path,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body)
  },13000,200000);
  if(!res.ok)throw Error("Database BADAI menolak sinkronisasi ("+res.code+")");
  return res.data;
}
async function hasPermission(req:Request):Promise<boolean>{
  if(!ANON||!SERVICE)return false;
  const token=req.headers.get("Authorization")?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!token||token.length>5000)return false;
  const u=await request(PROJECT+"/auth/v1/user",{
    headers:{apikey:ANON,Authorization:"Bearer "+token}
  },9000,30000);
  if(!u.ok||!value(record(u.data).id))return false;
  const rows=await db("GET","admin_team_members?auth_user_id=eq."+
    encodeURIComponent(value(record(u.data).id))+"&select=role,status&limit=1");
  const team=Array.isArray(rows)?record(rows[0]):{};
  return team.status==="active"&&ALLOWED_ROLES.has(value(team.role));
}

type Target = {kind:string,external_id:string,name:string,origin:string,enabled:boolean};
type Parsed = {rows:Target[],total:number};
function isTargetId(id:string,kind:"group"|"channel"){
  if(id.length<5||id.length>200)return false;
  if(kind==="group"&&id.endsWith("@g.us"))return true;
  if(kind==="channel"&&id.endsWith("@newsletter"))return true;
  return false; // Do not mistake phone numbers or member IDs for destinations.
}
async function providerList(kind:"group"|"channel",id:string,session:string){
  // Official contracts: GET /group or GET /channel, {docs:[...] }.
  const path=kind==="group"?"/group":"/channel";
  const res=await request(PROVIDER+path,{method:"GET",redirect:"error",
    headers:{id,"session-id":session,Accept:"application/json"}},25000,650000);
  const body=record(res.data);
  if(!res.ok||!Array.isArray(body.docs))return {path:null,rows:[] as Target[],total:0,attempts:[{path,status:res.code}]};
  const rows:Target[]=[];
  const unique=new Set<string>();
  for(const item of body.docs){
    const itemData=record(item),external=value(itemData.id),name=value(itemData.name);
    if(!name||!isTargetId(external,kind)||unique.has(external))continue;
    if(kind==="channel"&&itemData.isOwner!==true)continue;
    unique.add(external);
    rows.push({kind,external_id:external,name:name.slice(0,140),origin:"sync",enabled:false});
  }
  return {path,rows:rows.slice(0,350),total:rows.length,attempts:[] as Array<{path:string,status:number}>};
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin")||"";
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(origin&&!ALLOWED_ORIGINS.has(origin))return reply(origin,403,{error:"Origin tidak diizinkan"});
  if(req.method!=="POST")return reply(origin,405,{error:"Gunakan POST"});
  try{
    if(!await hasPermission(req))return reply(origin,403,{error:"Sinkronisasi hanya untuk Owner atau Super Admin BADAI."});
    const body=record(await req.json().catch(()=>({})));
    const kind=value(body.kind);
    if(kind!=="group"&&kind!=="channel")return reply(origin,400,{error:"Jenis harus group atau channel."});
    const stored=await db("GET","wa_marketing_connection_secure?select=provider_id,session_secret,state&id=eq.1&limit=1");
    const session=Array.isArray(stored)?record(stored[0]):{};
    const id=value(session.provider_id),secret=value(session.session_secret);
    if(!id||!secret)return reply(origin,409,{error:"Hubungkan WhatsApp di menu Koneksi WA lebih dulu."});
    const remote=await providerList(kind,id,secret);
    if(remote.path===null){
      const details=remote.attempts.map(x=>x.path+" ("+x.status+")").join(", ").slice(0,1250);
      return reply(origin,502,{error:"Daftar "+(kind==="group"?"Grup":"Channel")+" belum bisa dibaca dari Zawa. Endpoint API atau sesi perlu diverifikasi.",
        tested:details,synced:0});
    }
    const existingList=await db("GET","wa_marketing_targets?kind=eq."+kind+"&select=kind,external_id,name,origin,enabled");
    const existing=new Map<string,Obj>();
    for(const entry of Array.isArray(existingList)?existingList:[]) {
      const item=record(entry);existing.set(value(item.external_id),item);
    }
    const payload=remote.rows.map(entry=>{
      const previous=existing.get(entry.external_id);
      if(!previous)return entry;
      return {...entry,
        name:previous.origin==="manual"?value(previous.name):entry.name,
        origin:value(previous.origin)||"sync",
        enabled:previous.enabled===true
      };
    });
    if(payload.length){
      await db("POST","wa_marketing_targets?on_conflict=kind,external_id",payload,
        "resolution=merge-duplicates,return=minimal");
    }
    return reply(origin,200,{
      ok:true,kind,source:"zawa",found:remote.total,matched:remote.rows.length,
      added:remote.rows.filter(x=>!existing.has(x.external_id)).length,
      preserved:remote.rows.filter(x=>existing.has(x.external_id)).length,
      truncated:remote.total>1000||remote.rows.length>350,
      endpoint:remote.path,posting_enabled:false,
      message:"Daftar diperbarui. Tujuan baru nonaktif sampai dipilih untuk kampanye."
    });
  }catch{
    return reply(origin,503,{error:"Sinkronisasi belum berhasil. Coba lagi; tidak ada pesan WhatsApp yang dikirim."});
  }
});

export {};
