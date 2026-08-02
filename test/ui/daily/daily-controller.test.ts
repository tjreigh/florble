// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';

import { sessionKey } from '../../../src/platform/daily-persistence';
import { mountDailyApp } from '../../../src/ui/daily/daily-controller';

let root: Document;
const TEST_CLOCK = Object.freeze({
  now: () => new Date('2026-07-13T12:00:00.000Z'),
});

beforeAll(() => {
  vi.useFakeTimers();
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('florble:development-target', 'CLOUD');
  root = document.implementation.createHTMLDocument('Florble test');
  root.body.innerHTML = fixtureHtml();
  mountDailyApp(root, { clock: TEST_CLOCK });
});

afterEach(() => {
  vi.clearAllTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

test('runs six positional guesses and authorizes one overtime attempt', () => {
  expect(text('#mode-indicator')).toBe('Word clues');
  expect(text('#guess-counter')).toBe('Guess 1 of 6');
  expect(root.querySelectorAll('#palette button')).toHaveLength(26);
  expect([...root.querySelectorAll('#palette .palette-row')].map(
    (row) => [...row.querySelectorAll<HTMLButtonElement>('button')]
      .map((paletteButton) => paletteButton.dataset.letter)
      .join(''),
  )).toEqual(['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']);
  expect(button('#palette button[data-letter="I"]').getAttribute('aria-label')).toContain(
    'letter I',
  );
  expect(root.querySelectorAll('.picker-letter, .tile-letter')).toHaveLength(0);

  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);

  expect(root.querySelectorAll('.guess-row')).toHaveLength(6);
  expect(root.querySelectorAll('.guess-row[data-mode="positional"]')).toHaveLength(6);
  expect(text('#mode-indicator')).toBe('Getting another guess');
  expect(text('#guess-counter')).toBe('Guess 6 of 6');
  expect(text('#status')).toBe('Six guesses used. Hang on…');
  expect(button('#submit-button').disabled).toBe(true);
  expect([...root.querySelectorAll<HTMLButtonElement>('#palette button')].every(
    (paletteButton) => paletteButton.disabled,
  )).toBe(true);

  vi.advanceTimersByTime(900);

  expect(text('#mode-indicator')).toBe('Overtime clues');
  expect(text('#guess-counter')).toBe('Guess 7 of 7');
  expect(text('#status')).toBe('Not solved yet. One more guess is ready.');
  expect([...root.querySelectorAll<HTMLButtonElement>('#palette button')].some(
    (paletteButton) => !paletteButton.disabled,
  )).toBe(true);

  submitWord('CLOUD');

  expect(root.querySelectorAll('.guess-row')).toHaveLength(7);
  expect(root.querySelectorAll('.picker-letter, .tile-letter')).toHaveLength(0);
  expect(text('#mode-indicator')).toBe('Puzzle complete');
  expect(text('#guess-counter')).toBe('Result 6+1');
  expect(text('#status')).toBe('Solved after 1 overtime guess.');
  expect(text('#answer-reveal')).toContain('Result 6+1');
  expect(text('#answer-reveal')).toContain('Official score: 6+');
  expect(text('#answer-reveal')).toContain('Answer: CLOUD');
});

test('accepts physical letter keys, Backspace, and Enter through the reducer', () => {
  for (const key of ['a', 'b', 'o', 'u', 'x', 'Backspace', 't', 'Enter']) pressKey(key);

  expect(root.querySelectorAll('.guess-row')).toHaveLength(1);
  expect(text('#status')).toBe('Guess added.');
  expect(root.querySelectorAll('#current-guess .tile-glyph')).toHaveLength(0);
  expect(button('#palette button[data-letter="A"]').dataset.knowledge).toBe('absent');
  expect(button('#palette button[data-letter="O"]').dataset.knowledge).toBe('exact');
});

test('preserves native Enter behavior for focused command controls', () => {
  for (const key of ['a', 'b', 'o', 'u', 't']) pressKey(key);
  const rules = button('#rules-button');
  rules.focus();
  rules.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  }));

  expect(root.querySelectorAll('.guess-row')).toHaveLength(0);
  expect(text('#status')).toBe('');
});

