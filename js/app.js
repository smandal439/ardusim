'use strict';

class App {
  constructor() {
    this.sim = window.ArduinoSim;
    this.sim2 = null; // second simulator instance for dual-board
    this.editor = window.EditorManager;
    this.canvas = null;
    this.serial = null;
    this.output = null;
    this.osc = null;
    this.la = null;
    this.plotter = null;
    this.isRunning = false;
    this._runEpoch = 0;
    this._pendingRunEpoch = 0;
    this._bottomHeight = 200;
    this._propsComp = null;
    this._projectName = 'Untitled Project';
    this._autoSaveDebounced = null;
    this._activeView = null;
    this._examplesQuery = '';
    this._examplesFilter = 'all';
    this._examplesPageSize = 12;
    this._examplesPageIndex = 0;
    this._examplesFiltered = [];
    this._examplesObserver = null;
    this._savedQuery = '';
    this.remote = null;
    // Dual-board support
    this._activeBoard = 0; // 0 = Board 1 (primary), 1 = Board 2 (secondary)
    this._board2Code = ''; // stores Board 2 code (Board 1 uses editor)
    this._board2HasCode = false;
  }

  init() {
    try {
      this._initErrorHandlers();
      this._bindUi();
      this._initResizers();
      this._loadTheme();
      this._initCanvas();
      this._initSerial();
      this._initOutput();
      this._initOscilloscope();
      this._initLogicAnalyzer();
      this._initPlotter();
      this._attachSimulatorEvents();
      this._renderComponentLibrary();
      this._renderExamples();
      this._initBoardSelector();
      this.remote = new RemoteControl();
      window.GuideManager?.bind?.();
      this._restoreProject();
      this._setupBeforeUnloadGuard();
      this._syncProjectsFromServer();

      if (this.editor) {
        this.editor.init();
      }

      // Initialize second simulator for dual-board
      this._initSim2();
      this._bindBoard2TabUI();

      this._initMobile();

      this._updateStatus('Ready — press Run to start simulation');
      this._updateCompileStatus('Ready');
      this._hideLoadingOverlay();
    } catch (err) {
      console.error('[ArduSim] Init error:', err);
      this._showInitError(err.message || String(err));
    }
  }

  _showInitError(msg) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <div class="loading-error">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="#da3633"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1m0 3a.905.905 0 0 1 .9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>
          <h3>Failed to initialize ArduSim</h3>
          <p>${this._escHtml(msg)}</p>
          <button onclick="location.reload()">Reload</button>
        </div>`;
    }
  }

  /* ══════════════════════ GLOBAL ERROR HANDLING ══════════════════════ */
  _initErrorHandlers() {
    window.addEventListener('error', (e) => {
      console.error('[ArduSim] Uncaught error:', e.error || e.message);
      this._reportGlobalError((e.error && e.error.message) || e.message || 'unknown error');
    });

    window.addEventListener('unhandledrejection', (e) => {
      const reason = e && e.reason;
      const msg = reason && reason.message ? reason.message : String(reason || 'unknown error');
      console.error('[ArduSim] Unhandled promise rejection:', reason);
      this._reportGlobalError(msg);
    });
  }

  _reportGlobalError(msg) {
    // Throttle so a flood of errors can't spam the toast stack
    if (this._errorCooldown) return;
    this._errorCooldown = true;
    setTimeout(() => { this._errorCooldown = false; }, 4000);
    this.showToast(`Unexpected error: ${msg}`, 'error');
  }

  onEditorReady() {
    this._restoreProject();
    this._updateStatus('Editor ready');
    this._updateCompileStatus('Ready');
    this._hideLoadingOverlay();
  }

  /* ══════════════════════ UI BINDING ══════════════════════ */
  _bindUi() {
    const get = id => document.getElementById(id);

    const runBtn    = get('btn-run');
    const pauseBtn  = get('btn-pause');
    const saveBtn   = get('btn-save');
    const downloadBtn = get('btn-download');
    const saveExampleBtn = get('btn-save-example');
    const loadBtn   = get('btn-load');
    const savedProjectsBtn = get('btn-saved-projects');
    const shareBtn  = get('btn-share');
    const clearBtn  = get('btn-clear-canvas');
    const exportBtn = get('btn-export-img');
    const formatBtn = get('btn-format-code');
    const verifyBtn = get('btn-verify');
    const examplesBtn    = get('btn-examples');
    const shortcutsBtn   = get('btn-shortcuts');
    const toggleEditorBtn    = get('btn-toggle-editor');
    const toggleComponentsBtn = get('btn-toggle-components');
    const toggleBottomBtn     = get('btn-toggle-bottom');
    const showEditorBtn       = get('btn-show-editor');
    const showComponentsBtn   = get('btn-show-components');
    const newProjectBtn  = get('btn-new-project');
    const zoomInBtn  = get('btn-zoom-in');
    const zoomOutBtn = get('btn-zoom-out');
    const fitViewBtn = get('btn-fit-view');
    const undoBtn    = get('btn-undo-canvas');
    const redoBtn    = get('btn-redo-canvas');
    const oscClearBtn = get('btn-osc-clear');
    const oscPauseBtn = get('btn-osc-pause');
    const themeBtn   = get('btn-theme');
    const themeIconDark  = get('theme-icon-dark');
    const themeIconLight = get('theme-icon-light');
    const searchBox  = get('component-search');
    const speedSel   = get('sim-speed');
    const propsApply = get('btn-props-apply');
    const oscCh1     = get('osc-ch1');
    const oscCh2     = get('osc-ch2');
    const oscTimebase = get('osc-timebase');
    const modalOverlay = get('modal-overlay');
    const bottomTabButtons = document.querySelectorAll('.btm-tab');
    const projectNameEl = get('project-name');

    runBtn?.addEventListener('click', () => this.isRunning ? this.stop() : this.run());
    pauseBtn?.addEventListener('click', () => this.pauseResume());
    saveBtn?.addEventListener('click', () => this.saveProject());
    downloadBtn?.addEventListener('click', () => this.downloadProject());
    saveExampleBtn?.addEventListener('click', () => this.saveAsExample());
    loadBtn?.addEventListener('click', () => this.loadProject());
    savedProjectsBtn?.addEventListener('click', () => this._openSavedProjects());
    shareBtn?.addEventListener('click', () => this.shareProject());
    newProjectBtn?.addEventListener('click', () => this._newProject());
    clearBtn?.addEventListener('click', () => this.clearCanvas());
    exportBtn?.addEventListener('click', () => this.exportImage());
    formatBtn?.addEventListener('click', () => this.formatCode());
    verifyBtn?.addEventListener('click', () => this.verify());
    // Logo click → go to home page
    document.querySelector('.header-logo')?.addEventListener('click', () => {
      window.location.href = '/';
    });
    examplesBtn?.addEventListener('click', () => {
      this._renderExamples();
      this._showModal('modal-examples');
    });
    shortcutsBtn?.addEventListener('click', () => this._showModal('modal-shortcuts'));
    const homeBtn = get('btn-home');
    homeBtn?.addEventListener('click', () => {
      window.open('docs/ArduSim_Guide.html', '_blank');
      window.GuideManager?.open('home');
    });
    const remoteBtn = get('btn-remote');
    remoteBtn?.addEventListener('click', () => this._showRemoteModal());
    const helpComponentsBtn = get('btn-help-components');
    helpComponentsBtn?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      window.GuideManager?.open('components');
    });
    const helpTutorialsBtn = get('btn-help-tutorials');
    helpTutorialsBtn?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      window.GuideManager?.open('tutorials');
    });
    const helpShortcutsBtn = get('btn-help-shortcuts');
    helpShortcutsBtn?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      this._showModal('modal-shortcuts');
    });
    const helpProjectGuide = get('btn-help-project-guide');
    helpProjectGuide?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      window.open('docs/ArduSim_Guide.html', '_blank');
    });
    const guideLaunch = get('guide-launch');
    guideLaunch?.addEventListener('click', () => window.GuideManager?.close());
    const guideClose = get('guide-close');
    guideClose?.addEventListener('click', () => window.GuideManager?.close());
    toggleEditorBtn?.addEventListener('click', () => this._togglePanel('panel-editor', toggleEditorBtn, 'Collapse Editor', 'Expand Editor'));
    toggleComponentsBtn?.addEventListener('click', () => this._togglePanel('panel-components', toggleComponentsBtn, 'Collapse Panel', 'Expand Panel'));
    showEditorBtn?.addEventListener('click', () => this._togglePanel('panel-editor', toggleEditorBtn, 'Collapse Editor', 'Expand Editor'));
    showComponentsBtn?.addEventListener('click', () => this._togglePanel('panel-components', toggleComponentsBtn, 'Collapse Panel', 'Expand Panel'));
    toggleBottomBtn?.addEventListener('click', () => this._toggleBottomPanel(toggleBottomBtn));
    const viewCodeBtn = get('btn-view-code');
    const viewCircuitBtn = get('btn-view-circuit');
    const viewSerialBtn = get('btn-view-serial');
    viewCodeBtn?.addEventListener('click', () => this._setView('code'));
    viewCircuitBtn?.addEventListener('click', () => this._setView('circuit'));
    viewSerialBtn?.addEventListener('click', () => this._setView('serial'));
    zoomInBtn?.addEventListener('click', () => this.canvas?.zoomIn());
    zoomOutBtn?.addEventListener('click', () => this.canvas?.zoomOut());
    fitViewBtn?.addEventListener('click', () => this.canvas?.fitView());
    undoBtn?.addEventListener('click', () => this.canvas?.undo());
    redoBtn?.addEventListener('click', () => this.canvas?.redo());
    oscClearBtn?.addEventListener('click', () => this.osc?.clear());
    oscPauseBtn?.addEventListener('click', () => this._toggleOscPause(oscPauseBtn));
    themeBtn?.addEventListener('click', () => this._toggleTheme(themeIconDark, themeIconLight));
    searchBox?.addEventListener('input', (e) => this._filterComponents(e.target.value));
    speedSel?.addEventListener('change', (e) => this.sim.setSpeed(e.target.value));
    const boardSel = get('board-select');
    boardSel?.addEventListener('change', (e) => this._setBoard(e.target.value));
    oscCh1?.addEventListener('change', (e) => this.osc?.setChannel(1, e.target.value));
    oscCh2?.addEventListener('change', (e) => this.osc?.setChannel(2, e.target.value));
    oscTimebase?.addEventListener('change', (e) => this.osc?.setTimebase(e.target.value));
    propsApply?.addEventListener('click', () => this._applyPropsModal());

    // Logic Analyzer controls
    document.getElementById('btn-la-clear')?.addEventListener('click', () => {
      this.la?.clear();
      const statusEl = document.getElementById('la-status');
      if (statusEl) statusEl.textContent = 'Cleared';
      setTimeout(() => { if (statusEl) statusEl.textContent = 'Running'; }, 1000);
    });
    document.getElementById('btn-la-pause')?.addEventListener('click', () => {
      const btn = document.getElementById('btn-la-pause');
      const statusEl = document.getElementById('la-status');
      const paused = this.la?.togglePause();
      if (btn) btn.textContent = paused ? 'Resume' : 'Pause';
      if (statusEl) statusEl.textContent = paused ? 'Paused' : 'Running';
    });
    document.getElementById('la-timebase')?.addEventListener('change', (e) => this.la?.setTimebase(e.target.value));
    document.querySelectorAll('.la-ch-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.ch);
        this.la?.setChannel(idx, e.target.value);
      });
    });

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.modal === 'modal-remote-overlay') {
        document.getElementById('modal-remote-overlay')?.classList.add('hidden');
        document.getElementById('modal-remote')?.classList.remove('active');
      } else {
        this._closeModal();
      }
    }));
    // Close remote modal on overlay click
    document.getElementById('modal-remote-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-remote-overlay') {
        e.target.classList.add('hidden');
        document.getElementById('modal-remote')?.classList.remove('active');
      }
    });
    document.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._closeModal()));
    modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) this._closeModal(); });

    // Header dropdown menus
    document.querySelectorAll('.hdr-dropdown').forEach(dd => {
      const trigger = dd.querySelector('.hdr-dropdown-trigger');
      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = dd.classList.contains('open');
        this._closeHeaderDropdowns();
        if (!wasOpen) {
          const menu = dd.querySelector('.hdr-dropdown-menu');
          const rect = trigger.getBoundingClientRect();
          if (menu) {
            menu.style.top = `${rect.bottom + 6}px`;
            if (dd.classList.contains('hdr-dropdown-right')) {
              menu.style.left = 'auto';
              menu.style.right = `${Math.max(6, window.innerWidth - rect.right)}px`;
            } else {
              menu.style.right = 'auto';
              menu.style.left = `${Math.max(6, rect.left)}px`;
            }
          }
          dd.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      dd.querySelectorAll('.hdr-dropdown-item').forEach(item => {
        item.addEventListener('click', () => this._closeHeaderDropdowns());
      });
    });
    document.addEventListener('click', () => this._closeHeaderDropdowns());

    // Bottom tabs
    bottomTabButtons.forEach(btn => btn.addEventListener('click', (e) => this._switchBottomTab(e.currentTarget)));

    // Saved projects list (event delegation)
    const savedList = get('saved-projects-list');
    savedList?.addEventListener('click', (e) => {
      const btn = e.target.closest('button.saved-load, button.saved-download, button.saved-delete');
      if (!btn || !btn.dataset.id) return;
      if (btn.classList.contains('saved-load')) this._loadSavedProject(btn.dataset.id);
      else if (btn.classList.contains('saved-download')) this._downloadSavedProject(btn.dataset.id);
      else if (btn.classList.contains('saved-delete')) this._deleteSavedProject(btn.dataset.id);
    });

    // Examples library search + filters
    const examplesSearch = get('examples-search');
    examplesSearch?.addEventListener('input', (e) => {
      this._examplesQuery = e.target.value.toLowerCase().trim();
      this._renderExamples();
    });
    const examplesFilters = get('examples-filters');
    examplesFilters?.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this._examplesFilter = chip.dataset.filter || 'all';
      examplesFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      this._renderExamples();
    });

    // Saved projects search
    const savedSearch = get('saved-search');
    savedSearch?.addEventListener('input', (e) => {
      this._savedQuery = e.target.value.toLowerCase().trim();
      this._renderSavedProjects();
    });

    // Editable project name
    if (projectNameEl) {
      projectNameEl.addEventListener('input', (e) => {
        this._projectName = (e.target.value || 'Untitled Project').trim() || 'Untitled Project';
        document.title = `${this._projectName} — ArduSim`;
        window.StorageManager?.markDirty();
      });
      projectNameEl.addEventListener('blur', () => {
        this._triggerAutoSave();
      });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in an input or code editor
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA'
        || document.activeElement?.isContentEditable
        || document.activeElement?.closest?.('.monaco-editor')
        || document.activeElement?.closest?.('#editor-container');

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.downloadProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveProject();
        return;
      }
      if (e.key === 'Escape') {
        if (window.GuideManager?.isOpen?.()) {
          window.GuideManager.close();
          return;
        }
        this._closeModal();
        this._closeContextMenu();
        this._closeHeaderDropdowns();
        return;
      }
      if (inInput) return; // don't intercept remaining shortcuts while typing

      if (e.key === 'F5') { e.preventDefault(); this.run(); return; }
      if (e.key === 'F6') { e.preventDefault(); this.stop(); return; }
      if (e.key === 'F7') { e.preventDefault(); this.pauseResume(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!e.shiftKey) this.canvas?.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        this.canvas?.redo();
        return;
      }
    });

    // Context menu
    document.addEventListener('click', (e) => {
      const ctxMenu = document.getElementById('canvas-context-menu');
      if (ctxMenu && !ctxMenu.contains(e.target)) {
        this._closeContextMenu();
      }
    });
  }

  /* ══════════════════════ CANVAS INIT ══════════════════════ */
  _initCanvas() {
    const canvasEl = document.getElementById('circuit-canvas');
    const wrapperEl = document.getElementById('canvas-wrapper');
    if (canvasEl && wrapperEl && window.CircuitCanvasClass) {
      this.canvas = new window.CircuitCanvasClass(canvasEl, wrapperEl);
      window.CircuitCanvas = this.canvas;
      this.canvas.onCompChanged = () => {
        this._refreshCanvasSummary();
        this._triggerAutoSave();
        window.StorageManager?.markDirty();
        // Refresh instrument probe dropdown options
        if (this.osc) {
          this.osc.refreshProbeOptions(document.getElementById('osc-ch1'), document.getElementById('osc-ch2'));
        }
        if (this.la) this.la.refreshProbeOptions();
      };
      this.canvas.onPlacingChanged = (placing, type) => {
        document.querySelectorAll('.comp-item').forEach(item => {
          item.classList.toggle('placing', placing && item.dataset.type === type);
        });
      };
      // Initial sync — if already in placing mode from a previous session
      this.canvas.onPlacingChanged(this.canvas.placingType != null);
      this.canvas.onContextMenu = (inst, x, y) => this._showContextMenu(inst, x, y);
      this._refreshCanvasSummary();
    }
  }

  /* ══════════════════════ BOARD SELECTOR ══════════════════════ */
  _initBoardSelector() {
    const settings = window.StorageManager?.loadSettings?.() || {};
    const board = ['arduino_uno', 'esp32_devkit_v1', 'arduino_nano'].includes(settings.board) ? settings.board : 'arduino_uno';
    this.sim.setBoard(board);
    const sel = document.getElementById('board-select');
    if (sel) sel.value = board;
  }

  // Returns the board type driving the simulation: the board actually placed
  // on the canvas wins; otherwise fall back to the selected board.
  _getActiveBoardType() {
    const boardInst = this.canvas?.getBoardInst?.();
    if (boardInst) return boardInst.type;
    return this.sim.board || 'arduino_uno';
  }

  // Sync sim.board (and the board selector UI) with the board actually placed
  // on the canvas, so LED_BUILTIN / A0–A5 map to the right pins.
  _syncBoardFromCanvas() {
    const active = this._getActiveBoardType();
    if (this.sim.board !== active) {
      this.sim.setBoard(active);
      window.StorageManager?.saveSettings?.({ ...(window.StorageManager.loadSettings() || {}), board: active });
      this._pinMonitorBoard = null;
    }
    const sel = document.getElementById('board-select');
    if (sel && sel.value !== active) sel.value = active;
  }

  _setBoard(board) {
    const b = ['arduino_uno', 'esp32_devkit_v1', 'arduino_nano'].includes(board) ? board : 'arduino_uno';
    const boardName = b === 'esp32_devkit_v1' ? 'ESP32 DevKit V1' : b === 'arduino_nano' ? 'Arduino Nano' : 'Arduino Uno';
    this.sim.setBoard(b);
    window.StorageManager?.saveSettings?.({ ...(window.StorageManager.loadSettings() || {}), board: b });

    // Rebuild the pin monitor for the new pin set
    this._pinMonitorBoard = null;

    // If the canvas only holds the default starter circuit, reload it for the new board
    const comps = this.canvas?.components || [];
    const hasOnlyStarterBoard = comps.length === 1 && (comps[0].type === 'arduino_uno' || comps[0].type === 'esp32_devkit_v1' || comps[0].type === 'arduino_nano');
    if (hasOnlyStarterBoard || comps.length === 0) {
      this._loadExampleCircuit('blink');
      this.showToast(`${boardName} starter circuit loaded`, 'success');
    } else {
      this.showToast(`Board set to ${boardName} — existing wiring assumes the previous board`, 'info');
    }
  }

  /* ══════════════════════ SERIAL INIT ══════════════════════ */
  _initSerial() {
    if (window.SerialMonitorClass) {
      this.serial = new window.SerialMonitorClass();
      window.SerialMonitor = this.serial;
      this.serial.log('ArduSim ready. Add components, wire them up, and press Run.', 'system');
    }
  }

  /* ══════════════════════ OUTPUT / DEBUG INIT ══════════════════════ */
  _initOutput() {
    if (window.OutputPanelClass) {
      this.output = new window.OutputPanelClass();
      window.OutputPanel = this.output;
      this.output.log('ArduSim ready. Code errors and debug messages will appear here.', 'system');
    }
  }

  /* ══════════════════════ DUAL-BOARD SUPPORT ══════════════════════ */
  _initSim2() {
    if (window.ArduinoSimulator) {
      this.sim2 = new window.ArduinoSimulator();
      this.sim2.boardIndex = 1;
      this.sim2.board = 'esp32_devkit_v1';
    }
  }

  _attachSim2Events() {
    if (!this.sim2) return;

    this.sim2.onSerial = (text, type) => {
      const suppressed = type === 'data' && this.serial?.isBaudMismatched();
      this._serialBuf2 += text;
      const lines = this._serialBuf2.split('\n');
      this._serialBuf2 = lines.pop();
      for (const line of lines) {
        const tagged = '[Board2] ' + line + '\n';
        this.serial?.receive(tagged, type);
        if (!suppressed) this.plotter?.addSerial(tagged);
        if (this.remote && type === 'data') this.remote.publishSerial(tagged);
      }
    };

    this.sim2.onStart = () => {
      this.output?.log('[Board2] Compile OK — running', 'success');
    };

    this.sim2.onPinChange = (pinKey, value) => {
      if (this.canvas) this.canvas.updateSimState(this.sim2.pinStates);
      this._updatePinMonitor();
    };

    this.sim2.onTick = () => {};

    this.sim2.onError = (err) => {
      this.showToast('[Board2] ' + err, 'error');
      this.output?.log('[Board2] Error: ' + err, 'error');
    };

    this.sim2.onStop = () => {
      this.output?.log('[Board2] Stopped', 'system');
    };

    this.sim2.onEvent = (type, data) => {
      if (!this.canvas) return;
      const insts = this.canvas.components || [];
      // Route display events for Board 2's components (OLED, TFT, etc.)
      for (const inst of insts) {
        if (inst.type === 'ssd1306_128x64_i2c' && type === 'oled_power') {
          this.canvas.emitEvent?.('oled_draw', { ...data, __board2: true });
        }
      }
    };
  }

  _bindBoard2TabUI() {
    const board1Btn = document.getElementById('board-tab-1');
    const board2Btn = document.getElementById('board-tab-2');
    const board2Area = document.getElementById('board2-editor-area');

    if (board1Btn) {
      board1Btn.addEventListener('click', () => this._switchToBoard(0));
    }
    if (board2Btn) {
      board2Btn.addEventListener('click', () => this._switchToBoard(1));
    }
  }

  _switchToBoard(idx) {
    const board1Btn = document.getElementById('board-tab-1');
    const board2Btn = document.getElementById('board-tab-2');
    const board2Area = document.getElementById('board2-editor-area');

    if (this._activeBoard === idx) return;

    // Save current editor content to the current board slot
    if (this._activeBoard === 0) {
      this._board1CodeCache = this.editor?.getCode?.() || '';
    } else if (this._activeBoard === 1) {
      const textarea = document.getElementById('board2-code-textarea');
      if (textarea) this._board2Code = textarea.value;
    }

    this._activeBoard = idx;

    // Update tab UI
    if (board1Btn) board1Btn.classList.toggle('active', idx === 0);
    if (board2Btn) board2Btn.classList.toggle('active', idx === 1);

    if (idx === 0) {
      // Switch to Board 1: restore editor content
      if (board2Area) board2Area.style.display = 'none';
      const editorEl = document.getElementById('editor-container');
      if (editorEl) editorEl.style.display = '';
      if (this.editor?.setCode && this._board1CodeCache) {
        this.editor.setCode(this._board1CodeCache);
      }
    } else {
      // Switch to Board 2: show textarea
      if (board2Area) board2Area.style.display = 'flex';
      const editorEl = document.getElementById('editor-container');
      if (editorEl) editorEl.style.display = 'none';
      const textarea = document.getElementById('board2-code-textarea');
      if (textarea && !textarea.value.trim()) {
        textarea.value = this._board2Code || this._getDefaultBoard2Code();
      }
    }
  }

  _getBoard2Code() {
    const textarea = document.getElementById('board2-code-textarea');
    const fromTextarea = textarea ? textarea.value : '';
    if (fromTextarea && fromTextarea.trim().length > 0) return fromTextarea;
    return this._board2Code || '';
  }

  _getDefaultBoard2Code() {
    return `/*
 * ArduSim — Board 2 (Receiver)
 * This board runs on the secondary ESP32.
 * Both boards run simultaneously when you click "Run".
 */

#include <esp_now.h>
#include <WiFi.h>

typedef struct {
  int value;
} DataPacket;

DataPacket incomingData;

void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
  memcpy(&incomingData, data, sizeof(incomingData));
  Serial.print("Received: ");
  Serial.println(incomingData.value);
}

