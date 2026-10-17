const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
let browser,html;
before(async()=>{
  let status=200;const original=global.fetch;
  try{
    global.fetch=async()=>new Response(fs.readFileSync(root+'/index.html','utf8'));
    await require('../api/landing-v6.js')({query:{},headers:{}},{setHeader(){return this},status(v){status=v;return this},send(v){html=String(v);return this}});
  }finally{global.fetch=original;}
  assert.equal(status,200);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
});
after(async()=>{await browser?.close()});
async function fixture(options={}){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(5000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-17T12:00:00Z')});
  await page.addInitScript(options=>{
    const qris={id:'qris',method_type:'qris',provider:'buatqris',display_name:'QRIS',qris_image_url:'',sort_order:1};
    window.fixture={requests:[],hidden:!!options.hidden,fail:{},delay:{},held:[],hold:'',retryAfter:'',
      config:{product_price:100000,newbie_price:100000,pro_price:150000,registration_notification:'[nama] [harga]',registration_open:true},
      methods:[qris,{id:'manual',method_type:'manual_transfer',provider:'bank',display_name:'Bank',bank_name:'Bank fixture',account_number:'fixture',account_holder:'Fixture'}],
      social:{enabled:true,target:'both',placement:'bottom-left',max_items:20},couponValid:true,status:'pending'};
    Math.random=()=>0;
    // Keep the long request-count test independent of decorative frame work.
    // Normal rendering and checkout tests still run all production animations.
    if(options.dataOnly)window.requestAnimationFrame=()=>0;
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>fixture.hidden?'hidden':'visible'});
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>fixture.hidden});
    window.setFixtureHidden=hidden=>{fixture.hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));};
    window.fetch=async(input,init={})=>{
      const u=new URL(String(input),location.href),name=u.pathname.split('/').pop();
      fixture.requests.push({name,path:u.pathname,method:init.method||'GET',body:init.body?JSON.parse(init.body):null,t:Date.now()});
      if(fixture.hold===name)await new Promise((resolve,reject)=>{
        fixture.held.push(resolve);
        init.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
      });
      if(fixture.delay[name])await new Promise((resolve,reject)=>{
        const timer=setTimeout(resolve,fixture.delay[name]);
        init.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))},{once:true});
      });
      if(fixture.fail[name])return new Response('{"error":"fixture"}',{status:fixture.fail[name],headers:{'Retry-After':fixture.retryAfter}});
      let data;
      switch(name){
        case 'marketing_public_config':data=[{...fixture.config}];break;
        case 'payment_methods':data=fixture.methods;break;
        case 'get_social_proof_settings':data=[fixture.social];break;
        case 'get_social_proof_feed':data=['Alpha','Beta','Gamma'].map(display_name=>({display_name,membership_plan:'newbie',occurred_at:'2026-10-17T11:00:00Z',payment_status:'paid'}));break;
        case 'validate_marketing_coupon':{
          const plan=JSON.parse(init.body).p_plan;
          const amount=fixture.config[plan+'_price'];
          data=[{valid:fixture.couponValid,code:'HEMAT',original_amount:amount,discount_amount:amount/10,final_amount:amount*0.9,message:'fixture coupon'}];break;
        }
        case 'create-buatqris-payment-coupon':data={success:true,public_token:'invoice-fixture',amount:90000,total_amount:90500,expires_at:new Date(Date.now()+900000).toISOString()};break;
        case 'check-buatqris-payment':data={status:fixture.status};break;
        case 'register-free-lead':data={success:true};break;
        case 'create_manual_registration':await window.recordInvoiceFixture?.(JSON.parse(init.body));data=[{registration_id:'manual-fixture',amount:90000,payment_total_amount:90123,payment_unique_code:123}];break;
        default:throw Error('Unexpected fixture request '+name);
      }
      return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    };
  },options);
  let body=html;
  if(options.community)body=fs.readFileSync(root+'/community-v2/index.html','utf8');
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='wa.me')return route.fulfill({status:200,contentType:'text/html',body:'WhatsApp fixture'});
    if(u.hostname==='landing.test')return route.fulfill({status:200,contentType:u.pathname==='/landing-public.js'?'application/javascript':'text/html',body:u.pathname==='/landing-public.js'?fs.readFileSync(root+'/landing-public.js','utf8'):body});
    return route.abort();
  });
  await page.goto('https://landing.test/'+(options.free?'?kulwa':''));
  // The production CTA pulses continuously; freeze only that CSS motion so
  // Playwright can perform a normal enabled/visible click with virtual time.
  await page.addStyleTag({content:'.register-submit{animation:none!important;transition:none!important}'});
  await page.evaluate(async()=>{await Promise.resolve();await Promise.resolve()});
  const counts=()=>page.evaluate(()=>fixture.requests.reduce((o,r)=>(o[r.name]=(o[r.name]||0)+1,o),{}));
  const run=ms=>page.clock.runFor(ms);
  const close=async()=>{assert.deepEqual(errors,[]);await context.close()};
  return {page,counts,run,close};
}
async function checkout(f,method='qris'){
  await f.page.locator('[data-package-select="newbie"]').first().click();
  // Let the production 80ms desktop autofocus and 120ms modal/coupon setup
  // finish before the fixture fills fields faster than a human can type.
  await f.run(200);
  await f.page.locator('#paymentMethodSelect').selectOption(method);
  await f.page.locator('#regNama').fill('Fixture Buyer');
  await f.page.locator('#regEmail').fill('buyer@example.test');
  await f.page.locator('#regWa').fill('081234567890');
  assert.equal(await f.page.evaluate(()=>document.getElementById('badaiRegisterForm').checkValidity()),true);
}