test('keeps the strongest observed palette feedback for each glyph identity', () => {
  submitWord('ABOUT');
  expect(button('#palette button[data-letter="A"]').dataset.knowledge).toBe('absent');
  expect(button('#palette button[data-letter="O"]').dataset.knowledge).toBe('exact');
  expect(button('#palette button[data-letter="C"]').dataset.knowledge).toBe('unused');

  submitWord('BRICK');
  expect(button('#palette button[data-letter="C"]').dataset.knowledge).toBe('present');
  expect(button('#palette button[data-letter="C"]').getAttribute('aria-label')).toContain(
    'in the answer',
  );

  submitWord('CHASE');
  expect(button('#palette button[data-letter="C"]').dataset.knowledge).toBe('exact');
  expect(button('#palette button[data-letter="C"]').getAttribute('aria-label')).toContain(
    'right in at least one spot',
  );
});

test('switches to unbounded overtime and confirms a position on the third extension', () => {
  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);
  vi.advanceTimersByTime(900);
  submitWord('GIANT');
  vi.advanceTimersByTime(900);
  submitWord('GIVEN');
  vi.advanceTimersByTime(900);

  expect(text('#guess-counter')).toBe('Overtime · Guess 9');
  expect(text('#status')).toBe(
    'No need to stop. Overtime is now open. 1 answer position revealed.',
  );
  expect(element('#overtime-assistance').hidden).toBe(false);
  expect(text('#overtime-assistance')).toContain('1 of 5 answer letters revealed.');
  expect(root.querySelectorAll('#overtime-assistance [data-confirmed="true"]')).toHaveLength(1);
  expect(
    root.querySelector('#overtime-assistance [data-confirmed="true"]')?.getAttribute('aria-label'),
  ).toContain('Position 1');
});

test('persists and restores unfinished input through the v4 session adapter', () => {
  pressKey('c');
  pressKey('r');

  expect(JSON.parse(localStorage.getItem(sessionKey('2026-07-13')) ?? '{}')).toMatchObject({
    schemaVersion: 4,
    puzzleId: '2026-07-13',
    answer: 'CLOUD',
    currentGuess: 'CR',
  });

  remount();

  expect(root.querySelectorAll('#current-guess .tile-glyph')).toHaveLength(2);
  expect(element('#current-guess').getAttribute('aria-label')).toContain('letter C');
  expect(element('#current-guess').getAttribute('aria-label')).toContain('letter R');
});

test('restores an authorized overtime boundary without granting an extra attempt', () => {
  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);
  vi.advanceTimersByTime(900);

  expect(JSON.parse(localStorage.getItem(sessionKey('2026-07-13')) ?? '{}')).toMatchObject({
    overtimeAllowance: 1,
    assistanceLevel: 0,
  });

  remount();

  expect(text('#guess-counter')).toBe('Guess 7 of 7');
  expect(text('#status')).toBe('Welcome back — 6 guesses restored.');
  expect(root.querySelectorAll('.guess-row')).toHaveLength(6);
});

test('restores the nominal conclusion and waits the full delay before authorization', () => {
  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);

  expect(JSON.parse(localStorage.getItem(sessionKey('2026-07-13')) ?? '{}')).toMatchObject({
    overtimeAllowance: 0,
    officialResult: { status: 'overtime', officialGuesses: 6 },
  });

  remount();
  expect(text('#mode-indicator')).toBe('Getting another guess');
  expect(button('#submit-button').disabled).toBe(true);

  vi.advanceTimersByTime(899);
  expect(text('#mode-indicator')).toBe('Getting another guess');

  vi.advanceTimersByTime(1);
  expect(text('#guess-counter')).toBe('Guess 7 of 7');
  expect(text('#status')).toBe('Not solved yet. One more guess is ready.');
});

