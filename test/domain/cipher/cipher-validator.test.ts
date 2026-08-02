import { expect, test } from 'vitest';

import { CIPHER_FILES } from '../../../src/content/cipher-files';
import { CIPHER_FILE_001 } from '../../../src/content/cipher-files/file-001';
import { validateCipherFile } from '../../../src/domain/cipher/cipher-validator';

test('accepts every authored Cipher File', () => {
  for (const file of CIPHER_FILES) expect(validateCipherFile(file)).toBe(file);
});

test('rejects visual collisions and non-unique content', () => {
  expect(() => validateCipherFile({
    ...CIPHER_FILE_001,
    glyphs: CIPHER_FILE_001.glyphs.map((glyph, index) => (
      index === 1 ? { ...glyph, display: CIPHER_FILE_001.glyphs[0]!.display } : glyph
    )),
  })).toThrow(/Duplicate glyph display/);

  expect(() => validateCipherFile({
    ...CIPHER_FILE_001,
    specimens: CIPHER_FILE_001.specimens.slice(0, 2),
  })).toThrow(/exactly one solution/);
});