test('v6 retires only legacy social controller and renders local cards every two seconds without fetching',async()=>{
  assert.ok(!html.includes('id="badai-social-proof-script"'));
  for(const marker of ['badai-coupon-bootstrap','badai-social-proof-v6-script','badai-registration-mode-script','regCoupon','qrisCheckStatusBtn'])assert.ok(html.includes(marker),marker);
  const f=await fixture();
  try{
    await f.run(1);
    assert.match(await f.page.locator('h1').first().textContent(),/AI/i);
    assert.match(await f.page.locator('#badaiSp6Text').textContent(),/Alpha/);
    const before=await f.counts();
    await f.run(1999);assert.match(await f.page.locator('#badaiSp6Text').textContent(),/Beta/);
    await f.run(2000);assert.match(await f.page.locator('#badaiSp6Text').textContent(),/Gamma/);
    assert.deepEqual(await f.counts(),before);
  }finally{await f.close()}
});

test('one visible hour meets 360 config / 120 social requests and zero idle payment reads',async()=>{
  const f=await fixture({dataOnly:true});
  try{
    const start=await f.counts();assert.deepEqual(start,{marketing_public_config:1,get_social_proof_settings:1,get_social_proof_feed:1});
    // Half-open hour includes boot at t=0; the next hour starts at t=3600000.
    await f.run(3599000);
    const c=await f.counts();assert.equal(c.marketing_public_config,360);assert.equal(c.get_social_proof_settings,60);assert.equal(c.get_social_proof_feed,60);assert.equal(c.payment_methods||0,0);
    console.log('Measured visible hour:',JSON.stringify(c));
    await f.page.evaluate(()=>setFixtureHidden(true));const hidden=await f.counts();
    await f.run(60000);assert.deepEqual(await f.counts(),hidden);
    await f.page.evaluate(()=>{setFixtureHidden(false);window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'))});
    const resumed=await f.counts();assert.equal(resumed.marketing_public_config,c.marketing_public_config+1);assert.equal(resumed.get_social_proof_settings,c.get_social_proof_settings+1);
    await f.page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.deepEqual(await f.counts(),resumed);
  }finally{await f.close()}
});

test('shared config updates price and registration status; coupon events do not refresh other endpoints',async()=>{
  const f=await fixture();
  try{
    await checkout(f);
    assert.equal((await f.counts()).payment_methods,1);
    const before=await f.counts();
    await f.page.locator('#regCoupon').fill('HEMAT');await f.page.locator('#applyCouponBtn').click();
    await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.valid);
    assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/90.000/);
    const after=await f.counts();assert.equal(after.validate_marketing_coupon,1);
    for(const name of ['marketing_public_config','payment_methods','get_social_proof_settings','get_social_proof_feed'])assert.equal(after[name],before[name]);
    await f.run(10000);assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/90.000/,'raw config refresh must preserve coupon display');
    await f.page.locator('#regCoupon').fill('');assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/100.000/);
    await f.page.evaluate(()=>{fixture.config.newbie_price=120000;fixture.config.registration_open=false});
    await f.run(10000);assert.equal(await f.page.evaluate(()=>BADAI_REGISTRATION_OPEN),false);
    assert.equal(await f.page.locator('[data-package-select="newbie"]').first().isDisabled(),true);
    await f.page.evaluate(()=>fixture.config.registration_open=true);await f.run(10000);
    assert.match(await f.page.locator('#dynamicNewbiePrice').textContent(),/120.000/);
    assert.equal(await f.page.locator('[data-package-select="newbie"]').first().isDisabled(),false);
  }finally{await f.close()}
});

