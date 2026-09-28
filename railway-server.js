const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { Readable } = require('stream');
const crypto = require('crypto');
const Busboy = require('busboy');
const { google } = require('googleapis');

const landing = require('./api/landing-v6.js');
const admin = require('./api/admin-v5.js');
const akses = require('./api/admin-v3.js');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const BUILD_REV = 'badai-staging-mentor-hot-archive-v1';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tlvxlekqrllkvcpgwmic.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const MENTOR_ARCHIVE_SECRET = process.env.MENTOR_ARCHIVE_SECRET || '';
const MENTOR_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_MENTOR_FOLDER_ID || '';
const GOOGLE_OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://badai.up.railway.app/api/mentor/google/callback';

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.txt':'text/plain; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.gif':'image/gif',
  '.ico':'image/x-icon',
  '.woff':'font/woff',
  '.woff2':'font/woff2',
  '.mp4':'video/mp4',
  '.webm':'video/webm'
};

function decorateReqRes(req, res) {
  const base = 'http://' + (req.headers.host || 'localhost');
  const url = new URL(req.url || '/', base);
  req.query = Object.fromEntries(url.searchParams.entries());
  req.path = url.pathname;

  res.status = function(code){
    res.statusCode = Number(code) || 200;
    return res;
  };
  res.send = function(payload){
    if (res.writableEnded) return res;
    if (payload == null) payload = '';
    if (Buffer.isBuffer(payload)) {
      res.end(payload);
      return res;
    }
    if (typeof payload === 'object') {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type','application/json; charset=utf-8');
      }
      res.end(JSON.stringify(payload));
      return res;
    }
    res.end(String(payload));
    return res;
  };
  res.json = function(payload){
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.send(payload);
  };
}

async function collectBody(req){
  if (!['POST','PUT','PATCH'].includes(String(req.method || '').toUpperCase())) return;
  const type = String(req.headers['content-type'] || '');
  if (type.includes('multipart/form-data')) return;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  req.rawBody = raw;
  if (type.includes('application/json')) {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  } else {
    req.body = raw;
  }
}

function safeStaticPath(urlPath){
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
  if (!normalized || normalized.startsWith('..') || normalized.includes('/../')) return null;
  const absolute = path.resolve(ROOT, normalized);
  if (!absolute.startsWith(path.resolve(ROOT) + path.sep)) return null;
  return absolute;
}

function serveStatic(req, res, pathname){
  const absolute = safeStaticPath(pathname);
  if (!absolute) return false;

  let file = absolute;
  try {
    const stat = fs.statSync(file);
    if (stat.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    return false;
  }

  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return false;
    const ext = path.extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    const noStore = ext === '.html' || pathname === '/akses/auth.js';
    res.setHeader('Cache-Control', noStore ? 'no-store, max-age=0' : 'public, max-age=300');
    fs.createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

let mentorGoogleOauthCache={loadedAt:0,refreshToken:'',googleEmail:'',connectedAt:null};

async function loadStoredGoogleOauth(force){
  if(!MENTOR_ARCHIVE_SECRET || !SUPABASE_ANON_KEY) return mentorGoogleOauthCache;
  if(!force && mentorGoogleOauthCache.loadedAt && Date.now()-mentorGoogleOauthCache.loadedAt<60000){
    return mentorGoogleOauthCache;
  }
  try{
    const rows=await supabaseRpc('mentor_google_oauth_get',{p_worker_secret:MENTOR_ARCHIVE_SECRET});
    const row=Array.isArray(rows)?rows[0]:rows;
    mentorGoogleOauthCache={
      loadedAt:Date.now(),
      refreshToken:String(row?.refresh_token||''),
      googleEmail:String(row?.google_email||''),
      connectedAt:row?.connected_at||null
    };
  }catch(error){
    console.warn('Mentor Google OAuth cache:',error?.message||error);
    mentorGoogleOauthCache={loadedAt:Date.now(),refreshToken:'',googleEmail:'',connectedAt:null};
  }
  return mentorGoogleOauthCache;
}

async function createDriveAuth(){
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  let refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

  if(!refreshToken && clientId && clientSecret){
    const stored=await loadStoredGoogleOauth(false);
    refreshToken=stored.refreshToken||'';
  }

  if(refreshToken && clientId && clientSecret){
    const oauth = new google.auth.OAuth2(clientId,clientSecret,GOOGLE_OAUTH_REDIRECT_URI);
    oauth.setCredentials({refresh_token:refreshToken});
    return oauth;
  }

  const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if(serviceAccountRaw){
    const credentials = JSON.parse(serviceAccountRaw);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes:['https://www.googleapis.com/auth/drive']
    });
    return auth;
  }

  return null;
}

