import { parseCipherFile } from '../schemas/cipher-file-schema';
import { validateCipherFile } from '../../domain/cipher/cipher-validator';

export const CIPHER_FILE_001 = validateCipherFile(parseCipherFile({
  schemaVersion: 1,
  id: 'file-001',
  title: 'Word Ladder',
  brief: 'Each symbol always means the same letter. This is a word ladder: every row is a real five-letter word, and each new row changes exactly one letter. Eight words belong in the ladder; four are decoys.',
  glyphs: [
    { id: 'diamond', display: '◈', accessibleName: 'divided diamond' },
    { id: 'triangle', display: '△', accessibleName: 'outline triangle' },
    { id: 'circle', display: '○', accessibleName: 'outline circle' },
    { id: 'wave', display: '⌁', accessibleName: 'wave mark' },
    { id: 'square', display: '□', accessibleName: 'outline square' },
    { id: 'star', display: '✦', accessibleName: 'four-point star' },
    { id: 'house', display: '⌂', accessibleName: 'house mark' },
    { id: 'crossed-circle', display: '⊕', accessibleName: 'crossed circle' },
    { id: 'bowtie', display: '⋈', accessibleName: 'bowtie mark' },
    { id: 'lightning', display: 'ϟ', accessibleName: 'lightning mark' },
  ],
  specimens: [
    { id: 'specimen-01', glyphs: ['diamond', 'triangle', 'circle', 'wave', 'square'] },
    {
      id: 'specimen-02',
      glyphs: ['star', 'triangle', 'circle', 'wave', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-01', positions: 1 },
    },
    {
      id: 'specimen-03',
      glyphs: ['star', 'house', 'circle', 'wave', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-02', positions: 1 },
    },
    {
      id: 'specimen-04',
      glyphs: ['crossed-circle', 'house', 'circle', 'wave', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-03', positions: 1 },
    },
    {
      id: 'specimen-05',
      glyphs: ['crossed-circle', 'house', 'circle', 'diamond', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-04', positions: 1 },
    },
    {
      id: 'specimen-06',
      glyphs: ['crossed-circle', 'bowtie', 'circle', 'diamond', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-05', positions: 1 },
    },
    {
      id: 'specimen-07',
      glyphs: ['lightning', 'bowtie', 'circle', 'diamond', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-06', positions: 1 },
    },
    {
      id: 'specimen-08',
      glyphs: ['lightning', 'bowtie', 'circle', 'house', 'square'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-07', positions: 1 },
    },
  ],
  candidateWords: [
    'WHOLE', 'SCORE', 'ATONE', 'SHORE', 'CLONE', 'STONE',
    'PHONE', 'CLOSE', 'ALONE', 'SHONE', 'CHOSE', 'WHOSE',
  ],
  solution: {
    diamond: 'S',
    triangle: 'T',
    circle: 'O',
    wave: 'N',
    square: 'E',
    star: 'A',
    house: 'L',
    'crossed-circle': 'C',
    bowtie: 'H',
    lightning: 'W',
  },
  constraints: {
    bijection: true,
    uniqueCandidateUse: true,
  },
  hints: [
    {
      id: 'shared-tail',
      text: 'The first four rows end with the same three letters.',
    },
    {
      id: 'first-specimen',
      text: 'The first row is STONE.',
    },
    {
      id: 'final-specimen',
      text: 'The last row is WHOLE.',
    },
  ],
  metadata: {
    difficulty: 2,
    author: 'Florble Assessment Office',
  },
}));
