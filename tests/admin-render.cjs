const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('complete Admin render keeps existing tabs and emits valid scripts and Channel assets',async()=>{
  process.env.BADAI_ENV='staging';let status,body;const headers={};
  await require('../api/admin-v5')({method:'GET',query:{},headers:{}},{setHeader(k,v){headers[k]=v;return this},status(c){status=c;return this},send(value){body=value;return this}});
  assert.equal(status,200,body);
  for(const section of ['connection','channel','groups','reports'])assert.ok(body.includes('data-wa-section="'+section+'"'));
  assert.ok(body.includes('/wa-channel-admin.js'));assert.ok(body.includes('/wa-channel-admin.css'));
  assert.ok(body.includes('/admin-workspace.css'));
  assert.ok(body.indexOf('/wa-channel-admin.js')<body.indexOf('/wa-marketing-admin.js'));
  for(const match of body.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
    if(match[2].trim()&&!match[1].includes('application/ld+json'))assert.doesNotThrow(()=>new vm.Script(match[2]),match[1]);
  }
  const routes=JSON.parse(fs.readFileSync('vercel.json','utf8')).routes;
  for(const name of ['wa-channel-admin.js','wa-channel-admin.css','admin-workspace.css']){
    const route=routes.find(r=>r.src&&new RegExp(r.src).test('/'+name));assert.equal(route.dest,'/'+name);
  }
});
