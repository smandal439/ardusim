/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   server.js â€” ArduSim Node.js backend (zero external deps)
   â€¢ Serves the frontend (static files) from the project root
   â€¢ REST API for the Saved Projects library (SQLite via node:sqlite)
   â€¢ API for the bundled Examples library

   Run:  node server.js   (then open http://localhost:3000)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

'use strict';

const express = require('express');
const app = express();

const http  = require('node:http');
const fs    = require('node:fs');
const path  = require('node:path');
const os    = require('node:os');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { compileSketch, checkToolchains } = require('./compiler/compile');

const ROOT      = __dirname;
const DATA_DIR  = path.join(ROOT, 'data');
const DB_FILE   = path.join(DATA_DIR, 'ardusim.db');
const PORT      = Number(process.env.PORT) || 3000;
const HOST      = process.env.HOST || '0.0.0.0';
const MAX_BODY  = 2 * 1024 * 1024; // 2 MB request limit
const MAX_PROJECTS = 1000;

/* â”€â”€ Rate limiting (in-memory, per IP) â”€â”€ */
const _rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_WRITE = 30; // max POST/DELETE per window

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = _rateBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    _rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  return bucket.count <= RATE_MAX_WRITE;
}

/* â”€â”€ SQLite storage â”€â”€ */
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode=WAL;');
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    version     TEXT NOT NULL DEFAULT '1.1',
    saved_at    TEXT,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL DEFAULT '',
    circuit     TEXT NOT NULL DEFAULT '{}',
    board2_code TEXT NOT NULL DEFAULT ''
  );
`);
try { db.exec(`ALTER TABLE projects ADD COLUMN board2_code TEXT NOT NULL DEFAULT ''`); } catch (e) { /* column already exists */ }

const stmtInsert = db.prepare(`
  INSERT INTO projects (id, version, saved_at, name, code, circuit, board2_code)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    version    = excluded.version,
    saved_at   = excluded.saved_at,
    name       = excluded.name,
    code       = excluded.code,
    circuit    = excluded.circuit,
    board2_code = excluded.board2_code