test('checkout revalidates a disabled method and never starts a transaction on stale or failed reads',async()=>{
  const f=await fixture();
  try{
    await checkout(f);
    await f.page.evaluate(()=>fixture.methods=fixture.methods.filter(m=>m.id!=='qris'));
    await f.page.locator('.register-submit').click();
    await f.page.waitForFunction(()=>/berubah|tidak tersedia/.test(document.getElementById('registerStatus').textContent));
    assert.equal((await f.counts()).payment_methods,2);
    assert.equal((await f.counts())['create-buatqris-payment-coupon']||0,0);
    assert.match(await f.page.locator('#registerStatus').textContent(),/berubah|tidak tersedia/);
    await f.page.locator('#paymentMethodSelect').selectOption('manual');
    await f.page.evaluate(()=>fixture.fail.payment_methods=503);
    await f.page.locator('.register-submit').click();
    await f.page.waitForFunction(()=>document.getElementById('registerStatus').textContent.includes('belum dapat diperbarui'));
    assert.equal((await f.counts()).create_manual_registration||0,0);
    const c=await f.counts();await f.page.locator('.register-submit').click();assert.deepEqual(await f.counts(),c,'backoff is respected even on submit');
  }finally{await f.close()}
});

test('coupon QRIS uses fresh methods, keeps invoice amount and polls existing status without real transactions',async()=>{
  const f=await fixture();
  try{
    await checkout(f);await f.page.locator('#regCoupon').fill('HEMAT');await f.page.locator('#applyCouponBtn').click();
    await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.valid);
    await f.page.locator('.register-submit').click();
    await f.page.waitForFunction(()=>document.getElementById('qrisPaymentStage').textContent.includes('90.500')).catch(async error=>{
      console.log('QRIS fixture diagnostics',await f.page.evaluate(()=>({requests:fixture.requests,status:document.getElementById('registerStatus').textContent,coupon:window.__BADAI_COUPON_STATE,valid:document.getElementById('badaiRegisterForm').checkValidity(),method:document.getElementById('paymentMethodSelect')?.value,modal:document.getElementById('registrationModal').className})));
      throw error;
    });
    const c=await f.counts();assert.equal(c.payment_methods,2);assert.equal(c['create-buatqris-payment-coupon'],1);
    const req=await f.page.evaluate(()=>fixture.requests.find(r=>r.name==='create-buatqris-payment-coupon'));
    assert.equal(req.body.coupon_code,'HEMAT');assert.equal(req.body.payment_method_id,'qris');assert.equal(req.body.membership_plan,'newbie');assert.ok(!('amount' in req.body));
    assert.match(await f.page.locator('#qrisPaymentStage').textContent(),/90.500/);
    await f.run(3000);assert.equal((await f.counts())['check-buatqris-payment'],1);
    await f.page.evaluate(()=>fixture.config.newbie_price=170000);await f.run(10000);
    assert.match(await f.page.locator('#qrisPaymentStage').textContent(),/90.500/,'invoice amount remains server-issued');
    await f.page.evaluate(()=>fixture.status='success');await f.run(30000);
    assert.match(await f.page.locator('#qrisStageStatus').textContent(),/berhasil/i);
    assert.equal((await f.counts())['create-buatqris-payment-coupon'],1);
  }finally{await f.close()}
});

