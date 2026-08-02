// @vitest-environment jsdom

import { beforeEach, expect, test } from 'vitest';

import {
  createLocalDailyPersistence,
  sessionKey,
  type PersistedDailySession,
} from '../../src/platform/daily-persistence';

const PUZZLE_ID = '2026-07-13';

beforeEach(() => localStorage.clear());

test('round-trips a validated v4 Daily session', () => {
  const persistence = createLocalDailyPersistence(localStorage);
  const session: PersistedDailySession = {
    schemaVersion: 4,
    puzzleId: PUZZLE_ID,
    answer: 'CLOUD',
    guesses: [{ word: 'ABOUT', submittedAt: '2026-07-13T12:00:00.000Z' }],
    currentGuess: 'BR',
    overtimeAllowance: 0,
    assistanceLevel: 0,
    officialResult: null,
  };

  persistence.save(session);

  expect(persistence.load(PUZZLE_ID)).toEqual(session);
  expect(localStorage.getItem(sessionKey(PUZZLE_ID))).toContain('"schemaVersion":4');
});

test('rejects malformed or mismatched stored sessions', () => {
  const persistence = createLocalDailyPersistence(localStorage);
  localStorage.setItem(sessionKey(PUZZLE_ID), JSON.stringify({
    schemaVersion: 4,
    puzzleId: PUZZLE_ID,
    answer: 'invalid',
  }));
  expect(persistence.load(PUZZLE_ID)).toBeNull();

  expect(() => persistence.save({
    schemaVersion: 4,
    puzzleId: PUZZLE_ID,
    answer: 'CLOUD',
    guesses: [],
    currentGuess: 'TOOLONG',
    overtimeAllowance: 0,
    assistanceLevel: 0,
    officialResult: null,
  })).toThrow();
});

test('reads legacy v3 sessions into the v4 snapshot contract', () => {
  localStorage.setItem(`florble:v3:${PUZZLE_ID}`, JSON.stringify({
    date: PUZZLE_ID,
    answer: 'CLOUD',
    guesses: ['ABOUT'],
    finished: false,
  }));

  expect(createLocalDailyPersistence(localStorage).load(PUZZLE_ID)).toMatchObject({
    schemaVersion: 4,
    puzzleId: PUZZLE_ID,
    answer: 'CLOUD',
    currentGuess: '',
    overtimeAllowance: 0,
    officialResult: null,
  });
});

test('defaults pre-Phase-3 v4 snapshots to an empty official record', () => {
  localStorage.setItem(sessionKey(PUZZLE_ID), JSON.stringify({
    schemaVersion: 4,
    puzzleId: PUZZLE_ID,
    answer: 'CLOUD',
    guesses: [],
    currentGuess: '',
    overtimeAllowance: 0,
    assistanceLevel: 0,
  }));

  expect(createLocalDailyPersistence(localStorage).load(PUZZLE_ID)?.officialResult).toBeNull();
});

test('stores the development target separately from puzzle sessions', () => {
  const persistence = createLocalDailyPersistence(localStorage);
  persistence.saveDevelopmentTarget('CLOUD');
  expect(persistence.loadDevelopmentTarget()).toBe('CLOUD');
});
