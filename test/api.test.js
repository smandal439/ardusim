/**
 * test/api.test.js — Unit tests for the server REST API
 * Run: npx vitest run test/api.test.js
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(__dirname, '..');
let serverProcess;
let baseUrl;

function fetchJson(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.body
        ? { 'Content-Type': 'application/json', ...options.headers }
        : options.headers,
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

describe('REST API', () => {
  beforeAll(async () => {
    // Start the server on a random port (must stay ≤ 65535 — URLs reject higher)
    const port = 30000 + Math.floor(Math.random() * 20000);
    baseUrl = `http://127.0.0.1:${port}`;

    serverProcess = spawn('node', [path.join(ROOT, 'server.js')], {
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
      stdio: 'pipe',
      cwd: ROOT,
    });

    // Wait until the HTTP server actually responds (immune to banner wording).
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      };
      const timer = setTimeout(() => fail(new Error('Server start timeout')), 15000);
      const probe = () => {
        if (settled) return;
        const req = http.get(baseUrl + '/', (res) => {
          res.resume();
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        });
        req.on('error', () => {
          if (settled) return;
          if (Date.now() > deadline) return fail(new Error('Server start timeout'));
          setTimeout(probe, 150);
        });
      };
      serverProcess.on('error', (err) => fail(err));
      serverProcess.on('exit', (code) => fail(new Error(`server exited early (code ${code})`)));
      serverProcess.stdout.resume(); // drain — banner/visit logs must not block the pipe
      serverProcess.stderr.on('data', (data) => {
        // Visible for diagnosis, but non-fatal — TLS/DB chatter is expected.
        console.error('Server stderr:', data.toString());
      });
      probe();
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('GET /api/health returns 200', async () => {
    const res = await fetchJson('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.name).toBe('ardusim');
  });

  it('GET /api/host returns IP and port', async () => {
    const res = await fetchJson('/api/host');
    expect(res.status).toBe(200);
    expect(res.body.ip).toBeDefined();
    expect(res.body.port).toBeDefined();
  });

  it('GET /api/projects returns array', async () => {
    const res = await fetchJson('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('POST /api/projects creates a project', async () => {
    const project = {
      name: 'Test Project',
      code: 'void setup() {}',
      circuit: { components: [], wires: [] },
    };
    const res = await fetchJson('/api/projects', { method: 'POST', body: project });
    expect(res.status).toBe(200);
    expect(res.body.project).toBeDefined();
    expect(res.body.project.name).toBe('Test Project');
    expect(res.body.project.id).toBeDefined();

    // Clean up
    await fetchJson(`/api/projects/${res.body.project.id}`, { method: 'DELETE' });
  });

  it('POST /api/projects with invalid body returns 400', async () => {
    const res = await fetchJson('/api/projects', {
      method: 'POST',
      body: null,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/projects with non-JSON content type returns 415', async () => {
    const res = await fetchJson('/api/projects', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(res.status).toBe(415);
  });

  it('GET /api/projects/:id returns project or 404', async () => {
    // Create first
    const create = await fetchJson('/api/projects', {
      method: 'POST',
      body: { name: 'Fetch Test', code: '', circuit: { components: [], wires: [] } },
    });
    const id = create.body.project.id;

    const res = await fetchJson(`/api/projects/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Fetch Test');

    // Non-existent
    const res404 = await fetchJson('/api/projects/nonexistent_id_12345');
    expect(res404.status).toBe(404);

    // Clean up
    await fetchJson(`/api/projects/${id}`, { method: 'DELETE' });
  });

  it('DELETE /api/projects/:id removes project', async () => {
    const create = await fetchJson('/api/projects', {
      method: 'POST',
      body: { name: 'Delete Test', code: '', circuit: { components: [], wires: [] } },
    });
    const id = create.body.project.id;

    const del = await fetchJson(`/api/projects/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const res = await fetchJson(`/api/projects/${id}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/examples returns array', async () => {
    const res = await fetchJson('/api/examples');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.examples)).toBe(true);
  });

  it('GET /api/unknown returns 404', async () => {
    const res = await fetchJson('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('GET / returns HTML', async () => {
    const res = await fetchJson('/');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('string');
  });
});
