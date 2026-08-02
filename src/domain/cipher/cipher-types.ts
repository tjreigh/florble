import type { CanonicalLetter } from '../shared/alphabet';
import type { CanonicalWord } from '../shared/words';
import type { CipherFileId, GlyphId } from '../shared/identifiers';

export interface CipherGlyphDefinition {
  readonly id: GlyphId;
  readonly display: string;
  readonly accessibleName: string;
}

export interface CipherSpecimen {
  readonly id: string;
  readonly glyphs: readonly GlyphId[];
  readonly relationship?: {
    readonly type: 'differs-by';
    readonly previousSpecimenId: string;
    readonly positions: 1;
  };
}

export interface CipherHint {
  readonly id: string;
  readonly text: string;
}

export interface CipherFileDefinition {
  readonly schemaVersion: 1;
  readonly id: CipherFileId;
  readonly title: string;
  readonly brief: string;
  readonly glyphs: readonly CipherGlyphDefinition[];
  readonly specimens: readonly CipherSpecimen[];
  readonly candidateWords: readonly CanonicalWord[];
  readonly solution: Readonly<Record<string, CanonicalLetter>>;
  readonly constraints: {
    readonly bijection: true;
    readonly uniqueCandidateUse: true;
  };
  readonly hints: readonly CipherHint[];
  readonly metadata: {
    readonly difficulty: 1 | 2 | 3 | 4 | 5;
    readonly author: string;
  };
}

export type AssignmentConfidence = 'tentative' | 'confirmed';

export interface CipherAssignment {
  readonly glyphId: GlyphId;
  readonly letter: CanonicalLetter;
  readonly confidence: AssignmentConfidence;
}

export interface CipherState {
  readonly schemaVersion: 1;
  readonly fileId: CipherFileId;
  readonly assignments: readonly CipherAssignment[];
  readonly revealedHintIds: readonly string[];
  readonly status: 'active' | 'solved';
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export type CipherEvent =
  | {
      readonly type: 'assignment-set';
      readonly glyphId: GlyphId;
      readonly letter: CanonicalLetter;
    }
  | {
      readonly type: 'assignment-confirmed';
      readonly glyphId: GlyphId;
      readonly occurredAt: string;
    }
  | {
      readonly type: 'assignment-cleared';
      readonly glyphId: GlyphId;
    }
  | {
      readonly type: 'hint-revealed';
      readonly hintId: string;
    };

export type CipherRejectionCode =
  | 'file-complete'
  | 'glyph-unknown'
  | 'assignment-missing'
  | 'letter-confirmed-elsewhere'
  | 'hint-unknown'
  | 'hint-already-revealed';

export type CipherTransition =
  | { readonly accepted: true; readonly state: CipherState }
  | {
      readonly accepted: false;
      readonly state: CipherState;
      readonly rejection: {
        readonly code: CipherRejectionCode;
        readonly message: string;
      };
    };
