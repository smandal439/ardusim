const fs = require('fs');
let s = fs.readFileSync('js/app.js', 'utf8');

// 1. Add event binding after canvasFullscreenBtn
const bindMarker = "canvasFullscreenBtn?.addEventListener('click', () => this._toggleCanvasFullscreen());";
const bindIdx = s.indexOf(bindMarker);
if (bindIdx === -1) { console.log('ERROR: bind marker not found'); process.exit(1); }
const bindInsert = bindMarker + "\n    const editorFullscreenBtn = get('btn-editor-fullscreen');\n    editorFullscreenBtn?.addEventListener('click', () => this._toggleEditorFullscreen());";
s = s.slice(0, bindIdx) + bindInsert + s.slice(bindIdx + bindMarker.length);
console.log('1. Added event binding');

// 2. Add Escape key handler for editor-fullscreen
const escMarker = "if (document.body.classList.contains('canvas-fullscreen')) {";
const escIdx = s.indexOf(escMarker);
if (escIdx === -1) { console.log('ERROR: esc marker not found'); process.exit(1); }
const afterEscClose = s.indexOf('}', s.indexOf('}', escIdx) + 1) + 1;
const escInsert = "\n        if (document.body.classList.contains('editor-fullscreen')) {\n          this._toggleEditorFullscreen();\n          return;\n        }";
s = s.slice(0, afterEscClose) + escInsert + s.slice(afterEscClose);
console.log('2. Added Escape handler');

// 3. Add _setView clearing editor-fullscreen
const setViewMarker = "document.body.classList.remove('canvas-fullscreen');";
const svIdx = s.indexOf(setViewMarker);
if (svIdx === -1) { console.log('ERROR: setView marker not found'); process.exit(1); }
s = s.slice(0, svIdx) + "document.body.classList.remove('canvas-fullscreen', 'editor-fullscreen');" + s.slice(svIdx + setViewMarker.length);
console.log('3. Updated _setView');

// 4. Add _toggleEditorFullscreen method before _initDefaultLayout
const defaultLayoutMarker = "  _initDefaultLayout() {";
const dlIdx = s.indexOf(defaultLayoutMarker);
if (dlIdx === -1) { console.log('ERROR: defaultLayout marker not found'); process.exit(1); }

const newMethod = `
  _toggleEditorFullscreen() {
    const isFullscreen = document.body.classList.toggle('editor-fullscreen');
    const btn = document.getElementById('btn-editor-fullscreen');
    if (btn) btn.title = isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Editor (Esc to exit)';
    if (isFullscreen) {
      document.body.classList.remove('canvas-fullscreen');
      if (this._activeView) {
        document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
        this._activeView = null;
        this._updateViewButtons();
      }
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      const em = window.EditorManager;
      if (em?.editor?.layout) em.editor.layout();
      if (this.canvas?.resize) this.canvas.resize();
    }, 50);
  }

`;
s = s.slice(0, dlIdx) + newMethod + s.slice(dlIdx);
console.log('4. Added _toggleEditorFullscreen method');

// 5. Update resizer guards to also block during fullscreen
const resizerGuard = "document.body.classList.contains('view-serial')) return;";
let guardCount = 0;
let guardIdx = 0;
while ((guardIdx = s.indexOf(resizerGuard, guardIdx)) !== -1) {
  const replacement = "document.body.classList.contains('view-serial') ||\n            document.body.classList.contains('canvas-fullscreen') ||\n            document.body.classList.contains('editor-fullscreen')) return;";
  s = s.slice(0, guardIdx) + replacement + s.slice(guardIdx + resizerGuard.length);
  guardIdx += replacement.length;
  guardCount++;
}
console.log('5. Updated', guardCount, 'resizer guards');

fs.writeFileSync('js/app.js', s, 'utf8');
console.log('Done! Written js/app.js');
