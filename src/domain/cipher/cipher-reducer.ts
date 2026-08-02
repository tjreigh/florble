import type { CanonicalLetter } from '../shared/alphabet';
import type { GlyphId } from '../shared/identifiers';
import type {
  CipherAssignment,
  CipherEvent,
  CipherFileDefinition,
  CipherRejectionCode,
  CipherState,
  CipherTransition,
} from './cipher-types';

export interface CreateCipherStateInput {
  readonly file: CipherFileDefinition;
  readonly startedAt: string;
}

export function createCipherState(input: CreateCipherStateInput): CipherState {
  if (input.startedAt.trim().length === 0) throw new TypeError('Cipher start time is required');
  return {
    schemaVersion: 1,
    fileId: input.file.id,
    assignments: [],
    revealedHintIds: [],
    status: 'active',
    startedAt: input.startedAt,
    completedAt: null,
  };
}

export function reduceCipher(
  state: CipherState,
  event: CipherEvent,
  file: CipherFileDefinition,
): CipherTransition {
  if (state.status === 'solved') {
    return reject(state, 'file-complete', 'This Cipher File is already complete');
  }
  if (state.fileId !== file.id) throw new TypeError('Cipher state and file do not match');

  switch (event.type) {
    case 'assignment-set':
      return setAssignment(state, event.glyphId, event.letter, file);
    case 'assignment-confirmed':
      return confirmAssignment(state, event.glyphId, event.occurredAt, file);
    case 'assignment-cleared':
      return clearAssignment(state, event.glyphId, file);
    case 'hint-revealed':
      return revealHint(state, event.hintId, file);
  }
}

function setAssignment(
  state: CipherState,
  glyphId: GlyphId,
  letter: CanonicalLetter,
  file: CipherFileDefinition,
): CipherTransition {
  if (!hasGlyph(file, glyphId)) return unknownGlyph(state, glyphId);
  const assignment: CipherAssignment = { glyphId, letter, confidence: 'tentative' };
  return accept({
    ...state,
    assignments: replaceAssignment(state.assignments, assignment),
  });
}

function confirmAssignment(
  state: CipherState,
  glyphId: GlyphId,
  occurredAt: string,
  file: CipherFileDefinition,
): CipherTransition {
  if (!hasGlyph(file, glyphId)) return unknownGlyph(state, glyphId);
  const assignment = state.assignments.find((candidate) => candidate.glyphId === glyphId);
  if (!assignment) {
    return reject(state, 'assignment-missing', `No tentative assignment exists for ${glyphId}`);
  }
  const conflict = state.assignments.find((candidate) => (
    candidate.glyphId !== glyphId
    && candidate.letter === assignment.letter
    && candidate.confidence === 'confirmed'
  ));
  if (conflict) {
    return reject(
      state,
      'letter-confirmed-elsewhere',
      `${assignment.letter} is already confirmed for ${conflict.glyphId}`,
    );
  }

  const assignments = replaceAssignment(state.assignments, {
    ...assignment,
    confidence: 'confirmed',
  });
  const solved = isSolved(file, assignments);
  return accept({
    ...state,
    assignments,
    status: solved ? 'solved' : 'active',
    completedAt: solved ? occurredAt : null,
  });
}

function clearAssignment(
  state: CipherState,
  glyphId: GlyphId,
  file: CipherFileDefinition,
): CipherTransition {
  if (!hasGlyph(file, glyphId)) return unknownGlyph(state, glyphId);
  return accept({
    ...state,
    assignments: state.assignments.filter((assignment) => assignment.glyphId !== glyphId),
  });
}

function revealHint(
  state: CipherState,
  hintId: string,
  file: CipherFileDefinition,
): CipherTransition {
  if (!file.hints.some((hint) => hint.id === hintId)) {
    return reject(state, 'hint-unknown', `Unknown hint: ${hintId}`);
  }
  if (state.revealedHintIds.includes(hintId)) {
    return reject(state, 'hint-already-revealed', 'That hint is already visible');
  }
  return accept({ ...state, revealedHintIds: [...state.revealedHintIds, hintId] });
}

function replaceAssignment(
  assignments: readonly CipherAssignment[],
  replacement: CipherAssignment,
): readonly CipherAssignment[] {
  return [
    ...assignments.filter((assignment) => assignment.glyphId !== replacement.glyphId),
    replacement,
  ];
}

function isSolved(
  file: CipherFileDefinition,
  assignments: readonly CipherAssignment[],
): boolean {
  return file.glyphs.every((glyph) => {
    const assignment = assignments.find((candidate) => candidate.glyphId === glyph.id);
    return assignment?.confidence === 'confirmed'
      && assignment.letter === file.solution[glyph.id];
  });
}

function hasGlyph(file: CipherFileDefinition, glyphId: GlyphId): boolean {
  return file.glyphs.some((glyph) => glyph.id === glyphId);
}

function unknownGlyph(state: CipherState, glyphId: GlyphId): CipherTransition {
  return reject(state, 'glyph-unknown', `Unknown glyph: ${glyphId}`);
}

function accept(state: CipherState): CipherTransition {
  return { accepted: true, state };
}

function reject(
  state: CipherState,
  code: CipherRejectionCode,
  message: string,
): CipherTransition {
  return { accepted: false, state, rejection: { code, message } };
}
