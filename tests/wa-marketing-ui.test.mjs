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
      if(u.searchParams.get('action')==='history')return Response.json({jobs:overrides.jobs||[],runs:[]});
      if((options.method||'GET')==='GET')return Response.json(caps);
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
  await wait(()=>$('waSendReal').disabled===!(caps.ready&&targets.length===1&&c.message_type==='text'));
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
test('saving drafts never schedules a campaign, and scheduler is locked by default',async()=>{
  const h=await boot({campaign:{delivery_mode:'scheduled',scheduled_at:new Date(Date.now()+3600000).toISOString()}});
  assert.equal(h.$('waScheduleReal').disabled,true);h.$('waCampaignForm').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));
  await wait(()=>h.$('waCampaignMessage').textContent.includes('berhasil disimpan'));
  assert.equal(h.requests.filter(c=>c.options.method==='POST'&&c.url.includes('/functions/v1/')).length,0);h.dom.window.close();
});
