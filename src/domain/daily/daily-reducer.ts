import { requireCanonicalWord } from '../shared/words';
import type { CanonicalLetter } from '../shared/alphabet';
import { scorePositional } from './daily-scoring';
import { assistanceLevelForAllowance } from './overtime';
import {
  DAILY_SCHEMA_VERSION,
  DAILY_WORD_LENGTH,
  OFFICIAL_GUESS_LIMIT,
  type DailyEvent,
  type DailyRejectionCode,
  type DailyRules,
  type DailyState,
  type DailyTransition,
  type SubmittedGuess,
} from './daily-types';

export interface CreateDailyStateInput {
  readonly puzzleId: string;
  readonly answer: string;
}

export function createDailyState(input: CreateDailyStateInput): DailyState {
  if (input.puzzleId.trim().length === 0) throw new TypeError('Puzzle ID must not be empty');

  return {
    schemaVersion: DAILY_SCHEMA_VERSION,
    puzzleId: input.puzzleId,
    answer: requireCanonicalWord(input.answer, DAILY_WORD_LENGTH),
    wordLength: DAILY_WORD_LENGTH,
    officialLimit: OFFICIAL_GUESS_LIMIT,
    phase: 'official',
    guesses: [],
    currentGuess: [],
    overtimeAllowance: 0,
    assistanceLevel: 0,
    officialResult: null,
    result: null,
  };
}

export function reduceDaily(
  state: DailyState,
  event: DailyEvent,
  rules: DailyRules,
): DailyTransition {
  switch (event.type) {
    case 'letter-added':
      return addLetter(state, event.letter);
    case 'letter-removed':
      return removeLetter(state);
    case 'guess-submitted':
      return submitGuess(state, event.submittedAt, rules);
    case 'overtime-authorized':
      return authorizeOvertime(state);
  }
}

function addLetter(
  state: DailyState,
  letter: CanonicalLetter,
): DailyTransition {
  if (!acceptsInput(state)) return reject(state, 'input-unavailable', 'Input is not currently available');
  if (state.currentGuess.length >= state.wordLength) {
    return reject(state, 'guess-full', `A guess contains ${state.wordLength} letters`);
  }
  return accept({ ...state, currentGuess: [...state.currentGuess, letter] });
}

function removeLetter(state: DailyState): DailyTransition {
  if (!acceptsInput(state)) return reject(state, 'input-unavailable', 'Input is not currently available');
  if (state.currentGuess.length === 0) {
    return reject(state, 'guess-empty', 'The current guess is already empty');
  }
  return accept({ ...state, currentGuess: state.currentGuess.slice(0, -1) });
}

function submitGuess(
  state: DailyState,
  submittedAt: string,
  rules: DailyRules,
): DailyTransition {
  if (!acceptsInput(state)) return reject(state, 'input-unavailable', 'Input is not currently available');
  if (state.currentGuess.length !== state.wordLength) {
    return reject(
      state,
      'guess-incomplete',
      `Choose ${state.wordLength} letters before submitting`,
    );
  }

  const word = requireCanonicalWord(state.currentGuess.join(''), state.wordLength);
  if (!rules.isAcceptedGuess(word)) {
    return reject(state, 'guess-not-accepted', 'That word is not in the accepted dictionary');
  }
  if (state.guesses.some((guess) => guess.word === word)) {
    return reject(state, 'guess-duplicate', 'That word has already been submitted');
  }

  const submittedGuess: SubmittedGuess = {
    word,
    feedback: scorePositional(word, state.answer),
    submittedAt,
  };
  const guesses = [...state.guesses, submittedGuess];
  const overtimeGuesses = Math.max(0, guesses.length - state.officialLimit);
  const base = {
    ...state,
    guesses,
    currentGuess: [],
  };

  if (word === state.answer) {
    if (overtimeGuesses === 0) {
      return accept({
        ...base,
        phase: 'complete',
        officialResult: {
          status: 'solved',
          officialGuesses: guesses.length,
        },
        result: {
          status: 'solved',
          officialGuesses: guesses.length,
          overtimeGuesses: 0,
        },
      });
    }
    return accept({
      ...base,
      phase: 'complete',
      officialResult: {
        status: 'overtime',
        officialGuesses: OFFICIAL_GUESS_LIMIT,
      },
      result: {
        status: 'solved-overtime',
        officialGuesses: OFFICIAL_GUESS_LIMIT,
        overtimeGuesses,
      },
    });
  }

  if (guesses.length >= state.officialLimit) {
    const phase = overtimeGuesses >= state.overtimeAllowance
      ? 'overtime-pending'
      : 'overtime';
    return accept({
      ...base,
      phase,
      officialResult: {
        status: 'overtime',
        officialGuesses: OFFICIAL_GUESS_LIMIT,
      },
      result: {
        status: 'overtime-incomplete',
        officialGuesses: OFFICIAL_GUESS_LIMIT,
      },
    });
  }

  return accept({
    ...base,
    phase: 'official',
    officialResult: null,
    result: null,
  });
}

function authorizeOvertime(state: DailyState): DailyTransition {
  if (state.phase !== 'overtime-pending') {
    return reject(
      state,
      'overtime-not-pending',
      'Overtime can only be authorized at an exhausted limit',
    );
  }
  const overtimeAllowance = state.overtimeAllowance + 1;
  return accept({
    ...state,
    phase: 'overtime',
    overtimeAllowance,
    assistanceLevel: Math.max(
      state.assistanceLevel,
      assistanceLevelForAllowance(overtimeAllowance),
    ),
  });
}

function acceptsInput(state: DailyState): boolean {
  return state.phase === 'official' || state.phase === 'overtime';
}

function accept(state: DailyState): DailyTransition {
  return { accepted: true, state };
}

function reject(
  state: DailyState,
  code: DailyRejectionCode,
  message: string,
): DailyTransition {
  return {
    accepted: false,
    state,
    rejection: { code, message },
  };
}
