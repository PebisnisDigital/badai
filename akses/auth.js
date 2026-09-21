(function(){
  const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
  const STORAGE_KEY = 'badai_member_session';

  const style = document.createElement('style');
  style.textContent = `
    html.badai-auth-lock body{overflow:hidden!important}
    html.badai-auth-lock body > *:not(#badaiAuthGate){display:none!important}
    #badaiAuthGate{
      position:fixed;inset:0;z-index:99999;background:#070707;color:#fff;
      display:grid;place-items:center;padding:22px;font-family:Arial,Helvetica,sans-serif
    }
    #badaiAuthGate .box{
      width:min(100%,430px);background:#101010;border:1px solid #2a2a2a;
      border-radius:24px;padding:22px;box-shadow:0 28px 80px rgba(0,0,0,.48)
    }
    #badaiAuthGate .badge{
      display:inline-flex;align-items:center;min-height:27px;padding:0 10px;
      border-radius:999px;background:#1a0d14;border:1px solid #4b2138;
      color:#ff8fc4;font-size:10px;font-weight:900;letter-spacing:.08em
    }
    #badaiAuthGate h1{margin:13px 0 7px;font-size:30px;line-height:1.03;letter-spacing:-.04em}
    #badaiAuthGate p{margin:0 0 17px;color:#a8a8a8;font-size:13px;line-height:1.55}
    #badaiAuthGate .field{display:grid;gap:7px;margin-top:12px}
    #badaiAuthGate label{font-size:12px;font-weight:800}
    #badaiAuthGate input{
      width:100%;box-sizing:border-box;padding:14px 15px;border-radius:13px;
      border:1px solid #303030;background:#070707;color:#fff;outline:none;font:inherit
    }
    #badaiAuthGate input:focus{border-color:#ff4fa3;box-shadow:0 0 0 3px rgba(255,79,163,.12)}
    #badaiAuthGate button{
      width:100%;min-height:50px;margin-top:14px;border:0;border-radius:14px;
      background:#ff4fa3;color:#080808;font:900 13px Arial,Helvetica,sans-serif;cursor:pointer
    }
    #badaiAuthGate .status{min-height:19px;margin-top:10px;text-align:center;color:#8d8d8d;font-size:11px}
    #badaiAuthGate .status.error{color:#ff8d8d}
    #badaiMemberLogout{
      position:fixed;top:12px;right:12px;z-index:99998;border:1px solid #ddd;
      background:#fff;color:#111;border-radius:11px;padding:9px 11px;font:800 10px Arial,sans-serif;
      box-shadow:0 8px 28px rgba(0,0,0,.12);cursor:pointer
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('badai-auth-lock');

  let session = null;
  let currentUser = null;
  let currentProfile = null;
  let membershipRefreshBusy = false;

  function saveSession(data){
    session = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearSession(){
    session = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  async function api(path, options = {}, withAuth = true){
    const headers = Object.assign({
      'apikey': SUPABASE_KEY,
      'Content-Type':'application/json'
    }, options.headers || {});

    if(withAuth && session?.access_token){
      headers['Authorization'] = 'Bearer ' + session.access_token;
    }

    const res = await fetch(SUPABASE_URL + path, Object.assign({}, options, {headers}));
    let data = null;
    const text = await res.text();

    if(text){
      try{ data = JSON.parse(text); }catch(_){ data = text; }
    }

    if(!res.ok){
      const msg = data?.msg || data?.message || data?.error_description || data?.error || 'Request gagal';
      throw new Error(msg);
    }

    return data;
  }

  function normalizeWhatsapp(value){
    let digits = String(value || '').replace(/\D/g,'');
    if(digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if(digits.startsWith('8')) digits = '62' + digits;
    return digits;
  }

  function setAccountStatus(message, type){
    const el = document.getElementById('memberAccountStatus');
    if(!el) return;
    el.textContent = message || '';
    el.className = 'account-status' + (type ? ' ' + type : '');
  }

  function populateAccount(profile, user){
    const name = document.getElementById('memberAccountName');
    const email = document.getElementById('memberAccountEmail');
    const wa = document.getElementById('memberAccountWa');
    const password = document.getElementById('memberAccountPassword');

    if(name) name.value = profile?.full_name || user?.user_metadata?.full_name || '';
    if(email) email.value = user?.email || profile?.email || '';
    if(wa) wa.value = profile?.whatsapp || user?.user_metadata?.whatsapp || '';
    if(password) password.value = '';
  }

  async function saveMemberAccount(){
    if(!session?.access_token) throw new Error('Session habis. Silakan login ulang.');

    const name = document.getElementById('memberAccountName')?.value.trim() || '';
    const requestedEmail = document.getElementById('memberAccountEmail')?.value.trim().toLowerCase() || '';
    const wa = normalizeWhatsapp(document.getElementById('memberAccountWa')?.value || '');
    const password = document.getElementById('memberAccountPassword')?.value || '';
    const saveBtn = document.getElementById('memberAccountSave');

    if(!name || !requestedEmail || !wa){
      throw new Error('Nama, email, dan WhatsApp wajib diisi.');
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)){
      throw new Error('Format email belum valid.');
    }

    if(!/^62\d{8,13}$/.test(wa)){
      throw new Error('Nomor WhatsApp belum valid.');
    }

    if(password && password.length < 8){
      throw new Error('Password baru minimal 8 karakter.');
    }

    const currentEmail = String(currentUser?.email || session?.user?.email || '').toLowerCase();
    const emailChanged = currentEmail && currentEmail !== requestedEmail;

    if(emailChanged && !confirm(
      'Email login akan diganti dari ' + currentEmail + ' menjadi ' + requestedEmail + '. Lanjutkan?'
    )){
      return;
    }

    if(password && !confirm(
      'Password login akan diganti. Password lama tidak bisa dipakai lagi. Lanjutkan?'
    )){
      return;
    }

    const payload = {
      data:{
        full_name:name,
        whatsapp:wa
      }
    };

    if(emailChanged) payload.email = requestedEmail;
    if(password) payload.password = password;

    const oldText = saveBtn?.textContent || 'SIMPAN PERUBAHAN';
    if(saveBtn){
      saveBtn.disabled = true;
      saveBtn.textContent = 'MENYIMPAN...';
    }

    setAccountStatus('Menyimpan perubahan...', '');

    try{
      const updatedUser = await api('/auth/v1/user', {
        method:'PUT',
        body:JSON.stringify(payload)
      });

      currentUser = updatedUser || currentUser;

      if(session){
        session.user = Object.assign({}, session.user || {}, updatedUser || {});
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }

      currentProfile = Object.assign({}, currentProfile || {}, {
        full_name:name,
        whatsapp:wa,
        email:updatedUser?.email || currentProfile?.email || currentEmail
      });

      populateAccount(currentProfile, currentUser);

      const emailApplied = String(updatedUser?.email || '').toLowerCase() === requestedEmail;

      if(emailChanged && !emailApplied){
        setAccountStatus(
          'Nama/WA tersimpan. Untuk email baru, cek inbox email dan lakukan konfirmasi terlebih dahulu.',
          'ok'
        );
      }else if(password){
        setAccountStatus('Data akun dan password berhasil diperbarui.', 'ok');
      }else{
        setAccountStatus('Data akun berhasil diperbarui.', 'ok');
      }
    }finally{
      if(saveBtn){
        saveBtn.disabled = false;
        saveBtn.textContent = oldText;
      }
    }
  }

  function bindAccountForm(){
    const form = document.getElementById('memberAccountForm');
    if(!form || form.dataset.bound === '1') return;

    form.dataset.bound = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try{
        await saveMemberAccount();
      }catch(err){
        setAccountStatus(err.message || 'Gagal menyimpan data akun.', 'error');
      }
    });
  }

  async function configureMembership(profile){
    const plan = profile?.membership_plan === 'pro' ? 'pro' : 'newbie';
    const planName = document.getElementById('memberPlanName');
    const planDesc = document.getElementById('memberPlanDesc');
    const affiliateNav = document.getElementById('affiliateNavButton');
    const footer = document.querySelector('.footer');

    if(planName) planName.textContent = plan === 'pro' ? 'PRO' : 'NEWBIE';
    if(planDesc){
      planDesc.textContent = plan === 'pro'
        ? 'Belajar Ilmu AI + Update + Program Afiliasi'
        : 'Belajar Ilmu AI + Update';
    }

    window.BADAI_AFFILIATE_LINK = '';

    if(plan !== 'pro'){
      if(affiliateNav) affiliateNav.style.display = 'none';
      if(footer) footer.style.setProperty('--member-nav-count','4');

      const affiliateScreen = document.getElementById('afiliasi');
      if(affiliateScreen?.classList.contains('active')){
        const accountBtn = document.querySelector('[data-screen="akun"]');
        if(accountBtn) accountBtn.click();
      }

      const linkEl = document.getElementById('affiliateLink');
      const codeEl = document.getElementById('affiliateCode');
      if(linkEl) linkEl.textContent = 'Khusus Paket PRO.';
      if(codeEl) codeEl.textContent = '-';
      return;
    }

    if(affiliateNav) affiliateNav.style.display = '';
    if(footer) footer.style.setProperty('--member-nav-count','5');

    try{
      const rows = await api(
        '/rest/v1/affiliate_accounts?user_id=eq.' + encodeURIComponent(profile.id) +
        '&status=eq.active&select=affiliate_code,status'
      );

      const affiliate = rows?.[0];
      const linkEl = document.getElementById('affiliateLink');
      const codeEl = document.getElementById('affiliateCode');

      if(!affiliate){
        if(linkEl) linkEl.textContent = 'Akun afiliasi belum aktif. Hubungi admin BADAI.';
        if(codeEl) codeEl.textContent = '-';
        return;
      }

      const affiliateLink =
        location.origin.replace(/\/$/,'') + '/' + encodeURIComponent(affiliate.affiliate_code);

      window.BADAI_AFFILIATE_LINK = affiliateLink;
      if(linkEl) linkEl.textContent = affiliateLink;
      if(codeEl) codeEl.textContent = affiliate.affiliate_code;
    }catch(_){
      const linkEl = document.getElementById('affiliateLink');
      if(linkEl) linkEl.textContent = 'Gagal memuat link afiliasi.';
    }
  }

  function setAffiliateEditStatus(message, type){
    const el = document.getElementById('affiliateEditStatus');
    if(!el) return;
    el.textContent = message || '';
    el.className = 'affiliate-edit-status' + (type ? ' ' + type : '');
  }

  window.openAffiliateEditor = function(){
    if(currentProfile?.membership_plan !== 'pro'){
      alert('Fitur ini khusus member Paket PRO.');
      return;
    }

    const currentCode =
      String(document.getElementById('affiliateCode')?.textContent || '').trim();

    const input = document.getElementById('affiliateCodeInput');
    if(input){
      input.value = currentCode && currentCode !== '-' ? currentCode : '';
    }

    updateAffiliatePreview();
    setAffiliateEditStatus('', '');

    const modal = document.getElementById('affiliateEditModal');
    if(modal){
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
    }

    setTimeout(() => input?.focus(), 50);
  };

  window.closeAffiliateEditor = function(){
    const modal = document.getElementById('affiliateEditModal');
    if(modal){
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
    }
  };

  function normalizeAffiliateCode(value){
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g,'')
      .slice(0,24);
  }

  function updateAffiliatePreview(){
    const input = document.getElementById('affiliateCodeInput');
    const preview = document.getElementById('affiliatePreview');
    if(!input || !preview) return;

    const code = normalizeAffiliateCode(input.value) || 'AMBYAR';
    if(input.value !== code && input.value){
      input.value = code;
    }

    preview.textContent =
      location.origin.replace(/\/$/,'') + '/' + code;
  }

  window.saveAffiliateCode = async function(){
    if(!session?.access_token || !currentProfile?.id){
      setAffiliateEditStatus('Session habis. Silakan login ulang.', 'error');
      return;
    }

    if(currentProfile.membership_plan !== 'pro'){
      setAffiliateEditStatus('Fitur ini khusus member Paket PRO.', 'error');
      return;
    }

    const input = document.getElementById('affiliateCodeInput');
    const button = document.getElementById('saveAffiliateCodeBtn');
    const code = normalizeAffiliateCode(input?.value);

    if(!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code)){
      setAffiliateEditStatus('Kode harus 3–24 karakter dan hanya huruf, angka, - atau _.', 'error');
      return;
    }

    if(['ADMIN','AKSES','API','LOGIN','LOGOUT'].includes(code)){
      setAffiliateEditStatus('Kode ini dipakai sistem. Pilih kode lain.', 'error');
      return;
    }

    const oldText = button?.textContent || 'SIMPAN';
    if(button){
      button.disabled = true;
      button.textContent = 'MENYIMPAN...';
    }
    setAffiliateEditStatus('Menyimpan kode...', '');

    try{
      await api(
        '/rest/v1/affiliate_accounts?user_id=eq.' + encodeURIComponent(currentProfile.id),
        {
          method:'PATCH',
          headers:{'Prefer':'return=representation'},
          body:JSON.stringify({affiliate_code:code})
        }
      );

      const link = location.origin.replace(/\/$/,'') + '/' + code;
      window.BADAI_AFFILIATE_LINK = link;

      const linkEl = document.getElementById('affiliateLink');
      const codeEl = document.getElementById('affiliateCode');
      if(linkEl) linkEl.textContent = link;
      if(codeEl) codeEl.textContent = code;

      setAffiliateEditStatus('Berhasil. Link afiliasi sudah diperbarui.', 'ok');

      setTimeout(() => {
        window.closeAffiliateEditor();
      }, 700);
    }catch(err){
      const msg = String(err?.message || 'Gagal mengubah kode.');
      if(/duplicate|unique|affiliate_code_key/i.test(msg)){
        setAffiliateEditStatus('Kode tersebut sudah dipakai member lain.', 'error');
      }else{
        setAffiliateEditStatus(msg, 'error');
      }
    }finally{
      if(button){
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  };

  document.addEventListener('input', (e) => {
    if(e.target?.id === 'affiliateCodeInput'){
      updateAffiliatePreview();
    }
  });

  document.addEventListener('click', (e) => {
    const modal = document.getElementById('affiliateEditModal');
    if(modal && e.target === modal){
      window.closeAffiliateEditor();
    }
  });

  function buildGate(){
    if(document.getElementById('badaiAuthGate')) return;

    const gate = document.createElement('div');
    gate.id = 'badaiAuthGate';
    gate.innerHTML = `
      <div class="box">
        <span class="badge">MEMBER BADAI</span>
        <h1>Masuk ke Member Area</h1>
        <p>Gunakan email dan password yang dikirim admin setelah pembayaran dikonfirmasi.</p>

        <form id="badaiMemberLogin">
          <div class="field">
            <label>Email</label>
            <input id="badaiMemberEmail" type="email" autocomplete="email" required placeholder="email member"/>
          </div>

          <div class="field">
            <label>Password</label>
            <input id="badaiMemberPassword" type="password" autocomplete="current-password" required placeholder="password"/>
          </div>

          <button type="submit">MASUK SEKARANG</button>
        </form>

        <div id="badaiMemberStatus" class="status">Akses hanya untuk member aktif.</div>
      </div>
    `;

    document.body.prepend(gate);

    document.getElementById('badaiMemberLogin').addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('badaiMemberEmail').value.trim().toLowerCase();
      const password = document.getElementById('badaiMemberPassword').value;
      const status = document.getElementById('badaiMemberStatus');

      status.className = 'status';
      status.textContent = 'Memeriksa akses...';

      try{
        const data = await api('/auth/v1/token?grant_type=password', {
          method:'POST',
          body:JSON.stringify({email,password})
        }, false);

        saveSession(data);
        await verifyAccess();
      }catch(err){
        clearSession();
        status.className = 'status error';
        status.textContent = err.message || 'Login gagal.';
      }
    });
  }

  async function refreshMemberProfile(){
    if(membershipRefreshBusy || !session?.access_token || !currentUser?.id) return;

    membershipRefreshBusy = true;

    try{
      const rows = await api(
        '/rest/v1/profiles?id=eq.' + encodeURIComponent(currentUser.id) +
        '&select=id,email,full_name,whatsapp,role,member_status,membership_plan'
      );

      const freshProfile = rows?.[0];

      if(!freshProfile){
        return;
      }

      if(freshProfile.member_status !== 'active'){
        clearSession();
        location.reload();
        return;
      }

      currentProfile = freshProfile;
      populateAccount(freshProfile, currentUser);
      await configureMembership(freshProfile);
    }catch(err){
      console.warn('Gagal refresh paket member:', err?.message || err);
    }finally{
      membershipRefreshBusy = false;
    }
  }

  async function verifyAccess(){
    const status = document.getElementById('badaiMemberStatus');

    try{
      const user = await api('/auth/v1/user');
      const userId = user?.id;

      if(!userId) throw new Error('Session tidak valid.');

      const rows = await api(
        '/rest/v1/profiles?id=eq.' + encodeURIComponent(userId) +
        '&select=id,email,full_name,whatsapp,role,member_status,membership_plan'
      );

      const profile = rows?.[0];

      if(!profile || profile.member_status !== 'active'){
        clearSession();

        if(status){
          status.className = 'status error';
          status.textContent = 'Akses belum aktif. Hubungi admin BADAI.';
        }
        return;
      }

      currentUser = user;
      currentProfile = profile;
      await unlock(profile, user);
    }catch(err){
      clearSession();

      if(status){
        status.className = 'status error';
        status.textContent = err.message || 'Akses tidak valid.';
      }
    }
  }

  async function unlock(profile, user){
    document.documentElement.classList.remove('badai-auth-lock');

    const gate = document.getElementById('badaiAuthGate');
    if(gate) gate.remove();

    let logout = document.getElementById('badaiMemberLogout');

    if(!logout){
      logout = document.createElement('button');
      logout.id = 'badaiMemberLogout';
      logout.type = 'button';
      logout.textContent = 'LOGOUT';

      logout.addEventListener('click', () => {
        clearSession();
        location.reload();
      });

      document.body.appendChild(logout);
    }

    populateAccount(profile, user);
    await configureMembership(profile);
    setAccountStatus('', '');
    console.log('BADAI member active:', profile?.email || '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildGate();
    bindAccountForm();

    try{
      const stored = localStorage.getItem(STORAGE_KEY);

      if(stored){
        session = JSON.parse(stored);
        verifyAccess();
      }
    }catch(_){
      clearSession();
    }
  });

  window.addEventListener('focus', () => {
    refreshMemberProfile();
  });

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      refreshMemberProfile();
    }
  });
})();