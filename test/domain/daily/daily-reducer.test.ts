import { describe, expect, test } from 'vitest';

import { createDailyState, reduceDaily } from '../../../src/domain/daily/daily-reducer';
import {
  formatDailyOfficialResult,
  formatDailyResult,
} from '../../../src/domain/daily/daily-result';
import type {
  DailyEvent,
  DailyRejectionCode,
  DailyRules,
  DailyState,
  DailyTransition,
} from '../../../src/domain/daily/daily-types';
import { assistanceLevelForAllowance } from '../../../src/domain/daily/overtime';
import { lettersOf, requireCanonicalWord } from '../../../src/domain/shared/words';

const answer = 'CLOUD';
const wrongWords = [
  'SLATE', 'CRANE', 'AUDIO', 'BRICK', 'FIGHT', 'WOMAN',
  'GRACE', 'HOUSE', 'MONEY', 'WATER', 'PLANT', 'NIGHT',
  'STORM', 'QUICK', 'BAKER', 'SOUND', 'VIDEO', 'EARTH',
] as const;
const acceptedWords = new Set<string>([answer, ...wrongWords]);
const rules: DailyRules = {
  isAcceptedGuess: (word) => acceptedWords.has(word),
};

describe('Daily reducer', () => {
  test('creates a normalized official session', () => {
    const state = createDailyState({ puzzleId: 'daily-001', answer: 'cloud' });

    expect(state).toMatchObject({
      schemaVersion: 1,
      puzzleId: 'daily-001',
      answer: 'CLOUD',
      wordLength: 5,
      officialLimit: 6,
      phase: 'official',
      guesses: [],
      currentGuess: [],
      overtimeAllowance: 0,
      assistanceLevel: 0,
      result: null,
    });
  });

  test('rejects invalid session definitions', () => {
    expect(() => createDailyState({ puzzleId: '', answer })).toThrow(/Puzzle ID/);
    expect(() => createDailyState({ puzzleId: 'daily-001', answer: 'TOO' })).toThrow(
      /canonical word/,
    );
  });

  test('edits a guess without exceeding the configured word length', () => {
    let state = createDailyState({ puzzleId: 'daily-001', answer });
    state = enterWord(state, 'SLATE');

    const fullTransition = reduceDaily(
      state,
      { type: 'letter-added', letter: 'A' },
      rules,
    );
    expectRejection(fullTransition, 'guess-full', state);

    state = apply(state, { type: 'letter-removed' });
    expect(state.currentGuess.join('')).toBe('SLAT');
  });

  test('rejects incomplete, unaccepted, and duplicate guesses without consuming an attempt', () => {
    const initial = createDailyState({ puzzleId: 'daily-001', answer });
    const incomplete = reduceDaily(initial, submitted(), rules);
    expectRejection(incomplete, 'guess-incomplete', initial);

    const unacceptedState = enterWord(initial, 'ZZZZZ');
    const unaccepted = reduceDaily(unacceptedState, submitted(), rules);
    expectRejection(unaccepted, 'guess-not-accepted', unacceptedState);

    const afterFirstGuess = playWord(initial, 'SLATE');
    const duplicateState = enterWord(afterFirstGuess, 'SLATE');
    const duplicate = reduceDaily(duplicateState, submitted(), rules);
    expectRejection(duplicate, 'guess-duplicate', duplicateState);
    expect(duplicate.state.guesses).toHaveLength(1);
  });

  test('records an official solve and closes input', () => {
    const state = playWord(createDailyState({ puzzleId: 'daily-001', answer }), answer);

    expect(state.phase).toBe('complete');
    expect(state.result).toEqual({
      status: 'solved',
      officialGuesses: 1,
      overtimeGuesses: 0,
    });
    expect(state.officialResult).toEqual({ status: 'solved', officialGuesses: 1 });
    expect(formatDailyOfficialResult(requireOfficialResult(state))).toBe('1/6');
    expect(formatDailyResult(requireResult(state))).toBe('1/6');

    const closed = reduceDaily(state, { type: 'letter-added', letter: 'A' }, rules);
    expectRejection(closed, 'input-unavailable', state);
  });

  test('enters overtime-pending after the sixth unsuccessful guess', () => {
    const state = reachOvertimePending();

    expect(state.phase).toBe('overtime-pending');
    expect(state.guesses).toHaveLength(6);
    expect(state.currentGuess).toEqual([]);
    expect(state.overtimeAllowance).toBe(0);
    expect(state.result).toEqual({ status: 'overtime-incomplete', officialGuesses: 6 });
    expect(state.officialResult).toEqual({ status: 'overtime', officialGuesses: 6 });
    expect(formatDailyOfficialResult(requireOfficialResult(state))).toBe('6+');
    expect(formatDailyResult(requireResult(state))).toBe('6+');

    const blocked = reduceDaily(state, { type: 'letter-added', letter: 'A' }, rules);
    expectRejection(blocked, 'input-unavailable', state);
  });

  test('authorizes one overtime guess and records an overtime solve', () => {
    let state = reachOvertimePending();
    state = apply(state, { type: 'overtime-authorized' });

    expect(state.phase).toBe('overtime');
    expect(state.overtimeAllowance).toBe(1);

    state = playWord(state, answer);
    expect(state.phase).toBe('complete');
    expect(state.result).toEqual({
      status: 'solved-overtime',
      officialGuesses: 6,
      overtimeGuesses: 1,
    });
    expect(state.officialResult).toEqual({ status: 'overtime', officialGuesses: 6 });
    expect(formatDailyOfficialResult(requireOfficialResult(state))).toBe('6+');
    expect(formatDailyResult(requireResult(state))).toBe('6+1');
  });

  test('requires fresh authorization after every exhausted overtime allowance', () => {
    let state = reachOvertimePending();
    state = apply(state, { type: 'overtime-authorized' });
    state = playWord(state, wrongWords[6]);

    expect(state.phase).toBe('overtime-pending');
    expect(state.overtimeAllowance).toBe(1);
    expect(state.guesses).toHaveLength(7);

    state = apply(state, { type: 'overtime-authorized' });
    expect(state.phase).toBe('overtime');
    expect(state.overtimeAllowance).toBe(2);

    const redundantAuthorization = reduceDaily(state, { type: 'overtime-authorized' }, rules);
    expectRejection(redundantAuthorization, 'overtime-not-pending', state);
  });

  test('authorizes threshold assistance atomically with the third extension', () => {
    let state = reachOvertimePending();
    for (let extension = 1; extension <= 3; extension += 1) {
      state = apply(state, { type: 'overtime-authorized' });
      expect(state.overtimeAllowance).toBe(extension);
      expect(state.assistanceLevel).toBe(extension < 3 ? 0 : 1);
      if (extension < 3) state = playWord(state, wrongWords[5 + extension]!);
    }

    expect(state.phase).toBe('overtime');
    expect(state.officialResult).toEqual({ status: 'overtime', officialGuesses: 6 });
  });

  test('continues beyond every nominal cap without changing official feedback or result', () => {
    let state = reachOvertimePending();
    const officialGuesses = state.guesses;
    const officialResult = state.officialResult;

    for (let extension = 1; extension <= 12; extension += 1) {
      state = apply(state, { type: 'overtime-authorized' });
      expect(state.phase).toBe('overtime');
      expect(state.overtimeAllowance).toBe(extension);
      expect(state.assistanceLevel).toBe(assistanceLevelForAllowance(extension));
      if (extension < 12) state = playWord(state, wrongWords[5 + extension]!);
    }

    expect(state.guesses.slice(0, 6)).toEqual(officialGuesses);
    expect(state.officialResult).toEqual(officialResult);
    expect(state.assistanceLevel).toBe(5);
  });
});