test('free registration never loads payment methods',async()=>{
  const f=await fixture({free:true});
  try{
    await f.run(100);
    await f.page.locator('#regNama').fill('Free Fixture');await f.page.locator('#regEmail').fill('free@example.test');await f.page.locator('#regWa').fill('081234567890');
    await f.page.locator('.register-submit').click();assert.equal((await f.counts())['register-free-lead'],1);assert.equal((await f.counts()).payment_methods||0,0);
  }finally{await f.close()}
});

test('slow public reads are single-flight, time out, back off and recover; hide aborts in-flight work',async()=>{
  const f=await fixture();
  try{
    await f.page.evaluate(()=>{fixture.hold='marketing_public_config'});await f.run(10000);
    const c=await f.counts();
    await f.page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('focus'))});assert.deepEqual(await f.counts(),c);
    await f.run(8000);await f.run(19000);assert.deepEqual(await f.counts(),c,'timeout uses 20-second first backoff');
    await f.page.evaluate(()=>fixture.hold='');await f.run(1000);assert.equal((await f.counts()).marketing_public_config,c.marketing_public_config+1);
    await f.page.evaluate(()=>fixture.hold='marketing_public_config');await f.run(10000);
    await f.page.evaluate(()=>setFixtureHidden(true));const hidden=await f.counts();await f.run(120000);assert.deepEqual(await f.counts(),hidden);
    await f.page.evaluate(()=>{fixture.hold='';setFixtureHidden(false);window.dispatchEvent(new Event('focus'))});
    assert.equal((await f.counts()).marketing_public_config,hidden.marketing_public_config+1);
  }finally{await f.close()}
});

test('503 and Retry-After reduce public retries; disabled social proof skips feed',async()=>{
  const f=await fixture();
  try{
    await f.page.evaluate(()=>{fixture.fail.marketing_public_config=429;fixture.retryAfter='120';fixture.fail.get_social_proof_settings=503});
    await f.run(60000);const c=await f.counts();assert.equal(c.marketing_public_config,2);assert.equal(c.get_social_proof_settings,2);
    await f.page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('focus'))});await f.run(60000);assert.deepEqual(await f.counts(),c);
    await f.page.evaluate(()=>{fixture.fail={};fixture.social.enabled=false});await f.run(60000);
    assert.equal((await f.counts()).get_social_proof_feed,1);
    assert.equal(await f.page.locator('#badaiSocialProofV6').evaluate(e=>e.classList.contains('show')),false);
  }finally{await f.close()}
});

test('a slow successful config response is shared and is not superseded by focus',async()=>{
  const f=await fixture();
  try{
    await f.page.evaluate(()=>{fixture.config.newbie_price=130000;fixture.delay.marketing_public_config=3000});
    await f.run(10000);const c=await f.counts();
    await f.page.evaluate(()=>{for(let i=0;i<5;i++)window.dispatchEvent(new Event('focus'))});
    await f.run(3000);
    assert.deepEqual(await f.counts(),c);assert.match(await f.page.locator('#dynamicNewbiePrice').textContent(),/130.000/);
  }finally{await f.close()}
});

test('closing checkout during a slow revalidation cancels submission without an invoice',async()=>{
  const f=await fixture();
  try{
    await checkout(f);await f.page.evaluate(()=>fixture.hold='payment_methods');
    await f.page.locator('.register-submit').click();
    await f.page.evaluate(()=>document.getElementById('badaiRegisterForm').requestSubmit());
    assert.equal((await f.counts()).payment_methods,2,'double submit shares one revalidation');
    await f.page.locator('#closeRegistrationModal').click();
    await f.page.evaluate(()=>{fixture.hold='';fixture.held.splice(0).forEach(resolve=>resolve())});
    await f.page.waitForFunction(()=>document.getElementById('registerStatus').textContent.includes('ditutup'));
    assert.equal((await f.counts())['create-buatqris-payment-coupon']||0,0);
  }finally{await f.close()}
});

