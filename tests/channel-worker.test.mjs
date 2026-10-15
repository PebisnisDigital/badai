import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChannelWorker } from '../supabase/functions/_shared/channel-worker.ts';
import { signWorkerProof } from '../supabase/functions/_shared/worker-auth.ts';
import { fingerprint } from '../supabase/functions/_shared/zawa.ts';

const secret='fixture-worker-secret-with-at-least-32-characters';
const credentials={provider_id:'fixture-provider',session_secret:'fixture-session',session_epoch:'fixture-epoch'};
async function setupWorker(options={}){
  const kind=options.kind||'channel',external=kind==='group'?'123456789@g.us':'123456789@newsletter';
  let submissions=0;const settlements=[],routes=[];
  const fp=await fingerprint(credentials);
  const job={id:'job',claim_token:'claim',session_fingerprint:options.sessionChanged?'0'.repeat(64):fp,snapshot:{kind:options.wrongKind?(kind==='group'?'channel':'group'):kind,external_id:external,content_text:'Konten BADAI',message_type:'text'}};
  const fetcher=async(url,init={})=>{
    routes.push(url);url=url.replaceAll('wa_group_','wa_channel_');const body=init.body?JSON.parse(init.body):{};
    const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    if(url.endsWith('/auth/v1/user'))return response({id:'10000000-0000-4000-8000-000000000001'});
    if(url.includes('/admin_team_members?'))return response(options.noOwner?[]:[{role:'owner'}]);
    if(url.endsWith('/rpc/wa_channel_capabilities'))return response({text_verified:!options.unverified,image_verified:false,publication_enabled:false});
    if(url.includes('/wa_marketing_targets?'))return response([{external_id:external}]);
    if(url.endsWith('/rpc/wa_live_consume_worker_token'))return response(!options.replay);
    if(url.endsWith('/rpc/wa_channel_tick'))return response(0);
    if(url.endsWith('/rpc/wa_channel_claim'))return response(options.empty?null:job);
    if(url.includes('/wa_marketing_connection_secure?'))return response([credentials]);
    if(url.endsWith('/session'))return response({isConnected:options.disconnected?false:true});
    if(url.endsWith('/group'))return response({docs:options.notOwner?[]:[{id:external}]});
    if(url.endsWith('/channel'))return response({docs:[{id:'123456789@newsletter',isOwner:!options.notOwner}]});
    if(url.endsWith('/rpc/wa_channel_dispatch'))return response(!options.cancelled);
    if(url.endsWith('/message')){
      submissions++;
      assert.equal(body[kind==='group'?'group':'newsletter'],external);
      assert.equal(body[kind==='group'?'newsletter':'group'],undefined);
      if(options.timeout)throw new TypeError('network timeout');
      return response(options.rejected?{statusCode:400,message:'validation failed'}:{messageId:'provider-123'},options.rejected?400:200);
    }
    if(url.endsWith('/rpc/wa_channel_settle')){settlements.push(body);if(options.settleFails)throw Error('storage unavailable');return response(null);}
    throw Error('Unexpected URL '+url);
  };
  const handler=createChannelWorker({base:'https://fixture.supabase.co',serviceKey:'fixture-service',workerSecret:secret,kind},fetcher);
  const request=async(valid=true)=>{
    const nonce='10000000-0000-4000-8000-000000000001',time=Math.floor(Date.now()/1000);
    const signature=await signWorkerProof(secret,nonce,time);
    return handler(new Request('https://fixture.supabase.co/functions/v1/badai-wa-channel',{method:'POST',headers:valid?{'Content-Type':'application/json','x-wa-worker-nonce':nonce,'x-wa-worker-time':String(time),'x-wa-worker-signature':signature}:{},body:JSON.stringify({action:'worker'})}));
  };
  const capabilityRequest=(authorized=true,origin)=>handler(new Request('https://fixture.supabase.co/functions/v1/badai-wa-channel?target_id=20000000-0000-4000-8000-000000000001',{headers:{...(authorized?{Authorization:'Bearer fixture-valid-user-token'}:{}),...(origin?{Origin:origin}:{})}}));
  return {request,capabilityRequest,settlements,routes,submissions:()=>submissions};
}
for(const kind of ['channel','group']){
const setup=options=>setupWorker({...options,kind});
test(kind+' worker rejects unsigned requests and replayed proofs',async()=>{
  const a=await setup();assert.equal((await a.request(false)).status,403);assert.equal(a.routes.length,0);
  const b=await setup({replay:true});assert.equal((await b.request()).status,403);assert.equal(b.submissions(),0);
});
test(kind+' empty queue does not contact Zawa',async()=>{const a=await setup({empty:true});assert.equal((await a.request()).status,200);assert.equal(a.submissions(),0);assert.equal(a.routes.some(r=>r.includes('api-zawa')),false);});
for(const scenario of ['sessionChanged','disconnected','notOwner','cancelled','wrongKind']){
  test(kind+' worker checks '+scenario+' before publishing',async()=>{const a=await setup({[scenario]:true});await a.request();assert.equal(a.submissions(),0);assert.equal(a.settlements[0].p_status,scenario==='cancelled'?'cancelled':'failed');});
}
test(kind+' successful submission records API acceptance without claiming delivery',async()=>{
  const a=await setup();const r=await a.request();assert.deepEqual(await r.json(),{processed:true});assert.equal(a.submissions(),1);
  assert.equal(a.settlements[0].p_status,'api_accepted');assert.deepEqual(a.settlements[0].p_response,{http_status:200,message_id:'provider-123',error_code:null});
  assert.equal(JSON.stringify(a.settlements).includes('fixture-session'),false);
});
test(kind+' provider timeout is UNKNOWN and makes exactly one POST',async()=>{const a=await setup({timeout:true});await a.request();assert.equal(a.submissions(),1);assert.equal(a.settlements[0].p_status,'unknown');});
test(kind+' documented provider rejection is FAILED',async()=>{const a=await setup({rejected:true});await a.request();assert.equal(a.submissions(),1);assert.equal(a.settlements[0].p_status,'failed');});
test(kind+' persistence failure after POST never attempts a second send or overwrites uncertainty',async()=>{const a=await setup({settleFails:true});await a.request();assert.equal(a.submissions(),1);assert.equal(a.settlements.length,1);});
test(kind+' readiness checks current owner, receipt verification, connection and ownership without sending',async()=>{
  const a=await setup();const response=await a.capabilityRequest();assert.equal(response.status,200);const body=await response.json();assert.equal(body.ready,true);assert.equal(body.publication_enabled,false);assert.equal(a.submissions(),0);
  for(const scenario of ['unverified','disconnected','notOwner']){const a=await setup({[scenario]:true});const response=await a.capabilityRequest();assert.equal((await response.json()).ready,false);assert.equal(a.submissions(),0);}
});
test(kind+' readiness rejects signed-out users, non-owners and unapproved origins',async()=>{
  const a=await setup();assert.equal((await a.capabilityRequest(false)).status,403);assert.equal(a.routes.length,0);
  assert.equal((await a.capabilityRequest(true,'https://unapproved.example')).status,403);assert.equal(a.routes.length,0);
  const b=await setup({noOwner:true});assert.equal((await b.capabilityRequest()).status,403);
});

}
