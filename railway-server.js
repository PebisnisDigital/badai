const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const landing = require('./api/landing-v6.js');
const admin = require('./api/admin-v5.js');
const akses = require('./api/admin-v3.js');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const BUILD_REV = 'badai-staging-ai-influencer-geo-v2';

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.txt':'text/plain; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.gif':'image/gif',
  '.ico':'image/x-icon',
  '.woff':'font/woff',
  '.woff2':'font/woff2',
  '.mp4':'video/mp4',
  '.webm':'video/webm'
};

function decorateReqRes(req, res) {
  const base = 'http://' + (req.headers.host || 'localhost');
  const url = new URL(req.url || '/', base);
  req.query = Object.fromEntries(url.searchParams.entries());
  req.path = url.pathname;

  res.status = function(code){
    res.statusCode = Number(code) || 200;
    return res;
  };
  res.send = function(payload){
    if (res.writableEnded) return res;
    if (payload == null) payload = '';
    if (Buffer.isBuffer(payload)) {
      res.end(payload);
      return res;
    }
    if (typeof payload === 'object') {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type','application/json; charset=utf-8');
      }
      res.end(JSON.stringify(payload));
      return res;
    }
    res.end(String(payload));
    return res;
  };
  res.json = function(payload){
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.send(payload);
  };
}

async function collectBody(req){
  if (!['POST','PUT','PATCH'].includes(String(req.method || '').toUpperCase())) return;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  req.rawBody = raw;
  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/json')) {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  } else {
    req.body = raw;
  }
}

function safeStaticPath(urlPath){
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
  if (!normalized || normalized.startsWith('..') || normalized.includes('/../')) return null;
  const absolute = path.resolve(ROOT, normalized);
  if (!absolute.startsWith(path.resolve(ROOT) + path.sep)) return null;
  return absolute;
}

function serveStatic(req, res, pathname){
  const absolute = safeStaticPath(pathname);
  if (!absolute) return false;

  let file = absolute;
  try {
    const stat = fs.statSync(file);
    if (stat.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    return false;
  }

  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return false;
    const ext = path.extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', ext === '.html' ? 'no-store' : 'public, max-age=300');
    fs.createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  decorateReqRes(req, res);

  res.setHeader('X-BADAI-Environment','Railway-Staging');

  try {
    await collectBody(req);
    const pathname = req.path || '/';

    if (pathname === '/health') {
      res.setHeader('Content-Type','application/json; charset=utf-8');
      return res.status(200).send({
        ok:true,
        app:'BADAI-STAGING',
        source:process.env.VERCEL_GIT_COMMIT_SHA || 'staging',
        build:BUILD_REV
      });
    }

    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/api/admin-v5') {
      return await admin(req, res);
    }

    if (pathname === '/akses' || pathname === '/akses/' || pathname === '/api/admin-v3') {
      req.query = Object.assign({}, req.query, { accesscompact:'1' });
      return await akses(req, res);
    }

    if (pathname === '/api/landing-v6') {
      return await landing(req, res);
    }

    if (serveStatic(req, res, pathname)) return;

    const parts = pathname.split('/').filter(Boolean);
    if (pathname === '/' || parts.length === 1) {
      return await landing(req, res);
    }

    res.setHeader('Content-Type','text/plain; charset=utf-8');
    return res.status(404).send('BADAI staging: halaman tidak ditemukan.');
  } catch (error) {
    if (res.writableEnded) return;
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.status(500).send('BADAI staging error: ' + String(error?.message || error));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('BADAI-STAGING listening on port ' + PORT);
});