test('manual registration uses server invoice total and coupon without client-supplied amounts',async()=>{
  const f=await fixture();
  try{
    let submitted;
    await f.page.exposeFunction('recordInvoiceFixture',body=>{submitted=body});
    await f.page.evaluate(()=>fixture.config.registration_notification='[nama] [harga] [total_bayar]');await f.run(10000);
    await checkout(f,'manual');await f.page.locator('#regCoupon').fill('HEMAT');await f.page.locator('#applyCouponBtn').click();
    await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.valid);
    const destination=f.page.waitForRequest(r=>new URL(r.url()).hostname==='wa.me');
    await f.page.locator('.register-submit').click();
    const request=await destination;
    const message=new URL(request.url()).searchParams.get('text');
    assert.match(message,/90.000/);assert.match(message,/90.123/);
    assert.equal(submitted.p_coupon_code,'HEMAT');assert.equal(submitted.p_payment_method_id,'manual');assert.ok(!('amount' in submitted));
  }finally{await f.close()}
});

test('static community landing shares config and only loads methods on paid checkout',async()=>{
  const f=await fixture({community:true});
  try{
    await f.run(60000);assert.equal((await f.counts()).payment_methods||0,0);
    await checkout(f);assert.equal((await f.counts()).payment_methods,1);
    await f.page.evaluate(()=>fixture.config.registration_open=false);await f.run(10000);
    assert.equal(await f.page.evaluate(()=>BADAI_REGISTRATION_OPEN),false);
    assert.equal(await f.page.locator('.register-submit').isDisabled(),true);
    await f.page.evaluate(()=>setFixtureHidden(true));const c=await f.counts();await f.run(60000);assert.deepEqual(await f.counts(),c);
  }finally{await f.close()}
});

test('hidden boot does not fetch; rapid hide/show cannot restart an aborted config repeatedly',async()=>{
  const f=await fixture({hidden:true});
  try{
    await f.run(60000);assert.deepEqual(await f.counts(),{});
    await f.page.evaluate(()=>{fixture.hold='marketing_public_config';setFixtureHidden(false)});
    const c=await f.counts();assert.equal(c.marketing_public_config,1);
    await f.page.evaluate(()=>{setFixtureHidden(true);fixture.hold=''});
    const hidden=await f.counts();
    await f.page.evaluate(()=>{setFixtureHidden(false);for(let i=0;i<5;i++)window.dispatchEvent(new Event('focus'))});
    assert.deepEqual(await f.counts(),hidden);
    await f.run(10000);assert.equal((await f.counts()).marketing_public_config,2);
  }finally{await f.close()}
});

test('coupon plan changes and validation errors restore the appropriate base prices locally',async()=>{
  const f=await fixture();
  try{
    await checkout(f);await f.page.locator('#regCoupon').fill('HEMAT');await f.page.locator('#applyCouponBtn').click();
    await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.valid);
    await f.page.locator('#closeRegistrationModal').click();
    await f.page.locator('[data-package-select="pro"]').first().click();await f.run(120);
    await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.plan==='pro');
    assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/135.000/);
    const before=await f.counts();
    await f.page.evaluate(()=>fixture.fail.validate_marketing_coupon=503);await f.page.locator('#applyCouponBtn').click();
    await f.page.waitForFunction(()=>!window.__BADAI_COUPON_STATE.valid);
    assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/150.000/);
    const after=await f.counts();
    for(const name of ['marketing_public_config','payment_methods','get_social_proof_settings','get_social_proof_feed'])assert.equal(after[name],before[name]);
  }finally{await f.close()}
});

