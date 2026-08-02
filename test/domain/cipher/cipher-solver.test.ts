import { expect, test } from 'vitest';

import {
  CIPHER_FILE_001,
  CIPHER_FILE_002,
  CIPHER_FILE_003,
} from '../../../src/content/cipher-files';
import { decodeSpecimen, solveCipherFile } from '../../../src/domain/cipher/cipher-solver';
import { requireGlyphId } from '../../../src/domain/shared/identifiers';

test('proves Cipher File 001 has one global substitution solution', () => {
  const solutions = solveCipherFile(CIPHER_FILE_001, [], 2);

  expect(solutions).toHaveLength(1);
  expect(solutions[0]?.specimenWords).toEqual([
    'STONE', 'ATONE', 'ALONE', 'CLONE', 'CLOSE', 'CHOSE', 'WHOSE', 'WHOLE',
  ]);
  expect(solutions[0]?.mapping).toEqual(CIPHER_FILE_001.solution);
});

test.each([
  [CIPHER_FILE_002, [
    'SMART', 'START', 'STARE', 'STORE', 'STONE', 'SHONE', 'PHONE', 'PHONY',
  ]],
  [CIPHER_FILE_003, [
    'PLANT', 'PLANE', 'PLACE', 'PEACE', 'PEACH', 'REACH', 'ROACH', 'COACH', 'COUCH',
  ]],
] as const)('proves $id has one global substitution solution', (file, expectedWords) => {
  const solutions = solveCipherFile(file, [], 2);

  expect(solutions).toHaveLength(1);
  expect(solutions[0]?.specimenWords).toEqual(expectedWords);
  expect(solutions[0]?.mapping).toEqual(file.solution);
});

test('filters solutions through tentative player assignments', () => {
  expect(solveCipherFile(CIPHER_FILE_001, [{
    glyphId: requireGlyphId('diamond'),
    letter: 'S',
    confidence: 'tentative',
  }], 2)).toHaveLength(1);

  expect(solveCipherFile(CIPHER_FILE_001, [{
    glyphId: requireGlyphId('diamond'),
    letter: 'Q',
    confidence: 'tentative',
  }], 2)).toHaveLength(0);
});

test('decodes every specimen through a supplied mapping', () => {
  expect(CIPHER_FILE_001.specimens.map((specimen) => (
    decodeSpecimen(specimen, CIPHER_FILE_001.solution)
  ))).toEqual(['STONE', 'ATONE', 'ALONE', 'CLONE', 'CLOSE', 'CHOSE', 'WHOSE', 'WHOLE']);
});
