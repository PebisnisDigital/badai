import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source=readFileSync(new URL('../wa-marketing-admin.js',import.meta.url),'utf8');
const campaignId='00000000-0000-4000-8000-000000000002',targetId='00000000-0000-4000-8000-000000000003';
async function wait(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');}
async function boot(overrides={}){
  const dom=new JSDOM('<button id="tabWaMarketing">WA Marketing</button><div id="pageWamarketing"><div data-wa-content="groups"></div><div data-wa-content="channel"></div><div data-wa-content="story"></div><div data-wa-content="campaigns"></div><div data-wa-content="calendar"></div><div data-wa-content="reports"></div></div>',{url:'https://badai.vercel.app/admin',runScripts:'outside-only'});
  const w=dom.window,requests=[];
  w.localStorage.setItem('badai_admin_session',JSON.stringify({access_token:'fixture.user.token'}));
  w.alert=()=>{};w.confirm=()=>true;
  let c={id:campaignId,name:'Private test campaign',content_text:'Unique fixture message',delivery_mode:'now_test',status:'draft',delay_seconds:30,delay_min_seconds:30,delay_max_seconds:60,message_type:'text',media_path:null,cta_url:null,...overrides.campaign};
  const targets=overrides.targets||[{id:targetId,name:'Approved private group',kind:'group',external_id:'120363123456789012@g.us',enabled:true,origin:'manual'}];
  const caps={ready:true,sending_enabled:true,testing_ready:true,scheduler_enabled:false,supported_destinations:['group'],verified_types:[{target_kind:'group',message_type:'text'}],approved_test_targets:[targetId],...overrides.caps};
  w.fetch=async(url,options={})=>{
    requests.push({url,options});
    const u=new URL(url),path=u.pathname;
    if(path.includes('/functions/v1/')){
      if(u.searchParams.get('action')==='history')return Response.json({jobs:overrides.jobs||[],runs:overrides.runs||[]});
      if((options.method||'GET')==='GET')return overrides.capResponse?overrides.capResponse(caps):Response.json(caps);
      return overrides.post?overrides.post(JSON.parse(options.body)):Response.json({status:'queued'});
    }
    if(path.endsWith('/wa_marketing_targets'))return Response.json(targets);
    if(path.endsWith('/wa_marketing_campaigns')){
      if(options.method==='PATCH')c={...c,...JSON.parse(options.body)};
      return Response.json([c]);
    }
    if(path.endsWith('/wa_marketing_campaign_targets'))return Response.json(targets.map((t,i)=>({campaign_id:c.id,target_id:t.id,position:i,delay_seconds:null})));
    if(path.endsWith('/wa_marketing_delivery_plan'))return Response.json([]);
    throw Error('Unexpected UI fixture request '+url);
  };
  w.eval(source);await new Promise(r=>setTimeout(r,0));w.document.getElementById('tabWaMarketing').click();
  await wait(()=>w.document.querySelector('[data-wa-campaign]'));
  w.document.querySelector('[data-wa-campaign]').click();
  const $=id=>w.document.getElementById(id);
  const activeRun=(overrides.runs||[]).some(r=>r.campaign_id===campaignId&&['active','paused'].includes(r.status));
  await wait(()=>$('waSendReal').disabled===!(caps.ready&&targets.length===1&&c.message_type==='text'&&!activeRun));
  return {dom,w,$,requests};
}

test('editing saved content locks send until save completes',async()=>{
  const h=await boot();assert.equal(h.$('waSendReal').disabled,false);
  h.$('waCampaignText').value='Edited fixture text';h.$('waCampaignText').dispatchEvent(new h.w.Event('input',{bubbles:true}));
  assert.equal(h.$('waSendReal').disabled,true);assert.equal(h.$('waSendTest').disabled,true);
  h.$('waCampaignForm').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));
  await wait(()=>h.$('waCampaignMessage').textContent.includes('berhasil disimpan'));
  assert.equal(h.$('waSendReal').disabled,false);h.dom.window.close();
});
test('single-target preview explains the first start and shows the configured gap instead of 0–0',async()=>{
  const h=await boot();let text=h.$('waCampaignPreview').textContent;
  assert.ok(text.includes('30–60 detik antar tujuan'));assert.ok(text.includes('mulai setelah konfirmasi'));
  assert.equal(text.includes('0–0'),false);
  h.$('waCampaignDelayMin').value='70';h.$('waCampaignDelayMax').value='100';
  h.$('waCampaignDelayMax').dispatchEvent(new h.w.Event('input',{bubbles:true}));
  text=h.$('waCampaignPreview').textContent;assert.ok(text.includes('70–100 detik antar tujuan'));
  assert.equal(h.requests.some(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')),false);
  h.dom.window.close();
});
test('scheduled preview applies recipient overrides and campaign gaps cumulatively',async()=>{
  const targets=[0,1,2].map(i=>({id:'00000000-0000-4000-8000-00000000000'+(i+3),name:'Target '+i,kind:'group',enabled:true}));
  const h=await boot({targets,campaign:{delivery_mode:'scheduled',scheduled_at:new Date(Date.now()+3600000).toISOString()}});
  const override=h.w.document.querySelector('[data-wa-override="'+targets[1].id+'"]');
  override.value='45';override.dispatchEvent(new h.w.Event('input',{bubbles:true}));
  const text=h.$('waCampaignPreview').textContent;
  assert.ok(text.includes('mulai pada jadwal yang dipilih'));assert.ok(text.includes('45–45 detik'));
  assert.ok(text.includes('75–105 detik'));assert.equal(text.includes('0–0'),false);
  assert.equal(h.requests.some(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')),false);
  h.dom.window.close();
});
test('text verification does not unlock media or untested destinations',async()=>{
  const h=await boot({campaign:{message_type:'media',media_path:'campaigns/'+campaignId+'/test.jpg'}});
  assert.equal(h.$('waSendReal').disabled,true);assert.equal(h.$('waSendTest').disabled,false);h.dom.window.close();
});
test('bootstrap test is available only on the approved target; ordinary send stays locked',async()=>{
  const h=await boot({caps:{ready:false,sending_enabled:false,verified_types:[]}});
  assert.equal(h.$('waSendReal').disabled,true);assert.equal(h.$('waSendTest').disabled,false);h.dom.window.close();
  const denied=await boot({caps:{ready:false,sending_enabled:false,approved_test_targets:[],verified_types:[]}});
  assert.equal(denied.$('waSendTest').disabled,true);denied.dom.window.close();
});
test('capability failures explain the lock and a fresh read enables only the approved bootstrap test',async()=>{
  let checks=0;
  const h=await boot({caps:{ready:false,sending_enabled:false,verified_types:[]},capResponse:caps=>++checks===1?Response.json({error:'wa_owner_required'},{status:403}):Response.json(caps)});
  await wait(()=>h.$('waTestReadiness').textContent.includes('Sesi Admin'));
  assert.equal(h.$('waSendTest').disabled,true);
  h.$('waCheckSend').click();await wait(()=>h.$('waSendTest').disabled===false);
  assert.equal(h.$('waSendReal').disabled,true);assert.ok(h.$('waTestReadiness').textContent.includes('Siap'));
  assert.equal(h.requests.some(c=>c.options.method==='POST'),false);h.dom.window.close();
});
test('a queued acknowledgement is not displayed as provider acceptance or delivery',async()=>{
  const h=await boot();h.$('waSendReal').click();await wait(()=>h.$('waCampaignMessage').textContent.includes('ANTREAN'));
  const calls=h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/'));
  assert.equal(calls.length,1);const body=JSON.parse(calls[0].options.body);assert.equal(body.confirm,true);assert.match(body.request_key,/^[0-9a-f-]{36}$/);
  assert.ok(!h.$('waCampaignMessage').textContent.includes('DITERIMA API'));h.dom.window.close();
});
test('rejecting the confirmation sends nothing',async()=>{
  const h=await boot();h.w.confirm=()=>false;h.$('waSendReal').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')).length,0);h.dom.window.close();
});
test('double click cannot start parallel provider requests',async()=>{
  let release;const pending=new Promise(r=>release=r);
  const h=await boot({post:()=>pending});h.$('waSendReal').click();h.$('waSendReal').click();
  assert.equal(h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')).length,1);
  release(Response.json({status:'unknown'}));await wait(()=>h.$('waCampaignMessage').textContent.includes('BELUM DIKETAHUI'));h.dom.window.close();
});
test('delivery evidence is never recorded just by loading history',async()=>{
  const h=await boot({jobs:[{id:'fixture-job',target_name:'Private group',status:'api_accepted',provider_message_id:'fixture-message',snapshot:{content_text:'Fixture text'}}]});
  assert.ok(h.w.document.querySelector('[data-wa-content="reports"]').textContent.includes('PENERIMA BELUM DIKONFIRMASI'));
  assert.equal(h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')).length,0);h.dom.window.close();
});
test('gateway timeout is explained in the send result and history without claiming delivery or retrying',async()=>{
  const job={id:'fixture-unknown',target_name:'Status',status:'unknown',provider_http_status:504,error_code:'provider_gateway_timeout'};
  const h=await boot({jobs:[job],post:()=>Response.json(job)});
  h.$('waSendReal').click();await wait(()=>h.$('waCampaignMessage').textContent.includes('HTTP 504'));
  assert.ok(h.$('waCampaignMessage').textContent.includes('BELUM DIKETAHUI'));
  assert.ok(h.$('waCampaignMessage').textContent.includes('jangan kirim ulang'));
  assert.ok(h.w.document.querySelector('[data-wa-content="reports"]').textContent.includes('HTTP 504'));
  assert.equal(h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')).length,1);
  assert.equal(h.requests.some(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action==='confirm_received'),false);
  h.dom.window.close();
});
test('saving drafts never schedules a campaign, and scheduler is locked by default',async()=>{
  const h=await boot({campaign:{delivery_mode:'scheduled',scheduled_at:new Date(Date.now()+3600000).toISOString()}});
  assert.equal(h.$('waScheduleReal').disabled,true);h.$('waCampaignForm').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));
  await wait(()=>h.$('waCampaignMessage').textContent.includes('berhasil disimpan'));
  assert.equal(h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')).length,0);h.dom.window.close();
});
test('queue controls pause the selected run and require confirmation to resume',async()=>{
  const run='00000000-0000-4000-8000-000000000004';
  const h=await boot({runs:[{id:run,campaign_id:campaignId,status:'active',mode:'scheduled'}]});
  const pauseButton=h.w.document.querySelector('[data-wa-action="pause"]');pauseButton.click();
  await wait(()=>h.requests.some(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action==='pause'));
  const call=h.requests.find(c=>c.options.method==='POST'&&JSON.parse(c.options.body).action==='pause');
  await wait(()=>!pauseButton.disabled);
  assert.deepEqual(JSON.parse(call.options.body),{action:'pause',run_id:run,confirm:true});h.dom.window.close();
  const paused=await boot({runs:[{id:run,campaign_id:campaignId,status:'paused',mode:'scheduled'}]});
  paused.w.confirm=()=>false;paused.w.document.querySelector('[data-wa-action="resume"]').click();
  await new Promise(r=>setTimeout(r,10));
  assert.equal(paused.requests.some(c=>c.options.method==='POST'),false);
  paused.w.confirm=()=>true;const resumeButton=paused.w.document.querySelector('[data-wa-action="resume"]');resumeButton.click();
  await wait(()=>paused.requests.some(c=>c.options.method==='POST'));
  await wait(()=>!resumeButton.disabled);
  assert.deepEqual(JSON.parse(paused.requests.find(c=>c.options.method==='POST').options.body),{action:'resume',run_id:run,confirm:true});paused.dom.window.close();
});
test('a failed pause request leaves its control available for a manual retry',async()=>{
  const run='00000000-0000-4000-8000-000000000004';
  const h=await boot({runs:[{id:run,campaign_id:campaignId,status:'active',mode:'scheduled'}],post:()=>Response.json({error:'wa_backend_transport_failed'},{status:503})});
  const button=h.w.document.querySelector('[data-wa-action="pause"]');button.click();
  await wait(()=>h.requests.some(c=>c.options.method==='POST')&&!button.disabled);
  assert.equal(h.requests.filter(c=>c.options.method==='POST').length,1);h.dom.window.close();
});
test('an unknown delivery locks only its own resume control',async()=>{
  const uncertainRun='00000000-0000-4000-8000-000000000004',queuedRun='00000000-0000-4000-8000-000000000005';
  const h=await boot({runs:[{id:uncertainRun,campaign_id:campaignId,status:'paused',mode:'test'},{id:queuedRun,campaign_id:campaignId,status:'paused',mode:'scheduled'}],jobs:[{id:'fixture-unknown',run_id:uncertainRun,campaign_id:campaignId,target_name:'Status',status:'unknown',snapshot:{content_text:'Fixture text'}}]});
  const locked=h.w.document.querySelector('[data-wa-run="'+uncertainRun+'"][data-wa-action="resume"]');
  assert.equal(locked.disabled,true);assert.ok(locked.textContent.includes('PERLU VERIFIKASI'));locked.click();
  assert.equal(h.w.document.querySelector('[data-wa-run="'+queuedRun+'"][data-wa-action="resume"]').disabled,false);
  assert.equal(h.requests.some(c=>c.options.method==='POST'),false);h.dom.window.close();
});
test('a paused unknown run locks another send of its campaign even after readiness is refreshed',async()=>{
  const run='00000000-0000-4000-8000-000000000004';
  const h=await boot({runs:[{id:run,campaign_id:campaignId,status:'paused',mode:'test'}],jobs:[{id:'fixture-unknown',run_id:run,campaign_id:campaignId,status:'unknown'}]});
  assert.equal(h.$('waSendTest').disabled,true);assert.ok(h.$('waTestReadiness').textContent.includes('jangan kirim ulang'));
  h.$('waCheckSend').click();await wait(()=>!h.$('waCheckSend').disabled);
  assert.equal(h.$('waSendTest').disabled,true);h.$('waSendTest').click();
  assert.equal(h.requests.some(c=>c.options.method==='POST'),false);h.dom.window.close();
});
