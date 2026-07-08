import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FINAL_CAP,
  GLYPH_MAP,
  GLYPH_PICKER_LETTERS,
  GUESSES,
  TARGETS,
  dailyAnswer,
  glyphVariantMarker,
  isDevelopmentHostname,
  isValidGuess,
  renderWord,
  scorePositional,
  scorePositionless,
} from './game.mjs';

test('glyph map covers the alphabet and exposes only deliberate ambiguities', () => {
  assert.deepEqual(Object.keys(GLYPH_MAP), [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
  assert.deepEqual(GLYPH_PICKER_LETTERS, [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
  assert.equal(new Set(Object.values(GLYPH_MAP)).size, 24);
  assert.equal(GLYPH_MAP.A, GLYPH_MAP.I);
  assert.equal(GLYPH_MAP.H, GLYPH_MAP.M);
  assert.equal(glyphVariantMarker('A'), '•');
  assert.equal(glyphVariantMarker('I'), '••');
  assert.equal(glyphVariantMarker('H'), '•');
  assert.equal(glyphVariantMarker('M'), '••');
  assert.equal(glyphVariantMarker('R'), '');
  assert.throws(() => renderWord('HI!'), /Unsupported canonical letter/);
});

test('accepted dictionary contains exactly the deliberate collision pairs', () => {
  const collisions = [...Map.groupBy(GUESSES, renderWord).values()]
    .filter((words) => words.length > 1)
    .map((words) => [...words].sort());

  assert.deepEqual(collisions, [
    ['HONEY', 'MONEY'],
    ['HOUSE', 'MOUSE'],
    ['WATCH', 'WITCH'],
  ]);
});

test('target and accepted-guess dictionaries satisfy MVP invariants', () => {
  assert.ok(TARGETS.length >= 8 && TARGETS.length <= 12);
  assert.ok(GUESSES.length >= 300);
  assert.equal(new Set(TARGETS).size, TARGETS.length);
  assert.equal(new Set(GUESSES).size, GUESSES.length);

  for (const word of GUESSES) {
    assert.match(word, /^[A-Z]{5}$/);
  }
  for (const target of TARGETS) {
    assert.ok(GUESSES.includes(target));
  }
});

test('positional feedback accounts for duplicate letters and canonical collisions', () => {
  assert.deepEqual(
    scorePositional('EERIE', 'RIVER'),
    ['present', 'absent', 'present', 'present', 'absent'],
  );
  assert.deepEqual(
    scorePositional('MONEY', 'HONEY'),
    ['absent', 'exact', 'exact', 'exact', 'exact'],
  );
  assert.deepEqual(
    scorePositional('WATCH', 'WATCH'),
    ['exact', 'exact', 'exact', 'exact', 'exact'],
  );
  assert.deepEqual(
    scorePositional('WITCH', 'WATCH'),
    ['exact', 'absent', 'exact', 'exact', 'exact'],
  );
});

test('positionless feedback allocates duplicate letters left-to-right', () => {
  assert.deepEqual(
    scorePositionless('EERIE', 'RIVER'),
    ['present', 'absent', 'present', 'present', 'absent'],
  );
  assert.deepEqual(
    scorePositionless('MONEY', 'HONEY'),
    ['absent', 'present', 'present', 'present', 'present'],
  );
});

test('guess validation uses the larger dictionary, case-insensitively', () => {
  assert.equal(isValidGuess('mouse'), true);
  assert.equal(isValidGuess('about'), true);
  assert.equal(isValidGuess('zzzzz'), false);
  assert.equal(isValidGuess(null), false);
});

test('development hosts are restricted to local server addresses', () => {
  for (const hostname of ['localhost', 'app.localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']) {
    assert.equal(isDevelopmentHostname(hostname), true);
  }
  for (const hostname of ['florble.example', 'localhost.example', '', null]) {
    assert.equal(isDevelopmentHostname(hostname), false);
  }
});

test('daily answer is deterministic by UTC calendar day', () => {
  const morning = new Date('2026-07-08T00:01:00.000Z');
  const evening = new Date('2026-07-08T23:59:59.999Z');
  const tomorrow = new Date('2026-07-09T00:00:00.000Z');

  assert.equal(dailyAnswer(morning), dailyAnswer(evening));
  assert.equal(
    TARGETS.indexOf(dailyAnswer(tomorrow)),
    (TARGETS.indexOf(dailyAnswer(morning)) + 1) % TARGETS.length,
  );
  assert.equal(dailyAnswer('2026-07-08T12:00:00-05:00'), dailyAnswer(morning));
  assert.throws(() => dailyAnswer('not a date'), /valid date/);
});

test('every target remains exhaustively solvable within the final cap', () => {
  assert.ok(TARGETS.length <= FINAL_CAP);
  for (const target of TARGETS) assert.ok(isValidGuess(target));
});
