import type { CanonicalLetter } from '../shared/alphabet';
import type { GlyphId } from '../shared/identifiers';
import { solveCipherFile } from './cipher-solver';
import type {
  CipherAssignment,
  CipherFileDefinition,
  CipherState,
} from './cipher-types';

export interface CipherContradiction {
  readonly code: 'duplicate-letter' | 'no-valid-ladder';
  readonly message: string;
  readonly glyphIds: readonly GlyphId[];
  readonly letter?: CanonicalLetter;
}

export function findCipherContradictions(
  file: CipherFileDefinition,
  state: CipherState,
): readonly CipherContradiction[] {
  const contradictions: CipherContradiction[] = [];
  const assignmentsByLetter = new Map<CanonicalLetter, CipherAssignment[]>();
  for (const assignment of state.assignments) {
    const assignments = assignmentsByLetter.get(assignment.letter) ?? [];
    assignments.push(assignment);
    assignmentsByLetter.set(assignment.letter, assignments);
  }

  for (const [letter, assignments] of assignmentsByLetter) {
    if (assignments.length < 2) continue;
    contradictions.push({
      code: 'duplicate-letter',
      message: `${letter} is assigned to both ${assignments[0]!.glyphId} and ${assignments[1]!.glyphId}.`,
      glyphIds: assignments.map((assignment) => assignment.glyphId),
      letter,
    });
  }

  if (
    contradictions.length === 0
    && state.assignments.length > 0
    && solveCipherFile(file, state.assignments, 1).length === 0
  ) {
    contradictions.push({
      code: 'no-valid-ladder',
      message: 'The current assignments cannot produce any approved ladder.',
      glyphIds: state.assignments.map((assignment) => assignment.glyphId),
    });
  }

  return contradictions;
}

export function remainingCipherSolutions(
  file: CipherFileDefinition,
  state: CipherState,
  limit = 100,
): number {
  return solveCipherFile(file, state.assignments, limit).length;
}
