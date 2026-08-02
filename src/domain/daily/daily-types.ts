import type { CanonicalLetter } from '../shared/alphabet';
import type { CanonicalWord } from '../shared/words';
import type { LetterFeedback } from './daily-scoring';

export const DAILY_SCHEMA_VERSION = 1 as const;
export const DAILY_WORD_LENGTH = 5 as const;
export const OFFICIAL_GUESS_LIMIT = 6 as const;

export interface SubmittedGuess {
  readonly word: CanonicalWord;
  readonly feedback: readonly LetterFeedback[];
  readonly submittedAt: string;
}

export type DailyOfficialResult =
  | {
      readonly status: 'solved';
      readonly officialGuesses: number;
    }
  | {
      readonly status: 'overtime';
      readonly officialGuesses: 6;
    };

export type DailyResult =
  | {
      readonly status: 'solved';
      readonly officialGuesses: number;
      readonly overtimeGuesses: 0;
    }
  | {
      readonly status: 'solved-overtime';
      readonly officialGuesses: 6;
      readonly overtimeGuesses: number;
    }
  | {
      readonly status: 'overtime-incomplete';
      readonly officialGuesses: 6;
    };

interface DailyStateBase {
  readonly schemaVersion: typeof DAILY_SCHEMA_VERSION;
  readonly puzzleId: string;
  readonly answer: CanonicalWord;
  readonly wordLength: typeof DAILY_WORD_LENGTH;
  readonly officialLimit: typeof OFFICIAL_GUESS_LIMIT;
  readonly guesses: readonly SubmittedGuess[];
  readonly currentGuess: readonly CanonicalLetter[];
  readonly overtimeAllowance: number;
  readonly assistanceLevel: number;
}

export type DailyState =
  | DailyStateBase & {
      readonly phase: 'official';
      readonly officialResult: null;
      readonly result: null;
    }
  | DailyStateBase & {
      readonly phase: 'overtime-pending' | 'overtime';
      readonly officialResult: Extract<DailyOfficialResult, { status: 'overtime' }>;
      readonly result: Extract<DailyResult, { status: 'overtime-incomplete' }>;
    }
  | DailyStateBase & {
      readonly phase: 'complete';
      readonly officialResult: DailyOfficialResult;
      readonly result: Exclude<DailyResult, { status: 'overtime-incomplete' }>;
    };

export type DailyEvent =
  | { readonly type: 'letter-added'; readonly letter: CanonicalLetter }
  | { readonly type: 'letter-removed' }
  | { readonly type: 'guess-submitted'; readonly submittedAt: string }
  | { readonly type: 'overtime-authorized' };

export interface DailyRules {
  readonly isAcceptedGuess: (word: CanonicalWord) => boolean;
}

export type DailyRejectionCode =
  | 'input-unavailable'
  | 'guess-empty'
  | 'guess-full'
  | 'guess-incomplete'
  | 'guess-not-accepted'
  | 'guess-duplicate'
  | 'overtime-not-pending';

export interface DailyRejection {
  readonly code: DailyRejectionCode;
  readonly message: string;
}

export type DailyTransition =
  | {
      readonly accepted: true;
      readonly state: DailyState;
    }
  | {
      readonly accepted: false;
      readonly state: DailyState;
      readonly rejection: DailyRejection;
    };