test('public asset bypasses Vercel slug routing and HTML source follows each deployment commit',async()=>{
  const routes=JSON.parse(fs.readFileSync(root+'/vercel.json','utf8')).routes;
  const route=routes.find(r=>r.src&&new RegExp(r.src).test('/landing-public.js'));
  assert.equal(route.dest,'/landing-public.js');
  const names=['VERCEL_GIT_COMMIT_SHA','RAILWAY_GIT_COMMIT_SHA','COMMIT_REF'];
  const previous=names.map(name=>process.env[name]);const originalFetch=global.fetch;
  try{
    for(const name of [...names,null]){
      for(const key of names)delete process.env[key];
      if(name)process.env[name]='fixture-sha';
      let fetched,status;
      global.fetch=async url=>{fetched=String(url);return new Response(fs.readFileSync(root+'/index.html','utf8'))};
      await require('../api/landing.js')({},{setHeader(){return this},status(v){status=v;return this},send(){return this}});
      assert.equal(status,200);assert.ok(fetched.endsWith('/'+(name?'fixture-sha':'main')+'/index.html'));
    }
  }finally{
    global.fetch=originalFetch;
    names.forEach((name,i)=>{if(previous[i]===undefined)delete process.env[name];else process.env[name]=previous[i]});
  }
});

test('a changed base price invalidates only the local coupon quote without fetching another endpoint',async()=>{
  const f=await fixture();
  try{
    await checkout(f);await f.page.locator('#regCoupon').fill('HEMAT');await f.page.locator('#applyCouponBtn').click();
    await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.valid);
    const before=await f.counts();
    await f.page.evaluate(()=>fixture.config.newbie_price=120000);await f.run(10000);
    assert.equal(await f.page.evaluate(()=>__BADAI_COUPON_STATE.valid),false);
    assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/120.000/);
    assert.match(await f.page.locator('#couponFeedback').textContent(),/Harga paket berubah/);
    const after=await f.counts();
    for(const name of ['payment_methods','get_social_proof_settings','get_social_proof_feed','validate_marketing_coupon'])assert.equal(after[name],before[name]);
    await f.page.locator('#applyCouponBtn').click();await f.page.waitForFunction(()=>window.__BADAI_COUPON_STATE.valid);
    assert.match(await f.page.locator('#selectedPackagePrice').textContent(),/108.000/);
  }finally{await f.close()}
});

for(const [plan,status,allowed] of [['newbie','active',true],['pro','active',true],['free','active',false],['newbie','suspended',false]])test('member login regression: '+plan+'/'+status,async()=>{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(({plan,status})=>{
      window.memberRequests=[];
      window.fetch=async(input,init={})=>{
        const url=new URL(String(input));memberRequests.push({path:url.pathname,method:init.method||'GET'});
        let data=[];
        if(url.pathname==='/auth/v1/token')data={access_token:'fixture-member',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600};
        if(url.pathname==='/auth/v1/user')data={id:'member-fixture',email:'member@example.test'};
        if(url.pathname==='/rest/v1/profiles')data=[{id:'member-fixture',email:'member@example.test',full_name:'Fixture Member',role:'member',member_status:status,membership_plan:plan,membership_lifecycle_status:'active',membership_started_at:'2026-10-01T00:00:00Z',membership_expires_at:'2027-10-01T00:00:00Z',membership_grace_until:'2027-10-08T00:00:00Z'}];
        return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
      };
    },{plan,status});
    await page.route('**/*',route=>{
      const u=new URL(route.request().url());
      if(u.hostname!=='member.test')return route.abort();
      const auth=u.pathname==='/akses/auth.js';
      return route.fulfill({status:200,contentType:auth?'application/javascript':'text/html',body:fs.readFileSync(root+(auth?'/akses/auth.js':'/akses/index.html'),'utf8')});
    });
    await page.goto('https://member.test/akses/');
    await page.locator('#badaiMemberEmail').fill('member@example.test');await page.locator('#badaiMemberPassword').fill('fixture-password');
    await page.locator('#badaiMemberLogin button').click();
    if(allowed){
      await page.waitForFunction(()=>!document.getElementById('badaiAuthGate'));
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.membershipPlan),plan);
    }else{
      await page.waitForFunction(()=>document.getElementById('badaiMemberStatus')?.classList.contains('error'));
      assert.equal(await page.locator('#badaiAuthGate').count(),1);
    }
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>memberRequests.filter(r=>r.path==='/auth/v1/token').length),1);
  }finally{await context.close()}
});
