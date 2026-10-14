import test from 'node:test';
import assert from 'node:assert/strict';

let sequence=0;
async function harness(slug,providerData,existing=[]){
  let handler;const calls=[];
  globalThis.Deno={env:{get:n=>({SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',SUPABASE_ANON_KEY:'fixture-public'}[n])},serve:h=>handler=h};
  globalThis.fetch=async(url,init={})=>{
    calls.push({url,init});
    const path=new URL(url).pathname;
    if(path==='/auth/v1/user')return Response.json({id:'00000000-0000-4000-8000-000000000001'});
    if(path.endsWith('/admin_team_members'))return Response.json([{role:'owner',status:'active'}]);
    if(path.endsWith('/wa_marketing_connection_secure'))return Response.json([{provider_id:'fixture-provider',session_secret:'private-fixture-secret'}]);
    if(path.endsWith('/wa_marketing_targets'))return Response.json(init.method==='GET'?existing:[]);
    if(['/group','/channel','/session'].includes(path))return providerData instanceof Response?providerData.clone():Response.json(providerData);
    throw Error('Unexpected fixture endpoint: '+path);
  };
  await import('../supabase/functions/'+slug+'/index.ts?fixture='+sequence++);
  const call=body=>handler(new Request('https://fixture.supabase.co/functions/v1/'+slug,{method:body?'POST':'GET',headers:{authorization:'Bearer fixture.user.token','content-type':'application/json'},body:body?JSON.stringify(body):undefined}));
  return {calls,call};
}
test('QR connection uses only the documented boolean, never ready/online guesses',async()=>{
  const ambiguous=await harness('badai-zawa-connect',{ready:true,status:'online'});
  assert.equal((await (await ambiguous.call()).json()).connection_state,'waiting_for_qr');
  const real=await harness('badai-zawa-connect',{isConnected:true,qrcode:''});
  const response=await real.call(),text=await response.text();assert.equal(JSON.parse(text).connection_state,'connected');assert.equal(text.includes('private-fixture-secret'),false);
});
test('group sync accepts the documented docs array, preserves manual names/flags, and never sends',async()=>{
  const id='120363123456789012@g.us';
  const h=await harness('badai-zawa-sync',{docs:[{id,name:'Provider name'},{id:'120363123456789013@g.us',name:'New group'}]},[{external_id:id,name:'Manual name',origin:'manual',enabled:true}]);
  const response=await h.call({kind:'group'});assert.equal(response.status,200);const data=await response.json();assert.equal(data.found,2);
  const writes=h.calls.filter(c=>new URL(c.url).pathname.endsWith('/wa_marketing_targets')&&c.init.method==='POST');assert.equal(writes.length,1);
  const payload=JSON.parse(writes[0].init.body);assert.equal(payload[0].name,'Manual name');assert.equal(payload[0].enabled,true);assert.equal(payload[1].enabled,false);
  assert.equal(h.calls.some(c=>new URL(c.url).pathname==='/message'),false);
});
test('empty group catalog is valid, and error responses never trigger endpoint probes',async()=>{
  const h=await harness('badai-zawa-sync',{docs:[]});assert.equal((await h.call({kind:'group'})).status,200);
  const error=await harness('badai-zawa-sync',Response.json({statusCode:404,message:'session not found'},{status:404}));
  assert.equal((await error.call({kind:'group'})).status,502);
  assert.deepEqual(error.calls.filter(c=>new URL(c.url).host==='api-zawa.azickri.com').map(c=>new URL(c.url).pathname),['/group']);
});
test('catalog does not offer channels the device does not own',async()=>{
  const h=await harness('badai-zawa-sync',{docs:[{id:'120363123456789012@newsletter',name:'Owned',isOwner:true},{id:'120363123456789013@newsletter',name:'Followed',isOwner:false}]});
  const data=await (await h.call({kind:'channel'})).json();assert.equal(data.found,1);
  const writes=h.calls.filter(c=>new URL(c.url).pathname.endsWith('/wa_marketing_targets')&&c.init.method==='POST');assert.equal(JSON.parse(writes[0].init.body)[0].name,'Owned');
});
