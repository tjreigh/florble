import { validateCipherFile } from '../../domain/cipher/cipher-validator';
import { parseCipherFile } from '../schemas/cipher-file-schema';

export const CIPHER_FILE_003 = validateCipherFile(parseCipherFile({
  schemaVersion: 1,
  id: 'file-003',
  title: 'Word Ladder',
  brief: 'Each symbol always means the same letter. This is a word ladder: every row is a real five-letter word, and each new row changes exactly one letter. Nine words belong in the ladder; four are decoys.',
  glyphs: [
    { id: 'cloud', display: '☁', accessibleName: 'cloud mark' },
    { id: 'corner', display: '⌞', accessibleName: 'lower corner' },
    { id: 'peak', display: '△', accessibleName: 'outline peak' },
    { id: 'arch', display: '∩', accessibleName: 'arch mark' },
    { id: 'dagger', display: '†', accessibleName: 'dagger mark' },
    { id: 'three-waves', display: '≋', accessibleName: 'three waves' },
    { id: 'crescent', display: '☽', accessibleName: 'thin crescent' },
    { id: 'sharp', display: '♯', accessibleName: 'sharp mark' },
    { id: 'soft-wave', display: '⌁', accessibleName: 'soft wave' },
    { id: 'starburst', display: '※', accessibleName: 'starburst mark' },
    { id: 'cup', display: '∪', accessibleName: 'cup mark' },
  ],
  specimens: [
    { id: 'specimen-01', glyphs: ['cloud', 'corner', 'peak', 'arch', 'dagger'] },
    {
      id: 'specimen-02',
      glyphs: ['cloud', 'corner', 'peak', 'arch', 'three-waves'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-01', positions: 1 },
    },
    {
      id: 'specimen-03',
      glyphs: ['cloud', 'corner', 'peak', 'crescent', 'three-waves'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-02', positions: 1 },
    },
    {
      id: 'specimen-04',
      glyphs: ['cloud', 'three-waves', 'peak', 'crescent', 'three-waves'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-03', positions: 1 },
    },
    {
      id: 'specimen-05',
      glyphs: ['cloud', 'three-waves', 'peak', 'crescent', 'sharp'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-04', positions: 1 },
    },
    {
      id: 'specimen-06',
      glyphs: ['soft-wave', 'three-waves', 'peak', 'crescent', 'sharp'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-05', positions: 1 },
    },
    {
      id: 'specimen-07',
      glyphs: ['soft-wave', 'starburst', 'peak', 'crescent', 'sharp'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-06', positions: 1 },
    },
    {
      id: 'specimen-08',
      glyphs: ['crescent', 'starburst', 'peak', 'crescent', 'sharp'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-07', positions: 1 },
    },
    {
      id: 'specimen-09',
      glyphs: ['crescent', 'starburst', 'cup', 'crescent', 'sharp'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-08', positions: 1 },
    },
  ],
  candidateWords: [
    'REACH', 'GRAIN', 'PLACE', 'CLOUD', 'COUCH', 'PEACE', 'BRICK',
    'PLANT', 'WOMAN', 'ROACH', 'PLANE', 'PEACH', 'COACH',
  ],
  solution: {
    cloud: 'P',
    corner: 'L',
    peak: 'A',
    arch: 'N',
    dagger: 'T',
    'three-waves': 'E',
    crescent: 'C',
    sharp: 'H',
    'soft-wave': 'R',
    starburst: 'O',
    cup: 'U',
  },
  constraints: {
    bijection: true,
    uniqueCandidateUse: true,
  },
  hints: [
    {
      id: 'repeated-letter',
      text: 'The fourth row uses the same letter in positions 2 and 5.',
    },
    {
      id: 'fourth-row',
      text: 'The fourth row is PEACE.',
    },
    {
      id: 'final-row',
      text: 'The last row is COUCH.',
    },
  ],
  metadata: {
    difficulty: 4,
    author: 'Florble Puzzle Desk',
  },
}));
