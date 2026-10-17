const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
const root=require('node:path').join(__dirname,'..');
const browserOptions={executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']};

test('Production landing handler emits valid scripts including injected social proof and QRIS controls',async()=>{
  const nativeFetch=global.fetch;let body='',status=200;
  try{
    global.fetch=async url=>{
      assert.match(String(url),/^https:\/\/raw\.githubusercontent\.com\/PebisnisDigital\/badai\//);
      return new Response(fs.readFileSync(require('node:path').join(root,'index.html'),'utf8'));
    };
    await require('../api/landing-v6.js')({method:'GET',query:{},headers:{}},{setHeader(){return this;},status(code){status=code;return this;},send(value){body=value;return this;}});
  }finally{global.fetch=nativeFetch;}
  assert.equal(status,200);assert.ok(body.includes('qrisCheckStatusBtn'));
  const scripts=[...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length>8,'exercise server-injected scripts as well as static HTML');
  for(const [i,match] of scripts.entries())new (require('node:vm').Script)(match[1],{filename:'landing-script-'+i+'.js'});
});

for(const file of ['index.html','community-v2/index.html'])test(file+' QRIS: bounded polling, hidden/closed cancellation, recovery, expiry and payment success',async()=>{
  // Render the real payment UI and its complete registration script. A test-only
  // bridge exposes the normal screen transitions without creating a real invoice.
  let html=fs.readFileSync(require('node:path').join(root,file),'utf8');
  html=html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,(_,source)=>{
    if(!source.includes('async function checkQrisPayment('))return '';
    const pos=source.lastIndexOf('})();');
    return '<script>'+fs.readFileSync(root+'/landing-public.js','utf8')+'</script><script>'+source.slice(0,pos)+'window.paymentScreen={open:openRegistrationModal,close:closeRegistrationModal,show:showQrisStage};\n'+source.slice(pos)+'</script>';
  });
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch(browserOptions),page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2026-10-15T12:00:00Z')});
    await page.addInitScript(()=>{
      window.billingFixture={mode:'pending',requests:[],held:[]};
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.hiddenFixture?'hidden':'visible'});
      window.setHiddenFixture=hidden=>{window.hiddenFixture=hidden;document.dispatchEvent(new Event('visibilitychange'));};
      window.fetch=async(url,options={})=>{
        if(!String(url).includes('/functions/v1/check-buatqris-payment'))return new Response('[]',{status:200});
        const f=window.billingFixture;f.requests.push(JSON.parse(options.body).public_token);
        if(f.mode==='held')return new Promise(resolve=>f.held.push(resolve));
        if(f.mode==='timeout')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
        return new Response(JSON.stringify(f.mode==='error'?{error:'Temporarily unavailable'}:{status:f.mode}),{status:f.mode==='error'?503:200});
      };
    });
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await page.goto('http://127.0.0.1:'+server.address().port);
    const count=()=>page.evaluate(()=>billingFixture.requests.length);
    const show=async(token,expires=15*60000)=>page.evaluate(({token,expires})=>{
      paymentScreen.open('newbie');paymentScreen.show({public_token:token,expires_at:new Date(Date.now()+expires).toISOString(),amount:10000,total_amount:10000});
    },{token,expires});
    const advance=ms=>page.clock.runFor(ms);
    await show('first');await advance(3000);assert.equal(await count(),1);
    await advance(29000);assert.equal(await count(),1);await advance(1000);assert.equal(await count(),2,'normal checks use a 30 second interval');
    await page.evaluate(()=>setHiddenFixture(true));await advance(120000);assert.equal(await count(),2,'hidden tab makes no payment requests');
    await page.evaluate(()=>setHiddenFixture(false));await advance(1000);assert.equal(await count(),3,'returning to the payment screen can check status again');
    await page.evaluate(()=>paymentScreen.close());await advance(60000);assert.equal(await count(),3,'closing the payment dialog stops polling');
    await page.evaluate(()=>paymentScreen.open('newbie'));await advance(1000);assert.equal(await count(),4,'reopening resumes the existing invoice');

    // A late response from a closed/superseded invoice must not unlock access
    // or re-arm polling for that old invoice.
    await page.evaluate(()=>billingFixture.mode='held');await show('old');await advance(3000);const beforeClose=await count();
    await page.evaluate(()=>paymentScreen.close());
    await page.evaluate(()=>{billingFixture.mode='pending';billingFixture.held.shift()(new Response('{"status":"success"}',{status:200}));});
    await advance(60000);assert.equal(await count(),beforeClose);
    assert.equal(await page.locator('#qrisPaymentStage').evaluate(el=>el.classList.contains('access-ready')),false);
    await show('replacement');await advance(3000);assert.equal(await page.evaluate(()=>billingFixture.requests.at(-1)),'replacement');

    await page.evaluate(()=>billingFixture.mode='error');await show('errors');const beforeErrors=await count();
    await advance(3000);await advance(30000);await advance(60000);
    assert.equal(await count(),beforeErrors+3);assert.match(await page.locator('#qrisStageStatus').innerText(),/belum bisa diperiksa/);
    await advance(120000);assert.equal(await count(),beforeErrors+3,'three consecutive errors pause automatic checks');
    await page.evaluate(()=>billingFixture.mode='pending');await page.locator('#qrisCheckStatusBtn').click();
    assert.equal(await count(),beforeErrors+4,'manual status check recovers without creating another invoice');
    await page.locator('#qrisCheckStatusBtn').click();assert.equal(await count(),beforeErrors+4,'rapid manual clicks are throttled');

    await page.evaluate(()=>billingFixture.mode='timeout');await show('timeout');await advance(23000);
    assert.equal(await page.locator('#qrisCheckStatusBtn').isDisabled(),false,'a stuck request times out and releases the UI');
    await page.evaluate(()=>paymentScreen.close());

    await page.evaluate(()=>billingFixture.mode='pending');await show('already-expired',-1000);const pastCalls=await count();
    await advance(60000);assert.equal(await count(),pastCalls,'an already expired invoice never receives another fifteen minutes');
    assert.equal(await page.locator('#qrisRetryBtn').isVisible(),true);

    await page.evaluate(()=>billingFixture.mode='pending');await show('expires',5000);const beforeExpiry=await count();
    await advance(3000);await advance(2000);assert.equal(await count(),beforeExpiry+1);
    assert.match(await page.locator('#qrisStageStatus').innerText(),/Waktu QR berakhir/);
    await advance(120000);assert.equal(await count(),beforeExpiry+1,'local expiry ends automatic polling');
    // The server remains authoritative: a payment completed before expiry can
    // still be retrieved manually after the browser's countdown has ended.
    await page.evaluate(()=>billingFixture.mode='success');await page.locator('#qrisCheckStatusBtn').click();
    assert.equal(await count(),beforeExpiry+2);await page.waitForFunction(()=>document.getElementById('qrisStageStatus').textContent.toLowerCase().includes('berhasil'));assert.match(await page.locator('#qrisStageStatus').innerText(),/berhasil/i);
    assert.equal(await page.locator('#qrisCheckStatusBtn').isVisible(),false);
    assert.deepEqual(errors,[]);
  }finally{await page.close();await browser.close();await new Promise(r=>server.close(r));}
});