test('restores an exhausted overtime extension and authorizes only the next attempt', () => {
  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);
  vi.advanceTimersByTime(900);
  submitWord('GIANT');

  expect(text('#guess-counter')).toBe('Guess 7 of 7');
  expect(text('#status')).toBe('That one didn\'t solve it. One moment…');

  remount();
  expect(text('#mode-indicator')).toBe('Getting another guess');
  vi.advanceTimersByTime(900);

  expect(text('#guess-counter')).toBe('Guess 8 of 8');
  expect(JSON.parse(localStorage.getItem(sessionKey('2026-07-13')) ?? '{}')).toMatchObject({
    overtimeAllowance: 2,
    officialResult: { status: 'overtime', officialGuesses: 6 },
  });
});

test('restores atomic assistance at the third extension', () => {
  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);
  vi.advanceTimersByTime(900);
  submitWord('GIANT');
  vi.advanceTimersByTime(900);
  submitWord('GIVEN');
  vi.advanceTimersByTime(900);

  expect(JSON.parse(localStorage.getItem(sessionKey('2026-07-13')) ?? '{}')).toMatchObject({
    overtimeAllowance: 3,
    assistanceLevel: 1,
    officialResult: { status: 'overtime', officialGuesses: 6 },
  });

  remount();

  expect(text('#guess-counter')).toBe('Overtime · Guess 9');
  expect(text('#overtime-assistance')).toContain('1 of 5 answer letters revealed.');
  expect(root.querySelectorAll('#overtime-assistance [data-confirmed="true"]')).toHaveLength(1);
});

test('restores overtime completion without changing the official record', () => {
  submitWords(['ABOUT', 'BRICK', 'CHASE', 'DRINK', 'EVENT', 'FIGHT']);
  vi.advanceTimersByTime(900);
  submitWord('CLOUD');

  expect(text('#guess-counter')).toBe('Result 6+1');
  expect(text('#answer-reveal')).toContain('Official score: 6+');

  remount();

  expect(text('#mode-indicator')).toBe('Puzzle complete');
  expect(text('#guess-counter')).toBe('Result 6+1');
  expect(text('#answer-reveal')).toContain('Official score: 6+');
  expect(button('#submit-button').disabled).toBe(true);
});

test('migrates a matching legacy v3 session into the v4 namespace', () => {
  vi.clearAllTimers();
  localStorage.clear();
  localStorage.setItem('florble:development-target', 'CLOUD');
  localStorage.setItem('florble:v3:2026-07-13', JSON.stringify({
    date: '2026-07-13',
    answer: 'CLOUD',
    guesses: ['ABOUT'],
    finished: false,
  }));

  root = document.implementation.createHTMLDocument('Florble migration test');
  root.body.innerHTML = fixtureHtml();
  mountDailyApp(root, { clock: TEST_CLOCK });

  expect(root.querySelectorAll('.guess-row')).toHaveLength(1);
  expect(localStorage.getItem(sessionKey('2026-07-13'))).toContain('"schemaVersion":4');
});

function submitWords(words: readonly string[]): void {
  for (const word of words) submitWord(word);
}

function submitWord(word: string): void {
  for (const letter of word) button(`#palette button[data-letter="${letter}"]`).click();
  button('#submit-button').click();
}

function pressKey(key: string): void {
  root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
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

function remount(): void {
  vi.clearAllTimers();
  root = document.implementation.createHTMLDocument('Florble restored test');
  root.body.innerHTML = fixtureHtml();
  mountDailyApp(root, { clock: TEST_CLOCK });
}

function fixtureHtml(): string {
  return `
    <main>
      <div id="development-controls" hidden>
        <select id="target-select"></select>
        <button id="reset-target-button" type="button">Restart</button>
      </div>
      <button id="rules-button" type="button">Rules</button>
      <section id="daily-view">
      <section class="instrument-panel">
        <p id="mode-indicator"></p>
        <p id="guess-counter"></p>
        <div id="status"></div>
        <div id="board"></div>
        <section id="overtime-assistance" hidden></section>
        <div id="current-guess"></div>
        <div id="palette"></div>
        <button id="delete-button" type="button">Delete</button>
        <button id="submit-button" type="button">Submit</button>
        <section id="answer-reveal" hidden></section>
      </section>
      </section>
    </main>
    <dialog id="rules-dialog">
      <button id="close-rules" type="button">Close</button>
    </dialog>
  `;
}
