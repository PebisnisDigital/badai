/* Public landing data only. Never cache sessions, invoices or transaction responses. */
(function(){
  'use strict';
  if(window.BadaiLandingPublic)return;
  const base='https://tlvxlekqrllkvcpgwmic.supabase.co';
  const key='sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  const entries=new Map();
  let configTimer=null,configFlight=null,suspended=false;
  const visible=()=>!suspended&&document.visibilityState!=='hidden';
  const entry=name=>{
    if(!entries.has(name))entries.set(name,{value:null,hasValue:false,nextAt:0,failures:0,flight:null,controller:null});
    return entries.get(name);
  };
  function paused(){return Object.assign(new Error('Pembacaan publik dijeda.'),{name:'AbortError'});}
  async function json(path,signal,body){
    const response=await fetch(base+path,{
      // no-store/no-cache also bypass Chromium's CORS preflight cache. These
      // public endpoints have no HTTP freshness lifetime; app TTLs govern reads.
      method:body===undefined?'GET':'POST',signal,cache:'default',
      headers:{apikey:key,...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    if(!response.ok){
      const retry=response.headers.get('Retry-After');
      const retryAt=retry?(Number.isFinite(Number(retry))?Date.now()+Number(retry)*1000:Date.parse(retry)):0;
      throw Object.assign(new Error('Data belum dapat diperbarui. Silakan coba lagi.'),{status:response.status,retryAt:retryAt||0});
    }
    const data=await response.json();
    if(!Array.isArray(data))throw new Error('Respons data publik tidak valid.');
    return data;
  }
  function read(name,ttl,loader,force=false){
    const state=entry(name);
    if(!visible())return Promise.reject(paused());
    if(state.flight)return state.flight;
    if(Date.now()<state.nextAt){
      if(state.failures)return Promise.reject(Object.assign(new Error('Data belum dapat diperbarui. Tunggu sebelum mencoba lagi.'),{retryAt:state.nextAt}));
      if(state.hasValue&&!force)return Promise.resolve(state.value);
      if(!state.hasValue&&!force)return Promise.reject(paused());
    }
    const startedAt=Date.now();
    const controller=new AbortController();state.controller=controller;
    let timeout,timedOut=false;
    const deadline=new Promise((_,reject)=>{
      timeout=setTimeout(()=>{timedOut=true;controller.abort();reject(new Error('Waktu pembacaan data habis. Silakan coba lagi.'));},8000);
      controller.signal.addEventListener('abort',()=>reject(paused()),{once:true});
    });
    state.flight=(async()=>{
      try{
        const value=await Promise.race([loader(controller.signal),deadline]);
        if(controller.signal.aborted||!visible())throw paused();
        state.value=value;state.hasValue=true;state.failures=0;state.nextAt=Date.now()+ttl;
        if(name==='config'){
          window.BADAI_REGISTRATION_OPEN=value.registration_open!==false;
          document.dispatchEvent(new CustomEvent('badai:marketing-config',{detail:value}));
        }
        return value;
      }catch(error){
        if(error.name!=='AbortError'||timedOut){
          state.failures++;
          const permanent=error.status>=400&&error.status<500&&error.status!==408&&error.status!==429;
          const delay=permanent?300000:Math.min(300000,ttl*Math.pow(2,Math.min(state.failures,5)));
          state.nextAt=Math.max(error.retryAt||0,Date.now()+delay+Math.floor(delay*Math.random()*0.1));
        }else{
          // Rapid hide/show cycles must not restart an aborted read repeatedly.
          state.nextAt=Math.max(state.nextAt,startedAt+ttl);
        }
        throw error;
      }finally{
        clearTimeout(timeout);state.controller=null;state.flight=null;
      }
    })();
    return state.flight;
  }
  const config=()=>read('config',10000,async signal=>{
    const rows=await json('/rest/v1/marketing_public_config?id=eq.1&select=product_price,newbie_price,pro_price,registration_notification,registration_open',signal);
    if(!rows[0]||typeof rows[0]!=='object')throw new Error('Konfigurasi belum tersedia.');
    return Object.freeze({...rows[0]});
  });
  const paymentMethods=(force=false)=>read('payments',30000,signal=>json('/rest/v1/payment_methods?active=eq.true&select=id,method_type,provider,display_name,instructions,qris_image_url,payment_url,bank_name,account_number,account_holder,sort_order&order=sort_order.asc,created_at.asc',signal),force);
  const socialProof=()=>read('social',60000,async signal=>{
    const rows=await json('/rest/v1/rpc/get_social_proof_settings',signal,{});
    const settings=rows[0]||null;
    const feed=settings?.enabled&&visible()?await json('/rest/v1/rpc/get_social_proof_feed',signal,{p_limit:Math.min(50,Math.max(1,Number(settings.max_items)||20))}):[];
    return {settings,feed};
  });
  function pollConfig(){
    if(!visible())return;
    if(configFlight)return configFlight;
    clearTimeout(configTimer);
    configFlight=config().catch(()=>{}).finally(()=>{
      configFlight=null;
      if(visible())configTimer=setTimeout(pollConfig,Math.max(1,entry('config').nextAt-Date.now()));
    });
    return configFlight;
  }
  function pause(){
    clearTimeout(configTimer);
    for(const state of entries.values())state.controller?.abort();
  }
  window.BadaiLandingPublic=Object.freeze({config,paymentMethods,socialProof,visible,
    peekConfig:()=>entry('config').value,
    nextSocialAt:()=>entry('social').nextAt
  });
  document.addEventListener('visibilitychange',()=>{if(visible())pollConfig();else pause();});
  window.addEventListener('focus',()=>{if(visible())pollConfig();});
  window.addEventListener('pagehide',()=>{suspended=true;pause();});
  window.addEventListener('pageshow',()=>{suspended=false;pollConfig();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pollConfig,{once:true});
  else pollConfig();
})();
