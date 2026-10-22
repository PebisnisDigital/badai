const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const authSource = fs.readFileSync(path.join(__dirname, '..', 'akses', 'auth.js'), 'utf8');

function response(status, data){
  return {ok:status >= 200 && status < 300, status, text:async () => JSON.stringify(data)};
}

function makeLoginPage(fetch, savedSession){
  const listeners = {};
  const timeouts = new Map();
  const storage = new Map(savedSession ? [['badai_member_session', JSON.stringify(savedSession)]] : []);
  let timerId = 0;
  const button = {disabled:false, textContent:'MASUK SEKARANG'};
  const form = {
    addEventListener(type, fn){listeners[`form:${type}`] = fn;},
    querySelector(){return button;}
  };
  const email = {value:'  TEST@example.com  '};
  const password = {value:'demo-password'};
  const status = {className:'status', textContent:'Akses hanya untuk member aktif.'};
  const elements = {
    badaiMemberLogin:form,
    badaiMemberEmail:email,
    badaiMemberPassword:password,
    badaiMemberStatus:status
  };
  const document = {
    head:{appendChild(){}},
    body:{prepend(gate){elements.badaiAuthGate = gate;},appendChild(){}},
    documentElement:{dataset:{},classList:{add(){},remove(){}}},
    visibilityState:'visible',
    createElement(){return {innerHTML:'', style:{},dataset:{},addEventListener(){},remove(){delete elements.badaiAuthGate;}};},
    getElementById(id){return elements[id] || null;},
    querySelector(){return null;},
    addEventListener(type, fn){listeners[`document:${type}`] = fn;}
  };
  const location = {hash:'', search:'', pathname:'/akses', reload(){}};
  const sandbox = {
    document, location, window:{location,addEventListener(){},dispatchEvent(){}},
    localStorage:{getItem:key => storage.get(key) || null, setItem:(key,value) => storage.set(key,value), removeItem:key => storage.delete(key)},
    URLSearchParams, URL, AbortController, DOMException,
    fetch,
    console:{log(){}, warn(){}},
    setInterval(){},
    setTimeout(fn,ms){const id=++timerId;timeouts.set(id,{fn,ms});return id;},
    clearTimeout(id){timeouts.delete(id);}
  };
  vm.runInNewContext(authSource, sandbox, {filename:'akses/auth.js'});
  listeners['document:DOMContentLoaded']();

  return {
    button, status, storage, elements,
    submit(){return listeners['form:submit']({preventDefault(){},currentTarget:form});},
    timeout(){
      const timer = [...timeouts.values()].find(t => t.ms === 15000);
      assert.ok(timer, 'login timer should be scheduled');
      timer.fn();
    }
  };
}

test('stalled Supabase login stops after 15 seconds and allows retry', async () => {
  let requests = 0;
  const page = makeLoginPage((_url,options) => {
    requests++;
    return new Promise((_resolve,reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')));
    });
  });

  const attempt = page.submit();
  assert.equal(page.button.disabled, true);
  assert.equal(page.button.textContent, 'MEMERIKSA...');
  await page.submit();
  assert.equal(requests, 1, 'double tap should not create a second login request');
  page.timeout();
  await attempt;

  assert.match(page.status.textContent, /terlalu lama/i);
  assert.equal(page.button.disabled, false);
  assert.equal(page.button.textContent, 'MASUK SEKARANG');
  assert.equal(page.storage.has('badai_member_session'), false);
});

test('incorrect credentials show readable message and restore login button', async () => {
  const page = makeLoginPage(async () => response(400,{error:'invalid_grant',error_description:'Invalid login credentials'}));
  await page.submit();

  assert.match(page.status.textContent, /Email atau password belum cocok/i);
  assert.equal(page.button.disabled, false);
  assert.equal(page.storage.has('badai_member_session'), false);
});

test('network failure shows network guidance and allows retry', async () => {
  const page = makeLoginPage(async () => {throw new TypeError('Failed to fetch');});
  await page.submit();

  assert.match(page.status.textContent, /jaringan lain/i);
  assert.equal(page.button.disabled, false);
});

test('inactive membership is denied even with valid credentials', async () => {
  const paths = [];
  const page = makeLoginPage(async (url) => {
    const pathname = new URL(url).pathname;
    paths.push(pathname);
    if(pathname === '/auth/v1/token') return response(200,{access_token:'test-token'});
    if(pathname === '/auth/v1/user') return response(200,{id:'test-user'});
    return response(200,[{id:'test-user',member_status:'pending',membership_plan:'basic'}]);
  });

  await page.submit();
  assert.deepEqual(paths, ['/auth/v1/token','/auth/v1/user','/rest/v1/profiles']);
  assert.match(page.status.textContent, /Akses belum aktif/i);
  assert.equal(page.storage.has('badai_member_session'), false);
  assert.equal(page.button.disabled, false);
});

test('active paid membership unlocks after all three Supabase checks', async () => {
  const paths = [];
  const page = makeLoginPage(async (url) => {
    const pathname = new URL(url).pathname;
    paths.push(pathname);
    if(pathname === '/auth/v1/token') return response(200,{access_token:'test-token'});
    if(pathname === '/auth/v1/user') return response(200,{id:'test-user',email:'test@example.com'});
    return response(200,[{id:'test-user',member_status:'active',membership_plan:'newbie'}]);
  });

  await page.submit();
  assert.deepEqual(paths, ['/auth/v1/token','/auth/v1/user','/rest/v1/profiles']);
  assert.equal(page.elements.badaiAuthGate, undefined, 'successful member login should remove gate');
  assert.equal(page.storage.has('badai_member_session'), true);
});

test('stalled saved session also stops checking access after 15 seconds', async () => {
  const page = makeLoginPage((_url,options) => new Promise((_resolve,reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')));
  }),{access_token:'previous-session'});

  page.timeout();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(page.status.textContent, /terlalu lama/i);
  assert.equal(page.storage.has('badai_member_session'), false);
});
