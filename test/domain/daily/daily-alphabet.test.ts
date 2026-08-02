import { expect, test } from 'vitest';

import {
  GLYPH_MAP,
  GLYPH_PICKER_LETTERS,
  GLYPH_PICKER_ROWS,
  renderWord,
} from '../../../src/domain/daily/daily-alphabet';
import { scorePositional } from '../../../src/domain/daily/daily-scoring';

test('Daily glyph map has unique configured displays and uses QWERTY picker order', () => {
  expect(Object.keys(GLYPH_MAP)).toEqual([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
  expect(new Set(Object.values(GLYPH_MAP)).size).toBe(26);
  expect(GLYPH_PICKER_ROWS).toEqual([
    [...'QWERTYUIOP'],
    [...'ASDFGHJKL'],
    [...'ZXCVBNM'],
  ]);
  expect(GLYPH_PICKER_LETTERS).toEqual([...'QWERTYUIOPASDFGHJKLZXCVBNM']);
  expect(new Set(GLYPH_PICKER_LETTERS)).toEqual(new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
  expect(() => renderWord('HI!')).toThrow(/Unsupported canonical letter/);
});

test('positional feedback accounts for duplicate letters and canonical identity', () => {
  expect(
    scorePositional('EERIE', 'RIVER'),
  ).toEqual(['present', 'absent', 'present', 'present', 'absent']);
  expect(
    scorePositional('MONEY', 'HONEY'),
  ).toEqual(['absent', 'exact', 'exact', 'exact', 'exact']);
  expect(
    scorePositional('WATCH', 'WATCH'),
  ).toEqual(['exact', 'exact', 'exact', 'exact', 'exact']);
  expect(
    scorePositional('WITCH', 'WATCH'),
  ).toEqual(['exact', 'absent', 'exact', 'exact', 'exact']);
});
