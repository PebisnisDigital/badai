// BADAI admin-only QR pairing bridge. No message publishing endpoints.
const SB = Deno.env.get("SUPABASE_URL") || "https://tlvxlekqrllkvcpgwmic.supabase.co";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const ZAWA = "https://api-zawa.azickri.com/session";
const ORIGINS = new Set([
  "https://badai.vercel.app",
  "https://badai-cuanify25-2175s-projects.vercel.app",
  "https://badai-git-main-cuanify25-2175s-projects.vercel.app",
  ...(Deno.env.get("WA_MARKETING_ALLOWED_ORIGINS")||"").split(",").filter(Boolean)
]);
const ADMIN_ROLES = new Set(["owner", "super_admin"]);

function headers(origin: string): Record<string,string> {
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://badai.vercel.app",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
}
function answer(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {status, headers:headers(origin)});
}
function object(v: unknown): Record<string,unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string,unknown> : {};
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function deepObjects(v: unknown): Record<string,unknown>[] {
  const root=object(v), output=[root];
  for (const key of ["data","result","session","connection","whatsapp"]) {
    const nested=object(root[key]);
    if(Object.keys(nested).length)output.push(nested);
  }
  return output;
}
async function httpJson(url:string, init:RequestInit, max=180000):Promise<{ok:boolean;status:number;data:unknown}> {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(url,{...init,signal:controller.signal,cache:"no-store"});
    const dataText=await res.text();
    if(dataText.length>max)throw Error("Respons dari server terlalu besar");
    let data:unknown={};
    if(dataText) {
      try{data=JSON.parse(dataText);}catch{throw Error("Server tidak mengembalikan JSON");}
    }
    return {ok:res.ok,status:res.status,data};
  } finally {clearTimeout(timeout);}
}
async function db(method:string,path:string,payload?:unknown):Promise<unknown> {
  const h:Record<string,string>={
    apikey:SERVICE,Authorization:"Bearer "+SERVICE,Accept:"application/json",
    "Content-Type":"application/json"
  };
  if(method!=="GET")h.Prefer="return=representation,resolution=merge-duplicates";
  const result=await httpJson(SB+"/rest/v1/"+path,{
    method,headers:h,body:payload===undefined?undefined:JSON.stringify(payload)
  },100000);
  if(!result.ok)throw Error("Database BADAI menolak operasi");
  return result.data;
}
async function authorize(req:Request) {
  if(!SERVICE||!ANON)throw Error("Secrets Supabase belum tersedia");
  const bearer=req.headers.get("Authorization")||"";
  const token=bearer.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!token||token.length>5000)return false;
  const response=await httpJson(SB+"/auth/v1/user",{
    headers:{apikey:ANON,Authorization:"Bearer "+token}
  },30000);
  const user=object(response.data);
  if(!response.ok||typeof user.id!=="string")return false;
  const rows=await db("GET","admin_team_members?auth_user_id=eq."+
    encodeURIComponent(user.id)+"&select=role,status&limit=1");
  const team=Array.isArray(rows)?object(rows[0]):{};
  return team.status==="active"&&ADMIN_ROLES.has(str(team.role));
}
async function loadSession():Promise<Record<string,unknown>|null> {
  const rows=await db("GET","wa_marketing_connection_secure?select=*&id=eq.1&limit=1");
  return Array.isArray(rows)&&rows.length?object(rows[0]):null;
}
function isConnected(objects:Record<string,unknown>[]) {
  // Current official response is top-level isConnected:boolean. Never infer a
  // connected session from ambiguous strings, readiness flags or nested fields.
  return objects[0]?.isConnected === true;
}
async function imageFor(objects:Record<string,unknown>[]):Promise<string|null> {
  const candidate=str(objects[0]?.qrcode);
  if(/^iVBOR[A-Za-z0-9+/=]+$/.test(candidate)&&candidate.length<180000)return "data:image/png;base64,"+candidate;
  return null;
}
function publicInfo(session:Record<string,unknown>|null) {
  if(!session)return {exists:false,connection_state:"not_created",qr:null,posting_enabled:false};
  return {exists:true,connection_state:"unverified",qr:null,posting_enabled:false,created_at:session.created_at};
}
async function status(session:Record<string,unknown>) {
  const id=str(session.provider_id), secret=str(session.session_secret);
  const result=await httpJson(ZAWA,{
    method:"GET",headers:{"id":id,"session-id":secret,"Accept":"application/json"}
  },220000);
  if(!result.ok) {
    return {exists:true,connection_state:result.status===404?"not_found":"provider_error",
      qr:null,posting_enabled:false,provider_http_status:result.status};
  }
  const objects=deepObjects(result.data);
  const connected=isConnected(objects);
  const qr=connected?null:await imageFor(objects);
  const state=connected?"connected":qr?"qr_ready":"waiting_for_qr";
  await db("PATCH","wa_marketing_connection_secure?id=eq.1",{
    state,checked_at:new Date().toISOString(),updated_at:new Date().toISOString()
  });
  return {exists:true,connection_state:state,qr,posting_enabled:false};
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin")||"";
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(origin&&!ORIGINS.has(origin))return answer({error:"Origin tidak diizinkan."},403,origin);
  if(req.method!=="GET"&&req.method!=="POST")return answer({error:"Metode tidak didukung."},405,origin);
  try{
    if(!await authorize(req))return answer({error:"Hanya Owner atau Super Admin BADAI yang bisa menghubungkan WhatsApp."},403,origin);
    const previous=await loadSession();
    if(req.method==="GET"){
      if(!previous)return answer(publicInfo(null),200,origin);
      try{return answer(await status(previous),200,origin);}
      catch{return answer({...publicInfo(previous),connection_state:"provider_unavailable",
        message:"Status Zawa belum dapat dibaca. Pastikan endpoint sesi Zawa aktif."},200,origin);}
    }
    const body=object(await req.json().catch(()=>({})));
    const action=str(body.action);
    if(!["create","replace"].includes(action))return answer({error:"Aksi tidak dikenal."},400,origin);
    if(previous&&action==="create")return answer({error:"Sesi sudah ada. Gunakan Periksa Koneksi atau buat ulang dengan konfirmasi."},409,origin);
    if(previous&&action==="replace"&&body.confirm!==true)
      return answer({error:"Konfirmasi penggantian sesi diperlukan."},400,origin);
    const created=await httpJson(ZAWA,{method:"POST",headers:{"Accept":"application/json"}},25000);
    const data=object(created.data);
    const inside=object(data.data);
    const id=str(data.id)||str(inside.id);
    const secret=str(data.sessionId)||str(inside.sessionId);
    if(!created.ok||id.length<5||secret.length<5||id.length>200||secret.length>200)
      return answer({error:"Zawa belum berhasil membuat sesi. Periksa layanan Zawa dan coba lagi."},502,origin);
    await db("POST","wa_marketing_connection_secure?on_conflict=id",{
      id:1,provider:"zawa",provider_id:id,session_secret:secret,
      state:"created",created_at:new Date().toISOString(),updated_at:new Date().toISOString()
    });
    // Credentials must never be returned to the browser or logged.
    const current=await loadSession();
    try {return answer(await status(current||{provider_id:id,session_secret:secret}),200,origin);}
    catch{return answer({exists:true,connection_state:"created",qr:null,posting_enabled:false,
      message:"Sesi berhasil dibuat. QR belum tersedia; klik Periksa Koneksi."},200,origin);}
  } catch {
    return answer({error:"Gagal memproses koneksi WhatsApp. Periksa layanan dan sesi Admin BADAI."},503,origin);
  }
});

export {};
