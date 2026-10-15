const NONCE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function signWorkerProof(secret: string, nonce: string, timestamp: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`badai-wa-worker:${timestamp}:${nonce}`));
  return Array.from(new Uint8Array(bytes), v => v.toString(16).padStart(2, '0')).join('');
}

export async function verifyWorkerProof(headers: Headers, secret: string, now = Date.now()) {
  const nonce = headers.get('x-wa-worker-nonce') || '';
  const rawTime = headers.get('x-wa-worker-time') || '';
  const signature = headers.get('x-wa-worker-signature') || '';
  if (secret.length < 32 || !NONCE.test(nonce) || !/^\d{10}$/.test(rawTime) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const timestamp = Number(rawTime), age = Math.floor(now / 1000) - timestamp;
  if (age < -5 || age > 30) return false;
  const expected = await signWorkerProof(secret, nonce, timestamp);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return difference === 0;
}

