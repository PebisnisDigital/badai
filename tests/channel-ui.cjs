const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
const crypto=require('node:crypto');
test('Channel UI: draft editor, image upload, formatting, drag/drop, day editing, paging, duplicates, detach, save, responsive layout',async()=>{
  const root=require('node:path').join(__dirname,'..');
  const server=http.createServer((req,res)=>{
    if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wa-channel-admin.css"><style>body{margin:0;padding:24px;background:#080808;font-family:Arial}button,input,select,textarea{font-family:inherit}#pageWamarketing{max-width:1500px;margin:auto}</style></head><body><main id="pageWamarketing"><div id="channel"></div></main><script src="/wa-channel-admin.js"></script></body></html>');}
    else if(['/wa-channel-admin.js','/wa-channel-admin.css'].includes(req.url)){res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8');res.end(fs.readFileSync(root+req.url));}
    else{res.statusCode=404;res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept('Pesan terlihat di Channel uji BADAI.'));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>{
      window.fixture={contents:[{id:'30000000-0000-4000-8000-000000000001',title:'Edukasi AI untuk Pebisnis',caption:'Mulai dari satu langkah kecil. *Konsisten* setiap hari.',image_path:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}],settings:[],slots:[],logs:[],saves:[],uploads:0};
      const f=window.fixture;
      window.fetch=async(url,options={})=>{
        if(url.includes('/object/wa-marketing-media/')){f.uploads++;return new Response('{}',{status:200});}
        if(url.includes('/object/sign/'))return new Response(JSON.stringify({signedURL:'/object/sign/wa-marketing-media/fixture.png?token=fixture'}),{status:200});
        if(url.includes('badai-wa-send')||url.includes('badai-wa-channel'))return new Response(JSON.stringify({ready:!!f.verified,scheduler_enabled:true,verified_types:f.verified?[{target_kind:'channel',message_type:'image'}]:[]}),{status:200});
        return new Response('',{status:404});
      };
      const api={base:'https://fixture.supabase.co',key:'fixture',sendUrl:'https://fixture.supabase.co/functions/v1/badai-wa-send',token:()=> 'fixture',db:async(path,method,body)=>{
        if(path==='rpc/wa_channel_save_schedule'){
          f.saves.push(body);const row={...body.p_settings,version:body.p_expected_version+1,created_at:new Date().toISOString()};f.settings=[row];f.slots=body.p_slots.map(s=>({...s,settings_id:row.id}));return row;
        }
        if(path==='rpc/wa_channel_delete_content'){f.contents=f.contents.filter(c=>c.id!==body.p_content_id);f.slots=f.slots.filter(s=>s.content_id!==body.p_content_id);return f.settings.map(s=>({id:s.id,version:s.version}));}
        if(path==='rpc/wa_channel_send_test'){f.logs.unshift({id:'70000000-0000-4000-8000-000000000001',settings_id:body.p_settings_id,content_id:f.slots[0].content_id,day_number:body.p_day_number,send_time:body.p_send_time,cycle_number:1,local_date:new Date().toISOString().slice(0,10),status:'api_accepted',provider_response:{message_id:'fixture-provider-id'},created_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_test:true});return {id:f.logs[0].id};}
        if(path==='rpc/wa_channel_confirm_received'){f.logs.find(l=>l.id===body.p_id).status='delivered';f.verified=true;return null;}
        const table=path.split('?')[0];
        if(table==='wa_channel_contents'&&method==='POST'){const row={...body,created_at:new Date().toISOString()};f.contents.unshift(row);return [row];}
        if(table==='wa_channel_contents'&&method==='PATCH'){const i=f.contents.findIndex(c=>c.id===body.id);f.contents[i]={...f.contents[i],...body};return [f.contents[i]];}
        if(table==='wa_channel_contents')return structuredClone(f.contents);
        if(table==='wa_channel_settings')return structuredClone(f.settings);
        if(table==='wa_channel_calendar_slots')return structuredClone(f.slots);
        if(table==='wa_channel_delivery_logs')return structuredClone(f.logs);
        throw Error('Unexpected '+method+' '+path);
      }};
      window.editor=window.BadaiChannel.create(api);window.editor.mount(document.querySelector('#channel'),[{id:'20000000-0000-4000-8000-000000000001',kind:'channel',name:'Channel BADAI',enabled:true}]);
    });
    await page.locator('#wcTitle').waitFor({state:'attached'});await page.locator('#wcNew').click();
    assert.equal(await page.locator('.wc-day').count(),30);assert.equal(await page.locator('.wc-slot').count(),30);
    await page.locator('[data-duration="30"]').click();await page.locator('[data-time-index="0"]').fill('08:00');await page.locator('[data-time-index="0"]').dispatchEvent('change');await page.locator('#wcAddTime').click();await page.locator('[data-time-index="1"]').fill('16:00');await page.locator('[data-time-index="1"]').dispatchEvent('change');
    await page.locator('#wcTitle').fill('Draft baru');await page.locator('#wcCaption').fill('Belajar AI bersama BADAI');
    await page.locator('#wcCaption').evaluate(el=>{el.focus();el.setSelectionRange(0,7);});await page.getByRole('button',{name:'Bold',exact:true}).click();
    assert.equal(await page.locator('#wcPreview b').innerText(),'Belajar');
    await page.locator('#wcImage').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvGQAAAAASUVORK5CYII=','base64')});
    await page.locator('#wcSaveDraft').click();await page.waitForFunction(()=>fixture.contents.length===2);assert.equal(await page.evaluate(()=>fixture.uploads),1);
    const cards=page.locator('.wc-content[data-content]');assert.equal(await cards.count(),2);
    // Native drag/drop copies a bank draft; the master remains in the bank.
    const dest=page.locator('.wc-slot[data-day="1"][data-time="08:00"]');
    const dt=await page.evaluateHandle(()=>new DataTransfer());
    await cards.first().dispatchEvent('dragstart',{dataTransfer:dt});await dest.dispatchEvent('dragover',{dataTransfer:dt});await dest.dispatchEvent('drop',{dataTransfer:dt});
    assert.equal(await dest.locator('b').innerText(),'Draft baru');assert.equal(await cards.count(),2);
    await dest.hover();await dest.locator('[data-copy-slot]').click();await page.locator('.wc-slot[data-day="2"][data-time="08:00"] [data-pick-slot]').click();
    assert.equal(await page.locator('.wc-slot.filled').count(),2);
    await page.locator('.wc-slot[data-day="2"][data-time="08:00"]').hover();await page.locator('.wc-slot[data-day="2"][data-time="08:00"] [data-move-slot]').click();await page.locator('.wc-slot[data-day="3"][data-time="08:00"] [data-pick-slot]').click();
    assert.equal(await page.locator('.wc-slot[data-day="2"][data-time="08:00"]').locator('b').count(),0);
    await page.locator('.wc-slot[data-day="3"][data-time="08:00"]').hover();await page.locator('.wc-slot[data-day="3"][data-time="08:00"] [data-detach-slot]').click();assert.equal(await page.locator('.wc-slot.filled').count(),1);
    await page.locator('[data-edit-day="4"]').click();await page.locator('[data-day-time="16:00"]').selectOption('30000000-0000-4000-8000-000000000001');await page.locator('#wcDialogApply').click();
    assert.equal(await page.locator('.wc-slot.filled').count(),2);
    await page.locator('[data-duration="1000"]').click();await page.locator('#wcNext').click();assert.match(await page.locator('#wcPageLabel').innerText(),/Hari 31–60/);
    await page.locator('#wcPrevious').click();await page.locator('#wcAddTime').click();assert.equal(await page.locator('.wc-slot').count(),90);
    await page.locator('[data-remove-time="2"]').click();assert.equal(await page.locator('.wc-slot').count(),60);
    await page.locator('#wcLoop').check();await page.locator('#wcSave').click();await page.waitForFunction(()=>fixture.saves.length===1);
    const payload=await page.evaluate(()=>fixture.saves[0]);assert.equal(payload.p_settings.duration_days,1000);assert.equal(payload.p_settings.enabled,false);assert.equal(payload.p_settings.loop,true);assert.equal(payload.p_slots.length,2);
    assert.equal(await page.locator('#wcVerify').isDisabled(),false,'saved slots can be used for an explicit verification test');await page.locator('#wcSend').click();assert.match(await page.locator('#wcMessage').innerText(),/belum terverifikasi/);
    await page.locator('#wcVerify').click();await page.locator('#wcDialogApply').click();await page.waitForFunction(()=>fixture.logs.length===1);
    assert.equal(await page.evaluate(()=>fixture.settings[0].enabled),false,'a test must not enable publication');
    await page.locator('#wcReload').click();await page.locator('#wcHistory').click();await page.locator('[data-confirm-received]').click();await page.waitForFunction(()=>fixture.verified===true);
    await page.locator('#wcEnabled').check();await page.locator('#wcSave').click();await page.waitForFunction(()=>fixture.saves.length===2);
    assert.equal(await page.evaluate(()=>fixture.saves[1].p_confirm_enable),true,'activation is an explicit admin action after receipt verification');
    await page.locator('#wcSearch').fill('Draft baru');assert.equal(await cards.count(),1);await cards.first().locator('[data-duplicate]').click();await page.locator('#wcSaveDraft').click();await page.waitForFunction(()=>fixture.contents.length===3);
    await page.locator('#wcSearch').fill('');await cards.filter({hasText:'Draft baru (salinan)'}).locator('[data-delete]').click();await page.waitForFunction(()=>fixture.contents.length===2);
    assert.equal(await page.evaluate(()=>window.fixture.settings[0].enabled),true);
    if(process.env.CHANNEL_SCREENSHOT){await page.setViewportSize({width:1000,height:760});await page.screenshot({path:process.env.CHANNEL_SCREENSHOT,fullPage:true});}
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile has no horizontal overflow');
    assert.deepEqual(errors,[]);
  }finally{await page.close({runBeforeUnload:false});await browser.close();await new Promise(resolve=>server.close(resolve));}
});
