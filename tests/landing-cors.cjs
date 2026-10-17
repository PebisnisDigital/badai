const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');

test('real CORS reuses preflight while public config and forced payment reads stay fresh',async()=>{
  const counts={},prices=[];
  const api=http.createServer((req,res)=>{
    const name=req.url.split('?')[0].split('/').pop();
    counts[name]??={};counts[name][req.method]=(counts[name][req.method]||0)+1;
    // Match the audited public endpoint: max-age on preflight, no HTTP
    // cache-control/expires/etag/last-modified freshness headers on data.
    res.writeHead(200,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Max-Age':'3600','Content-Type':'application/json'});
    if(req.method==='OPTIONS')return res.end('');
    res.end(JSON.stringify(name==='marketing_public_config'?[{newbie_price:100000+counts[name].GET,registration_open:true}]:[{id:'method-'+counts[name].GET}]));
  });
  const origin=http.createServer((req,res)=>res.end('<!doctype html><title>CORS fixture</title>'));
  await Promise.all([new Promise(r=>api.listen(0,'127.0.0.1',r)),new Promise(r=>origin.listen(0,'127.0.0.1',r))]);
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page=await browser.newPage();await page.clock.install();await page.goto('http://127.0.0.1:'+origin.address().port);
    const source=fs.readFileSync(require('node:path').join(__dirname,'../landing-public.js'),'utf8').replace('https://tlvxlekqrllkvcpgwmic.supabase.co','http://127.0.0.1:'+api.address().port);
    await page.addScriptTag({content:source});
    prices.push(await page.evaluate(async()=>(await BadaiLandingPublic.config()).newbie_price));
    for(let i=0;i<2;i++){
      await page.clock.runFor(10000);
      prices.push(await page.evaluate(async()=>(await BadaiLandingPublic.config()).newbie_price));
    }
    assert.deepEqual(prices,[100001,100002,100003]);
    assert.equal(counts.marketing_public_config.GET,3);assert.equal(counts.marketing_public_config.OPTIONS,1);
    const ids=await page.evaluate(async()=>{
      const ids=[];for(let i=0;i<3;i++)ids.push((await BadaiLandingPublic.paymentMethods(true))[0].id);return ids;
    });
    assert.deepEqual(ids,['method-1','method-2','method-3']);assert.equal(counts.payment_methods.OPTIONS,1);
  }finally{await browser?.close();await Promise.all([new Promise(r=>api.close(r)),new Promise(r=>origin.close(r))]);}
});