test('WhatsApp QR checks stop after five minutes, pause outside Connection, and resume only on explicit checks',async()=>{
  const html='<!doctype html><button id="tabWaMarketing" data-page="wamarketing">WA</button><button id="otherTab" data-page="sales">Sales</button><section id="pageWamarketing"><button id="waCheckConnection">PERIKSA KONEKSI</button><div id="waStatusLabel"></div><div id="waStatusHeading"></div><div id="waStatusDetail"></div><button data-wa-section="connection">Koneksi</button><button data-wa-section="channel">Channel</button><div data-wa-content="connection" class="active"></div></section><script src="/wa-zawa-ui.js"></script>';
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/html');res.end(req.url.endsWith('.js')?fs.readFileSync(root+'/wa-zawa-ui.js'):html);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch(browserOptions),page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.clock.install({time:new Date('2026-10-15T12:00:00Z')});
    await page.addInitScript(()=>{
      localStorage.setItem('badai_admin_session',JSON.stringify({access_token:'fixture'}));window.qrFixture={calls:0,state:'waiting_for_qr'};
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>!!window.hiddenFixture});
      window.fetch=async()=>{qrFixture.calls++;return new Response(JSON.stringify({exists:true,connection_state:qrFixture.state}),{status:200});};
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#tabWaMarketing').click();assert.equal(await page.evaluate(()=>qrFixture.calls),1);
    await page.locator('#tabWaMarketing').click();assert.equal(await page.evaluate(()=>qrFixture.calls),1,'reopening WA immediately uses recent connection state');
    await page.clock.runFor(5*60000);const capped=await page.evaluate(()=>qrFixture.calls);
    assert.ok(capped<=26);assert.match(await page.locator('#waPairHint').innerText(),/5 menit/);
    await page.clock.runFor(60000);assert.equal(await page.evaluate(()=>qrFixture.calls),capped);
    await page.locator('#waCheckConnection').click();assert.equal(await page.evaluate(()=>qrFixture.calls),capped+1);
    await page.locator('[data-wa-section="channel"]').click();await page.clock.runFor(60000);assert.equal(await page.evaluate(()=>qrFixture.calls),capped+1);
    await page.locator('[data-wa-section="connection"]').click();await page.clock.runFor(12000);assert.equal(await page.evaluate(()=>qrFixture.calls),capped+2);
    await page.evaluate(()=>{window.hiddenFixture=true;document.dispatchEvent(new Event('visibilitychange'));});
    await page.clock.runFor(5*60000);const hiddenCount=await page.evaluate(()=>qrFixture.calls);
    await page.evaluate(()=>{window.hiddenFixture=false;document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(12000);
    assert.equal(await page.evaluate(()=>qrFixture.calls),hiddenCount,'hiding the tab does not reset the five-minute allowance');
    await page.evaluate(()=>qrFixture.state='connected');await page.locator('#waCheckConnection').click();const connectedCount=await page.evaluate(()=>qrFixture.calls);
    await page.clock.runFor(60000);assert.equal(await page.evaluate(()=>qrFixture.calls),connectedCount,'connected sessions need no QR polling');
    assert.deepEqual(errors,[]);
  }finally{await page.close();await browser.close();await new Promise(r=>server.close(r));}
});

for(const kind of ['channel','group'])test(kind+' readiness checks are single-flight, skip empty destinations and reject stale responses',async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':'text/html');res.end(req.url.endsWith('.js')?fs.readFileSync(root+'/wa-channel-admin.js'):'<!doctype html><main id="pageWamarketing"><div id="host"></div></main><script src="/wa-channel-admin.js"></script>');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch(browserOptions),page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const locate=selector=>page.locator(kind==='group'?selector.replace(/#wc/g,'#wg'):selector);
  try{
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(kind=>{
      const targets=['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'];
      const cid='30000000-0000-4000-8000-000000000001';
      const settings=targets.map((target_id,i)=>({id:'40000000-0000-4000-8000-00000000000'+(i+1),target_id,enabled:false,duration_days:10,start_date:'2026-10-15',timezone:'Asia/Jakarta',send_times:['08:00'],loop:true,version:1}));
      window.readinessFixture={calls:[],pending:[]};
      window.fetch=(url)=>new Promise(resolve=>{readinessFixture.calls.push(url);readinessFixture.pending.push(resolve);});
      const api={base:'https://fixture.supabase.co',key:'fixture',token:()=> 'fixture',db:async path=>{
        if(path.startsWith('wa_'+kind+'_contents'))return [{id:cid,title:'Draft',caption:'Caption'}];
        if(path.startsWith('wa_'+kind+'_settings'))return settings;
        if(path.startsWith('wa_'+kind+'_calendar_slots'))return settings.map(s=>({settings_id:s.id,day_number:1,send_time:'08:00',content_id:cid}));
        return [];
      }};
      BadaiChannel.create(api,{kind}).mount(document.querySelector('#host'),targets.map((id,i)=>({id,kind,name:'Tujuan '+i,enabled:true})));
    },kind);
    await locate('#wcTarget').waitFor();
    assert.equal(await page.evaluate(()=>readinessFixture.calls.length),1,'initial load has exactly one readiness check');
    await locate('#wcReload').evaluate(el=>{el.click();el.click();});
    assert.equal(await page.evaluate(()=>readinessFixture.calls.length),1,'overlapping refresh clicks share one request');
    await locate('#wcTarget').selectOption('');assert.equal(await page.evaluate(()=>readinessFixture.calls.length),1,'empty selection makes no Edge Function request');
    await locate('#wcTarget').selectOption('20000000-0000-4000-8000-000000000001');
    assert.equal(await page.evaluate(()=>readinessFixture.calls.length),2,'returning to a target does not reuse an invalidated request');
    await locate('#wcTarget').selectOption('20000000-0000-4000-8000-000000000002');
    assert.equal(await page.evaluate(()=>readinessFixture.calls.length),3);
    await page.evaluate(kind=>{
      const body=JSON.stringify({ready:true,scheduler_enabled:true,verified_types:[{target_kind:kind,message_type:'text'}]});
      readinessFixture.pending[0](new Response(body));readinessFixture.pending[1](new Response(body));
    },kind);
    assert.match(await locate('#wcServerState').innerText(),/menunggu koneksi/,'late readiness for the old target cannot unlock the new one');
    await locate('#wcSend').click();assert.equal(await locate('#wcDialog').evaluate(el=>el.open),false);
    await page.evaluate(kind=>readinessFixture.pending[2](new Response(JSON.stringify({ready:true,scheduler_enabled:true,verified_types:[{target_kind:kind,message_type:'text'}]}))),kind);
    await page.waitForFunction(id=>!document.querySelector(id).textContent.includes('menunggu koneksi'),kind==='group'?'#wgServerState':'#wcServerState');
    await locate('#wcSend').click();assert.equal(await locate('#wcDialog').evaluate(el=>el.open),true,'only the current target verification opens the send confirmation');
    assert.deepEqual(errors,[]);
  }finally{await page.close();await browser.close();await new Promise(r=>server.close(r));}
});
