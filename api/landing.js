module.exports = async function handler(req, res) {
  try {
    const ref = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
    const sourceUrl = `https://raw.githubusercontent.com/PebisnisDigital/badai/${encodeURIComponent(ref)}/index.html`;
    const source = await fetch(sourceUrl, { headers: { 'User-Agent': 'BADAI-Landing/1.0' } });

    if (!source.ok) {
      throw new Error(`Gagal memuat landing page (${source.status})`);
    }

    let html = await source.text();

    const couponStyle = String.raw`
<style id="badai-coupon-style">
.registration-modal-card .coupon-group{gap:7px}
.registration-modal-card .coupon-optional{color:#888;font-family:"Nunito",Arial,sans-serif;font-size:10px;font-weight:700}
.registration-modal-card .coupon-input-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch}
.registration-modal-card .coupon-input-row input{text-transform:uppercase}
.registration-modal-card .coupon-apply-btn{
  min-width:84px;border:0;border-radius:12px;background:#ff4fa3;color:#0a0a0a;
  padding:0 14px;font-family:"Raleway",Arial,sans-serif;font-size:10px;font-weight:950;
  cursor:pointer;transition:transform .18s ease,opacity .18s ease
}
.registration-modal-card .coupon-apply-btn:active{transform:scale(.97)}
.registration-modal-card .coupon-apply-btn:disabled{opacity:.55;cursor:wait}
.registration-modal-card .coupon-feedback{min-height:16px;margin-top:-1px;font-family:"Nunito",Arial,sans-serif;font-size:10px;line-height:1.45;color:#858585}
.registration-modal-card .coupon-feedback.ok{color:#82dda0}
.registration-modal-card .coupon-feedback.error{color:#ff929f}
.registration-modal-card .coupon-group.coupon-success input{border-color:#66ce8d!important;box-shadow:0 0 0 4px rgba(102,206,141,.12)!important}
.registration-modal-card .coupon-group.coupon-error input{border-color:#ff6f82!important;box-shadow:0 0 0 4px rgba(255,111,130,.12)!important}
@media(max-width:520px){
  .registration-modal-card .coupon-apply-btn{min-width:78px;font-size:9px}
}
</style>`;

    const couponMarkup = String.raw`
        <div class="form-group coupon-group" id="couponGroup">
          <label for="regCoupon">Kode Kupon <span class="coupon-optional">(opsional)</span></label>
          <div class="coupon-input-row">
            <input id="regCoupon" name="coupon" type="text" placeholder="Contoh: BADAI20" autocomplete="off" spellcheck="false">
            <button id="applyCouponBtn" type="button" class="coupon-apply-btn">PAKAI</button>
          </div>
          <div id="couponFeedback" class="coupon-feedback"></div>
        </div>`;

    const couponBootstrap = String.raw`
<script id="badai-coupon-bootstrap">
(function(){
  var SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  var nativeFetch = window.fetch.bind(window);
  var bypassNextSubmit = false;
  var validating = false;

  var state = window.__BADAI_COUPON_STATE = {
    valid:false,
    code:'',
    plan:'',
    original_amount:0,
    discount_amount:0,
    final_amount:0
  };

  function currentPlan(){
    var el = document.getElementById('selectedPackage');
    return el && el.value === 'pro' ? 'pro' : 'newbie';
  }

  function currentCode(){
    var el = document.getElementById('regCoupon');
    return String(el ? el.value : '').trim().toUpperCase();
  }

  function formatRp(value){
    return new Intl.NumberFormat('id-ID',{
      style:'currency',currency:'IDR',maximumFractionDigits:0
    }).format(Number(value || 0));
  }

  function setFeedback(message, type){
    var feedback = document.getElementById('couponFeedback');
    var group = document.getElementById('couponGroup');
    if(feedback){
      feedback.textContent = message || '';
      feedback.className = 'coupon-feedback' + (type ? ' ' + type : '');
    }
    if(group){
      group.classList.toggle('coupon-success', type === 'ok');
      group.classList.toggle('coupon-error', type === 'error');
    }
  }

  function clearCoupon(message){
    state.valid = false;
    state.code = '';
    state.plan = '';
    state.original_amount = 0;
    state.discount_amount = 0;
    state.final_amount = 0;
    setFeedback(message || '', '');
    try{ window.dispatchEvent(new Event('focus')); }catch(_){ }
  }

  async function waitForPriceSync(finalAmount){
    var started = Date.now();
    while(Date.now() - started < 2600){
      var el = document.getElementById('selectedPackagePrice');
      var shown = Number(String(el ? el.textContent : '').replace(/\D/g,''));
      if(shown === Number(finalAmount)) return true;
      await new Promise(function(resolve){ setTimeout(resolve, 80); });
    }
    return false;
  }

  async function validateCoupon(){
    var code = currentCode();
    var plan = currentPlan();
    var btn = document.getElementById('applyCouponBtn');

    if(!code){
      clearCoupon('Kode kupon boleh dikosongkan.');
      return true;
    }

    if(validating) return false;
    validating = true;
    if(btn){ btn.disabled = true; btn.textContent = 'CEK...'; }
    setFeedback('Mengecek kupon...', '');

    try{
      var response = await nativeFetch(SUPABASE_URL + '/rest/v1/rpc/validate_marketing_coupon', {
        method:'POST',
        headers:{
          'apikey':SUPABASE_KEY,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({p_code:code,p_plan:plan})
      });

      var rows = await response.json().catch(function(){ return []; });
      var result = Array.isArray(rows) ? rows[0] : rows;

      if(!response.ok || !result || !result.valid){
        state.valid = false;
        state.code = '';
        state.plan = '';
        setFeedback((result && result.message) || 'Kode kupon tidak valid atau sedang tidak aktif.', 'error');
        try{ window.dispatchEvent(new Event('focus')); }catch(_){ }
        return false;
      }

      state.valid = true;
      state.code = String(result.code || code).toUpperCase();
      state.plan = plan;
      state.original_amount = Number(result.original_amount || 0);
      state.discount_amount = Number(result.discount_amount || 0);
      state.final_amount = Number(result.final_amount || 0);

      var input = document.getElementById('regCoupon');
      if(input) input.value = state.code;

      setFeedback('✓ Kupon ' + state.code + ' aktif • Hemat ' + formatRp(state.discount_amount) + ' • Total ' + formatRp(state.final_amount), 'ok');
      try{ window.dispatchEvent(new Event('focus')); }catch(_){ }
      await waitForPriceSync(state.final_amount);
      return true;
    }catch(err){
      state.valid = false;
      setFeedback('Kupon belum bisa dicek. Coba lagi.', 'error');
      return false;
    }finally{
      validating = false;
      if(btn){ btn.disabled = false; btn.textContent = 'PAKAI'; }
    }
  }

  window.__BADAI_VALIDATE_COUPON = validateCoupon;

  window.fetch = async function(input, init){
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();

    if(url.indexOf('/functions/v1/create-buatqris-payment') !== -1 && url.indexOf('create-buatqris-payment-coupon') === -1){
      var qrisBody = {};
      try{ qrisBody = JSON.parse((init && init.body) || '{}'); }catch(_){ }
      if(state.valid && state.plan === currentPlan()) qrisBody.coupon_code = state.code;
      else delete qrisBody.coupon_code;

      var qrisInit = Object.assign({}, init || {}, {body:JSON.stringify(qrisBody)});
      return nativeFetch(url.replace('/functions/v1/create-buatqris-payment','/functions/v1/create-buatqris-payment-coupon'), qrisInit);
    }

    if(url.indexOf('/rest/v1/registrations') !== -1 && method === 'POST'){
      var regBody = {};
      try{ regBody = JSON.parse((init && init.body) || '{}'); }catch(_){ }

      var rpcBody = {
        p_full_name:regBody.full_name || '',
        p_email:regBody.email || '',
        p_whatsapp:regBody.whatsapp || '',
        p_membership_plan:regBody.membership_plan || currentPlan(),
        p_payment_method_id:regBody.payment_method_id || null,
        p_referred_by_code:regBody.referred_by_code || null,
        p_coupon_code:(state.valid && state.plan === currentPlan()) ? state.code : null
      };

      var rpcHeaders = Object.assign({}, (init && init.headers) || {}, {'Content-Type':'application/json'});
      return nativeFetch(SUPABASE_URL + '/rest/v1/rpc/submit_badai_registration', {
        method:'POST',
        headers:rpcHeaders,
        body:JSON.stringify(rpcBody)
      });
    }

    if(url.indexOf('/rest/v1/marketing_public_config') !== -1 && method === 'GET' && state.valid){
      var configResponse = await nativeFetch(input, init);
      if(!configResponse.ok) return configResponse;

      var configRows = await configResponse.clone().json().catch(function(){ return null; });
      if(Array.isArray(configRows) && configRows[0] && state.plan === currentPlan()){
        if(state.plan === 'pro') configRows[0].pro_price = state.final_amount;
        else configRows[0].newbie_price = state.final_amount;

        var headers = new Headers(configResponse.headers);
        headers.set('content-type','application/json; charset=utf-8');
        headers.delete('content-length');
        return new Response(JSON.stringify(configRows), {
          status:configResponse.status,
          statusText:configResponse.statusText,
          headers:headers
        });
      }
      return configResponse;
    }

    return nativeFetch(input, init);
  };

  document.addEventListener('DOMContentLoaded', function(){
    var input = document.getElementById('regCoupon');
    var btn = document.getElementById('applyCouponBtn');

    if(input){
      input.addEventListener('input', function(){
        var normalized = String(input.value || '').toUpperCase().replace(/[^A-Z0-9_-]/g,'');
        if(input.value !== normalized) input.value = normalized;
        if(state.valid && normalized !== state.code) clearCoupon('Klik PAKAI untuk mengecek kode kupon.');
        else if(!state.valid) setFeedback(normalized ? 'Klik PAKAI untuk mengecek kode kupon.' : '', '');
      });
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          validateCoupon();
        }
      });
    }

    if(btn) btn.addEventListener('click', validateCoupon);

    document.querySelectorAll('[data-package-select]').forEach(function(packageBtn){
      packageBtn.addEventListener('click', function(){
        setTimeout(function(){
          if(currentCode()) validateCoupon();
          else clearCoupon('');
        }, 120);
      });
    });
  });

  document.addEventListener('submit', async function(e){
    if(!e.target || e.target.id !== 'badaiRegisterForm') return;

    if(bypassNextSubmit){
      bypassNextSubmit = false;
      return;
    }

    var code = currentCode();
    if(!code) return;

    var plan = currentPlan();
    if(state.valid && state.code === code && state.plan === plan) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    var ok = await validateCoupon();
    if(ok){
      bypassNextSubmit = true;
      e.target.requestSubmit();
    }
  }, true);
})();
</script>`;

    const waMarker = String.raw`        <div class="form-group">
          <label for="regWa">WA</label>
          <input id="regWa" name="wa" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" autocomplete="tel" required>
        </div>`;

    if (!html.includes(waMarker)) {
      throw new Error('Marker formulir WA tidak ditemukan');
    }

    html = html.replace('</head>', couponStyle + '\n' + couponBootstrap + '\n</head>');
    html = html.replace(waMarker, waMarker + '\n' + couponMarkup);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).setHeader('Content-Type','text/plain; charset=utf-8');
    res.send('BADAI landing gagal dimuat: ' + String(error && error.message ? error.message : error));
  }
};