void setup() {
  Serial.begin(9600);
  WiFi.mode(WIFI_STA);
  esp_now_init();
  esp_now_register_recv_cb(OnDataRecv);
  Serial.println("Board 2 ready - waiting for data...");
}

void loop() {
  delay(100);
}`;
  }

  /* ══════════════════════ SIMULATOR EVENTS ══════════════════════ */
  _attachSimulatorEvents() {
    // Buffer serial output per-simulator so [Board] tag appears once per line
    this._serialBuf1 = '';
    this._serialBuf2 = '';

    this.sim.onSerial = (text, type) => {
      const suppressed = type === 'data' && this.serial?.isBaudMismatched();
      const needsTag = this.sim2 && this.sim2.isRunning;
      if (needsTag) {
        this._serialBuf1 += text;
        // Emit complete lines with tag
        const lines = this._serialBuf1.split('\n');
        this._serialBuf1 = lines.pop(); // keep incomplete last line in buffer
        for (const line of lines) {
          const tagged = '[Board1] ' + line + '\n';
          this.serial?.receive(tagged, type);
          if (!suppressed) this.plotter?.addSerial(tagged);
          if (this.remote && type === 'data') this.remote.publishSerial(tagged);
        }
      } else {
        this.serial?.receive(text, type);
        if (!suppressed) this.plotter?.addSerial(text);
        if (this.remote && type === 'data') this.remote.publishSerial(text);
      }
    };

    this.sim.onStart = () => {
      if (this._pendingRunEpoch !== this._runEpoch) return; // stop requested while starting
      this._setRunningState(true);
      this._updateCompileStatus(this.sim2 && this.sim2.isRunning ? 'Running (2 boards)' : 'Running');
      this._updateStatus('Simulation running');
      this.output?.log('Compile OK — running simulation', 'success');
      // Start remote control bridge
      if (this.remote && this.sim.sessionId) {
        this.remote.start(this.sim.sessionId);
      }
    };

    this.sim.onPinChange = (pinKey, value) => {
      if (this.canvas) this.canvas.updateSimState(this.sim.pinStates);
      if (this.osc)    this.osc.sample(this.sim.simTime, this.sim.pinStates);
      if (this.la)     this.la.sample(this.sim.simTime, this.sim.pinStates);
      this._updatePinMonitor();
      // Broadcast pin change to remote clients
      if (this.remote) this.remote.publishPinChange(pinKey, value);
    };

    this.sim.onTick = (simTime, fps) => {
      // Continuously sample oscilloscope and logic analyzer (probes read from components, not just pins)
      if (this.osc && !this.osc.paused) {
        this.osc.sample(simTime, this.sim.pinStates);
      }
      if (this.la && !this.la.paused) {
        this.la.sample(simTime, this.sim.pinStates);
      }
      // Keep the Pin Monitor live even when an input component changes without
      // causing an Arduino output pin event.
      this._updatePinMonitor();
      const simTimeEl = document.getElementById('sim-time');
      const fpsEl     = document.getElementById('sim-fps');
      if (simTimeEl) simTimeEl.textContent = `⏱ ${(simTime / 1000).toFixed(2)}s`;
      if (fpsEl)     fpsEl.textContent     = `${fps} FPS`;
      const laStatus = document.getElementById('la-status');
      if (laStatus && this.la && !this.la.paused) {
        const samples = this.la.channels.reduce((n, ch) => n + (this.la.data[ch.pin]?.length || 0), 0);
        laStatus.textContent = `Running · ${samples} samples`;
      }
    };

    this.sim.onError = (err) => {
      this._updateCompileStatus(`Error: ${err}`);
      this.showToast(err, 'error');
      this.output?.log(`Error: ${err}`, 'error');
      this._setRunningState(false);
      // Try to extract line number from error and show squiggle
      const lineMatch = err.match(/line[:\s]+(\d+)/i);
      if (this.editor && lineMatch) {
        this.editor.showError(parseInt(lineMatch[1]), err);
      }
    };

    this.sim.onStop = () => {
      this._setRunningState(false);
      this._updateStatus('Stopped');
      const simDot = document.getElementById('sim-dot');
      if (simDot) simDot.classList.remove('running');
      // Stop remote control bridge
      if (this.remote) this.remote.stop();
    };

    this.sim.onEvent = (type, data) => {
      if (!this.canvas) return;
      const insts = this.canvas.components || [];

      // LCD display events (16×2 parallel and I2C/PCF8574 versions)
      for (const inst of insts) {
        if (inst.type !== 'lcd1602' && inst.type !== 'lcd1602_i2c') continue;

        // I2C LCD: skip if SDA or SCL not wired to a board
        if (inst.type === 'lcd1602_i2c') {
          const sdaPin = this.canvas._getConnectedPinNum(inst.id, 'sda');
          const sclPin = this.canvas._getConnectedPinNum(inst.id, 'scl');
          if (sdaPin === null || sclPin === null) continue;

          // Route by I2C address — only handle events for this LCD's address
          if (data && data.addr != null) {
            const raw = String(inst.props && inst.props.address || '0x27').trim();
            const instAddr = raw.startsWith('0x') || raw.startsWith('0X')
              ? parseInt(raw, 16) || 0x27
              : Number(raw) || 0x27;
            const evtAddr = Number(data.addr) || 0;
            if (instAddr !== evtAddr) continue;
          }
        }

        if (type === 'lcd_power') {
          if (!inst.runtimeState) inst.runtimeState = {};
          inst.runtimeState.powered = data && data.on !== undefined ? Boolean(data.on) : true;
        } else if (type === 'lcd_clear') {
          if (!inst.runtimeState) inst.runtimeState = {};
          inst.runtimeState.line1 = '';
          inst.runtimeState.line2 = '';
        } else if (type === 'lcd_print') {
          if (!inst.runtimeState) inst.runtimeState = {};
          const cursor = (data && data.cursor) || { col: 0, row: 0 };
          const lineKey = cursor.row === 1 ? 'line2' : 'line1';
          const text = String(data && data.text !== undefined ? data.text : '');
          const line = String(inst.runtimeState[lineKey] || '').padEnd(16, ' ').slice(0, 16).split('');
          const col = Math.max(0, Math.min(15, cursor.col || 0));
          for (let i = 0; i < text.length && col + i < 16; i++) {
            line[col + i] = text[i];
          }
          inst.runtimeState[lineKey] = line.join('');
        } else if (type === 'lcd_backlight') {
          if (!inst.runtimeState) inst.runtimeState = {};
          inst.runtimeState.backlight = data && data.backlight;
        }
      }

      // OLED (SSD1306 I2C) display events — maintains a 128×64 framebuffer
      for (const inst of insts) {
        if (inst.type !== 'oled_ssd1306') continue;

        // SDA/SCL wiring check — skip if not wired to a board
        if (this.canvas._getConnectedPinNum) {
          const sdaPin = this.canvas._getConnectedPinNum(inst.id, 'sda');
          const sclPin = this.canvas._getConnectedPinNum(inst.id, 'scl');
          if (sdaPin === null || sclPin === null) continue;
        }

        // Address-based routing — skip if event addr doesn't match this OLED
        if (data && data.addr != null) {
          const raw = String(inst.props && inst.props.address || '0x3C').trim();
          const instAddr = raw.startsWith('0x') || raw.startsWith('0X')
            ? parseInt(raw, 16) || 0x3C
            : Number(raw) || 0x3C;
          const evtAddr = Number(data.addr) || 0;
          if (instAddr !== evtAddr) continue;
        }

        if (!inst.runtimeState) inst.runtimeState = {};
        const o = inst.runtimeState.oled || (inst.runtimeState.oled = {
          power: false,
          invert: false,
          pixels: new Uint8Array(128 * 64),
          texts: [],
        });
        const setPx = (px, py, v) => {
          if (px >= 0 && px < 128 && py >= 0 && py < 64) o.pixels[py * 128 + px] = v ? 1 : 0;
        };
        const drawLinePx = (x0, y0, x1, y1) => {
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
          for (;;) {
            setPx(x0, y0, 1);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        };

        if (type === 'oled_power') {
          o.power = true;
        } else if (type === 'oled_draw' && data) {
          const op = data.op;
          if (op === 'clear') {
            o.pixels.fill(0);
            o.texts = [];
          } else if (op === 'invert') {
            o.invert = !!data.invert;
          } else if (op === 'print') {
            o.texts.push({
              x: data.cursor ? data.cursor.col : 0,
              y: data.cursor ? data.cursor.row : 0,
              text: String(data.text !== undefined ? data.text : ''),
              size: data.size || 1,
              color: data.color === 0 ? 0 : 1,
            });
          } else if (op === 'pixel') {
            setPx(data.x, data.y, data.color !== undefined ? data.color : 1);
          } else if (op === 'line') {
            drawLinePx(data.x0, data.y0, data.x1, data.y1);
          } else if (op === 'rect') {
            const x = data.x, y = data.y, w = data.w, h = data.h;
            drawLinePx(x, y, x + w, y);
            drawLinePx(x, y + h, x + w, y + h);
            drawLinePx(x, y, x, y + h);
            drawLinePx(x + w, y, x + w, y + h);
          } else if (op === 'fillRect') {
            for (let py = data.y; py < data.y + data.h; py++) {
              for (let px = data.x; px < data.x + data.w; px++) setPx(px, py, 1);
            }
          } else if (op === 'circle') {
            const cx = data.x, cy = data.y, r = data.r;
            let xx = r, yy = 0, err = 1 - r;
            while (xx >= yy) {
              setPx(cx + xx, cy + yy, 1); setPx(cx - xx, cy + yy, 1);
              setPx(cx + xx, cy - yy, 1); setPx(cx - xx, cy - yy, 1);
              setPx(cx + yy, cy + xx, 1); setPx(cx - yy, cy + xx, 1);
              setPx(cx + yy, cy - xx, 1); setPx(cx - yy, cy - xx, 1);
              yy++;
              if (err < 0) err += 2 * yy + 1;
              else { xx--; err += 2 * (yy - xx) + 1; }
            }
          } else if (op === 'fillCircle') {
            const cx = data.x, cy = data.y, r = data.r;
            for (let yy = -r; yy <= r; yy++) {
              for (let xx = -r; xx <= r; xx++) {
                if (xx * xx + yy * yy <= r * r) setPx(cx + xx, cy + yy, 1);
              }
            }
          } else if (op === 'fillScreen') {
            o.pixels.fill(data.color ? 1 : 0);
          } else if (op === 'triangle') {
            drawLinePx(data.x0, data.y0, data.x1, data.y1);
            drawLinePx(data.x1, data.y1, data.x2, data.y2);
            drawLinePx(data.x2, data.y2, data.x0, data.y0);
          } else if (op === 'fillTriangle') {
            const pts = [[data.x0, data.y0], [data.x1, data.y1], [data.x2, data.y2]];
            pts.sort((a, b) => a[1] - b[1]);
            const [x0, y0] = pts[0], [x1, y1] = pts[1], [x2, y2] = pts[2];
            const fillHalf = (ya, yb, xa, xb, xc) => {
              if (ya === yb) return;
              for (let yy = ya; yy < yb; yy++) {
                const t = (yy - ya) / (yb - ya);
                const m02 = xa + (xc - xa) * ((yy - y0) / (y2 - y0 || 1));
                const m01 = xa + (xb - xa) * t;
                const minX = Math.floor(Math.min(m02, m01));
                const maxX = Math.ceil(Math.max(m02, m01));
                for (let xx = minX; xx <= maxX; xx++) setPx(xx, yy, 1);
              }
            };
            fillHalf(y0, y1, x0, x1, x2);
            fillHalf(y1, y2, x1, x2, x0);
          } else if (op === 'dim') {
            // Dim is a brightness hint — ignore for now
          } else if (op === 'contrast') {
            // Contrast — ignore for simulation
          }
        }
      }

      // TFT (ILI9341 240×320 SPI) display events — maintains a 320×240 RGB framebuffer
      for (const inst of insts) {
        if (inst.type !== 'ili9341') continue;
        const FB_W = 320, FB_H = 240;
        const tft = inst.runtimeState.tft || (inst.runtimeState.tft = {
          power: false,
          pixels: new Uint8Array(FB_W * FB_H * 3),
          cursor: { x: 0, y: 0 },
          textSize: 1,
          fgColor: 0xFFFF,
          bgColor: 0x0000,
        });

        const rgb565toRGB = (c) => {
          c = Number(c) || 0;
          const r = ((c >> 11) & 0x1F) << 3;
          const g = ((c >> 5) & 0x3F) << 2;
          const b = (c & 0x1F) << 3;
          return [r, g, b];
        };
        const setPx = (px, py, r, g, b) => {
          if (px >= 0 && px < FB_W && py >= 0 && py < FB_H) {
            const i = (py * FB_W + px) * 3;
            tft.pixels[i] = r; tft.pixels[i + 1] = g; tft.pixels[i + 2] = b;
          }
        };
        const setPx565 = (px, py, c) => {
          const [r, g, b] = rgb565toRGB(c);
          setPx(px, py, r, g, b);
        };
        const drawLinePx = (x0, y0, x1, y1, c) => {
          const [cr, cg, cb] = rgb565toRGB(c);
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
          for (;;) {
            setPx(x0, y0, cr, cg, cb);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        };
        const drawCharPx = (cx, cy, ch, fg, bg, sz) => {
          const [fr, fg2, fb] = rgb565toRGB(fg);
          const [br, bg2, bb] = rgb565toRGB(bg);
          const font5x7 = [
            0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x5F,0x00,0x00,
            0x00,0x07,0x00,0x07,0x00,0x14,0x7F,0x14,0x7F,0x14,
            0x24,0x2A,0x7F,0x2A,0x12,0x23,0x13,0x08,0x64,0x62,
            0x36,0x49,0x56,0x20,0x50,0x00,0x08,0x07,0x03,0x00,
            0x00,0x1C,0x22,0x41,0x00,0x00,0x41,0x22,0x1C,0x00,
            0x2A,0x1C,0x7F,0x1C,0x2A,0x08,0x08,0x3E,0x08,0x08,
            0x00,0x80,0x70,0x30,0x00,0x08,0x08,0x08,0x08,0x08,
            0x00,0x00,0x60,0x60,0x00,0x20,0x10,0x08,0x04,0x02,
            0x3E,0x51,0x49,0x45,0x3E,0x00,0x42,0x7F,0x40,0x00,
            0x72,0x49,0x49,0x49,0x46,0x21,0x41,0x49,0x4D,0x33,
            0x18,0x14,0x12,0x7F,0x10,0x27,0x45,0x45,0x45,0x39,
            0x3C,0x4A,0x49,0x49,0x31,0x41,0x21,0x11,0x09,0x07,
            0x36,0x49,0x49,0x49,0x36,0x46,0x49,0x49,0x29,0x1E,
            0x00,0x00,0x14,0x00,0x00,0x00,0x40,0x34,0x00,0x00,
            0x00,0x08,0x14,0x22,0x41,0x14,0x14,0x14,0x14,0x14,
            0x00,0x41,0x22,0x14,0x08,0x02,0x01,0x59,0x09,0x06,
            0x3E,0x41,0x5D,0x59,0x4E,0x7C,0x12,0x11,0x12,0x7C,
            0x7F,0x49,0x49,0x49,0x36,0x3E,0x41,0x41,0x41,0x22,
            0x7F,0x41,0x41,0x41,0x3E,0x7F,0x49,0x49,0x49,0x41,
            0x7F,0x09,0x09,0x09,0x01,0x3E,0x41,0x41,0x51,0x73,
            0x7F,0x08,0x08,0x08,0x7F,0x00,0x41,0x7F,0x41,0x00,
            0x20,0x40,0x41,0x3F,0x01,0x7F,0x08,0x14,0x22,0x41,
            0x7F,0x40,0x40,0x40,0x40,0x7F,0x02,0x1C,0x02,0x7F,
            0x7F,0x04,0x08,0x10,0x7F,0x3E,0x41,0x41,0x41,0x3E,
            0x7F,0x09,0x09,0x09,0x06,0x3E,0x41,0x51,0x21,0x5E,
            0x7F,0x09,0x19,0x29,0x46,0x26,0x49,0x49,0x49,0x32,
            0x03,0x01,0x7F,0x01,0x03,0x3F,0x40,0x40,0x40,0x3F,
            0x1F,0x20,0x40,0x20,0x1F,0x3F,0x40,0x38,0x40,0x3F,
            0x63,0x14,0x08,0x14,0x63,0x03,0x04,0x78,0x04,0x03,
            0x61,0x59,0x49,0x4D,0x43,0x00,0x7F,0x41,0x41,0x41,
            0x02,0x04,0x08,0x10,0x20,0x00,0x41,0x41,0x41,0x7F,
            0x04,0x02,0x01,0x02,0x04,0x40,0x40,0x40,0x40,0x40,
            0x00,0x03,0x07,0x08,0x00,0x20,0x54,0x54,0x78,0x40,
            0x7F,0x28,0x44,0x44,0x38,0x38,0x44,0x44,0x44,0x28,
            0x38,0x44,0x44,0x28,0x7F,0x38,0x54,0x54,0x54,0x18,
            0x00,0x08,0x7E,0x09,0x02,0x18,0xA4,0xA4,0x9C,0x78,
            0x7F,0x08,0x04,0x04,0x78,0x00,0x44,0x7D,0x40,0x00,
            0x20,0x40,0x40,0x3D,0x00,0x7F,0x10,0x28,0x44,0x00,
            0x00,0x41,0x7F,0x40,0x00,0x7C,0x04,0x78,0x04,0x78,
            0x7C,0x08,0x04,0x04,0x78,0x38,0x44,0x44,0x44,0x38,
            0xFC,0x18,0x24,0x24,0x18,0x18,0x24,0x24,0x18,0xFC,
            0x7C,0x08,0x04,0x04,0x08,0x48,0x54,0x54,0x54,0x24,
            0x04,0x04,0x3F,0x44,0x24,0x3C,0x40,0x40,0x20,0x7C,
            0x1C,0x20,0x40,0x20,0x1C,0x3C,0x40,0x30,0x40,0x3C,
            0x44,0x28,0x10,0x28,0x44,0x4C,0x90,0x90,0x90,0x7C,
            0x44,0x64,0x54,0x4C,0x44,0x00,0x08,0x36,0x41,0x00,
            0x00,0x00,0x77,0x00,0x00,0x00,0x41,0x36,0x08,0x00,
            0x02,0x01,0x02,0x04,0x02
          ];
          const code = ch.charCodeAt(0);
          if (code < 32 || code > 126) return;
          const idx = (code - 32) * 5;
          for (let col = 0; col < 5; col++) {
            const bits = font5x7[idx + col] || 0;
            for (let row = 0; row < 7; row++) {
              if (bits & (1 << row)) {
                for (let dy = 0; dy < sz; dy++) {
                  for (let dx = 0; dx < sz; dx++) {
                    setPx(cx + col * sz + dx, cy + row * sz + dy, fr, fg2, fb);
                  }
                }
              }
            }
          }
        };

        if (type === 'tft_power') {
          tft.power = true;
        } else if (type === 'tft_draw' && data) {
          const op = data.op;
          if (op === 'fillScreen') {
            const [r, g, b] = rgb565toRGB(data.color);
            for (let i = 0; i < tft.pixels.length; i += 3) {
              tft.pixels[i] = r; tft.pixels[i + 1] = g; tft.pixels[i + 2] = b;
            }
          } else if (op === 'pixel') {
            setPx565(data.x, data.y, data.color);
          } else if (op === 'line') {
            drawLinePx(data.x0, data.y0, data.x1, data.y1, data.color);
          } else if (op === 'rect') {
            const c = data.color;
            drawLinePx(data.x, data.y, data.x + data.w, data.y, c);
            drawLinePx(data.x, data.y + data.h, data.x + data.w, data.y + data.h, c);
            drawLinePx(data.x, data.y, data.x, data.y + data.h, c);
            drawLinePx(data.x + data.w, data.y, data.x + data.w, data.y + data.h, c);
          } else if (op === 'fillRect') {
            const [r, g, b] = rgb565toRGB(data.color);
            for (let py = data.y; py < data.y + data.h; py++) {
              for (let px = data.x; px < data.x + data.w; px++) setPx(px, py, r, g, b);
            }
          } else if (op === 'circle') {
            const cx = data.x, cy = data.y, rad = data.r, c = data.color;
            let xx = rad, yy = 0, err = 1 - rad;
            while (xx >= yy) {
              setPx565(cx + xx, cy + yy, c); setPx565(cx - xx, cy + yy, c);
              setPx565(cx + xx, cy - yy, c); setPx565(cx - xx, cy - yy, c);
              setPx565(cx + yy, cy + xx, c); setPx565(cx - yy, cy + xx, c);
              setPx565(cx + yy, cy - xx, c); setPx565(cx - yy, cy - xx, c);
              yy++;
              if (err < 0) err += 2 * yy + 1;
              else { xx--; err += 2 * (yy - xx) + 1; }
            }
          } else if (op === 'fillCircle') {
            const cx = data.x, cy = data.y, rad = data.r;
            const [r, g, b] = rgb565toRGB(data.color);
            for (let yy = -rad; yy <= rad; yy++) {
              for (let xx = -rad; xx <= rad; xx++) {
                if (xx * xx + yy * yy <= rad * rad) setPx(cx + xx, cy + yy, r, g, b);
              }
            }
          } else if (op === 'print') {
            const sz = data.size || 1;
            const fg = data.fg != null ? data.fg : 0xFFFF;
            const bg = data.bg != null ? data.bg : 0x0000;
            let cx = data.x || 0, cy = data.y || 0;
            for (let i = 0; i < data.text.length; i++) {
              drawCharPx(cx, cy, data.text[i], fg, bg, sz);
              cx += 6 * sz;
            }
          } else if (op === 'roundRect') {
            const c = data.color;
            const rx = data.r || 0;
            drawLinePx(data.x + rx, data.y, data.x + data.w - rx, data.y, c);
            drawLinePx(data.x + rx, data.y + data.h, data.x + data.w - rx, data.y + data.h, c);
            drawLinePx(data.x, data.y + rx, data.x, data.y + data.h - rx, c);
            drawLinePx(data.x + data.w, data.y + rx, data.x + data.w, data.y + data.h - rx, c);
          } else if (op === 'fillRoundRect') {
            const [r, g, b] = rgb565toRGB(data.color);
            const rr = Math.min(data.r || 0, data.w / 2, data.h / 2);
            for (let py = data.y; py < data.y + data.h; py++) {
              for (let px = data.x; px < data.x + data.w; px++) {
                let skip = false;
                if (rr > 0) {
                  const corners = [
                    [data.x + rr, data.y + rr],
                    [data.x + data.w - 1 - rr, data.y + rr],
                    [data.x + rr, data.y + data.h - 1 - rr],
                    [data.x + data.w - 1 - rr, data.y + data.h - 1 - rr]
                  ];
                  for (const [cx, cy] of corners) {
                    const dx = px - cx, dy = py - cy;
                    if (dx * dx + dy * dy > rr * rr) { skip = true; break; }
                  }
                }
                if (!skip) setPx(px, py, r, g, b);
              }
            }
          } else if (op === 'triangle') {
            const c = data.color;
            drawLinePx(data.x0, data.y0, data.x1, data.y1, c);
            drawLinePx(data.x1, data.y1, data.x2, data.y2, c);
            drawLinePx(data.x2, data.y2, data.x0, data.y0, c);
          } else if (op === 'fillTriangle') {
            const [fr, fg2, fb] = rgb565toRGB(data.color);
            const minX = Math.min(data.x0, data.x1, data.x2);
            const maxX = Math.max(data.x0, data.x1, data.x2);
            const minY = Math.min(data.y0, data.y1, data.y2);
            const maxY = Math.max(data.y0, data.y1, data.y2);
            for (let py = minY; py <= maxY; py++) {
              for (let px = minX; px <= maxX; px++) {
                const a = (data.x1 - data.x0) * (py - data.y0) - (data.y1 - data.y0) * (px - data.x0);
                const b2 = (data.x2 - data.x1) * (py - data.y1) - (data.y2 - data.y1) * (px - data.x1);
                const c2 = (data.x0 - data.x2) * (py - data.y2) - (data.y0 - data.y2) * (px - data.x2);
                if ((a >= 0 && b2 >= 0 && c2 >= 0) || (a <= 0 && b2 <= 0 && c2 <= 0)) {
                  setPx(px, py, fr, fg2, fb);
                }
              }
            }
          } else if (op === 'char') {
            drawCharPx(data.x, data.y, data.char, data.color, data.bg, data.size || 1);
          }
        }
      }

      // Servo events
      if (type === 'servo' && data && Number.isFinite(Number(data.angle))) {
        const angle = Math.max(0, Math.min(180, Number(data.angle)));
        for (const inst of insts) {
          if (inst.type === 'servo') {
            inst.runtimeState.angle = angle;
            inst.runtimeState._servoDriven = true;
            break;
          }
        }
      }

      // NeoPixel / FastLED strip events — map strip LEDs onto placed WS2812B
      // components in placement order (led[0] → first neopixel, etc.)
      if (type === 'fastled_show' && data && Array.isArray(data.leds)) {
        const npInsts = insts.filter(i => i.type === 'neopixel' || i.type === 'neopixel_strip' || i.type === 'neopixel_ring' || i.type === 'neopixel_8x8_matrix');
        const brightness = Math.max(0, Math.min(255, Number(data.brightness != null ? data.brightness : 255) || 0));
        let ledOffset = 0;
        npInsts.forEach((inst) => {
          const numPx = inst.type === 'neopixel' ? 1
            : inst.type === 'neopixel_strip' ? (inst.props.numPixels || 8)
            : inst.type === 'neopixel_8x8_matrix' ? 64
            : (inst.props.numPixels || 12);
          if (inst.type === 'neopixel') {
            const led = data.leds[ledOffset];
            inst.runtimeState.r = led ? (Number(led.r) || 0) & 255 : 0;
            inst.runtimeState.g = led ? (Number(led.g) || 0) & 255 : 0;
            inst.runtimeState.b = led ? (Number(led.b) || 0) & 255 : 0;
            inst.runtimeState.brightness = brightness;
            ledOffset += 1;
          } else {
            const pixels = [];
            for (let p = 0; p < numPx; p++) {
              const led = data.leds[ledOffset + p];
              pixels.push({
                r: led ? (Number(led.r) || 0) & 255 : 0,
                g: led ? (Number(led.g) || 0) & 255 : 0,
                b: led ? (Number(led.b) || 0) & 255 : 0,
              });
            }
            inst.runtimeState.pixels = pixels;
            inst.runtimeState.brightness = brightness;
            ledOffset += numPx;
          }
        });
      }
    };
  }

  /* ══════════════════════ RUN / STOP / PAUSE ══════════════════════ */
  async run() {
    if (!this.editor) return;
    const code = this.editor.getCode();
    this._syncBoardFromCanvas();
    this._updateCompileStatus('Compiling…');
    this._updateStatus('Compiling sketch');
    this.serial?.log('Compiling sketch…', 'system');
    this.output?.log('Compiling sketch…', 'system');
    if (this.editor) this.editor.clearErrors();

    this.sim.stop();
    if (this.sim2) this.sim2.stop();
    this._pendingRunEpoch = this._runEpoch;

    // Compile Board 1 first (compile only, don't block)
    this._setRunningState(true);
    this._updateCompileStatus('Compiling…');
    let result1;
    try {
      result1 = await this.sim.compile(code);
    } catch (err) {
      console.error('[ArduSim] Board 1 compile error:', err);
      this._updateCompileStatus('Board 1 compile failed');
      this.output?.log(`Board 1 failed: ${err && err.message ? err.message : err}`, 'error');
      this.showToast('Board 1 compilation failed', 'error');
      this._setRunningState(false);
      return;
    }
    if (this._pendingRunEpoch !== this._runEpoch) {
      this._updateCompileStatus('Stopped');
      return;
    }
    if (!result1 || !result1.ok) {
      this._setRunningState(false);
      this._updateCompileStatus('Board 1 compile failed');
      this.output?.log('Board 1 compile failed — see the error message below', 'error');
      return;
    }

    // Compile Board 2
    const board2Code = this._getBoard2Code();
    let hasBoard2 = false;
    const b2Len = board2Code ? board2Code.trim().length : 0;
    this.output?.log(`[Board2] Code length: ${b2Len} chars`, 'system');
    if (board2Code && b2Len > 20) {
      this._attachSim2Events();
      try {
        const result2 = await this.sim2.compile(board2Code);
        if (result2 && result2.ok) {
          hasBoard2 = true;
          this.output?.log('[Board2] Compile OK', 'success');
        } else {
          this.output?.log('[Board2] Compile failed — only Board 1 running', 'warn');
        }
      } catch (err) {
        console.error('[ArduSim] Board 2 compile error:', err);
        this.output?.log('[Board2] Compile error: ' + (err.message || err), 'error');
      }
    }

    // Both compiled — run them in parallel (don't await)
    this._updateCompileStatus(hasBoard2 ? 'Running (2 boards)' : 'Running');
    this._updateStatus('Simulation running');
    this.output?.log('Compile OK — running simulation' + (hasBoard2 ? ' (2 boards)' : ''), 'success');

    // Reset state for Board 1
    this.sim.simTime = 0;
    this.sim.pinStates = {};
    this.sim.pinModes = {};
    this.sim._iterSinceDelay = 0;
    this.sim._startExecution();
    if (hasBoard2) {
      this.sim2.simTime = 0;
      this.sim2.pinStates = {};
      this.sim2.pinModes = {};
      this.sim2._iterSinceDelay = 0;
      this.sim2._startExecution();
    }
  }

  stop() {
    const wasRunning = this.isRunning;
    this._runEpoch++;
    this.sim.stop();
    if (this.sim2) this.sim2.stop();
    // Flush serial buffers
    if (this._serialBuf1) {
      this.serial?.receive('[Board1] ' + this._serialBuf1, 'data');
      this._serialBuf1 = '';
    }
    if (this._serialBuf2) {
      this.serial?.receive('[Board2] ' + this._serialBuf2, 'data');
      this._serialBuf2 = '';
    }
    this._setRunningState(false);
    this._updateStatus('Stopped');
    if (wasRunning) this.output?.log('Simulation stopped', 'system');
    const fpsEl = document.getElementById('sim-fps');
    if (fpsEl) fpsEl.textContent = '0 FPS';
  }

  pauseResume() {
    if (!this.isRunning) return;
    const pauseBtn = document.getElementById('btn-pause');
    if (this.sim.isPaused) {
      this.sim.resume();
      if (this.sim2) this.sim2.resume();
      this._updateStatus('Simulation resumed');
      this.output?.log('Simulation resumed', 'success');
      if (pauseBtn) {
        pauseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5"/></svg> Pause`;
      }
    } else {
      this.sim.pause();
      if (this.sim2) this.sim2.pause();
      this._updateStatus('Simulation paused');
      this.output?.log('Simulation paused', 'warn');
      if (pauseBtn) {
        pauseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z"/></svg> Resume`;
      }
    }
  }

  clearCanvas() {
    if (!this.canvas) return;
    const hasComponents = this.canvas.components.length > 0 || this.canvas.wires.length > 0;
    if (!hasComponents) return;
    window.Utils?.ConfirmDialog.show('Clear the canvas? This will remove all components and wires.', 'Clear Canvas')
      .then(ok => {
        if (!ok) return;
        this.canvas.clearCanvas();
        this._refreshCanvasSummary();
        this.showToast('Circuit cleared', 'info');
        this._triggerAutoSave();
      });
  }

  exportImage() {
    this.canvas?.exportPNG();
  }

  formatCode() {
    this.editor?.formatCode();
  }

  /* ══════════════════════ PROJECT NAME ══════════════════════ */
  getProjectName() {
    return this._projectName || 'Untitled Project';
  }

  _setProjectName(name) {
    this._projectName = name || 'Untitled Project';
    document.title = `${this._projectName} — ArduSim`;
    const el = document.getElementById('project-name');
    if (el) el.value = this._projectName;
  }

  /* ══════════════════════ SAVE / DOWNLOAD / LOAD / SHARE ══════════════════════ */
  saveProject() {
    const code = this.editor?.getCode() || '';
    const board2Code = this._board2Code || document.getElementById('board2-code-textarea')?.value || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.saveToLibrary(code, circuitData, this._projectName, board2Code);
  }

  downloadProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.downloadProject(code, circuitData, this._projectName);
  }

  saveAsExample() {
    const name = window.prompt('Example name:', this.getProjectName());
    if (!name || !name.trim()) return;
    const description = window.prompt('Short description:', `A custom ${name.trim()} circuit example.`);
    if (description === null) return;
    const tags = window.prompt('Tags, separated by commas:', 'custom, circuit');
    if (tags === null) return;
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.downloadExample(code, circuitData, name.trim(), description.trim(), tags);
  }

  loadProject() {
    window.StorageManager?.loadFromFile((project) => {
      if (this.editor) this.editor.setCode(project.code || '');
      if (this.canvas) this.canvas.deserialize(project.circuit || { components: [], wires: [] });
      this._syncBoardFromCanvas();
      this._setProjectName(project.name || 'Untitled Project');
      this._refreshCanvasSummary();
    });
  }

  shareProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.shareUrl(code, circuitData);
  }

  /* ══════════════════════ SAVED PROJECTS ══════════════════════ */
  async _syncProjectsFromServer() {
    try {
      const result = await window.StorageManager?.syncFromServer?.();
      if (!result) return;
      const total = (result.merged || 0) + (result.pushed || 0);
      if (total > 0) {
        this.showToast(`Synced ${result.merged} project(s) from server`, 'info');
      }
    } catch (e) {
      // Backend offline — the app simply continues with local storage
    }
  }

  _openSavedProjects() {
    this._renderSavedProjects();
    this._showModal('modal-saved');
  }

  _renderSavedProjects() {
    const list = document.getElementById('saved-projects-list');
    if (!list) return;
    const projects = window.StorageManager?.getSavedProjects() || [];
    const esc = (s) => String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

    if (!projects.length) {
      list.innerHTML = `<div class="saved-empty">No saved projects yet.<br>Click <b>Save</b> in the toolbar to save the current project here.</div>`;
      return;
    }

    const q = (this._savedQuery || '').toLowerCase();
    const filtered = q
      ? projects.filter(p => (p.name || '').toLowerCase().includes(q))
      : projects;

    if (!filtered.length) {
      list.innerHTML = `<div class="saved-empty">No saved projects match “${esc(this._savedQuery)}”.</div>`;
      return;
    }

    list.innerHTML = filtered.map(p => {
      const date = new Date(p.savedAt).toLocaleString();
      const compCount = Array.isArray(p.circuit?.components) ? p.circuit.components.length : 0;
      const wireCount = Array.isArray(p.circuit?.wires) ? p.circuit.wires.length : 0;
      const name = esc(p.name || 'Untitled Project');
      return `
        <div class="saved-project-item">
          <div class="saved-project-thumb"><img alt="" loading="lazy"></div>
          <div class="saved-project-info">
            <strong class="saved-project-name">${name}</strong>
            <span class="saved-project-meta">${compCount} components · ${wireCount} wires · ${esc(date)}</span>
            <span class="saved-project-actions">
              <button class="hdr-btn hdr-btn-ghost saved-load" data-id="${esc(p.id)}">Open</button>
              <button class="hdr-btn hdr-btn-ghost saved-download" data-id="${esc(p.id)}" title="Download as JSON file">Download</button>
              <button class="hdr-btn hdr-btn-ghost saved-delete" data-id="${esc(p.id)}" title="Delete from Saved Projects">Delete</button>
            </span>
          </div>
        </div>`;
    }).join('');

    // Render thumbnails (after DOM insertion so images exist)
    list.querySelectorAll('.saved-project-item').forEach((el, i) => {
      const p = filtered[i];
      const img = el.querySelector('.saved-project-thumb img');
      if (img) window.CircuitThumbnail?.applyTo(img, p.circuit, 200, 120);
    });
  }

  _loadSavedProject(id) {
    const p = (window.StorageManager?.getSavedProjects() || []).find(x => x.id === id);
    if (!p) { this.showToast('Saved project not found', 'error'); return; }
    if (this.editor) this.editor.setCode(p.code || '');
    if (this.canvas) this.canvas.deserialize(p.circuit || { components: [], wires: [] });
    this._board2Code = p.board2Code || '';
    const textarea = document.getElementById('board2-code-textarea');
    if (textarea) textarea.value = this._board2Code;
    this._syncBoardFromCanvas();
    this._setProjectName(p.name || 'Untitled Project');
    this._refreshCanvasSummary();
    this._closeModal();
    this.showToast(`"${p.name}" opened`, 'success');
  }

  _downloadSavedProject(id) {
    const p = (window.StorageManager?.getSavedProjects() || []).find(x => x.id === id);
    if (!p) return;
    window.StorageManager?.downloadProject(p.code || '', p.circuit || { components: [], wires: [] }, p.name || 'Untitled Project');
  }

  _deleteSavedProject(id) {
    window.StorageManager?.deleteSavedProject(id);
    this._renderSavedProjects();
  }

