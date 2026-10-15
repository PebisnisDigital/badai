const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');

test('integrated Channel settings preserve schedule edits across sync, activation and target changes',async()=>{
  process.env.BADAI_ENV='staging';
  let html;
  await require('../api/admin-v5')({method:'GET',query:{},headers:{}},{setHeader(){return this},status(c){assert.equal(c,200);return this},send(s){html=s;return this}});
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="/wa-channel-admin.js"></script><script src="/wa-marketing-admin.js"></script></body>');
  const server=http.createServer((req,res)=>{
    if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
    else if(['/wa-channel-admin.js','/wa-marketing-admin.js','/wa-channel-admin.css','/admin-workspace.css'].includes(req.url)){
      res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'application/javascript');res.end(fs.readFileSync(require('node:path').join(__dirname,'..',req.url)));
    }else{res.statusCode=404;res.end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[];
  const first='20000000-0000-4000-8000-000000000001',second='20000000-0000-4000-8000-000000000002';
  const targets=[{id:first,kind:'channel',name:'BADAI Utama',external_id:'111@newsletter',enabled:true,origin:'sync'},{id:second,kind:'channel',name:'BADAI Edukasi',external_id:'222@newsletter',enabled:false,origin:'sync'}];
  let failSync=true;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  try{
    await page.addInitScript(()=>localStorage.setItem('badai_admin_session',JSON.stringify({access_token:'fixture'})));
    await page.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.hostname==='127.0.0.1')return route.continue();
      if(!url.hostname.endsWith('.supabase.co'))return route.abort();
      let data=[],status=200;
      if(req.method()!=='GET')writes.push({path:url.pathname,method:req.method()});
      if(url.pathname.endsWith('/badai-zawa-sync')){
        if(failSync){failSync=false;status=503;data={error:'Sinkronisasi sementara gagal'};}
        else data={found:2,added:0,preserved:2};
      }else if(url.pathname.endsWith('/badai-wa-channel'))data={ready:false,scheduler_enabled:false,verified_types:[]};
      else if(url.pathname.endsWith('/wa_marketing_targets')){
        if(req.method()==='PATCH')Object.assign(targets.find(t=>t.id===url.searchParams.get('id').slice(3)),req.postDataJSON());
        if(req.method()==='POST')targets.push({...req.postDataJSON(),id:'20000000-0000-4000-8000-000000000003'});
        data=targets;
      }
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>{
      document.querySelector('#authView').classList.add('hidden');document.querySelector('#dashboardView').classList.remove('hidden');
      document.querySelectorAll('.admin-page').forEach(p=>p.classList.toggle('hidden',p.id!=='pageWamarketing'));
      document.querySelectorAll('[data-wa-content]').forEach(p=>p.classList.toggle('active',p.dataset.waContent==='channel'));
    });
    await page.locator('[data-wa-section="channel"]').click();
    await page.locator('#wcTarget').waitFor();
    assert.equal(await page.locator('.wc-settings [data-wa-sync="channel"]').count(),1);
    assert.equal(await page.locator('.wc-settings #wcTarget').inputValue(),first);
    assert.equal(await page.locator('.wc-targets').count(),0);
    await page.locator('#wcCustom').fill('42');await page.locator('#wcCustom').dispatchEvent('change');
    await page.locator('[data-wa-sync="channel"]').click();
    await page.getByRole('button',{name:'COBA SINKRONKAN LAGI'}).waitFor();
    await page.getByRole('button',{name:'COBA SINKRONKAN LAGI'}).click();
    await page.waitForFunction(()=>document.querySelector('[data-wa-sync-note="channel"]').textContent.includes('Ditemukan'));
    assert.equal(await page.locator('#wcCustom').inputValue(),'42');
    await page.locator('.wc-target-details>summary').click();
    await page.locator('[data-wa-enable="'+second+'"]').check();
    await page.waitForFunction(id=>!!document.querySelector('#wcTarget option[value="'+id+'"]'),second);
    assert.equal(await page.locator('#wcCustom').inputValue(),'42');
    await page.locator('#wcTarget').selectOption(second);
    assert.equal(await page.locator('.wc-settings [data-wa-sync="channel"]').count(),1,'sync survives full editor rerender');
    await page.locator('[data-wa-sync="channel"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-wa-sync-note="channel"]').textContent.includes('Ditemukan'));
    await page.locator('.wc-target-manual>summary').click();
    await page.locator('[data-wa-target-form="channel"] [name="targetName"]').fill('BADAI Baru');await page.locator('[data-wa-target-form="channel"] [name="targetId"]').fill('333@newsletter');
    await page.locator('[data-wa-target-form="channel"] [type="submit"]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#wcTarget option')].some(o=>o.textContent==='BADAI Baru'));
    await page.locator('.wc-target-details>summary').click();
    for(const width of [1440,1024,768,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no overflow at '+width);
      if(process.env.CHANNEL_TARGET_SCREENSHOTS){await page.waitForTimeout(200);await page.screenshot({path:'work/channel-integrated-'+width+'.png',fullPage:true});}
    }
    assert.deepEqual(errors,[]);
    assert.ok(writes.every(r=>!r.path.includes('/rpc/')&&!r.path.includes('badai-wa-send')),'configuration never dispatches messages or saves an automation implicitly');
  }finally{await page.close({runBeforeUnload:false});await browser.close();await new Promise(r=>server.close(r));}
});
