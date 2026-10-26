'use strict';

(function (global) {
  const INPUTS = ['I0_0', 'I0_1', 'I0_2', 'I0_3'];
  const OUTPUTS = ['Q0_0', 'Q0_1', 'Q0_2', 'Q0_3'];
  const INPUT_PINS = { I0_0: 2, I0_1: 3, I0_2: 4, I0_3: 5 };
  const OUTPUT_PINS = { Q0_0: 8, Q0_1: 9, Q0_2: 10, Q0_3: 11 };
  const CONTACT_TYPES = new Set(['NO', 'NC']);
  const BLOCK_TYPES = new Set(['TON', 'TOF', 'CTU']);

  function defaultProgram() {
    return {
      mode: 'code',
      rungs: [{ elements: [{ type: 'NO', input: 'I0_0' }], output: 'Q0_0' }],
    };
  }

  function normalizeProgram(program) {
    if (!program || typeof program !== 'object' || !Array.isArray(program.rungs)) {
      throw new Error('Invalid PLC program: expected a rungs list.');
    }
    if (program.rungs.length > 100) throw new Error('A PLC program cannot contain more than 100 rungs.');

    const rungs = program.rungs.map((rung, rungIndex) => {
      if (!rung || typeof rung !== 'object' || !Array.isArray(rung.elements)) {
        throw new Error(`Rung ${rungIndex + 1} is invalid.`);
      }
      if (rung.elements.length > 16) throw new Error(`Rung ${rungIndex + 1} has more than 16 elements.`);
      if (!OUTPUTS.includes(rung.output)) throw new Error(`Rung ${rungIndex + 1} has an invalid output.`);

      const elements = rung.elements.map((element, elementIndex) => {
        if (!element || typeof element !== 'object') {
          throw new Error(`Element ${elementIndex + 1} in rung ${rungIndex + 1} is invalid.`);
        }
        if (CONTACT_TYPES.has(element.type)) {
          if (!INPUTS.includes(element.input)) {
            throw new Error(`Element ${elementIndex + 1} in rung ${rungIndex + 1} has an invalid input.`);
          }
          return { type: element.type, input: element.input };
        }
        if (BLOCK_TYPES.has(element.type)) {
          const preset = Number(element.preset);
          const presetLimit = element.type === 'CTU' ? 65535 : 600000;
          if (!Number.isInteger(preset) || preset < 1 || preset > presetLimit) {
            throw new Error(`Element ${elementIndex + 1} in rung ${rungIndex + 1} needs a preset from 1 to ${presetLimit}.`);
          }
          const normalized = { type: element.type, preset };
          if (element.type === 'CTU') {
            if (!INPUTS.includes(element.resetInput)) {
              throw new Error(`CTU in rung ${rungIndex + 1} has an invalid reset input.`);
            }
            normalized.resetInput = element.resetInput;
          }
          return normalized;
        }
        throw new Error(`Element ${elementIndex + 1} in rung ${rungIndex + 1} has an unsupported type.`);
      });
      return { elements, output: rung.output };
    });

    return {
      mode: program.mode === 'ladder' ? 'ladder' : 'code',
      rungs,
    };
  }

  function generateArduinoCode(program) {
    const normalized = normalizeProgram(program);
    const rungs = normalized.rungs;
    if (rungs.length === 0) throw new Error('Add at least one rung before running the PLC program.');

    const declarations = [];
    const loopLines = [];
    const outputPins = new Set(rungs.map(rung => OUTPUT_PINS[rung.output]));
    let blockIndex = 0;
    const timerBlocks = [];

    rungs.forEach((rung, rungIndex) => {
      const rungName = `_plcRung${rungIndex}`;
      loopLines.push(`  bool ${rungName} = true;`);
      rung.elements.forEach(element => {
        if (CONTACT_TYPES.has(element.type)) {
          const pin = INPUT_PINS[element.input];
          const activeLevel = element.type === 'NO' ? 'LOW' : 'HIGH';
          loopLines.push(`  ${rungName} = ${rungName} && (digitalRead(${pin}) == ${activeLevel});`);
          return;
        }

        const id = blockIndex++;
        const prefix = `_plc${element.type}${id}`;
        const preset = `${element.preset}`;
        if (element.type === 'TON') {
          declarations.push(`unsigned long ${prefix}Start = 0;`, `bool ${prefix}Active = false;`, `bool ${prefix}Q = false;`);
          timerBlocks.push(element.type);
          loopLines.push(`  if (${rungName}) {`);
          loopLines.push(`    if (!${prefix}Active) { ${prefix}Active = true; ${prefix}Start = plcNow; }`);
          loopLines.push(`    ${prefix}Q = (plcNow - ${prefix}Start >= ${preset});`);
          loopLines.push(`  } else { ${prefix}Active = false; ${prefix}Q = false; }`);
          loopLines.push(`  ${rungName} = ${prefix}Q;`);
        } else if (element.type === 'TOF') {
          declarations.push(`unsigned long ${prefix}Start = 0;`, `bool ${prefix}Q = false;`);
          timerBlocks.push(element.type);
          loopLines.push(`  if (${rungName}) { ${prefix}Q = true; ${prefix}Start = plcNow; }`);
          loopLines.push(`  else if (${prefix}Q && (plcNow - ${prefix}Start >= ${preset})) { ${prefix}Q = false; }`);
          loopLines.push(`  ${rungName} = ${prefix}Q;`);
        } else {
          const resetPin = INPUT_PINS[element.resetInput];
          declarations.push(`unsigned int ${prefix}Count = 0;`, `bool ${prefix}Previous = false;`);
          loopLines.push(`  if (digitalRead(${resetPin}) == LOW) { ${prefix}Count = 0; }`);
          loopLines.push(`  if (${rungName} && !${prefix}Previous && ${prefix}Count < ${preset}) { ${prefix}Count++; }`);
          loopLines.push(`  ${prefix}Previous = ${rungName};`);
          loopLines.push(`  ${rungName} = ${rungName} && (${prefix}Count >= ${preset});`);
        }
      });
      loopLines.push(`  _plcOutput${OUTPUT_PINS[rung.output]} = _plcOutput${OUTPUT_PINS[rung.output]} || ${rungName};`);
    });

    const outputStateDeclarations = [...outputPins].sort((a, b) => a - b)
      .map(pin => `  bool _plcOutput${pin} = false;`);
    const outputWrites = [...outputPins].sort((a, b) => a - b)
      .map(pin => `  digitalWrite(${pin}, _plcOutput${pin} ? HIGH : LOW);`);
    const inputSetup = INPUTS.map(input => `  pinMode(${INPUT_PINS[input]}, INPUT_PULLUP);`).join('\n');
    const outputSetup = [...new Set(Object.values(OUTPUT_PINS))].map(pin =>
      `  pinMode(${pin}, OUTPUT);\n  digitalWrite(${pin}, LOW);`).join('\n');
    const needsClock = timerBlocks.length > 0;

    return [
      '// Generated by ArduSim Ladder Diagram editor.',
      '// I0.x inputs are active-low; Q0.x outputs map to Arduino digital pins 8-11.',
      ...declarations,
      '',
      'void setup() {',
      inputSetup,
      outputSetup,
      '}',
      '',
      'void loop() {',
      ...(needsClock ? ['  const unsigned long plcNow = millis();'] : []),
      ...outputStateDeclarations,
      ...loopLines,
      ...outputWrites,
      '}',
    ].join('\n');
  }

  function inputOptions(selected) {
    return INPUTS.map(input => `<option value="${input}"${input === selected ? ' selected' : ''}>${input.replace('_', '.')}</option>`).join('');
  }

  function outputOptions(selected) {
    return OUTPUTS.map(output => `<option value="${output}"${output === selected ? ' selected' : ''}>${output.replace('_', '.')}</option>`).join('');
  }

  class PLCLadderEditor {
    constructor() {
      this.program = defaultProgram();
      this.activeRung = 0;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.container = document.getElementById('plc-editor');
      this.rungsEl = document.getElementById('plc-rungs');
      if (!this.container || !this.rungsEl) return;

      this.container.addEventListener('click', event => this._handleClick(event));
      this.container.addEventListener('change', event => this._handleChange(event));
      document.getElementById('editor-mode-code')?.addEventListener('click', () => this.setMode('code'));
      document.getElementById('editor-mode-ladder')?.addEventListener('click', () => this.setMode('ladder'));
      this._render();
    }

    setMode(mode, { markDirty = true } = {}) {
      this.program.mode = mode === 'ladder' ? 'ladder' : 'code';
      const ladderMode = this.program.mode === 'ladder';
      const editorBody = document.getElementById('editor-body');
      const boardTabs = document.querySelector('.board-tabs');
      const board2Area = document.getElementById('board2-editor-area');
      const ladderPanel = document.getElementById('plc-editor');
      const formatButton = document.getElementById('btn-format-code');
      const codeTab = document.getElementById('editor-mode-code');
      const ladderTab = document.getElementById('editor-mode-ladder');
      const footerLang = document.getElementById('editor-lang');
      if (editorBody) editorBody.style.display = ladderMode || window.App?._activeBoard === 1 ? 'none' : '';
      if (board2Area) board2Area.style.display = !ladderMode && window.App?._activeBoard === 1 ? 'flex' : 'none';
      if (boardTabs) boardTabs.style.display = ladderMode ? 'none' : '';
      if (ladderPanel) ladderPanel.hidden = !ladderMode;
      if (formatButton) formatButton.style.display = ladderMode ? 'none' : '';
      if (codeTab) {
        codeTab.classList.toggle('active', !ladderMode);
        codeTab.setAttribute('aria-selected', String(!ladderMode));
      }
      if (ladderTab) {
        ladderTab.classList.toggle('active', ladderMode);
        ladderTab.setAttribute('aria-selected', String(ladderMode));
      }
      if (footerLang) footerLang.textContent = ladderMode ? 'Ladder Logic · Arduino-compatible' : 'Arduino C++';
      if (ladderMode) this._render();
      else window.EditorManager?.editor?.layout?.();
      if (markDirty) this._markChanged();
    }

    serialize() {
      return {
        mode: this.program.mode,
        rungs: this.program.rungs.map(rung => ({
          output: rung.output,
          elements: rung.elements.map(element => ({ ...element })),
        })),
      };
    }

    load(program) {
      this.program = program ? normalizeProgram(program) : defaultProgram();
      this.activeRung = Math.max(0, this.program.rungs.length - 1);
      this.setMode(this.program.mode, { markDirty: false });
      this._render();
    }

    reset() {
      this.load(defaultProgram());
      this._markChanged();
    }

    getGeneratedCode() {
      return generateArduinoCode(this.program);
    }

    _handleClick(event) {
      const actionButton = event.target.closest('[data-plc-action]');
      if (!actionButton || !this.container.contains(actionButton)) {
        const rungEl = event.target.closest('.plc-rung');
        if (rungEl && !event.target.closest('button, select, input')) {
          this.activeRung = Number(rungEl.dataset.rungIndex);
          this._render();
        }
        return;
      }
      const action = actionButton.dataset.plcAction;
      const rungIndex = Number(actionButton.dataset.rungIndex);
      if (action === 'add-rung') {
        this.program.rungs.push({ elements: [{ type: 'NO', input: 'I0_0' }], output: 'Q0_0' });
        this.activeRung = this.program.rungs.length - 1;
      } else if (action === 'add-element') {
        const rung = this.program.rungs[this.activeRung];
        if (!rung) return;
        const type = actionButton.dataset.plcKind;
        if (CONTACT_TYPES.has(type)) rung.elements.push({ type, input: 'I0_0' });
        else if (type === 'TON' || type === 'TOF') rung.elements.push({ type, preset: 1000 });
        else if (type === 'CTU') rung.elements.push({ type, preset: 1, resetInput: 'I0_3' });
      } else if (action === 'remove-rung' && this.program.rungs.length > 1) {
        this.program.rungs.splice(rungIndex, 1);
        this.activeRung = Math.min(this.activeRung, this.program.rungs.length - 1);
      } else if (action === 'remove-element') {
        const rung = this.program.rungs[rungIndex];
        if (rung) rung.elements.splice(Number(actionButton.dataset.elementIndex), 1);
        this.activeRung = rungIndex;
      } else {
        return;
      }
      this._render();
      this._markChanged();
    }

    _handleChange(event) {
      const control = event.target.closest('[data-plc-field]');
      if (!control || !this.container.contains(control)) return;
      const rungIndex = Number(control.dataset.rungIndex);
      const rung = this.program.rungs[rungIndex];
      if (!rung) return;
      const field = control.dataset.plcField;
      if (field === 'output') {
        rung.output = control.value;
      } else {
        const element = rung.elements[Number(control.dataset.elementIndex)];
        if (!element) return;
        if (field === 'preset') element.preset = Number(control.value);
        else element[field] = control.value;
      }
      this.activeRung = rungIndex;
      this._render();
      this._markChanged();
    }

    _markChanged() {
      window.StorageManager?.markDirty?.();
      window.App?._triggerAutoSave?.();
    }

    _render() {
      if (!this.rungsEl) return;
      this.rungsEl.innerHTML = this.program.rungs.map((rung, rungIndex) => {
        const elements = rung.elements.map((element, elementIndex) => {
          const itemAttrs = `data-rung-index="${rungIndex}" data-element-index="${elementIndex}"`;
          if (CONTACT_TYPES.has(element.type)) {
            return `<div class="plc-element plc-contact">
              <button type="button" class="plc-remove" data-plc-action="remove-element" ${itemAttrs} aria-label="Remove contact">×</button>
              <select data-plc-field="type" ${itemAttrs} aria-label="Contact type">
                <option value="NO"${element.type === 'NO' ? ' selected' : ''}>NO</option>
                <option value="NC"${element.type === 'NC' ? ' selected' : ''}>NC</option>
              </select>
              <span class="plc-contact-symbol">${element.type === 'NO' ? '──| |──' : '──|/|──'}</span>
              <select data-plc-field="input" ${itemAttrs} aria-label="Contact input">${inputOptions(element.input)}</select>
            </div>`;
          }
          const presetLabel = element.type === 'CTU' ? 'Count' : 'ms';
          const resetControl = element.type === 'CTU'
            ? `<label>Reset <select data-plc-field="resetInput" ${itemAttrs} aria-label="Counter reset input">${inputOptions(element.resetInput)}</select></label>`
            : '';
          return `<div class="plc-element plc-function-block">
            <button type="button" class="plc-remove" data-plc-action="remove-element" ${itemAttrs} aria-label="Remove ${element.type} block">×</button>
            <strong>${element.type}</strong>
            <label>Preset <input type="number" min="1" max="${element.type === 'CTU' ? 65535 : 600000}" value="${element.preset}" data-plc-field="preset" ${itemAttrs} aria-label="${element.type} ${presetLabel} preset"></label>
            ${resetControl}
            <span class="plc-block-output">Q</span>
          </div>`;
        }).join('<span class="plc-series-wire" aria-hidden="true"></span>');
        return `<div class="plc-rung${rungIndex === this.activeRung ? ' active' : ''}" data-rung-index="${rungIndex}">
          <div class="plc-rail" aria-hidden="true"></div>
          <div class="plc-right-rail" aria-hidden="true"></div>
          <span class="plc-rung-number">Rung ${rungIndex + 1}</span>
          <div class="plc-rung-logic">${elements || '<span class="plc-empty-rung">Add a contact or function block</span>'}<span class="plc-series-wire" aria-hidden="true"></span>
            <label class="plc-coil"><span>──( )──</span><select data-plc-field="output" data-rung-index="${rungIndex}" aria-label="Output coil">${outputOptions(rung.output)}</select></label>
          </div>
          <button type="button" class="plc-remove-rung" data-plc-action="remove-rung" data-rung-index="${rungIndex}" aria-label="Remove rung" ${this.program.rungs.length === 1 ? 'disabled' : ''}>Remove</button>
        </div>`;
      }).join('');

      const generated = document.getElementById('plc-generated-code');
      if (generated) {
        try {
          generated.textContent = this.getGeneratedCode();
        } catch (error) {
          generated.textContent = error.message;
        }
      }

    }
  }

  global.PLCLadder = {
    INPUTS,
    OUTPUTS,
    defaultProgram,
    normalizeProgram,
    generateArduinoCode,
    PLCLadderEditor,
  };
})(window);
