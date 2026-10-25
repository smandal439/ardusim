import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.style = {};
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.value = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.scrollTop = 0;
  }

  appendChild(child) { this.children.push(child); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  setAttribute(name, value) { this.attributes[name] = value; }
  dispatchEvent(event) {
    for (const handler of this.listeners[event.type] || []) handler(event);
    return true;
  }
  focus() {}
}

function createMobileEditor() {
  const container = new FakeElement('div');
  const document = {
    getElementById: (id) => id === 'editor-container' ? container : null,
    createElement: (tagName) => new FakeElement(tagName),
  };
  const window = {};
  const source = fs.readFileSync(path.join(ROOT, 'js/editor.js'), 'utf8');
  const editor = new Function(
    'window', 'document', 'Event', 'setTimeout', 'clearTimeout',
    `${source}\nreturn window.EditorManager;`,
  )(window, document, Event, () => 1, () => {});
  editor._initMobileEditor();

  const helperBar = container.children[0];
  const wrapper = container.children[1];
  const textarea = wrapper.children[1];
  return { editor, helperBar, textarea };
}

describe('mobile code editor', () => {
  it('keeps typed and shortcut-inserted text in the active file', () => {
    const { editor, helperBar, textarea } = createMobileEditor();
    textarea.value = 'digitalWrite(LED_BUILTIN, HIGH);';
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    textarea.dispatchEvent(new Event('input'));
    expect(editor.getCode()).toBe('digitalWrite(LED_BUILTIN, HIGH);');

    const highButton = helperBar.children.find(button => button.textContent === 'HIGH');
    highButton.onclick({ preventDefault() {} });
    expect(editor.getCode()).toBe('digitalWrite(LED_BUILTIN, HIGH);HIGH');
  });

  it('shows loaded example files in the mobile textarea', () => {
    const { editor, textarea } = createMobileEditor();
    editor.loadFiles({
      'sketch.ino': 'void setup() {}\nvoid loop() {}',
      'helper.h': '#define LED_PIN 13',
    }, 'sketch.ino');

    expect(textarea.value).toBe('void setup() {}\nvoid loop() {}');
    expect(editor.getCode()).toBe(textarea.value);

    editor.loadFiles({
      'sketch.ino': 'void setup() { pinMode(13, OUTPUT); }',
      'helper.h': '#define LED_PIN 13',
    }, 'sketch.ino');
    expect(textarea.value).toBe('void setup() { pinMode(13, OUTPUT); }');
  });

  it('adds matching indentation when inserting a new line inside a block', () => {
    const { editor, textarea } = createMobileEditor();
    textarea.value = 'void loop() {\n  if (ready) {';
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    textarea.dispatchEvent({
      type: 'keydown',
      key: 'Enter',
      preventDefault() {},
    });
    expect(editor.getCode()).toBe('void loop() {\n  if (ready) {\n    ');
  });

  it('provides a blink sketch matching the D13 starter circuit', () => {
    const { editor, textarea } = createMobileEditor();
    editor.setCode(editor.BLINK_STARTER_CODE);
    expect(textarea.value).toBe(editor.BLINK_STARTER_CODE);
    expect(editor.getCode()).toContain('pinMode(13, OUTPUT);');
    expect(editor.getCode()).toContain('digitalWrite(13, HIGH);');
    expect(editor.getCode()).toContain('digitalWrite(13, LOW);');
  });

  it('provides touch-sized shortcuts and a zoom-safe editor font', () => {
    const { helperBar, textarea } = createMobileEditor();
    expect(helperBar.children.every(button => button.style.cssText.includes('min-height:40px'))).toBe(true);
    expect(textarea.style.cssText).toContain('font-size:16px');
  });
});
