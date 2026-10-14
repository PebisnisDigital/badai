// Contracts verified against https://zawa.azickri.com/llms.txt on 2026-10-14.
// A provider ID is acceptance evidence, never proof of recipient delivery.
export const ZAWA_BASE = 'https://api-zawa.azickri.com';
export type Destination = 'group' | 'channel' | 'status';
export type MessageType = 'text' | 'image' | 'video' | 'document';
export type Credentials = { provider_id: string; session_secret: string };
export type Snapshot = {
  kind: Destination; external_id: string; content_text: string; cta_url?: string | null;
  message_type: 'text' | 'media'; media_path?: string | null;
};
export type Media = { url: string; mimetype: string; size: number; duration?: number; name: string };
export type Outcome = { status: 'api_accepted' | 'failed' | 'unknown'; provider_id: string | null; http_status: number | null; error_code: string | null };

export function providerHeaders(c: Credentials) {
  if (!c.provider_id || !c.session_secret) throw new Error('connection_not_configured');
  return { id: c.provider_id, 'session-id': c.session_secret, 'Content-Type': 'application/json' };
}

export function messageType(path: string | null | undefined): MessageType {
  if (!path) return 'text';
  if (/\.(jpg|jpeg|png|webp)$/i.test(path)) return 'image';
  if (/\.mp4$/i.test(path)) return 'video';
  if (/\.pdf$/i.test(path)) return 'document';
  throw new Error('unsupported_media');
}

export function requestBody(s: Snapshot, media?: Media) {
  if (!['group', 'channel', 'status'].includes(s.kind)) throw new Error('unsupported_destination');
  if (s.kind === 'group' && !/^\d{8,}-\d+@g\.us$|^\d{8,}@g\.us$/.test(s.external_id)) throw new Error('invalid_group_id');
  if (s.kind === 'channel' && !/^\d{8,}@newsletter$/.test(s.external_id)) throw new Error('invalid_channel_id');
  let text = String(s.content_text || '').trim();
  if (s.cta_url) {
    if (!/^https:\/\//i.test(s.cta_url)) throw new Error('invalid_cta');
    if (!text.includes(s.cta_url)) text += (text ? '\n\n' : '') + s.cta_url;
  }
  if (text.length > 12000) throw new Error('text_too_long');
  const body: Record<string, unknown> = {};
  if (s.kind === 'group') body.group = s.external_id;
  if (s.kind === 'channel') body.newsletter = s.external_id;
  const type = s.message_type === 'media' ? messageType(s.media_path) : 'text';
  if (s.message_type === 'media' && type === 'text') throw new Error('media_required');
  body.type = type;
  if (type === 'text') {
    if (!text) throw new Error('text_required');
    body.text = text;
  } else {
    if (!media || !/^https:\/\//i.test(media.url) || media.size <= 0 || media.size > 20 * 1024 * 1024) throw new Error('invalid_media');
    if (s.kind === 'status' && type === 'document') throw new Error('status_document_unsupported');
    const expected = { image: ['image/jpeg', 'image/png', 'image/webp'], video: ['video/mp4'], document: ['application/pdf'] };
    if (!expected[type].includes(media.mimetype)) throw new Error('media_mimetype_mismatch');
    const object: Record<string, unknown> = { url: media.url, mimetype: media.mimetype };
    if (type === 'video') {
      if (!Number.isFinite(media.duration) || Number(media.duration) <= 0) throw new Error('video_duration_required');
      object.duration = media.duration;
    }
    if (type === 'document') { object.name = media.name; object.size = media.size; }
    body[type] = object;
    if (text) body.text = text;
  }
  return { endpoint: s.kind === 'status' ? '/status' : '/message', type, body };
}

export function classifyResponse(status: number, data: unknown, kind: Destination): Outcome {
  const id = data && typeof data === 'object' ? (data as Record<string, unknown>)[kind === 'status' ? 'statusId' : 'messageId'] : null;
  if (status === 200 && typeof id === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(id)) {
    return { status: 'api_accepted', provider_id: id, http_status: status, error_code: null };
  }
  // Only documented rejection codes prove no submission occurred. A timeout,
  // transport failure, 5xx, redirect or malformed success stays ambiguous.
  if ((status === 400 || status === 404) && data && typeof data === 'object' && (data as Record<string, unknown>).statusCode === status && typeof (data as Record<string, unknown>).message === 'string') {
    return { status: 'failed', provider_id: null, http_status: status, error_code: 'provider_rejected_' + status };
  }
  // Preserve useful documented diagnostics without retaining arbitrary provider
  // messages. Even known 5xx errors remain unknown: they do not prove delivery
  // did not occur and must never authorize an automatic retry.
  const message = data && typeof data === 'object' ? (data as Record<string, unknown>).message : null;
  const diagnostic = status === 500 && message === 'contacts not synced, reconnect the session or set status privacy to "only share with"'
    ? 'provider_contacts_not_synced'
    : status === 500 && message === 'status privacy "only share with" has no contacts'
      ? 'provider_status_audience_empty'
      : status === 500 && message === 'send timeout after 240s'
        ? 'provider_processing_timeout'
        : status === 504 ? 'provider_gateway_timeout' : 'provider_ambiguous_response';
  return { status: 'unknown', provider_id: null, http_status: status, error_code: diagnostic };
}

export async function submit(snapshot: Snapshot, credentials: Credentials, media?: Media, fetcher: typeof fetch = fetch): Promise<Outcome> {
  const request = requestBody(snapshot, media);
  // Do not retry or follow redirects: Zawa documents no idempotency key.
  try {
    const response = await fetcher(ZAWA_BASE + request.endpoint, {
      method: 'POST', redirect: 'error', headers: providerHeaders(credentials),
      body: JSON.stringify(request.body), signal: AbortSignal.timeout(65000),
    });
    const data = await response.json().catch(() => null);
    return classifyResponse(response.status, data, snapshot.kind);
  } catch (_) {
    return { status: 'unknown', provider_id: null, http_status: null, error_code: 'provider_transport_uncertain' };
  }
}

export async function connected(credentials: Credentials, fetcher: typeof fetch = fetch) {
  let response: Response;
  try {
    response = await fetcher(ZAWA_BASE + '/session', {
      headers: providerHeaders(credentials), redirect: 'error', signal: AbortSignal.timeout(30000),
    });
  } catch (_) { throw new Error('provider_session_transport_failed'); }
  if (!response.ok) throw new Error('provider_session_unavailable');
  const data = await response.json().catch(() => null);
  // Do not expose the response: it contains session credentials and account data.
  if (!data || typeof data.isConnected !== 'boolean') throw new Error('provider_session_invalid_response');
  if (data.isConnected !== true) throw new Error('provider_session_disconnected');
  return true;
}

export async function ownsChannel(id: string, credentials: Credentials, fetcher: typeof fetch = fetch) {
  const response = await fetcher(ZAWA_BASE + '/channel', {
    headers: providerHeaders(credentials), redirect: 'error', signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error('provider_channel_unavailable');
  const data = await response.json();
  if (!Array.isArray(data.docs) || !data.docs.some((row: { id: string; isOwner: boolean }) => row.id === id && row.isOwner === true)) throw new Error('channel_not_owned');
}

export async function fingerprint(credentials: Credentials) {
  const bytes = new TextEncoder().encode(JSON.stringify([credentials.provider_id, credentials.session_secret]));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), v => v.toString(16).padStart(2, '0')).join('');
}