async function mentorDriveConfigured(){
  if(!MENTOR_DRIVE_FOLDER_ID) return false;
  if(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return true;
  const clientId=process.env.GOOGLE_CLIENT_ID||'';
  const clientSecret=process.env.GOOGLE_CLIENT_SECRET||'';
  if(!clientId || !clientSecret) return false;
  if(process.env.GOOGLE_DRIVE_REFRESH_TOKEN) return true;
  const stored=await loadStoredGoogleOauth(false);
  return Boolean(stored.refreshToken);
}

async function driveClient(){
  const auth = await createDriveAuth();
  if(!auth) throw new Error('Google Drive Mentor belum terhubung.');
  return google.drive({version:'v3',auth});
}

function signedMentorFileUrl(fileId){
  if(!MENTOR_ARCHIVE_SECRET) return '';
  const sig = crypto.createHmac('sha256',MENTOR_ARCHIVE_SECRET).update(String(fileId)).digest('hex');
  return '/api/mentor/file?id='+encodeURIComponent(fileId)+'&sig='+sig;
}

function verifyMentorFileSignature(fileId,sig){
  if(!fileId || !sig || !MENTOR_ARCHIVE_SECRET) return false;
  const expected = crypto.createHmac('sha256',MENTOR_ARCHIVE_SECRET).update(String(fileId)).digest('hex');
  try{
    return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(sig)));
  }catch{
    return false;
  }
}

async function verifySupabaseBearer(token){
  if(!token || !SUPABASE_ANON_KEY) return null;
  const res = await fetch(SUPABASE_URL+'/auth/v1/user',{
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}
  });
  if(!res.ok) return null;
  return await res.json().catch(()=>null);
}

async function supabaseRpc(name,body,authorization){
  const headers={
    apikey:SUPABASE_ANON_KEY,
    'Content-Type':'application/json'
  };
  if(authorization) headers.Authorization=authorization;
  const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers,
    body:JSON.stringify(body||{})
  });
  const text=await res.text();
  let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!res.ok) throw new Error((data&&(data.message||data.error||data.msg))||('RPC '+name+' gagal'));
  return data;
}

async function verifyAdminBearer(token){
  const user=await verifySupabaseBearer(token);
  if(!user?.id) return null;
  const res=await fetch(
    SUPABASE_URL+'/rest/v1/admin_team_members?auth_user_id=eq.'+encodeURIComponent(user.id)+'&status=eq.active&select=id,role,status&limit=1',
    {headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}}
  );
  if(!res.ok) return null;
  const rows=await res.json().catch(()=>[]);
  const team=rows?.[0]||null;
  if(!team || !['owner','super_admin'].includes(team.role)) return null;
  return {user,team};
}

function googleOauthState(){
  const ts=String(Date.now());
  const sig=crypto.createHmac('sha256',MENTOR_ARCHIVE_SECRET).update('google-oauth:'+ts).digest('hex');
  return ts+'.'+sig;
}

function verifyGoogleOauthState(value){
  const raw=String(value||'');
  const dot=raw.indexOf('.');
  if(dot<1 || !MENTOR_ARCHIVE_SECRET) return false;
  const ts=raw.slice(0,dot);
  const sig=raw.slice(dot+1);
  const age=Date.now()-Number(ts);
  if(!Number.isFinite(age) || age<0 || age>15*60*1000) return false;
  const expected=crypto.createHmac('sha256',MENTOR_ARCHIVE_SECRET).update('google-oauth:'+ts).digest('hex');
  try{return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}
}

async function handleGoogleOauthConnect(req,res){
  const clientId=process.env.GOOGLE_CLIENT_ID||'';
  const clientSecret=process.env.GOOGLE_CLIENT_SECRET||'';
  if(!clientId || !clientSecret){
    return res.status(503).json({error:'Google OAuth Client ID/Secret belum dipasang di Railway.'});
  }

  const authHeader=String(req.headers.authorization||'');
  const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
  const adminUser=await verifyAdminBearer(token);
  if(!adminUser) return res.status(403).json({error:'Hanya Owner atau Super Admin yang dapat menyambungkan Google Drive.'});

  const oauth=new google.auth.OAuth2(clientId,clientSecret,GOOGLE_OAUTH_REDIRECT_URI);
  const url=oauth.generateAuthUrl({
    access_type:'offline',
    prompt:'consent',
    include_granted_scopes:true,
    state:googleOauthState(),
    scope:[
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ]
  });
  return res.status(200).json({ok:true,url});
}

