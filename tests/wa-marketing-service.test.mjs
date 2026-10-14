import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/_shared/wa-service.ts';
import { fingerprint } from '../supabase/functions/_shared/zawa.ts';
import { signWorkerProof } from '../supabase/functions/_shared/worker-auth.ts';

const actor='00000000-0000-4000-8000-000000000001',campaign='00000000-0000-4000-8000-000000000002',target='00000000-0000-4000-8000-000000000003',run='00000000-0000-4000-8000-000000000004',jobId='00000000-0000-4000-8000-000000000005';
const credentials={provider_id:'fixture-id',session_secret:'PRIVATE_SESSION_FIXTURE'};
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'PRIVATE_SERVICE_FIXTURE',WA_MARKETING_WORKER_SECRET:'fixture-worker-secret-with-at-least-32-characters'};
const req=(body,headers={})=>new Request('https://fixture.supabase.co/functions/v1/badai-wa-send',{method:'POST',headers:{authorization:'Bearer fixture.user.token','content-type':'application/json',...headers},body:JSON.stringify(body)});

async function harness(overrides={}){
  const trace=[];
  const job={id:jobId,run_id:run,campaign_id:campaign,claim_token:target,session_fingerprint:await fingerprint(credentials),snapshot:{kind:'group',external_id:'120363123456789012@g.us',message_type:'text',content_text:'Pesan uji fixture'}};
  const fetcher=async(url,init={})=>{
    const u=new URL(url),route=u.pathname,body=init.body?JSON.parse(init.body):null;
    trace.push({url,method:init.method||'GET',body});
    if(overrides[route])return overrides[route](body,init);
    if(route==='/auth/v1/user')return Response.json({id:actor});
    if(route==='/rest/v1/admin_team_members')return Response.json([{role:'owner',status:'active'}]);
    if(route==='/rest/v1/wa_marketing_connection_secure')return Response.json([credentials]);
    if(route==='/rest/v1/wa_marketing_live_settings')return Response.json([{enabled:true,testing_enabled:true,scheduler_enabled:false}]);
    if(route==='/rest/v1/wa_marketing_live_verifications')return Response.json([{target_kind:'group',message_type:'text'}]);
    if(route==='/rest/v1/wa_marketing_live_test_targets')return Response.json([{target_id:target}]);
    if(route==='/rest/v1/wa_marketing_live_jobs')return Response.json([{id:jobId}]);
    if(route==='/rest/v1/rpc/wa_live_enqueue')return Response.json({run_id:run,queued:1,duplicate:false});
    if(route==='/rest/v1/rpc/wa_live_claim')return Response.json(job);
    if(route==='/rest/v1/rpc/wa_live_dispatch')return Response.json(true);
    if(route==='/rest/v1/rpc/wa_live_settle')return Response.json(null);
    if(route==='/rest/v1/rpc/wa_live_consume_worker_token')return Response.json(true);
    if(route==='/session')return Response.json({isConnected:true,...credentials,qrcode:'PRIVATE_QR_FIXTURE'});
    if(route==='/message')return Response.json({messageId:'FIXTURE_MESSAGE_ID'});
    throw Error('Unexpected test request: '+route);
  };
  return {handler:createHandler(env,fetcher),trace,job};
}
const sendBody={action:'send_test',confirm:true,campaign_id:campaign,target_id:target,request_key:'00000000-0000-4000-8000-000000000006'};

