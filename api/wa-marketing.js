// BADAI internal WhatsApp Marketing — safe setup/status endpoint.
// This endpoint never publishes, posts statuses, or exposes Zawa credentials.
const SUPABASE_URL = 'https://tlvxlekqrllkvcpgwmic.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_CttQA-59OaKmYm2GnzB_Hw_eHfVCv_R';
const ROLES = new Set(['owner','super_admin','admin','marketing']);

async function fromSupabase(path, bearer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(SUPABASE_URL + path, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': 'Bearer ' + bearer,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    if (!response.ok) throw Object.assign(new Error('Supabase authentication failed'), { status: response.status });
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metode tidak didukung. Pengiriman belum diaktifkan.' });
  }
  const bearer = String(req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_.-]+)$/i)?.[1];
  if (!bearer || bearer.length > 5000) return res.status(401).json({ error: 'Silakan login admin kembali.' });

  try {
    // Supabase verifies token signature and expiry; never trust user metadata/role from the browser.
    const user = await fromSupabase('/auth/v1/user', bearer);
    if (!user || typeof user.id !== 'string') return res.status(401).json({ error: 'Sesi admin tidak valid.' });
    const team = await fromSupabase(
      '/rest/v1/admin_team_members?auth_user_id=eq.' + encodeURIComponent(user.id) +
      '&select=role,status&limit=1', bearer
    );
    const current = Array.isArray(team) ? team[0] : null;
    if (current?.status !== 'active' || !ROLES.has(current?.role)) {
      return res.status(403).json({ error: 'Akun ini tidak boleh membuka WA Marketing.' });
    }
    const configured = Boolean(process.env.ZAWA_ID && process.env.ZAWA_SESSION_ID);
    return res.status(200).json({
      provider: 'zawa',
      configured,
      // Credentials alone never imply a valid, connected WhatsApp device.
      connection_state: configured ? 'not_verified' : 'not_configured',
      posting_enabled: false,
      scheduler_enabled: false,
      media: ['channel', 'group', 'status'],
      next_step: configured
        ? 'Verifikasi endpoint sesi dan QR Zawa sebelum mengaktifkan posting.'
        : 'Buat sesi Zawa lalu tambahkan ZAWA_ID dan ZAWA_SESSION_ID sebagai secret Vercel.',
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    const status = error?.status === 401 ? 401 : error?.status === 403 ? 403 : 503;
    return res.status(status).json({
      error: status === 503 ? 'Pemeriksaan admin gagal. Coba lagi nanti.' : 'Sesi admin tidak valid.'
    });
  }
};
