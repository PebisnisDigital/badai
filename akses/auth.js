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

  async function verifyAccess(){
    const status = document.getElementById('badaiMemberStatus');

    try{
      const user = await api('/auth/v1/user');
      const userId = user?.id;

      if(!userId) throw new Error('Session tidak valid.');

      const rows = await api(
        '/rest/v1/profiles?id=eq.' + encodeURIComponent(userId) +
        '&select=id,email,full_name,role,member_status'
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

      unlock(profile);
    }catch(err){
      clearSession();

      if(status){
        status.className = 'status error';
        status.textContent = err.message || 'Akses tidak valid.';
      }
    }
  }

  function unlock(profile){
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

    console.log('BADAI member active:', profile?.email || '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildGate();

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
})();