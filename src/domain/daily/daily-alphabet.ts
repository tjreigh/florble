import { isCanonicalLetter, type CanonicalLetter } from '../shared/alphabet';

export const GLYPH_MAP: Readonly<Record<CanonicalLetter, string>> = Object.freeze({
  A: 'А',
  B: 'В',
  C: 'Ϲ',
  D: 'ᗞ',
  E: 'Е',
  F: 'Ϝ',
  G: 'Ԍ',
  H: 'Н',
  I: 'І',
  J: 'Ј',
  K: 'Κ',
  L: 'Ⅼ',
  M: 'М',
  N: 'Ν',
  O: 'Ο',
  P: 'Р',
  Q: 'Ⴓ',
  R: 'Ꭱ',
  S: 'Ѕ',
  T: 'Τ',
  U: 'Ս',
  V: 'Ⅴ',
  W: 'Ԝ',
  X: 'Χ',
  Y: 'Υ',
  Z: 'Ζ',
});

export const GLYPH_PICKER_ROWS: readonly (readonly CanonicalLetter[])[] = Object.freeze([
  Object.freeze([...'QWERTYUIOP'] as CanonicalLetter[]),
  Object.freeze([...'ASDFGHJKL'] as CanonicalLetter[]),
  Object.freeze([...'ZXCVBNM'] as CanonicalLetter[]),
]);

export const GLYPH_PICKER_LETTERS: readonly CanonicalLetter[] = Object.freeze(
  GLYPH_PICKER_ROWS.flat(),
);

/** Render a canonical Latin word through Florble's fixed Daily glyph alphabet. */
export function renderWord(word: string): string {
  return [...word.toUpperCase()].map((letter) => {
    if (!isCanonicalLetter(letter)) {
      throw new TypeError(`Unsupported canonical letter: ${letter}`);
    }
    return GLYPH_MAP[letter];
  }).join('');
}