async function handleGoogleOauthCallback(req,res){
  const clientId=process.env.GOOGLE_CLIENT_ID||'';
  const clientSecret=process.env.GOOGLE_CLIENT_SECRET||'';
  const code=String(req.query.code||'');
  const state=String(req.query.state||'');
  const oauthError=String(req.query.error||'');

  if(oauthError){
    res.statusCode=302;
    res.setHeader('Location','/admin?mentor_drive=error&reason='+encodeURIComponent(oauthError));
    return res.end();
  }
  if(!clientId || !clientSecret || !code || !verifyGoogleOauthState(state)){
    return res.status(400).send('Otorisasi Google Drive tidak valid atau sudah kedaluwarsa.');
  }

  const oauth=new google.auth.OAuth2(clientId,clientSecret,GOOGLE_OAUTH_REDIRECT_URI);
  const tokenResult=await oauth.getToken(code);
  const tokens=tokenResult.tokens||{};
  oauth.setCredentials(tokens);

  let refreshToken=String(tokens.refresh_token||'');
  if(!refreshToken){
    const stored=await loadStoredGoogleOauth(true);
    refreshToken=stored.refreshToken||'';
  }
  if(!refreshToken) return res.status(400).send('Google tidak memberikan refresh token. Ulangi sambungan dan izinkan akses Drive.');

  let googleEmail='';
  try{
    const oauth2=google.oauth2({version:'v2',auth:oauth});
    const me=await oauth2.userinfo.get();
    googleEmail=String(me.data?.email||'');
  }catch(_){}

  await supabaseRpc('mentor_google_oauth_set',{
    p_worker_secret:MENTOR_ARCHIVE_SECRET,
    p_refresh_token:refreshToken,
    p_google_email:googleEmail||null,
    p_scope:String(tokens.scope||'')||null
  });
  mentorGoogleOauthCache={loadedAt:Date.now(),refreshToken,googleEmail,connectedAt:new Date().toISOString()};

  // Verify that the selected Drive folder is actually reachable before declaring success.
  const drive=await driveClient();
  await drive.files.get({fileId:MENTOR_DRIVE_FOLDER_ID,fields:'id,name',supportsAllDrives:true});

  res.statusCode=302;
  res.setHeader('Location','/admin?mentor_drive=connected');
  return res.end();
}

function parseMentorMultipart(req){
  return new Promise((resolve,reject)=>{
    const bb=Busboy({
      headers:req.headers,
      limits:{files:1,fileSize:10*1024*1024,fields:10}
    });
    const fields={};
    let fileData=null;
    let failed=false;

    bb.on('field',(name,value)=>{fields[name]=value});
    bb.on('file',(name,file,info)=>{
      const chunks=[];
      let size=0;
      file.on('data',chunk=>{size+=chunk.length;chunks.push(chunk)});
      file.on('limit',()=>{failed=true;reject(new Error('File maksimal 10 MB.'))});
      file.on('end',()=>{
        if(failed) return;
        fileData={
          field:name,
          name:String(info.filename||'file'),
          mime:String(info.mimeType||'application/octet-stream'),
          size,
          buffer:Buffer.concat(chunks)
        };
      });
    });
    bb.on('error',reject);
    bb.on('finish',()=>{
      if(failed) return;
      if(!fileData) return reject(new Error('File belum dipilih.'));
      resolve({fields,file:fileData});
    });
    req.pipe(bb);
  });
}

function safeDriveName(value){
  return String(value||'BADAI').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,90) || 'BADAI';
}

