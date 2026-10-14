import test from 'node:test';
import assert from 'node:assert/strict';
import { requestBody, classifyResponse, submit, connected, ownsChannel, fingerprint } from '../supabase/functions/_shared/zawa.ts';

const credentials={provider_id:'fixture-provider',session_secret:'fixture-secret'};
const group={kind:'group',external_id:'120363123456789012@g.us',content_text:'Pesan uji BADAI',message_type:'text'};

test('documented group/channel/story contracts have exactly one destination',()=>{
  assert.deepEqual(requestBody(group),{endpoint:'/message',type:'text',body:{group:group.external_id,type:'text',text:group.content_text}});
  assert.deepEqual(requestBody({...group,kind:'channel',external_id:'120363123456789012@newsletter'}).body,{newsletter:'120363123456789012@newsletter',type:'text',text:group.content_text});
  assert.deepEqual(requestBody({...group,kind:'status',external_id:'story'}),{endpoint:'/status',type:'text',body:{type:'text',text:group.content_text}});
});
test('invite links are rejected instead of guessed as group IDs',()=>{
  assert.throws(()=>requestBody({...group,external_id:'https://chat.whatsapp.com/fixture'}),/invalid_group_id/);
});
test('CTA is included once and empty text is rejected',()=>{
  assert.equal(requestBody({...group,cta_url:'https://badai.vercel.app'}).body.text,group.content_text+'\n\nhttps://badai.vercel.app');
  assert.equal(requestBody({...group,content_text:'https://badai.vercel.app',cta_url:'https://badai.vercel.app'}).body.text,'https://badai.vercel.app');
  assert.throws(()=>requestBody({...group,content_text:'  '}),/text_required/);
});
test('images, PDFs and videos use documented nested bodies',()=>{
  const media={url:'https://example.com/signed-file',mimetype:'image/jpeg',size:1234,name:'test.jpg'};
  const image=requestBody({...group,message_type:'media',media_path:'test.jpg'},media);
  assert.deepEqual(image.body.image,{url:media.url,mimetype:'image/jpeg'});
  assert.equal(image.body.type,'image');
  const pdf=requestBody({...group,message_type:'media',media_path:'test.pdf'},{...media,mimetype:'application/pdf',name:'test.pdf'});
  assert.deepEqual(pdf.body.document,{url:media.url,mimetype:'application/pdf',name:'test.pdf',size:1234});
  assert.throws(()=>requestBody({...group,kind:'status',message_type:'media',media_path:'test.pdf'},{...media,mimetype:'application/pdf'}),/status_document_unsupported/);
  assert.throws(()=>requestBody({...group,message_type:'media',media_path:'test.mp4'},{...media,mimetype:'video/mp4'}),/video_duration_required/);
  assert.equal(requestBody({...group,message_type:'media',media_path:'test.mp4'},{...media,mimetype:'video/mp4',duration:12}).body.video.duration,12);
  assert.throws(()=>requestBody({...group,message_type:'media',media_path:'test.jpg'},{...media,mimetype:'application/pdf'}),/media_mimetype_mismatch/);
});
test('provider acceptance never becomes delivery automatically',()=>{
  assert.equal(classifyResponse(200,{messageId:'ABC123'},'group').status,'api_accepted');
  assert.equal(classifyResponse(200,{statusId:'ABC123'},'status').status,'api_accepted');
  assert.equal(classifyResponse(200,{messageId:'ABC123'},'status').status,'unknown');
  assert.equal(classifyResponse(200,{},'group').status,'unknown');
  assert.equal(classifyResponse(500,{message:'send timeout after 240s'},'group').status,'unknown');
  assert.equal(classifyResponse(404,{statusCode:404,message:'session not found'},'group').status,'failed');
});
test('documented Status diagnostics are safe and never permit a 5xx retry',()=>{
  for(const [message,code] of [
    ['contacts not synced, reconnect the session or set status privacy to "only share with"','provider_contacts_not_synced'],
    ['status privacy "only share with" has no contacts','provider_status_audience_empty'],
    ['send timeout after 240s','provider_processing_timeout'],
    ['PRIVATE arbitrary provider response','provider_ambiguous_response'],
  ]) {
    const result=classifyResponse(500,{statusCode:500,message},'status');
    assert.equal(result.status,'unknown');assert.equal(result.error_code,code);assert.equal(result.provider_id,null);
    assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
  }
  assert.equal(classifyResponse(504,null,'status').error_code,'provider_gateway_timeout');
});
test('submission sends documented headers once, and never follows redirects',async()=>{
  let calls=0;
  const outcome=await submit(group,credentials,undefined,async(url,init)=>{
    calls++;assert.equal(url,'https://api-zawa.azickri.com/message');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');
    assert.equal(init.headers.id,credentials.provider_id);assert.equal(init.headers['session-id'],credentials.session_secret);
    assert.deepEqual(JSON.parse(init.body),requestBody(group).body);
    return Response.json({messageId:'REALISTIC_FIXTURE_ID'});
  });
  assert.equal(calls,1);assert.equal(outcome.status,'api_accepted');
});
test('lost response is unknown and never automatically retried',async()=>{
  let calls=0;
  const outcome=await submit(group,credentials,undefined,async()=>{calls++;throw Error('timeout');});
  assert.equal(calls,1);assert.equal(outcome.status,'unknown');
});
test('only explicit isConnected=true and channel ownership permit sending',async()=>{
  await assert.rejects(()=>connected(credentials,async()=>Response.json({isConnected:'true'})),/invalid_response/);
  await assert.rejects(()=>ownsChannel('123@newsletter',credentials,async()=>Response.json({docs:[{id:'123@newsletter',isOwner:false}]})),/not_owned/);
  await ownsChannel('123@newsletter',credentials,async()=>Response.json({docs:[{id:'123@newsletter',isOwner:true}]}));
});
test('session transport and invalid JSON failures have safe specific codes',async()=>{
  await assert.rejects(()=>connected(credentials,async()=>{throw Error('PRIVATE transport detail')}),/^Error: provider_session_transport_failed$/);
  await assert.rejects(()=>connected(credentials,async()=>new Response('not JSON')),/^Error: provider_session_invalid_response$/);
  await assert.rejects(()=>connected(credentials,async()=>Response.json({isConnected:false})),/^Error: provider_session_disconnected$/);
});
test('verification fingerprints change with session rotation',async()=>{
  const a=await fingerprint(credentials),b=await fingerprint({...credentials,session_secret:'different-fixture'});
  assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);
});
