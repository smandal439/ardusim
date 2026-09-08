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
    // Start the server on a random port
    const port = 30000 + Math.floor(Math.random() * 50000);
    baseUrl = `http://127.0.0.1:${port}`;

    serverProcess = spawn('node', [path.join(ROOT, 'server.js')], {
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
      stdio: 'pipe',
      cwd: ROOT,
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10000);
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('running at')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProcess.stderr.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });
      serverProcess.on('error', reject);
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