`);
const stmtAll    = db.prepare('SELECT * FROM projects ORDER BY saved_at DESC');
const stmtCount  = db.prepare('SELECT COUNT(*) as cnt FROM projects');
const stmtById   = db.prepare('SELECT * FROM projects WHERE id = ?');
const stmtDelete = db.prepare('DELETE FROM projects WHERE id = ?');
const stmtDeleteOldest = db.prepare('DELETE FROM projects WHERE id IN (SELECT id FROM projects ORDER BY saved_at ASC LIMIT 1)');

function rowToProject(row) {
  if (!row) return null;
  let circuit = {};
  try { circuit = JSON.parse(row.circuit || '{}'); } catch (e) { circuit = {}; }
  return {
    id:         row.id,
    version:    row.version,
    savedAt:    row.saved_at,
    name:       row.name,
    code:       row.code,
    circuit,
    board2Code: row.board2_code || '',
  };
}

/* â”€â”€ Helpers â”€â”€ */
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
}

function readJsonBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) {
      reject(new Error('Unsupported Media Type: expected application/json'));
      return;
    }
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function sanitizeProject(body) {
  if (!body || typeof body !== 'object') return null;
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 200) : 'Untitled Project';
  const code = typeof body.code === 'string' ? body.code.slice(0, 100_000) : '';
  const board2Code = typeof body.board2Code === 'string' ? body.board2Code.slice(0, 100_000) : '';
  const circuit = body.circuit && typeof body.circuit === 'object'
    ? { components: Array.isArray(body.circuit.components) ? body.circuit.components.slice(0, 500) : [],
        wires:      Array.isArray(body.circuit.wires) ? body.circuit.wires.slice(0, 1000) : [] }
    : { components: [], wires: [] };
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim().slice(0, 100) : 'p_' + crypto.randomBytes(8).toString('hex');
  return {
    id,
    version: typeof body.version === 'string' ? body.version : '1.1',
    savedAt: typeof body.savedAt === 'string' ? body.savedAt : new Date().toISOString(),
    name,
    code,
    circuit,
    board2Code,
  };
}

function readExamples() {
  const dir = path.join(ROOT, 'Examples');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
      catch (e) { return null; }
    })
    .filter(Boolean);
}

/* â”€â”€ Static file serving â”€â”€ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.map':  'application/json; charset=utf-8',
};

// Paths that must never be served over HTTP
const BLOCKED = ['/node_modules', '/data', '/.git', '/server.js', '/package.json', '/package-lock.json', '/.env'];

function serveStatic(req, res, urlPath) {
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Decode first, then check blocklist (prevents double-encoding bypass)
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch (e) {
    return sendJson(res, 400, { error: 'Bad request' });
  }
  if (BLOCKED.some(b => decoded === b || decoded.startsWith(b + '/'))) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  let filePath;
  try {
    filePath = path.normalize(path.join(ROOT, decoded));
  } catch (e) {
    return sendJson(res, 400, { error: 'Bad request' });
  }
  if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { error: 'Forbidden' });

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return sendJson(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    // ETag based on mtime + size for cache validation
    const etag = `"${stat.mtimeMs}-${stat.size}"`;
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.writeHead(304);
      return res.end();
    }

    const noCache = ext === '.html' || ext === '.json';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': noCache ? 'no-cache' : 'public, max-age=0, must-revalidate',
      'ETag': etag,
      'Last-Modified': stat.mtime.toUTCString(),
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* â”€â”€ Routing â”€â”€ */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const pathname = url.pathname;
  const method = req.method;
  const clientIp = getClientIp(req);

  // API routes (handled before static so they always win)
  if (pathname === '/api/health' && method === 'GET') {
    return sendJson(res, 200, { ok: true, name: 'ardusim', uptime: process.uptime(), time: new Date().toISOString() });
  }

  if (pathname === '/api/host' && method === 'GET') {
    let ip = '127.0.0.1';
    try {
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) { ip = net.address; break; }
        }
        if (ip !== '127.0.0.1') break;
      }
    } catch (e) { /* fallback to 127.0.0.1 */ }
    return sendJson(res, 200, { ip: ip, port: Number(PORT) || 3000 });
  }

  if (pathname === '/api/projects' && method === 'GET') {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 200, 1), 1000);
    const offset = Math.max(parseInt(url.searchParams.get('offset'), 10) || 0, 0);
    const stmtPaginated = db.prepare(`SELECT * FROM projects ORDER BY saved_at DESC LIMIT ? OFFSET ?`);
    const projects = stmtPaginated.all(limit, offset).map(rowToProject);
    const total = stmtCount.get().cnt;
    return sendJson(res, 200, { projects, total });
  }

  if (pathname === '/api/projects' && method === 'POST') {
    if (!checkRateLimit(clientIp)) {
      return sendJson(res, 429, { error: 'Rate limit exceeded. Try again later.' });
    }
    try {
      const body = await readJsonBody(req);
      const project = sanitizeProject(body);
      if (!project) return sendJson(res, 400, { error: 'Invalid project' });
      // Enforce project count limit
      const { cnt } = stmtCount.get();
      if (cnt >= MAX_PROJECTS) {
        stmtDeleteOldest.run();
      }
      stmtInsert.run(project.id, project.version, project.savedAt, project.name, project.code, JSON.stringify(project.circuit), project.board2Code || '');
      return sendJson(res, 200, { project });
    } catch (e) {
      const status = e.message.includes('Unsupported Media Type') ? 415 : 400;
      return sendJson(res, status, { error: e.message });
    }
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]);
    if (method === 'GET') {
      const p = rowToProject(stmtById.get(id));
      return p ? sendJson(res, 200, { project: p }) : sendJson(res, 404, { error: 'Project not found' });
    }
    if (method === 'DELETE') {
      if (!checkRateLimit(clientIp)) {
        return sendJson(res, 429, { error: 'Rate limit exceeded. Try again later.' });
      }
      stmtDelete.run(id);
      return sendJson(res, 200, { ok: true, id });
    }
  }

  if (pathname === '/api/examples' && method === 'GET') {
    return sendJson(res, 200, { examples: readExamples() });
  }
  // Server-side Arduino compilation
  if (pathname === '/api/compile' && method === 'POST') {
    if (!checkRateLimit(clientIp)) {
      return sendJson(res, 429, { error: 'Rate limit exceeded. Try again later.' });
    }
    try {
      const body = await readJsonBody(req);
      const code = typeof body.code === 'string' ? body.code : '';
      const boardType = typeof body.board === 'string' ? body.board : 'arduino_uno';
      if (!code.trim()) {
        return sendJson(res, 400, { ok: false, error: 'No code provided' });
      }
      const validBoards = ['arduino_uno', 'arduino_nano', 'esp32_devkit_v1'];
      if (!validBoards.includes(boardType)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid board type. Valid: ' + validBoards.join(', ') });
      }
      const result = await compileSketch(code, boardType);
      return sendJson(res, result.ok ? 200 : 400, result);
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: 'Compilation error: ' + (e.message || String(e)) });
    }
  }

  // Check compiler toolchain availability
  if (pathname === '/api/compiler-status' && method === 'GET') {
    const status = checkToolchains();
    return sendJson(res, 200, { toolchains: status });
  }


  // Unknown /api route
  if (pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'Unknown API route' });
  }

  // Remote control page
  if (pathname === '/remote') {
    const remotePath = path.join(ROOT, 'remote.html');
    return fs.readFile(remotePath, (err, data) => {
      if (err) return sendJson(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  }

  // Static files
  return serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`â–¶ ArduSim server running at http://${HOST}:${PORT}`);
  console.log(`  DB: ${DB_FILE}`);
});