_newProject() {
    // Reset the canvas and editor to a fresh state
    this.canvas?.clearCanvas();
    this.editor?.setCode('void setup() {\n   // Put your setup code here, to run once when the board starts:\n}\nvoid loop() {\n  // Put your main code here, to run repeatedly indefinitely:\n}');
    this._board2Code = '';
    const b2ta = document.getElementById('board2-code-textarea');
    if (b2ta) b2ta.value = '';
    this._setProjectName('Untitled Project');
    this.output?.log('New project created', 'system');
    // Focus the editor for immediate typing
    const codeEl = document.getElementById('editor-code');
    if (codeEl) codeEl.focus();
  }

  /* ══════════════════════ AUTO-SAVE ══════════════════════ */
  _triggerAutoSave() {
    if (!this._autoSaveDebounced) {
      this._autoSaveDebounced = window.Utils?.debounce((code, circuit) => {
        window.StorageManager?.autoSave(code, circuit, this._projectName || 'Untitled Project');
      }, 2000) ?? ((code, circuit) => {
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => window.StorageManager?.autoSave(code, circuit, this._projectName || 'Untitled Project'), 2000);
      });
    }
    const code = this.editor?.getCode() || '';
    const circuit = this.canvas?.serialize() || { components: [], wires: [] };
    this._autoSaveDebounced(code, circuit);
  }

  /* ══════════════════════ COMPONENT LIBRARY ══════════════════════ */
  _renderComponentLibrary() {
    const container = document.getElementById('components-container');
    if (!container || !window.ArduinoComponents?.COMPONENT_CATALOG) return;

    container.innerHTML = '';
    const defs = window.ArduinoComponents.COMPONENT_DEFS || {};

    for (const group of window.ArduinoComponents.COMPONENT_CATALOG) {
      const section = document.createElement('div');
      section.className = 'comp-group';
      const title = document.createElement('div');
      title.className = 'comp-group-title';
      title.textContent = group.category;
      section.appendChild(title);

      // Render dropdown group (e.g., LED variants)
      if (group.dropdown) {
        const dd = group.dropdown;
        const item = document.createElement('button');
        item.className = 'comp-item comp-dropdown';
        item.dataset.type = dd.id;
        item.title = dd.desc || dd.label;
        item.innerHTML = `<span class="comp-icon">${this._escHtml(dd.icon || '🔧')}</span><span class="comp-info"><span class="comp-name">${this._escHtml(dd.label)}</span><span class="comp-desc">${this._escHtml(dd.desc || '')}</span></span><span class="comp-dropdown-arrow">▾</span>`;

        const menu = document.createElement('div');
        menu.className = 'comp-dropdown-menu';
        menu.style.display = 'none';

        for (const v of dd.variants) {
          const vdef = defs[v.id];
          const btn = document.createElement('button');
          btn.className = 'comp-dropdown-item';
          btn.dataset.type = v.id;
          btn.innerHTML = `<span class="comp-icon">${this._escHtml(v.icon)}</span><span class="comp-info"><span class="comp-name">${this._escHtml(v.name)}</span>${vdef ? `<span class="comp-desc">${this._escHtml(vdef.desc || '')}</span>` : ''}</span>`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            item.classList.remove('open');
            if (this.canvas) {
              this.canvas.startPlacing(v.id);
              this.showToast(`${v.name} selected — click on canvas to place`, 'info');
            }
          });
          menu.appendChild(btn);
        }

        item.addEventListener('click', () => {
          const isOpen = menu.style.display !== 'none';
          // Close all other dropdowns first
          document.querySelectorAll('.comp-dropdown-menu').forEach(m => m.style.display = 'none');
          document.querySelectorAll('.comp-dropdown.open').forEach(i => i.classList.remove('open'));
          if (!isOpen) {
            menu.style.display = 'block';
            item.classList.add('open');
          }
        });

        section.appendChild(item);
        section.appendChild(menu);
      }

      for (const id of group.ids) {
        const def = defs[id];
        if (!def) continue;
        const item = document.createElement('button');
        item.className = 'comp-item';
        item.dataset.type = id;
        item.title = def.desc || def.name;
        const shortDesc = (def.desc || '').length > 42 ? def.desc.slice(0, 42) + '…' : (def.desc || '');
        item.innerHTML = `<span class="comp-icon">${this._escHtml(def.icon || '🔧')}</span><span class="comp-info"><span class="comp-name">${this._escHtml(def.name)}</span>${shortDesc ? `<span class="comp-desc">${this._escHtml(shortDesc)}</span>` : ''}</span>`;
        item.addEventListener('click', () => {
          if (this.canvas) {
            this.canvas.startPlacing(id);
            this.showToast(`${def.name} selected — click on canvas to place`, 'info');
          }
        });
        // Hover tooltip showing full description
        item.addEventListener('mouseenter', () => {
          const existing = item.querySelector('.comp-tooltip');
          if (existing) return;
          const tip = document.createElement('span');
          tip.className = 'comp-tooltip';
          tip.textContent = def.desc || '';
          tip.style.cssText = 'position:absolute;bottom:100%;left:50%;transform:translateX(-50%) translateY(4px);background:var(--bg-panel);padding:6px 10px;border-radius:var(--radius-sm);font-size:11px;color:var(--text-muted);white-space:normal;max-width:200px;box-shadow:var(--shadow-sm);z-index:10;';
          item.appendChild(tip);
        });
        item.addEventListener('mouseleave', () => {
          const tip = item.querySelector('.comp-tooltip');
          if (tip) tip.remove();
        });
        section.appendChild(item);
      }
      container.appendChild(section);
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.comp-dropdown') && !e.target.closest('.comp-dropdown-menu')) {
        document.querySelectorAll('.comp-dropdown-menu').forEach(m => m.style.display = 'none');
        document.querySelectorAll('.comp-dropdown.open').forEach(i => i.classList.remove('open'));
      }
    });
  }

  _filterComponents(term) {
    const query = (term || '').toLowerCase();
    // Filter regular comp-items
    document.querySelectorAll('.comp-item:not(.comp-dropdown)').forEach(item => {
      const name = item.textContent.toLowerCase();
      item.style.display = name.includes(query) ? '' : 'none';
    });
    // Filter dropdown variant items
    document.querySelectorAll('.comp-dropdown-item').forEach(item => {
      const name = item.textContent.toLowerCase();
      item.style.display = name.includes(query) ? '' : 'none';
    });
    // Show/hide groups based on visible items
    document.querySelectorAll('.comp-group').forEach(group => {
      const hasVisibleItems = Array.from(group.querySelectorAll('.comp-item:not(.comp-dropdown)')).some(item => item.style.display !== 'none');
      const hasVisibleDropdowns = Array.from(group.querySelectorAll('.comp-dropdown-item')).some(item => item.style.display !== 'none');
      const hasVisibleDropdown = group.querySelector('.comp-dropdown') && hasVisibleDropdowns;
      group.style.display = (hasVisibleItems || hasVisibleDropdown) ? '' : 'none';
    });
  }

  /* ══════════════════════ CANVAS SUMMARY ══════════════════════ */
  _refreshCanvasSummary() {
    const compEl = document.getElementById('canvas-comp-count');
    const wireEl = document.getElementById('canvas-wire-count');
    if (!this.canvas) return;
    const nc = this.canvas.components.length;
    const nw = this.canvas.wires.length;
    if (compEl) compEl.textContent = `${nc} component${nc !== 1 ? 's' : ''}`;
    if (wireEl) wireEl.textContent = `${nw} wire${nw !== 1 ? 's' : ''}`;
  }

  /* ══════════════════════ RESTORE PROJECT ══════════════════════ */
  _restoreProject() {
    const project = window.StorageManager?.autoLoad?.();
    if (project) {
      if (this.editor) this.editor.setCode(project.code || '');
      if (this.canvas) this.canvas.deserialize(project.circuit || { components: [], wires: [] });
      this._syncBoardFromCanvas();
      this._setProjectName(project.name || 'Untitled Project');
      this._refreshCanvasSummary();
      this.showToast('Previous project restored', 'success');
      window.StorageManager?.markClean();
      return;
    }

    const shared = window.StorageManager?.loadFromUrl?.();
    if (shared) {
      if (this.editor) this.editor.setCode(shared.code || '');
      if (this.canvas) this.canvas.deserialize(shared.circuit || { components: [], wires: [] });
      this._syncBoardFromCanvas();
      this._setProjectName(shared.name || 'Shared Project');
      this._refreshCanvasSummary();
      this.showToast('Shared project loaded', 'success');
      return;
    }

    // Default starter circuit if canvas is empty
    if (this.canvas && this.canvas.components.length === 0) {
      this._loadExampleCircuit('blink');
    }
  }

  /* ══════════════════════ RUNNING STATE ══════════════════════ */
  _setRunningState(running) {
    this.isRunning = running;
    const runBtn   = document.getElementById('btn-run');
    const runLabel = document.getElementById('btn-run-label');
    const runIcon  = document.getElementById('btn-run-icon');
    const pauseBtn = document.getElementById('btn-pause');
    const simDot   = document.getElementById('sim-dot');
    if (runBtn) {
      runBtn.classList.toggle('running', running);
      runBtn.title = running ? 'Stop Simulation (F6)' : 'Compile & Run (F5)';
    }
    if (runLabel) runLabel.textContent = running ? 'Stop' : 'Run';
    if (runIcon) {
      runIcon.innerHTML = running
        ? '<path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5" />'
        : '<path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z" />';
    }
    if (pauseBtn) pauseBtn.disabled = !running;
    if (simDot) simDot.classList.toggle('running', running);
    if (!running) {
      const fpsEl = document.getElementById('sim-fps');
      if (fpsEl) fpsEl.textContent = '0 FPS';
    }
  }

  /* ══════════════════════ PIN MONITOR ══════════════════════ */
  _updatePinMonitor() {
    const grid = document.getElementById('pin-monitor-grid');
    if (!grid || !this.sim) return;

    // Rebuild when the active board (or pin set) changes
    const boardType = this._getActiveBoardType();
    if (this._pinMonitorBoard !== boardType) {
      this._pinMonitorBoard = boardType;
      this._buildPinMonitor(grid, boardType);
    }

    // Update values
    grid.querySelectorAll('.pin-row').forEach(row => {
      const pinKey = row.dataset.pin;
      const valEl  = row.querySelector('.pin-val');
      const barEl  = row.querySelector('.pin-bar-fill');
      const modeEl = row.querySelector('.pin-mode');
      const val = this.sim.pinStates[pinKey];
      const mode = this.sim.pinModes[pinKey];
      if (valEl) {
        if (val === undefined || val === null) {
          valEl.textContent = '—';
          row.classList.remove('pin-high', 'pin-pwm');
        } else if (val <= 1) {
          valEl.textContent = val ? 'HIGH' : 'LOW';
          row.classList.toggle('pin-high', val === 1);
          row.classList.remove('pin-pwm');
        } else {
          valEl.textContent = val;
          row.classList.add('pin-pwm');
          row.classList.remove('pin-high');
        }
      }
      if (barEl) {
        const pct = val !== undefined ? Math.round((val / 255) * 100) : 0;
        barEl.style.width = `${pct}%`;
      }
      if (modeEl) {
        modeEl.textContent = mode || '—';
      }
    });
  }

  _buildPinMonitor(grid, boardType) {
    grid.innerHTML = '';
    const esp32 = boardType === 'esp32_devkit_v1';
    const nano  = boardType === 'arduino_nano';
    const unoPins = [
      { key: 'pin_0',  label: 'D0' },  { key: 'pin_1',  label: 'D1' },
      { key: 'pin_2',  label: 'D2' },  { key: 'pin_3',  label: 'D3~' },
      { key: 'pin_4',  label: 'D4' },  { key: 'pin_5',  label: 'D5~' },
      { key: 'pin_6',  label: 'D6~' }, { key: 'pin_7',  label: 'D7' },
      { key: 'pin_8',  label: 'D8' },  { key: 'pin_9',  label: 'D9~' },
      { key: 'pin_10', label: 'D10~'},  { key: 'pin_11', label: 'D11~'},
      { key: 'pin_12', label: 'D12' }, { key: 'pin_13', label: 'D13 · L' },
      { key: 'pin_14', label: 'A0' },  { key: 'pin_15', label: 'A1' },
      { key: 'pin_16', label: 'A2' },  { key: 'pin_17', label: 'A3' },
      { key: 'pin_18', label: 'A4' },  { key: 'pin_19', label: 'A5' },
    ];
    const pins = esp32 ? [
      { key: 'pin_2',  label: 'D2 · L' },  { key: 'pin_4',  label: 'D4' },
      { key: 'pin_5',  label: 'D5' },      { key: 'pin_12', label: 'D12' },
      { key: 'pin_13', label: 'D13' },     { key: 'pin_14', label: 'D14' },
      { key: 'pin_15', label: 'D15' },     { key: 'pin_16', label: 'D16' },
      { key: 'pin_17', label: 'D17' },     { key: 'pin_18', label: 'D18' },
      { key: 'pin_19', label: 'D19' },     { key: 'pin_21', label: 'D21' },
      { key: 'pin_22', label: 'D22' },     { key: 'pin_23', label: 'D23' },
      { key: 'pin_25', label: 'D25' },     { key: 'pin_26', label: 'D26' },
      { key: 'pin_27', label: 'D27' },     { key: 'pin_32', label: 'D32' },
      { key: 'pin_33', label: 'D33' },     { key: 'pin_34', label: 'D34' },
      { key: 'pin_35', label: 'D35' },     { key: 'pin_36', label: 'VP · 36' },
      { key: 'pin_39', label: 'VN · 39' }, { key: 'pin_1',  label: 'TX0' },
      { key: 'pin_3',  label: 'RX0' },
    ] : nano ? [
      ...unoPins,
      { key: 'pin_20', label: 'A6 · 20' }, { key: 'pin_21', label: 'A7 · 21' },
    ] : unoPins;
    pins.forEach(pin => {
      const row = document.createElement('div');
      row.className = 'pin-row';
      row.dataset.pin = pin.key;
      row.innerHTML = `
        <span class="pin-label">${pin.label}</span>
        <span class="pin-mode">—</span>
        <span class="pin-val">—</span>
        <div class="pin-bar"><div class="pin-bar-fill"></div></div>`;
      grid.appendChild(row);
    });
  }

  /* ══════════════════════ BEFORE UNLOAD GUARD ══════════════════════ */
  _setupBeforeUnloadGuard() {
    window.addEventListener('beforeunload', (e) => {
      if (window.StorageManager?.isDirty()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  /* ══════════════════════ LOADING OVERLAY ══════════════════════ */
  _hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }

  /* ══════════════════════ THEME ══════════════════════ */
  _toggleTheme(iconDark, iconLight) {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    const darkMode = !isDark;
    body.classList.toggle('dark-theme', darkMode);
    body.classList.toggle('light-theme', !darkMode);
    if (this.editor?.setTheme) this.editor.setTheme(darkMode);
    if (iconDark)  iconDark.classList.toggle('hidden', !darkMode);
    if (iconLight) iconLight.classList.toggle('hidden', darkMode);
    try { localStorage.setItem('ardusim-theme', darkMode ? 'arduino-dark' : 'arduino-light'); } catch (e) {}
  }

  _loadTheme() {
    let theme;
    try { theme = localStorage.getItem('ardusim-theme'); } catch (e) { theme = null; }
    const darkMode = theme !== 'light' && theme !== 'arduino-light';
    const iconDark  = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');
    document.body.classList.toggle('dark-theme', darkMode);
    document.body.classList.toggle('light-theme', !darkMode);
    if (this.editor?.setTheme) this.editor.setTheme(darkMode);
    if (iconDark)  iconDark.classList.toggle('hidden', !darkMode);
    if (iconLight) iconLight.classList.toggle('hidden', darkMode);
  }

  /* ══════════════════════ STATUS BAR ══════════════════════ */
  _updateStatus(msg) {
    const el = document.getElementById('sim-status-text');
    if (el) el.textContent = msg;
  }

  _updateCompileStatus(msg) {
    const el = document.getElementById('compile-status');
    if (el) el.textContent = `● ${msg}`;
  }

  /* ══════════════════════ MODALS ══════════════════════ */
  _showModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    const modal   = document.getElementById(modalId);
    if (!overlay || !modal) return;
    overlay.classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    modal.classList.add('active');
  }

  _showRemoteModal() {
    const overlay = document.getElementById('modal-remote-overlay');
    const modal = document.getElementById('modal-remote');
    const idle = document.getElementById('remote-idle');
    const active = document.getElementById('remote-active');
    if (!overlay || !modal) return;

    const sim = this.sim;
    if (sim && sim.isRunning && sim.sessionId) {
      // Simulation is running — show session code
      idle?.classList.add('hidden');
      active?.classList.remove('hidden');
      const sessionInput = document.getElementById('remote-session-id');
      const urlInput = document.getElementById('remote-url');
      if (sessionInput) sessionInput.value = sim.sessionId;

      // Fetch real LAN IP for QR code (not localhost)
      const fallbackHost = window.location.hostname || '127.0.0.1';
      const fallbackPort = window.location.port || '3000';
      const isSecure = window.location.protocol === 'https:';
      const scheme = isSecure ? 'https' : 'http';
      const isGitHubPages = fallbackHost.endsWith('.github.io');
      const pagePath = isGitHubPages ? '/remote.html' : '/remote';
      let basePath = '';
      if (isGitHubPages) {
        const segs = window.location.pathname.split('/').filter(Boolean);
        if (segs.length > 0) basePath = '/' + segs[0];
      }
      fetch('/api/host').then(r => r.json()).then(info => {
        const host = info.ip || fallbackHost;
        const port = info.port || fallbackPort;
        const portStr = (isGitHubPages || !port || port === '80' || port === '443') ? '' : `:${port}`;
        const remoteUrl = `${scheme}://${host}${portStr}${basePath}${pagePath}?session=${sim.sessionId}`;
        if (urlInput) urlInput.value = remoteUrl;

        // Generate QR code
        const qrContainer = document.getElementById('remote-qr');
        if (qrContainer && typeof QRCode !== 'undefined') {
          qrContainer.innerHTML = '';
          new QRCode(qrContainer, {
            text: remoteUrl,
            width: 160,
            height: 160,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M,
          });
        }
      }).catch(() => {
        // Fallback to hostname
        const portStr = (isGitHubPages || !fallbackPort || fallbackPort === '80' || fallbackPort === '443') ? '' : `:${fallbackPort}`;
        const remoteUrl = `${scheme}://${fallbackHost}${portStr}${basePath}${pagePath}?session=${sim.sessionId}`;
        if (urlInput) urlInput.value = remoteUrl;
        const qrContainer = document.getElementById('remote-qr');
        if (qrContainer && typeof QRCode !== 'undefined') {
          qrContainer.innerHTML = '';
          new QRCode(qrContainer, { text: remoteUrl, width: 160, height: 160, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        }
      });
    } else {
      // Not running — show idle message
      idle?.classList.remove('hidden');
      active?.classList.add('hidden');
    }

    overlay.classList.remove('hidden');
    modal.classList.add('active');

    // Copy session button
    const copySessionBtn = document.getElementById('btn-copy-session');
    copySessionBtn?.addEventListener('click', () => {
      const input = document.getElementById('remote-session-id');
      if (input) { navigator.clipboard?.writeText(input.value); this.showToast('Session code copied', 'success'); }
    }, { once: true });

    // Copy URL button
    const copyUrlBtn = document.getElementById('btn-copy-url');
    copyUrlBtn?.addEventListener('click', () => {
      const input = document.getElementById('remote-url');
      if (input) { navigator.clipboard?.writeText(input.value); this.showToast('URL copied', 'success'); }
    }, { once: true });
  }

  _closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    this._closePropsModal();
  }

  /* ══════════════════════ CONTEXT MENU ══════════════════════ */
  _showContextMenu(inst, x, y) {
    this._closeContextMenu();
    const menu = document.getElementById('canvas-context-menu');
    if (!menu) return;
    menu.style.left = `${x}px`;
    menu.style.top  = `${y}px`;
    menu.classList.remove('hidden');
    menu.classList.add('active');

    const compGroup   = document.getElementById('ctx-comp-group');
    const wireGroup   = document.getElementById('ctx-wire-group');
    const itemDelete  = document.getElementById('ctx-delete');
    const itemProps   = document.getElementById('ctx-props');
    const itemDuplicate = document.getElementById('ctx-duplicate');
    const itemRotate  = document.getElementById('ctx-rotate');
    const itemWireAuto = document.getElementById('ctx-wire-auto');
    const wirePalette = document.getElementById('wire-palette');

    const cleanup = () => this._closeContextMenu();

    const isWire = inst && (inst.type === 'wire' || !!inst.wire);
    const wireObj = isWire ? (inst.wire || inst) : null;

    if (isWire) {
      if (compGroup) compGroup.classList.add('hidden');
      if (wireGroup) wireGroup.classList.remove('hidden');

      // Highlight current wire color in palette
      if (wirePalette) {
        wirePalette.querySelectorAll('.wire-color-btn').forEach(btn => {
          const isSelected = wireObj && wireObj.color && wireObj.color.toLowerCase() === btn.dataset.color.toLowerCase();
          btn.classList.toggle('active', !!isSelected);

          btn.onclick = (e) => {
            e.stopPropagation();
            if (wireObj) {
              this.canvas?.setWireColor(wireObj.id, btn.dataset.color);
            }
            cleanup();
          };
        });
      }

      if (itemWireAuto) {
        itemWireAuto.onclick = () => {
          if (wireObj) {
            this.canvas?.setWireColor(wireObj.id, null);
          }
          cleanup();
        };
      }
    } else {
      if (compGroup) compGroup.classList.remove('hidden');
      if (wireGroup) wireGroup.classList.add('hidden');

      itemProps?.removeEventListener('click', itemProps._handler);
      itemProps._handler = () => { if (inst) this.openPropsModal(inst); cleanup(); };
      itemProps?.addEventListener('click', itemProps._handler, { once: true });

      itemDuplicate?.removeEventListener('click', itemDuplicate._handler);
      itemDuplicate._handler = () => { this.canvas?.duplicateSelected?.(); cleanup(); };
      itemDuplicate?.addEventListener('click', itemDuplicate._handler, { once: true });

      itemRotate?.removeEventListener('click', itemRotate._handler);
      itemRotate._handler = () => { this.canvas?.rotateSelected?.(); cleanup(); };
      itemRotate?.addEventListener('click', itemRotate._handler, { once: true });
    }

    itemDelete?.removeEventListener('click', itemDelete._handler);
    itemDelete._handler = () => { this.canvas?.deleteSelected(); cleanup(); };
    itemDelete?.addEventListener('click', itemDelete._handler, { once: true });
  }

  _closeContextMenu() {
    const menu = document.getElementById('canvas-context-menu');
    if (menu) { menu.classList.add('hidden'); menu.classList.remove('active'); }
  }

  /* ══════════════════════ HEADER DROPDOWNS ══════════════════════ */
  _closeHeaderDropdowns() {
    document.querySelectorAll('.hdr-dropdown.open').forEach(dd => {
      dd.classList.remove('open');
      const t = dd.querySelector('.hdr-dropdown-trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
      const menu = dd.querySelector('.hdr-dropdown-menu');
      if (menu) {
        menu.style.top = '';
        menu.style.left = '';
        menu.style.right = '';
      }
    });
  }

  /* ══════════════════════ PANEL TOGGLES ══════════════════════ */
  _togglePanel(panelId, button, collapseTitle, expandTitle) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const hidden = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', hidden);
    if (button) button.title = hidden ? expandTitle : collapseTitle;

    // Adjacent resizer follows the panel visibility
    const resizerId = panelId === 'panel-editor' ? 'resizer-left'
                    : panelId === 'panel-components' ? 'resizer-right' : null;
    if (resizerId) {
      const resizer = document.getElementById(resizerId);
      if (resizer) resizer.classList.toggle('hidden', hidden);
    }

    // Always-visible toggle in the canvas header (collapse + expand)
    const canvasToggleId = panelId === 'panel-editor' ? 'btn-show-editor'
                         : panelId === 'panel-components' ? 'btn-show-components' : null;
    if (canvasToggleId) {
      const canvasToggle = document.getElementById(canvasToggleId);
      if (canvasToggle) {
        canvasToggle.title = hidden ? expandTitle : collapseTitle;
        const icon = canvasToggle.querySelector('svg');
        if (icon) icon.style.transform = hidden ? 'rotate(180deg)' : '';
      }
    }
  }

  _toggleBottomPanel(button) {
    const bottom = document.getElementById('bottom-panel');
    if (!bottom) return;
    const mainLayout = document.querySelector('.main-layout');
    const collapsed = bottom.classList.toggle('collapsed');
    document.body.classList.toggle('bottom-collapsed', collapsed);
    if (collapsed) {
      // Clear inline sizes so the CSS collapsed rules can take effect
      bottom.style.height = '';
      if (mainLayout) mainLayout.style.bottom = '';
    } else {
      const h = this._bottomHeight || 200;
      bottom.style.height = `${h}px`;
      if (mainLayout) mainLayout.style.bottom = `${h}px`;
    }
    if (button) {
      const icon = document.getElementById('bottom-toggle-icon');
      if (icon) icon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      button.title = collapsed ? 'Show Bottom Panel' : 'Hide Bottom Panel';
    }
  }

  _switchBottomTab(button) {
    if (!button) return;
    const target = button.dataset.tab;
    if (!target) return;
    document.querySelectorAll('.btm-tab').forEach(tab => tab.classList.toggle('active', tab === button));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === `pane-${target}`));
    if (target === 'pins') this._updatePinMonitor();
    if (target === 'oscilloscope' && this.osc) {
      this.osc.refreshProbeOptions(document.getElementById('osc-ch1'), document.getElementById('osc-ch2'));
    }
    if (target === 'logic-analyzer' && this.la) {
      this.la.refreshProbeOptions();
    }
  }

  /* ══════════════════════ VIEW FOCUS MODES ══════════════════════ */
  _setView(view) {
    if (this._activeView === view) {
      // Clicking the active view restores the default layout
      this._activeView = null;
      document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
      this._restoreResizedLayout();
    } else {
      this._activeView = view;
      document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
      document.body.classList.add(`view-${view}`);
      // Clear inline sizes so the view-specific CSS rules take over
      const bottom = document.getElementById('bottom-panel');
      const mainLayout = document.querySelector('.main-layout');
      const editorPanel = document.getElementById('panel-editor');
      const compPanel = document.getElementById('panel-components');
      if (bottom) bottom.style.height = '';
      if (mainLayout) mainLayout.style.bottom = '';
      if (editorPanel) { editorPanel.style.width = ''; editorPanel.style.flex = ''; }
      if (compPanel)   { compPanel.style.width = ''; compPanel.style.flex = ''; }
      if (view === 'serial') {
        const tab = document.getElementById('tab-serial');
        if (tab) this._switchBottomTab(tab);
      }
    }
    this._updateViewButtons();
  }

  _restoreResizedLayout() {
    const bottom = document.getElementById('bottom-panel');
    const mainLayout = document.querySelector('.main-layout');
    const editorPanel = document.getElementById('panel-editor');
    const compPanel = document.getElementById('panel-components');
    if (!bottom || document.body.classList.contains('bottom-collapsed')) return;
    if (editorPanel && this._panelWidths && this._panelWidths.editor) {
      editorPanel.style.width = `${this._panelWidths.editor}px`;
      editorPanel.style.flex = '0 0 auto';
    }
    if (compPanel && this._panelWidths && this._panelWidths.components) {
      compPanel.style.width = `${this._panelWidths.components}px`;
      compPanel.style.flex = '0 0 auto';
    }
    const h = this._bottomHeight || 200;
    bottom.style.height = `${h}px`;
    if (mainLayout) mainLayout.style.bottom = `${h}px`;
  }

  _updateViewButtons() {
    ['code', 'circuit', 'serial'].forEach(v => {
      const btn = document.getElementById(`btn-view-${v}`);
      if (btn) btn.classList.toggle('active', this._activeView === v);
    });
  }

  /* ══════════════════════ PANEL RESIZERS ══════════════════════ */
  _initResizers() {
    const LS_KEY = 'ardusim-layout';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { saved = {}; }
    const save = () => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          editorW: this._panelWidths ? this._panelWidths.editor : undefined,
          compW: this._panelWidths ? this._panelWidths.components : undefined,
          bottomH: this._bottomHeight,
        }));
      } catch (e) { /* noop */ }
    };
    this._panelWidths = { editor: saved.editorW || 320, components: saved.compW || 260 };
    if (saved.bottomH) this._bottomHeight = saved.bottomH;

    // Restore saved sizes
    const editorPanel = document.getElementById('panel-editor');
    const compPanel = document.getElementById('panel-components');
    if (editorPanel) { editorPanel.style.width = `${this._panelWidths.editor}px`; editorPanel.style.flex = '0 0 auto'; }
    if (compPanel)   { compPanel.style.width = `${this._panelWidths.components}px`; compPanel.style.flex = '0 0 auto'; }

    const bindResizer = (resizerId, panelId, dir) => {
      const resizer = document.getElementById(resizerId);
      const panel = document.getElementById(panelId);
      if (!resizer || !panel) return;
      resizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (document.body.classList.contains('view-code') ||
            document.body.classList.contains('view-circuit') ||
            document.body.classList.contains('view-serial')) return;
        const startX = e.clientX;
        const startW = panel.getBoundingClientRect().width;
        const minW = 120;
        const maxW = Math.max(minW + 100, window.innerWidth - 360);
        const onMove = (ev) => {
          let w = dir === 'left' ? startW + (ev.clientX - startX) : startW - (ev.clientX - startX);
          w = Math.max(minW, Math.min(maxW, w));
          panel.style.width = `${w}px`;
          panel.style.flex = '0 0 auto';
          if (dir === 'left') this._panelWidths.editor = w;
          else this._panelWidths.components = w;
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          resizer.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          save();
        };
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    };
    bindResizer('resizer-left', 'panel-editor', 'left');
    bindResizer('resizer-right', 'panel-components', 'right');

    // Bottom panel resizer (drag up/down to change height)
    const bottomResizer = document.getElementById('resizer-bottom');
    const bottomPanel = document.getElementById('bottom-panel');
    if (bottomResizer && bottomPanel) {
      const mainLayout = document.querySelector('.main-layout');
      bottomResizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (document.body.classList.contains('view-code') ||
            document.body.classList.contains('view-circuit') ||
            document.body.classList.contains('view-serial')) return;
        if (bottomPanel.classList.contains('collapsed')) {
          bottomPanel.classList.remove('collapsed');
          document.body.classList.remove('bottom-collapsed');
        }
        const startY = e.clientY;
        const startH = bottomPanel.getBoundingClientRect().height;
        const minH = 80;
        const maxH = Math.max(minH + 50, window.innerHeight - 240);
        bottomPanel.style.transition = 'none';
        const onMove = (ev) => {
          let h = startH + (startY - ev.clientY);
          h = Math.max(minH, Math.min(maxH, h));
          this._bottomHeight = h;
          bottomPanel.style.height = `${h}px`;
          if (mainLayout) mainLayout.style.bottom = `${h}px`;
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          bottomResizer.classList.remove('dragging');
          bottomPanel.style.transition = '';
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          save();
        };
        bottomResizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    }

    // Apply restored bottom height (unless collapsed)
    const restoredBottom = document.getElementById('bottom-panel');
    if (restoredBottom && !document.body.classList.contains('bottom-collapsed')) {
      restoredBottom.style.height = `${this._bottomHeight}px`;
      const mainLayout = document.querySelector('.main-layout');
      if (mainLayout) mainLayout.style.bottom = `${this._bottomHeight}px`;
    }
  }

  _toggleOscPause(button) {
    if (!this.osc) return;
    const paused = this.osc.togglePause();
    if (button) button.textContent = paused ? 'Resume' : 'Pause';
  }

  /* ══════════════════════ VERIFY ══════════════════════ */
  async verify() {
    if (!this.editor) return;
    const code = this.editor.getCode();
    this._syncBoardFromCanvas();
    this._updateCompileStatus('Verifying…');
    this._updateStatus('Verifying sketch');
    this.serial?.log('Verifying sketch…', 'system');
    this.output?.log('Verifying sketch…', 'system');
    if (this.editor) this.editor.clearErrors();

    let result;
    try {
      result = await this.sim.compile(code);
    } catch (err) {
      console.error('[ArduSim] Verify error:', err);
      this._updateCompileStatus('Verification failed');
      this._updateStatus('Verification failed');
      this.output?.log(`Verification failed unexpectedly: ${err && err.message ? err.message : err}`, 'error');
      this.showToast('Verification failed unexpectedly', 'error');
      return false;
    }
    if (result.ok) {
      this._updateCompileStatus('Verified ✓');
      this._updateStatus('Verification succeeded');
      this.output?.log('✓ Sketch verified — no errors found', 'success');
      this.showToast('✓ Sketch verified — no errors found!', 'success');
      return true;
    }

    this._updateCompileStatus(`Error: ${result.error}`);
    this._updateStatus('Verification failed');
    this.output?.log(`Error: ${result.error}`, 'error');
    this.showToast(result.error || 'Verification failed', 'error');
    if (this.editor) this.editor.showError(1, result.error);
    return false;
  }

  /* ══════════════════════ OSCILLOSCOPE ══════════════════════ */
  _initOscilloscope() {
    const oscCanvas = document.getElementById('oscilloscope-canvas');
    if (!oscCanvas || !window.OscilloscopeClass) return;
    this.osc = new window.OscilloscopeClass(oscCanvas);
  }

  /* ══════════════════════ DSO FULLSCREEN ══════════════════════ */
  openDSOFullscreen(comp) {
    if (!window.DSOFullscreen) return;
    if (!this._dsoFS) {
      this._dsoFS = new window.DSOFullscreen();
    }
    this._dsoFS.open(comp);
  }

  closeDSOFullscreen() {
    if (this._dsoFS) this._dsoFS.close();
  }

  /* ══════════════════════ LOGIC ANALYZER ══════════════════════ */
  _initLogicAnalyzer() {
    const laCanvas = document.getElementById('logic-analyzer-canvas');
    if (!laCanvas || !window.LogicAnalyzerClass) return;
    this.la = new window.LogicAnalyzerClass(laCanvas);
    const statusEl = document.getElementById('la-status');
    if (statusEl) statusEl.textContent = 'Ready';
  }

  /* ══════════════════════ SERIAL PLOTTER ══════════════════════ */
  _initPlotter() {
    const plotterCanvas = document.getElementById('plotter-canvas');
    if (!plotterCanvas || !window.SerialPlotterClass) return;
    this.plotter = new window.SerialPlotterClass(plotterCanvas);

    const clearBtn = document.getElementById('btn-plotter-clear');
    const pauseBtn = document.getElementById('btn-plotter-pause');
    clearBtn?.addEventListener('click', () => this.plotter?.clear());
    pauseBtn?.addEventListener('click', () => {
      const paused = this.plotter?.togglePause();
      if (pauseBtn) pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    });
  }

  /* ══════════════════════ EXAMPLES ══════════════════════ */
  async _renderExamples() {
    const container = document.getElementById('examples-grid');
    if (!container) return;

    // Show spinner while loading
    container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;grid-column:1/-1;min-height:300px;padding:40px 20px;color:var(--text-muted)"><div class="loading-spinner" style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px"></div><span style="font-size:13px">Loading examples...</span></div>';

    try {
      if (window.loadExamplesFromFiles && (!window.EXAMPLE_SKETCHES || window.EXAMPLE_SKETCHES.length === 0)) {
        await window.loadExamplesFromFiles();
      }
    } catch (e) {
      console.error('[ArduSim] Failed to load examples:', e);
    }

    if (window.EXAMPLE_SKETCHES.length === 0) {
      container.innerHTML = '<div class="library-empty" style="padding:24px;text-align:center;color:var(--text-muted)">No examples loaded. Check your connection and reload.</div>';
      const empty = document.getElementById('examples-empty');
      if (empty) empty.classList.add('hidden');
      return;
    }

    const q = (this._examplesQuery || '').toLowerCase();
    const filter = this._examplesFilter || 'all';
    this._examplesFiltered = window.EXAMPLE_SKETCHES.filter(ex => {
      if (q && !(`${ex.name} ${ex.desc} ${(ex.tags || []).join(' ')}`).toLowerCase().includes(q)) return false;
      if (filter === 'all') return true;
      if (filter === 'display') return (ex.tags || []).some(t => t.includes('lcd') || t.includes('oled') || t === 'display');
      if (filter === 'sensor') return (ex.tags || []).some(t => ['sensor', 'dht11', 'ultrasonic', 'analog'].includes(t));
      return (ex.tags || []).includes(filter);
    });

    const empty = document.getElementById('examples-empty');
    if (empty) empty.classList.toggle('hidden', this._examplesFiltered.length > 0);

    container.innerHTML = '';
    this._examplesPageIndex = 0;
    this._renderExamplesNextBatch(container);

    if (this._examplesObserver) this._examplesObserver.disconnect();
    const sentinel = container.querySelector('.examples-sentinel');
    if (sentinel && this._examplesFiltered.length > this._examplesPageSize) {
      this._examplesObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this._renderExamplesNextBatch(container);
          }
        }
      }, { root: container.closest('.modal-body') || null, rootMargin: '200px' });
      this._examplesObserver.observe(sentinel);
    }
  }

  _renderExamplesNextBatch(container) {
    if (!container) return;
    const start = this._examplesPageIndex * this._examplesPageSize;
    const end = Math.min(start + this._examplesPageSize, this._examplesFiltered.length);
    if (start >= end) return;

    const sentinel = container.querySelector('.examples-sentinel');

    for (let i = start; i < end; i++) {
      const example = this._examplesFiltered[i];
      const item = document.createElement('button');
      item.className = 'example-item';
      item.type = 'button';
      const thumb = window.CircuitThumbnail?.render(example.circuit, 260, 150);
      item.innerHTML = `
        <div class="example-thumb">${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<span class="example-thumb-icon">${example.icon || '📄'}</span>`}</div>
        <div class="example-info">
          <strong>${this._escHtml(example.name)}</strong>
          <span class="example-desc">${this._escHtml(example.desc)}</span>
          <div class="example-tags">${(example.tags || []).map(t => `<span class="tag">${this._escHtml(t)}</span>`).join('')}</div>
        </div>`;
      item.addEventListener('click', () => {
        this._setProjectName(example.name);
        if (this.editor) this.editor.setCode(example.code || '');
        this._board2Code = example.board2Code || '';
        const b2ta = document.getElementById('board2-code-textarea');
        if (b2ta) b2ta.value = this._board2Code;
        if (example.circuit && this.canvas) this._loadExampleCircuit(example.circuit);
        this._closeModal();
        this.showToast(`${example.name} loaded`, 'success');
      });
      container.insertBefore(item, sentinel);
    }

    this._examplesPageIndex++;

    if (!sentinel) {
      const s = document.createElement('div');
      s.className = 'examples-sentinel';
      s.style.height = '1px';
      container.appendChild(s);
    }

    const allLoaded = this._examplesPageIndex * this._examplesPageSize >= this._examplesFiltered.length;
    const sentinelEl = container.querySelector('.examples-sentinel');
    if (sentinelEl) sentinelEl.style.display = allLoaded ? 'none' : '';
    if (allLoaded && this._examplesObserver) {
      this._examplesObserver.disconnect();
      this._examplesObserver = null;
    }
  }

  _escHtml(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  }

  /* Load a built-in example by its id (used by the guide tutorials). */
  loadExampleById(id) {
    const ex = (window.EXAMPLE_SKETCHES || []).find(x => x.id === id);
    if (!ex) { this.showToast(`Example "${id}" not found`, 'error'); return; }
    this._setProjectName(ex.name);
    if (this.editor) this.editor.setCode(ex.code || '');
    this._board2Code = ex.board2Code || '';
    const b2ta = document.getElementById('board2-code-textarea');
    if (b2ta) b2ta.value = this._board2Code;
    if (ex.circuit && this.canvas) this._loadExampleCircuit(ex.circuit);
    this.showToast(`${ex.name} loaded`, 'success');
  }

  _loadExampleCircuit(key) {
    if (!this.canvas) return;

    // Data-driven circuit (serialized project data) — most examples use this
    if (key && typeof key === 'object' && Array.isArray(key.components)) {
      this.canvas.deserialize(key);
      this._syncBoardFromCanvas();
      this._refreshCanvasSummary();
      return;
    }

    // Legacy named circuits (hardcoded builders)
    const lower = String(key || '').toLowerCase();
    if (lower === 'led_on_13' || lower === 'blink') {
      this.canvas.clearCanvas();
      const boardType = this.sim.board === 'esp32_devkit_v1' ? 'esp32_devkit_v1'
        : this.sim.board === 'arduino_nano' ? 'arduino_nano' : 'arduino_uno';
      const board = this.canvas.addComponent(boardType, 200, 100);
      const led   = this.canvas.addComponent('led', 120, 280);
      const res   = this.canvas.addComponent('resistor', 120, 360);
      if (board && led && res) {
        this.canvas.addWire(board.id, 'D13', led.id, 'anode');
        this.canvas.addWire(led.id, 'cathode', res.id, 'p1');
        this.canvas.addWire(res.id, 'p2', board.id, 'GND1');
      }
      this._syncBoardFromCanvas();
      this._refreshCanvasSummary();
      setTimeout(() => this.canvas.fitView(), 80);
    }
  }

  /* ══════════════════════ PROPERTIES MODAL ══════════════════════ */
  openPropsModal(comp) {
    this._propsComp = comp;
    const title   = document.getElementById('modal-props-title');
    const body    = document.getElementById('modal-props-body');
    const modal   = document.getElementById('modal-props');
    const overlay = document.getElementById('modal-overlay');

    if (!comp || !body || !modal || !overlay) return;

    const def = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS[comp.type]);
    const g = (window.GuideManagerData && window.GuideManagerData.GUIDE_COMPONENTS[comp.type]) || {};
    if (title) title.textContent = `${def ? def.name : comp.type} Properties`;

    const esc = this._escHtml;
    const pinDescs = g.pins || {};

    // Description header block
    const infoBlock = document.createElement('div');
    infoBlock.className = 'props-info';
    const pinsPreview = (def && def.pins && def.pins.length)
      ? def.pins.map(p => {
          const pinInfo = pinDescs[p.id] || {};
          const label = pinInfo.label || p.label || p.id;
          const tip = pinInfo.desc || '';
          const typeMap = { digital: 'Digital', analog: 'Analog', power: 'Power', gnd: 'GND', pwm: 'PWM', signal: 'Signal' };
          return `<span class="props-pin" title="${esc(tip)}"><code>${esc(label)}</code><i>${esc(typeMap[p.type] || p.type)}</i></span>`;
        }).join('')
      : '';
    infoBlock.innerHTML = `
      <div class="props-desc">
        <span class="props-comp-icon">${this._escHtml(def ? def.icon : '🔧')}</span>
        <div>
          <p class="props-desc-text">${esc(g.longDesc || def?.desc || '')}</p>
          <button type="button" class="gh-btn gh-btn-ghost gh-btn-sm props-ref-btn">Open full reference →</button>
        </div>
      </div>
      ${pinsPreview ? `<div class="props-pins"><span class="props-pins-label">Pins</span><div class="props-pins-list">${pinsPreview}</div></div>` : ''}
      <div class="props-hr"></div>
      <p class="props-editable-label">Editable properties</p>`;
    body.innerHTML = '';
    body.appendChild(infoBlock);

    const rows = [];
    const isLED = comp.type && comp.type.startsWith('led');
    const LED_COLORS = [
      { name: 'Red',    hex: '#ff3333' },
      { name: 'Green',  hex: '#33ff66' },
      { name: 'Blue',   hex: '#3399ff' },
      { name: 'Yellow', hex: '#ffee33' },
      { name: 'Orange', hex: '#ff8833' },
      { name: 'White',  hex: '#ffffff' },
    ];
    // Build lookup of interactive control definitions for select rendering
    const interactiveDefs = {};
    if (def && def.interactive) {
      for (const ctrl of def.interactive) {
        if (ctrl.field) interactiveDefs[ctrl.field] = ctrl;
      }
    }

    Object.entries(comp.props || {}).forEach(([key, value]) => {
      if (isLED && key === 'colorName') return;

      // Handle interactive select controls
      const iDef = interactiveDefs[key];
      if (iDef && iDef.type === 'select' && Array.isArray(iDef.options)) {
        const row   = document.createElement('div');
        row.className = 'prop-row';
        const label = document.createElement('label');
        label.textContent = iDef.label || key.replace(/_/g, ' ');
        label.className = 'prop-label';
        const select = document.createElement('select');
        select.className = 'prop-input';
        select.name = key;
        iDef.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if (opt.value === String(value)) o.selected = true;
          select.appendChild(o);
        });
        row.appendChild(label);
        row.appendChild(select);
        rows.push(row);
        return;
      }

      if (isLED && key === 'color') {
        const row = document.createElement('div');
        row.className = 'prop-row';
        const label = document.createElement('label');
        label.textContent = 'LED Color';
        label.className = 'prop-label';
        const select = document.createElement('select');
        select.className = 'prop-input';
        select.name = 'color';
        const currentColor = value;
        LED_COLORS.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.hex;
          opt.textContent = c.name;
          if (c.hex === currentColor) opt.selected = true;
          opt.style.background = c.hex;
          opt.style.color = (c.hex === '#ffffff') ? '#000' : '#fff';
          select.appendChild(opt);
        });
        row.appendChild(label);
        row.appendChild(select);
        rows.push(row);
        return;
      }
      const row   = document.createElement('div');
      row.className = 'prop-row';
      const label = document.createElement('label');
      const propDoc = (g.props && g.props[key]) || '';
      label.textContent = key.replace(/_/g, ' ');
      label.className = 'prop-label';
      label.htmlFor = `prop-${key}`;
      if (propDoc) label.title = propDoc;
      const input = document.createElement('input');
      input.className = 'prop-input';
      input.name = key;
      input.id   = `prop-${key}`;
      input.value = value;
      if (typeof value === 'number') { input.type = 'number'; }
      else if (typeof value === 'boolean') { input.type = 'checkbox'; input.checked = value; }
      else { input.type = 'text'; }
      row.appendChild(label);
      row.appendChild(input);
      rows.push(row);
    });

    rows.forEach(row => body.appendChild(row));

    const refBtn = body.querySelector('.props-ref-btn');
    if (refBtn) refBtn.addEventListener('click', () => {
      this._closeModal();
      window.GuideManager?._renderCompDetail?.(
        document.getElementById('guide-pane-components'),
        comp.type
      );
      window.GuideManager?.open('components');
    });

    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    overlay.classList.remove('hidden');
    modal.classList.add('active');
  }

  _applyPropsModal() {
    if (!this._propsComp) return;
    const body = document.getElementById('modal-props-body');
    if (!body) return;
    const LED_COLORS = [
      { name: 'Red',    hex: '#ff3333' },
      { name: 'Green',  hex: '#33ff66' },
      { name: 'Blue',   hex: '#3399ff' },
      { name: 'Yellow', hex: '#ffee33' },
      { name: 'Orange', hex: '#ff8833' },
      { name: 'White',  hex: '#ffffff' },
    ];
    body.querySelectorAll('.prop-input').forEach(input => {
      const key = input.name;
      let val = input.value;
      if (input.type === 'number')   val = Number(val);
      if (input.type === 'checkbox') val = input.checked;
      this._propsComp.props[key] = val;
      // Sync runtimeState so draw() picks up the change immediately
      if (this._propsComp.runtimeState) this._propsComp.runtimeState[key] = val;
      if (key === 'color' && input.tagName === 'SELECT') {
        const match = LED_COLORS.find(c => c.hex === val);
        if (match) this._propsComp.props.colorName = match.name;
      }
    });
    this.canvas?._onChanged?.();
    this._closeModal();
    this.showToast('Properties updated', 'success');
  }

  _closePropsModal() {
    const modal = document.getElementById('modal-props');
    if (modal) modal.classList.remove('active');
    this._propsComp = null;
  }

  /* ══════════════════════ TOAST STACK ══════════════════════ */
  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || 'ℹ';
    const text = document.createElement('span');
    text.className = 'toast-msg';
    text.textContent = String(msg);
    toast.appendChild(icon);
    toast.appendChild(text);

    container.appendChild(toast);

    // Auto-dismiss
    const DURATION = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 350);
    }, DURATION);

    // Limit stack to 5 toasts
    while (container.childElementCount > 5) {
      container.firstChild?.remove();
    }
  }

  /* ══════════════════════ MOBILE SUPPORT ══════════════════════ */
  _initMobile() {
    this._isMobile = window.matchMedia('(max-width: 768px)').matches;
    this._openSheet = null;

    // Bottom nav buttons
    const nav = document.getElementById('mobile-nav');
    if (nav) {
      nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => this._handleMobileNav(btn));
      });
    }

    // Bottom sheet overlay close
    const overlay = document.getElementById('bottom-sheet-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this._closeAllMobileSheets());
    }

    // Bottom sheet close buttons
    document.querySelectorAll('.bottom-sheet-close').forEach(btn => {
      btn.addEventListener('click', () => this._closeAllMobileSheets());
    });

    // More menu actions
    document.querySelectorAll('.mobile-more-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.moreAction;
        this._closeAllMobileSheets();
        this._handleMoreAction(action);
      });
    });

    // Resize listener for orientation changes
    window.addEventListener('resize', () => {
      const wasMobile = this._isMobile;
      this._isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (wasMobile !== this._isMobile) {
        this._closeAllMobileSheets();
      }
    });

    // Swipe-to-close on bottom sheet handles
    document.querySelectorAll('.bottom-sheet-handle').forEach(handle => {
      let startY = 0;
      let currentY = 0;
      const sheet = handle.closest('.bottom-sheet');
      if (!sheet) return;

      handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
      }, { passive: true });
      handle.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
          sheet.style.transform = `translateY(${diff}px)`;
        }
      }, { passive: true });
      handle.addEventListener('touchend', () => {
        const diff = currentY - startY;
        sheet.style.transform = '';
        if (diff > 80) {
          this._closeAllMobileSheets();
        }
        startY = 0;
        currentY = 0;
      }, { passive: true });
    });
  }

  _handleMobileNav(btn) {
    const action = btn.dataset.action;

    // Update active state
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

    if (action === 'run') {
      this.isRunning ? this.stop() : this.run();
      btn.classList.toggle('running', this.isRunning);
      return;
    }

    // Toggle bottom sheet
    const sheetId = `sheet-${action}`;
    const sheet = document.getElementById(sheetId);

    if (this._openSheet === sheetId) {
      this._closeAllMobileSheets();
      return;
    }

    this._closeAllMobileSheets();
    if (sheet) {
      this._openMobileSheet(sheetId);
      btn.classList.add('active');
    }
  }

  _openMobileSheet(sheetId) {
    if (!this._isMobile) return;

    const sheet = document.getElementById(sheetId);
    const overlay = document.getElementById('bottom-sheet-overlay');
    if (!sheet || !overlay) return;

    // Clone content for dynamic sheets
    if (sheetId === 'sheet-components') {
      const body = document.getElementById('sheet-components-body');
      const container = document.getElementById('components-container');
      if (body && container && !body.hasChildNodes()) {
        body.appendChild(container.cloneNode(true));
      }
    } else if (sheetId === 'sheet-editor') {
      const body = document.getElementById('sheet-editor-body');
      const editorContainer = document.getElementById('editor-container');
      if (body && editorContainer && !body.hasChildNodes()) {
        body.appendChild(editorContainer);
        if (this.editor?.editor) {
          setTimeout(() => this.editor.editor.layout?.(), 100);
        }
      }
    } else if (sheetId === 'sheet-serial') {
      const body = document.getElementById('sheet-serial-body');
      const serialPane = document.getElementById('pane-serial');
      if (body && serialPane && !body.hasChildNodes()) {
        body.appendChild(serialPane.cloneNode(true));
      }
    }

    overlay.classList.add('active');
    sheet.classList.add('open');
    this._openSheet = sheetId;
    document.body.style.overflow = 'hidden';
  }

  _closeAllMobileSheets() {
    document.querySelectorAll('.bottom-sheet').forEach(s => {
      s.classList.remove('open');
      s.style.transform = '';
    });
    const overlay = document.getElementById('bottom-sheet-overlay');
    if (overlay) overlay.classList.remove('active');
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    this._openSheet = null;
    document.body.style.overflow = '';

    // Return editor container to its original position if it was moved
    if (this._isMobile) {
      const editorBody = document.getElementById('sheet-editor-body');
      const editorContainer = document.getElementById('editor-container');
      if (editorBody && editorContainer && editorBody.contains(editorContainer)) {
        const panelEditor = document.getElementById('panel-editor');
        if (panelEditor) {
          panelEditor.appendChild(editorContainer);
          if (this.editor?.editor) {
            setTimeout(() => this.editor.editor.layout?.(), 100);
          }
        }
      }
    }
  }

  _handleMoreAction(action) {
    switch (action) {
      case 'examples':
        this._renderExamples();
        this._showModal('modal-examples');
        break;
      case 'save':
        this.saveProject();
        break;
      case 'share':
        this.shareProject();
        break;
      case 'download':
        this.downloadProject();
        break;
      case 'new':
        this._newProject();
        break;
      case 'board':
        // TODO: board settings modal
        break;
      case 'shortcuts':
        this._showModal('modal-shortcuts');
        break;
      case 'guide':
        window.GuideManager?.open('home');
        break;
      case 'project-guide':
        window.open('docs/ArduSim_Guide.html', '_blank');
        break;
    }
  }
}

window.App = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.App.init());
} else {
  window.App.init();
}