test('anonymous users and inactive/non-owner accounts cannot send',async()=>{
  const h=await harness({'/rest/v1/admin_team_members':()=>Response.json([])});
  const r=await h.handler(req(sendBody));assert.equal(r.status,403);assert.equal(h.trace.some(c=>c.url.endsWith('/message')),false);
  const anonymous=await h.handler(new Request('https://fixture.supabase.co/functions/v1/badai-wa-send'));assert.equal(anonymous.status,403);
});
test('capabilities expose no session, service key, QR or claim secrets',async()=>{
  const h=await harness();const r=await h.handler(new Request('https://fixture.supabase.co/functions/v1/badai-wa-send',{headers:{authorization:'Bearer fixture.user.token'}}));
  const text=await r.text();assert.equal(r.status,200);for(const secret of ['PRIVATE_SESSION_FIXTURE','PRIVATE_SERVICE_FIXTURE','PRIVATE_QR_FIXTURE'])assert.equal(text.includes(secret),false);
  assert.equal(JSON.parse(text).ready,true);
});
test('confirmation and request key are mandatory before any provider send',async()=>{
  const h=await harness();assert.equal((await h.handler(req({...sendBody,confirm:false}))).status,400);
  assert.equal((await h.handler(req({...sendBody,request_key:undefined}))).status,400);assert.equal(h.trace.some(c=>c.url.endsWith('/message')),false);
});
test('dispatch is durably marked before the single provider POST and then settled',async()=>{
  const h=await harness();const r=await h.handler(req(sendBody));assert.equal(r.status,202);assert.equal((await r.json()).status,'api_accepted');
  const dispatch=h.trace.findIndex(c=>c.url.endsWith('/wa_live_dispatch'));
  const post=h.trace.findIndex(c=>c.url.endsWith('/message'));
  const settle=h.trace.findIndex(c=>c.url.endsWith('/wa_live_settle'));
  assert.ok(dispatch<post&&post<settle);assert.equal(h.trace.filter(c=>c.url.endsWith('/message')).length,1);
  assert.equal(h.trace[settle].body.p_status,'api_accepted');
});
test('duplicate enqueue does not issue another provider request',async()=>{
  const h=await harness({'/rest/v1/rpc/wa_live_enqueue':()=>Response.json({run_id:run,duplicate:true})});
  const r=await h.handler(req(sendBody));assert.equal(r.status,202);assert.equal((await r.json()).duplicate,true);assert.equal(h.trace.some(c=>c.url.endsWith('/message')),false);
});
test('pause/configuration changes between preparation and dispatch prevent the POST',async()=>{
  const h=await harness({'/rest/v1/rpc/wa_live_dispatch':()=>Response.json(false)});
  const r=await h.handler(req(sendBody));assert.equal((await r.json()).status,'cancelled');assert.equal(h.trace.some(c=>c.url.endsWith('/message')),false);
});
test('lost provider response persists unknown without retry',async()=>{
  const h=await harness({'/message':()=>{throw Error('lost response')}});
  const r=await h.handler(req(sendBody));assert.equal((await r.json()).status,'unknown');
  assert.equal(h.trace.filter(c=>c.url.endsWith('/message')).length,1);assert.equal(h.trace.find(c=>c.url.endsWith('/wa_live_settle')).body.p_status,'unknown');
});
test('session failure before enqueue is specific and cannot submit a message',async()=>{
  const h=await harness({'/session':()=>{throw Error('PRIVATE transport detail')}});
  const r=await h.handler(req(sendBody));assert.equal(r.status,503);
  assert.equal((await r.json()).error,'provider_session_transport_failed');
  assert.equal(h.trace.some(c=>c.url.endsWith('/wa_live_enqueue')||c.url.endsWith('/message')),false);
});
test('one-use worker health check only reads session readiness',async()=>{
  const h=await harness();
  const timestamp=Math.floor(Date.now()/1000),nonce='00000000-0000-4000-8000-000000000009';
  const signature=await signWorkerProof(env.WA_MARKETING_WORKER_SECRET,nonce,timestamp);
  const r=await h.handler(req({action:'worker',check_connection:true},{'x-wa-worker-time':String(timestamp),'x-wa-worker-nonce':nonce,'x-wa-worker-signature':signature}));
  assert.deepEqual(await r.json(),{processed:false,connected:true});
  assert.equal(h.trace.some(c=>c.url.endsWith('/wa_live_claim')||c.url.endsWith('/message')||c.url.endsWith('/wa_live_enqueue')),false);
});
test('authenticated Status validation uses only hardcoded invalid text and exposes no provider data',async()=>{
  const h=await harness({'/status':(body)=>{
    assert.deepEqual(body,{type:'text',text:''});
    return Response.json({statusCode:400,message:'text should not be empty',extra:'PRIVATE_PROVIDER_DETAIL'},{status:400});
  }});
  const timestamp=Math.floor(Date.now()/1000),nonce='00000000-0000-4000-8000-000000000009';
  const signature=await signWorkerProof(env.WA_MARKETING_WORKER_SECRET,nonce,timestamp);
  const r=await h.handler(req({action:'worker',check_status_validation:true,text:'Must never be submitted'},{'x-wa-worker-time':String(timestamp),'x-wa-worker-nonce':nonce,'x-wa-worker-signature':signature}));
  assert.deepEqual(await r.json(),{processed:false,status_validation_http:400,status_validation_rejected:true});
  assert.equal(h.trace.filter(c=>c.url.endsWith('/status')).length,1);
  assert.equal(h.trace.some(c=>/\/(wa_live_claim|wa_live_enqueue|wa_live_confirm|wa_live_settle)$/.test(c.url)),false);
  assert.equal((await h.handler(req({action:'worker',check_status_validation:true}))).status,403);
});
test('failed outcome persistence cannot falsely claim API acceptance',async()=>{
  const h=await harness({'/rest/v1/rpc/wa_live_settle':()=>{throw Error('database unavailable')}});
  const r=await h.handler(req(sendBody));assert.equal(r.status,503);assert.equal(h.trace.filter(c=>c.url.endsWith('/message')).length,1);assert.ok(!(await r.text()).includes('PRIVATE_'));
});
test('short-lived worker proof cannot be used for owner actions; raw master keys are rejected',async()=>{
  const h=await harness();assert.equal((await h.handler(req({action:'worker'}))).status,403);
  const onlySecret=new Request('https://fixture.supabase.co/functions/v1/badai-wa-send',{method:'POST',headers:{'content-type':'application/json','x-wa-worker-secret':env.WA_MARKETING_WORKER_SECRET},body:JSON.stringify(sendBody)});
  assert.equal((await h.handler(onlySecret)).status,403);
  assert.equal((await h.handler(req({action:'worker'},{'x-wa-worker-secret':env.WA_MARKETING_WORKER_SECRET}))).status,403);
  const timestamp=Math.floor(Date.now()/1000),nonce='00000000-0000-4000-8000-000000000009';
  const signature=await signWorkerProof(env.WA_MARKETING_WORKER_SECRET,nonce,timestamp);
  const r=await h.handler(req({action:'worker'},{'x-wa-worker-time':String(timestamp),'x-wa-worker-nonce':nonce,'x-wa-worker-signature':signature}));assert.equal(r.status,200);
  const payload=await r.json();assert.deepEqual(payload,{processed:true});
});
test('unapproved origins and oversized JSON are rejected',async()=>{
  const h=await harness();assert.equal((await h.handler(req(sendBody,{origin:'https://evil.example'}))).status,403);
  assert.equal((await h.handler(req({...sendBody,extra:'x'.repeat(9000)}))).status,413);
});
