import type { CanonicalLetter } from '../shared/alphabet';
import type { CanonicalWord } from '../shared/words';
import type { GlyphId } from '../shared/identifiers';
import type {
  CipherAssignment,
  CipherFileDefinition,
  CipherSpecimen,
} from './cipher-types';

export interface CipherSolverSolution {
  readonly mapping: Readonly<Record<string, CanonicalLetter>>;
  readonly specimenWords: readonly CanonicalWord[];
}

export function solveCipherFile(
  file: CipherFileDefinition,
  fixedAssignments: readonly CipherAssignment[] = [],
  limit = Number.POSITIVE_INFINITY,
): readonly CipherSolverSolution[] {
  const glyphToLetter = new Map<GlyphId, CanonicalLetter>();
  const letterToGlyph = new Map<CanonicalLetter, GlyphId>();
  for (const assignment of fixedAssignments) {
    const existingLetter = glyphToLetter.get(assignment.glyphId);
    const existingGlyph = letterToGlyph.get(assignment.letter);
    if (
      (existingLetter && existingLetter !== assignment.letter)
      || (existingGlyph && existingGlyph !== assignment.glyphId)
    ) return [];
    glyphToLetter.set(assignment.glyphId, assignment.letter);
    letterToGlyph.set(assignment.letter, assignment.glyphId);
  }

  const solutions: CipherSolverSolution[] = [];
  search(0, glyphToLetter, letterToGlyph, new Set(), []);
  return solutions;

  function search(
    specimenIndex: number,
    currentGlyphToLetter: ReadonlyMap<GlyphId, CanonicalLetter>,
    currentLetterToGlyph: ReadonlyMap<CanonicalLetter, GlyphId>,
    usedWords: ReadonlySet<CanonicalWord>,
    specimenWords: readonly CanonicalWord[],
  ): void {
    if (solutions.length >= limit) return;
    const specimen = file.specimens[specimenIndex];
    if (!specimen) {
      solutions.push({
        mapping: Object.freeze(Object.fromEntries(currentGlyphToLetter)),
        specimenWords: Object.freeze([...specimenWords]),
      });
      return;
    }

    for (const word of file.candidateWords) {
      if (file.constraints.uniqueCandidateUse && usedWords.has(word)) continue;
      const extension = extendMapping(
        specimen,
        word,
        currentGlyphToLetter,
        currentLetterToGlyph,
      );
      if (!extension) continue;
      search(
        specimenIndex + 1,
        extension.glyphToLetter,
        extension.letterToGlyph,
        new Set([...usedWords, word]),
        [...specimenWords, word],
      );
    }
  }
}

export function decodeSpecimen(
  specimen: CipherSpecimen,
  mapping: Readonly<Record<string, CanonicalLetter>>,
): string {
  return specimen.glyphs.map((glyphId) => mapping[glyphId] ?? '?').join('');
}

function extendMapping(
  specimen: CipherSpecimen,
  word: CanonicalWord,
  currentGlyphToLetter: ReadonlyMap<GlyphId, CanonicalLetter>,
  currentLetterToGlyph: ReadonlyMap<CanonicalLetter, GlyphId>,
): {
  readonly glyphToLetter: ReadonlyMap<GlyphId, CanonicalLetter>;
  readonly letterToGlyph: ReadonlyMap<CanonicalLetter, GlyphId>;
} | null {
  const glyphToLetter = new Map(currentGlyphToLetter);
  const letterToGlyph = new Map(currentLetterToGlyph);
  const letters = [...word] as CanonicalLetter[];

  for (let index = 0; index < specimen.glyphs.length; index += 1) {
    const glyphId = specimen.glyphs[index];
    const letter = letters[index];
    if (!glyphId || !letter) return null;
    const existingLetter = glyphToLetter.get(glyphId);
    const existingGlyph = letterToGlyph.get(letter);
    if (
      (existingLetter && existingLetter !== letter)
      || (existingGlyph && existingGlyph !== glyphId)
    ) return null;
    glyphToLetter.set(glyphId, letter);
    letterToGlyph.set(letter, glyphId);
  }

  return { glyphToLetter, letterToGlyph };
}