function driveQ(value){
  return String(value||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

async function findOrCreateDriveFolder(drive,name,parentId){
  const q=[
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    "name='"+driveQ(name)+"'",
    "'"+driveQ(parentId)+"' in parents"
  ].join(' and ');
  const found=await drive.files.list({
    q,
    fields:'files(id,name)',
    pageSize:1,
    supportsAllDrives:true,
    includeItemsFromAllDrives:true
  });
  if(found.data.files && found.data.files[0]) return found.data.files[0].id;

  const created=await drive.files.create({
    requestBody:{name,mimeType:'application/vnd.google-apps.folder',parents:[parentId]},
    fields:'id',
    supportsAllDrives:true
  });
  return created.data.id;
}

async function uploadDriveBuffer(drive,parentId,name,mime,buffer){
  const result=await drive.files.create({
    requestBody:{name,parents:[parentId]},
    media:{mimeType:mime,body:Readable.from(buffer)},
    fields:'id,name,mimeType,size,webViewLink',
    supportsAllDrives:true
  });
  return result.data;
}

async function handleMentorUpload(req,res){
  if(!(await mentorDriveConfigured())){
    return res.status(503).json({
      error:'Google Drive Mentor belum terhubung. Chat teks dan stiker sudah aktif; file/gambar akan aktif setelah koneksi Drive dipasang.'
    });
  }

  const authHeader=String(req.headers.authorization||'');
  const token=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
  const user=await verifySupabaseBearer(token);
  if(!user?.id) return res.status(401).json({error:'Session tidak valid.'});

  const parsed=await parseMentorMultipart(req);
  const conversationId=String(parsed.fields.conversation_id||'').trim();
  if(!conversationId) return res.status(400).json({error:'Percakapan Mentor belum tersedia.'});

  const check=await fetch(
    SUPABASE_URL+'/rest/v1/mentor_conversations?id=eq.'+encodeURIComponent(conversationId)+'&select=id',
    {headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}}
  );
  const rows=check.ok?await check.json().catch(()=>[]):[];
  if(!check.ok || !rows?.length) return res.status(403).json({error:'Tidak punya akses ke percakapan ini.'});

  const drive=await driveClient();
  const attachmentRoot=await findOrCreateDriveFolder(drive,'ATTACHMENTS',MENTOR_DRIVE_FOLDER_ID);
  const conversationFolder=await findOrCreateDriveFolder(drive,conversationId,attachmentRoot);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const fileName=stamp+'__'+safeDriveName(parsed.file.name);
  const saved=await uploadDriveBuffer(drive,conversationFolder,fileName,parsed.file.mime,parsed.file.buffer);

  return res.status(200).json({
    ok:true,
    id:saved.id,
    name:parsed.file.name,
    mime:parsed.file.mime,
    size:parsed.file.size,
    url:signedMentorFileUrl(saved.id)
  });
}

async function handleMentorFile(req,res){
  const fileId=String(req.query.id||'');
  const sig=String(req.query.sig||'');
  if(!verifyMentorFileSignature(fileId,sig)) return res.status(403).send('Link file tidak valid.');
  if(!(await mentorDriveConfigured())) return res.status(503).send('Google Drive Mentor belum terhubung.');

  const drive=await driveClient();
  const meta=await drive.files.get({fileId,fields:'name,mimeType,size',supportsAllDrives:true});
  const data=await drive.files.get({fileId,alt:'media',supportsAllDrives:true},{responseType:'stream'});
  res.statusCode=200;
  res.setHeader('Content-Type',meta.data.mimeType||'application/octet-stream');
  res.setHeader('Content-Disposition','inline; filename="'+String(meta.data.name||'file').replace(/"/g,'')+'"');
  res.setHeader('Cache-Control','private, max-age=300');
  data.data.pipe(res);
}

function csvCell(value){
  const s=String(value==null?'':value).replace(/"/g,'""');
  return '"'+s+'"';
}

async function finishArchiveBatch(batchId,success,payload){
  return await supabaseRpc('mentor_archive_finish_batch',{
    p_worker_secret:MENTOR_ARCHIVE_SECRET,
    p_batch_id:batchId,
    p_success:Boolean(success),
    p_drive_file_id:payload?.json?.id||null,
    p_drive_web_view_link:payload?.json?.webViewLink||null,
    p_drive_csv_file_id:payload?.csv?.id||null,
    p_drive_csv_web_view_link:payload?.csv?.webViewLink||null,
    p_error_message:payload?.error||null
  });
}

let mentorArchiveBusy=false;
async function runMentorArchiveWorker(){
  if(mentorArchiveBusy || !(await mentorDriveConfigured()) || !SUPABASE_ANON_KEY || !MENTOR_ARCHIVE_SECRET) return;
  mentorArchiveBusy=true;
  let batch=null;
  try{
    const claimed=await supabaseRpc('mentor_archive_claim_batch',{p_worker_secret:MENTOR_ARCHIVE_SECRET});
    batch=Array.isArray(claimed)?claimed[0]:claimed;
    if(!batch?.batch_id) return;

    const drive=await driveClient();
    const memberFolderName='MEMBER - '+safeDriveName(batch.member_name||'BADAI')+' - '+String(batch.member_user_id||'').slice(0,8);
    const memberFolder=await findOrCreateDriveFolder(drive,memberFolderName,MENTOR_DRIVE_FOLDER_ID);
    const date=String(batch.archive_date);
    const year=date.slice(0,4)||'ARSIP';
    const month=date.slice(5,7)||'00';
    const yearFolder=await findOrCreateDriveFolder(drive,year,memberFolder);
    const monthFolder=await findOrCreateDriveFolder(drive,month,yearFolder);

    const messages=Array.isArray(batch.messages)?batch.messages:[];
    const jsonl=messages.map(m=>JSON.stringify(m)).join('\n')+'\n';
    const csvHeader=['created_at','sender_kind','message_type','body','sticker_key','file_name','file_mime','file_size','drive_file_id'];
    const csvLines=[csvHeader.map(csvCell).join(',')];
    for(const m of messages){
      csvLines.push(csvHeader.map(key=>csvCell(m?.[key])).join(','));
    }

    const base=date+'__mentor-chat';
    const jsonFile=await uploadDriveBuffer(drive,monthFolder,base+'.jsonl','application/x-ndjson',Buffer.from(jsonl,'utf8'));
    const csvFile=await uploadDriveBuffer(drive,monthFolder,base+'.csv','text/csv',Buffer.from(csvLines.join('\n')+'\n','utf8'));
    await finishArchiveBatch(batch.batch_id,true,{json:jsonFile,csv:csvFile});
    console.log('Mentor archive uploaded:',batch.batch_id,date,batch.member_name);
  }catch(error){
    console.error('Mentor archive worker:',error?.message||error);
    if(batch?.batch_id){
      try{await finishArchiveBatch(batch.batch_id,false,{error:String(error?.message||error)})}catch(_){}
    }
  }finally{
    mentorArchiveBusy=false;
  }
}

const server = http.createServer(async (req, res) => {
  decorateReqRes(req, res);

  res.setHeader('X-BADAI-Environment','Railway-Staging');

  try {
    await collectBody(req);
    const pathname = req.path || '/';

    if (pathname === '/health') {
      res.setHeader('Content-Type','application/json; charset=utf-8');
      return res.status(200).send({
        ok:true,
        app:'BADAI-STAGING',
        source:process.env.VERCEL_GIT_COMMIT_SHA || 'staging',
        build:BUILD_REV
      });
    }

    if (pathname === '/api/mentor/status') {
      const stored=await loadStoredGoogleOauth(false);
      return res.status(200).json({
        ok:true,
        drive_configured:await mentorDriveConfigured(),
        oauth_client_configured:Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        connected_account:stored.googleEmail ? stored.googleEmail.replace(/^(.{2}).*(@.*)$/,'$1***$2') : '',
        hot_storage_days:7,
        archive_time:'00:05 WIB'
      });
    }

    if (pathname === '/api/mentor/google/connect' && req.method === 'POST') {
      return await handleGoogleOauthConnect(req,res);
    }

    if (pathname === '/api/mentor/google/callback' && req.method === 'GET') {
      return await handleGoogleOauthCallback(req,res);
    }

    if (pathname === '/api/mentor/upload' && req.method === 'POST') {
      return await handleMentorUpload(req,res);
    }

    if (pathname === '/api/mentor/file' && req.method === 'GET') {
      return await handleMentorFile(req,res);
    }

    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/api/admin-v5') {
      return await admin(req, res);
    }

    if (pathname === '/akses' || pathname === '/akses/' || pathname === '/api/admin-v3') {
      req.query = Object.assign({}, req.query, { accesscompact:'1' });
      return await akses(req, res);
    }

    if (pathname === '/api/landing-v6') {
      return await landing(req, res);
    }

    if (serveStatic(req, res, pathname)) return;

    const parts = pathname.split('/').filter(Boolean);
    if (pathname === '/' || parts.length === 1) {
      return await landing(req, res);
    }

    res.setHeader('Content-Type','text/plain; charset=utf-8');
    return res.status(404).send('BADAI staging: halaman tidak ditemukan.');
  } catch (error) {
    if (res.writableEnded) return;
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.status(500).send('BADAI staging error: ' + String(error?.message || error));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('BADAI-STAGING listening on port ' + PORT);
  mentorDriveConfigured().then(v=>console.log('Mentor Drive configured:',v)).catch(()=>{});
  setTimeout(() => runMentorArchiveWorker().catch(()=>{}), 15000);
  setInterval(() => runMentorArchiveWorker().catch(()=>{}), 5*60*1000);
});
