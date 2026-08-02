// @vitest-environment jsdom

import { beforeEach, expect, test } from 'vitest';

import { CIPHER_FILE_001, CIPHER_FILE_002 } from '../../../src/content/cipher-files';
import { cipherStateKey } from '../../../src/platform/cipher-persistence';
import { mountCipherApp, type CipherApp } from '../../../src/ui/cipher/cipher-controller';

let root: Document;
let cipherApp: CipherApp;
const TEST_CLOCK = Object.freeze({
  now: () => new Date('2026-08-02T12:00:00.000Z'),
});

beforeEach(() => {
  localStorage.clear();
  root = createRoot();
  cipherApp = mountCipherApp(CIPHER_FILE_001, root, { clock: TEST_CLOCK });
});

test('renders the complete connected Cipher File and vocabulary', () => {
  expect(root.querySelectorAll('.cipher-specimen-row')).toHaveLength(8);
  expect(root.querySelectorAll('.cipher-glyph-cell')).toHaveLength(40);
  expect(root.querySelectorAll('#cipher-letter-picker button')).toHaveLength(26);
  expect(root.querySelectorAll('.candidate-chip')).toHaveLength(12);
  expect(text('#cipher-progress')).toBe('0 of 10 letters locked');
});

test('propagates a tentative assignment and confirms it explicitly', () => {
  selectGlyph('diamond');
  button('#cipher-letter-picker button[data-letter="S"]').click();

  expect([...root.querySelectorAll('[data-glyph-id="diamond"] .cipher-plaintext')].every(
    (plaintext) => plaintext.textContent === 'S',
  )).toBe(true);
  expect(root.querySelector('[data-glyph-id="diamond"]')?.getAttribute('data-confidence')).toBe(
    'tentative',
  );

  button('#confirm-assignment').click();

  expect(text('#cipher-progress')).toBe('1 of 10 letters locked');
  expect(root.querySelector('[data-glyph-id="diamond"]')?.getAttribute('data-confidence')).toBe(
    'confirmed',
  );
});

test('allows tentative conflicts and identifies both glyph assignments', () => {
  assignAndConfirm('diamond', 'S');
  selectGlyph('triangle');
  button('#cipher-letter-picker button[data-letter="S"]').click();

  expect(element('#cipher-contradictions').hidden).toBe(false);
  expect(text('#cipher-contradictions')).toContain(
    'The letter S is being used for both divided diamond and outline triangle',
  );

  button('#confirm-assignment').click();
  expect(text('#cipher-status')).toBe('That letter is already locked to another symbol.');
  expect(element('#cipher-status').dataset.tone).toBe('error');
});

test('supports physical-letter assignment for the selected glyph', () => {
  selectGlyph('circle');
  root.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true, cancelable: true }));

  expect([...root.querySelectorAll('[data-glyph-id="circle"] .cipher-plaintext')].every(
    (plaintext) => plaintext.textContent === 'O',
  )).toBe(true);
});

test('switches Cipher Files and restores each puzzle independently', () => {
  assignAndConfirm('diamond', 'S');

  cipherApp.showFile(CIPHER_FILE_002);
  expect(text('#cipher-candidate-summary')).toBe('8 answers · 4 decoys');
  expect(root.querySelectorAll('.cipher-specimen-row')).toHaveLength(8);
  expect(text('#cipher-progress')).toBe('0 of 11 letters locked');

  cipherApp.showFile(CIPHER_FILE_001);
  expect(text('#cipher-progress')).toBe('1 of 10 letters locked');
});

test('restores assignments and hints from device-local persistence', () => {
  assignAndConfirm('diamond', 'S');
  button('#reveal-cipher-hint').click();
  expect(localStorage.getItem(cipherStateKey(CIPHER_FILE_001.id))).toContain('shared-tail');

  root = createRoot();
  mountCipherApp(CIPHER_FILE_001, root, { clock: TEST_CLOCK });

  expect(text('#cipher-progress')).toBe('1 of 10 letters locked');
  expect(text('#cipher-hint-list')).toContain('same three letters');
  expect(text('#cipher-status')).toBe('Picked up where you left off: 1 symbol filled in.');
});

test('completes the mapping and can restart the file', () => {
  for (const glyph of CIPHER_FILE_001.glyphs) {
    assignAndConfirm(glyph.id, CIPHER_FILE_001.solution[glyph.id]!);
  }

  expect(text('#cipher-progress')).toBe('Puzzle solved');
  expect(element('#cipher-completion').hidden).toBe(false);
  expect(text('#cipher-completion')).toContain(
    'STONE · ATONE · ALONE · CLONE · CLOSE · CHOSE · WHOSE · WHOLE',
  );

  button('#reset-cipher-file').click();
  expect(text('#cipher-progress')).toBe('0 of 10 letters locked');
  expect(element('#cipher-completion').hidden).toBe(true);
});

function assignAndConfirm(glyphId: string, letter: string): void {
  selectGlyph(glyphId);
  button(`#cipher-letter-picker button[data-letter="${letter}"]`).click();
  button('#confirm-assignment').click();
}

function selectGlyph(glyphId: string): void {
  button(`.cipher-glyph-cell[data-glyph-id="${glyphId}"]`).click();
}

function text(selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? '';
}

function button(selector: string): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(selector);
  if (!found) throw new Error(`Missing button: ${selector}`);
  return found;
}

function element(selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

function createRoot(): Document {
  const nextRoot = document.implementation.createHTMLDocument('Cipher controller test');
  nextRoot.body.innerHTML = `
    <section id="cipher-view" tabindex="-1">
      <section id="cipher-panel">
        <p id="cipher-brief"></p>
        <span id="cipher-candidate-summary"></span>
        <p id="cipher-progress"></p>
        <div id="cipher-status"></div>
        <div id="cipher-specimens"></div>
        <div id="selected-glyph"></div>
        <div id="cipher-letter-picker"></div>
        <button id="clear-assignment" type="button">Clear</button>
        <button id="confirm-assignment" type="button">Confirm</button>
        <section id="cipher-contradictions" hidden></section>
        <div id="cipher-candidates"></div>
        <span id="cipher-viability"></span>
        <div id="cipher-assignments"></div>
        <button id="reveal-cipher-hint" type="button">Hint</button>
        <ol id="cipher-hint-list"></ol>
        <section id="cipher-completion" hidden></section>
        <button id="reset-cipher-file" type="button">Restart</button>
      </section>
    </section>
  `;
  return nextRoot;
}
