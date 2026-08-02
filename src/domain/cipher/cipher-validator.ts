import { solveCipherFile, decodeSpecimen } from './cipher-solver';
import type { CipherFileDefinition } from './cipher-types';

export function validateCipherFile(file: CipherFileDefinition): CipherFileDefinition {
  const errors: string[] = [];
  const glyphIds = file.glyphs.map((glyph) => glyph.id);
  const glyphIdSet = new Set(glyphIds);
  const specimenIds = file.specimens.map((specimen) => specimen.id);
  const requiredGlyphIds = new Set(file.specimens.flatMap((specimen) => specimen.glyphs));

  checkUnique(glyphIds, 'glyph ID', errors);
  checkUnique(file.glyphs.map((glyph) => glyph.display), 'glyph display', errors);
  checkUnique(file.glyphs.map((glyph) => glyph.accessibleName), 'glyph accessible name', errors);
  checkUnique(specimenIds, 'specimen ID', errors);
  checkUnique(file.candidateWords, 'candidate word', errors);
  checkUnique(file.hints.map((hint) => hint.id), 'hint ID', errors);

  for (const requiredGlyphId of requiredGlyphIds) {
    if (!glyphIdSet.has(requiredGlyphId)) errors.push(`Unknown specimen glyph: ${requiredGlyphId}`);
    if (!file.solution[requiredGlyphId]) errors.push(`Missing solution for glyph: ${requiredGlyphId}`);
  }
  for (const solutionGlyphId of Object.keys(file.solution)) {
    if (![...glyphIdSet].some((glyphId) => glyphId === solutionGlyphId)) {
      errors.push(`Solution references unknown glyph: ${solutionGlyphId}`);
    }
  }

  if (file.constraints.bijection) {
    checkUnique(Object.values(file.solution), 'solution letter', errors);
  }

  file.specimens.forEach((specimen, index) => {
    const decoded = decodeSpecimen(specimen, file.solution);
    if (!file.candidateWords.some((word) => word === decoded)) {
      errors.push(`${specimen.id} resolves to unapproved word ${decoded}`);
    }
    if (index === 0 && specimen.relationship) {
      errors.push(`${specimen.id} must not declare a previous relationship`);
    }
    if (index > 0) {
      const previous = file.specimens[index - 1]!;
      if (
        specimen.relationship?.type !== 'differs-by'
        || specimen.relationship.previousSpecimenId !== previous.id
      ) errors.push(`${specimen.id} must reference ${previous.id}`);
      if (hammingDistance(previous.glyphs, specimen.glyphs) !== 1) {
        errors.push(`${specimen.id} must differ from ${previous.id} by one glyph`);
      }
      const previousDecoded = decodeSpecimen(previous, file.solution);
      if (hammingDistance([...previousDecoded], [...decoded]) !== 1) {
        errors.push(`${specimen.id} solution must differ from ${previous.id} by one letter`);
      }
    }
  });

  if (errors.length === 0) {
    const solutions = solveCipherFile(file, [], 2);
    if (solutions.length !== 1) {
      errors.push(`Cipher File must have exactly one solution; found ${solutions.length === 2 ? 'multiple' : solutions.length}`);
    } else {
      for (const glyphId of requiredGlyphIds) {
        if (solutions[0]!.mapping[glyphId] !== file.solution[glyphId]) {
          errors.push(`Solver mapping disagrees for glyph ${glyphId}`);
        }
      }
    }
  }

  if (errors.length > 0) throw new Error(`Invalid Cipher File ${file.id}:\n- ${errors.join('\n- ')}`);
  return file;
}

function checkUnique(values: readonly unknown[], label: string, errors: string[]): void {
  if (new Set(values).size !== values.length) errors.push(`Duplicate ${label}`);
}

function hammingDistance(left: readonly unknown[], right: readonly unknown[]): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  left.forEach((value, index) => {
    if (value !== right[index]) distance += 1;
  });
  return distance;
}
