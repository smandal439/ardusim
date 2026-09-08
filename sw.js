/* ═══════════════════════════════════════════════════════
   sw.js — Service Worker for ArduSim PWA
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'ardusim-v31';

// Compute base path dynamically so the SW works on both root domains
// (ardusim.app) and GitHub Pages subpaths (/Online-Circuit-Simulator/).
const BASE = self.registration.scope.replace(/\/[^/]*$/, '/');
const STATIC_ASSETS = [
  '',
  'index.html',
  'remote.html',
  'docs/ArduSim_Guide.html',
  'css/style.css',
  'css/remote.css',
  'js/app.js',
  'js/canvas.js',
  'js/editor.js',
  'js/simulator.js',
  'js/electrical.js',
  'js/remote.js',
  'js/remote-control.js',
  'js/serial_monitor.js',
  'js/output.js',
  'js/oscilloscope.js',
  'js/logic-analyzer.js',
  'js/plotter.js',
  'js/storage.js',
  'js/api.js',
  'js/utils.js',
  'js/thumbnails.js',
  'js/guide.js',
  'js/sharing.js',
  'js/safetyChecker.js',
  'js/communication.js',
  'js/dsp.js',
  'js/dso-fullscreen.js',
  'js/components/audio.js',
  'js/components/base.js',
  'js/components/boards.js',
  'js/components/output.js',
  'js/components/input.js',
  'js/components/actuators.js',
  'js/components/sensors.js',
  'js/components/passive.js',
  'js/components/power.js',
  'js/components/ics.js',
  'js/components/multimeter.js',
  'js/components/probe.js',
  'js/components/function_generator.js',
  'js/libraries/math.js',
  'js/libraries/wire.js',
  'js/libraries/spi.js',
  'js/libraries/eeprom.js',
  'js/libraries/wifi.js',
  'js/libraries/webserver.js',
  'js/libraries/httpclient.js',
  'js/libraries/bme280.js',
  'js/libraries/dht.js',
  'js/libraries/servo.js',
  'js/libraries/liquidcrystal.js',
  'js/libraries/liquidcrystal_i2c.js',
  'js/libraries/adafruit_ssd1306.js',
  'js/libraries/adafruit_ili9341.js',
  'js/libraries/adafruit_gfx.js',
  'js/libraries/adafruit_mpu6050.js',
  'js/libraries/adafruit_vl53l0x.js',
  'js/libraries/neopixel.js',
  'js/libraries/fastled.js',
  'js/libraries/stepper.js',
  'js/libraries/softwareserial.js',
  'js/libraries/newping.js',
  'js/libraries/mfrc522.js',
  'js/libraries/tinygps.js',
  'js/libraries/arduinojson.js',
  'js/libraries/pubsubclient.js',
  'js/libraries/irremote.js',
  'js/libraries/i2s.js',
  'js/libraries/espnow.js',
  'js/libraries/coap.js',
  'js/libraries/sevensegment.js',
  'js/libraries/cpp_types.js',
  'favicon.ico',
].map(p => BASE + p);

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ArduSim — Offline</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0d1117;color:#c9d1d9;text-align:center}div{max-width:400px}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#8b949e;font-size:.9rem}</style>
</head>
<body><div><h1>You are offline</h1><p>ArduSim needs a network connection to load. Please check your internet connection and try again.</p></div></body>
</html>`;

// Install: cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Cache what we can, ignore failures
        return Promise.allSettled(
          STATIC_ASSETS.map((url) => cache.add(url).catch(() => {}))
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls: network first — never cache API responses
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"Network error"}', { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // CDN resources (Monaco, fonts): cache-first
  if (url.hostname !== location.hostname) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Static assets: network first, cache fallback (ensures fresh files)
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => {
      return caches.match(e.request).then((cached) => {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
      });
    })
  );
});