function submitted(): DailyEvent {
  return { type: 'guess-submitted', submittedAt: '2026-07-13T12:00:00.000Z' };
}

function enterWord(state: DailyState, value: string): DailyState {
  let next = state;
  const word = requireCanonicalWord(value);
  for (const letter of lettersOf(word)) {
    next = apply(next, { type: 'letter-added', letter });
  }
  return next;
}

function playWord(state: DailyState, value: string): DailyState {
  return apply(enterWord(state, value), submitted());
}

function reachOvertimePending(): DailyState {
  let state = createDailyState({ puzzleId: 'daily-001', answer });
  for (const word of wrongWords.slice(0, 6)) state = playWord(state, word);
  return state;
}

function apply(state: DailyState, event: DailyEvent): DailyState {
  const transition = reduceDaily(state, event, rules);
  if (!transition.accepted) throw new Error(transition.rejection.message);
  return transition.state;
}

function expectRejection(
  transition: DailyTransition,
  code: DailyRejectionCode,
  originalState: DailyState,
): void {
  expect(transition.accepted).toBe(false);
  if (transition.accepted) throw new Error(`Expected rejection ${code}`);
  expect(transition.rejection.code).toBe(code);
  expect(transition.state).toBe(originalState);
}

function requireResult(state: DailyState) {
  if (!state.result) throw new Error('Expected a Daily result');
  return state.result;
}

function requireOfficialResult(state: DailyState) {
  if (!state.officialResult) throw new Error('Expected an official Daily result');
  return state.officialResult;
}
