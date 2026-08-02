import { validateCipherFile } from '../../domain/cipher/cipher-validator';
import { parseCipherFile } from '../schemas/cipher-file-schema';

export const CIPHER_FILE_002 = validateCipherFile(parseCipherFile({
  schemaVersion: 1,
  id: 'file-002',
  title: 'Word Ladder',
  brief: 'Each symbol always means the same letter. This is a word ladder: every row is a real five-letter word, and each new row changes exactly one letter. Eight words belong in the ladder; four are decoys.',
  glyphs: [
    { id: 'sun', display: '☼', accessibleName: 'sun mark' },
    { id: 'moon', display: '☾', accessibleName: 'crescent moon' },
    { id: 'hollow-diamond', display: '♢', accessibleName: 'hollow diamond' },
    { id: 'looped-cross', display: '⌘', accessibleName: 'looped cross' },
    { id: 'rook', display: '♜', accessibleName: 'rook mark' },
    { id: 'hollow-star', display: '✧', accessibleName: 'hollow star' },
    { id: 'club', display: '♧', accessibleName: 'outline club' },
    { id: 'dotted-circle', display: '⊙', accessibleName: 'dotted circle' },
    { id: 'tall-strokes', display: '⌇', accessibleName: 'tall strokes' },
    { id: 'flag', display: '⚑', accessibleName: 'flag mark' },
    { id: 'striped-circle', display: '◍', accessibleName: 'striped circle' },
  ],
  specimens: [
    { id: 'specimen-01', glyphs: ['sun', 'moon', 'hollow-diamond', 'looped-cross', 'rook'] },
    {
      id: 'specimen-02',
      glyphs: ['sun', 'rook', 'hollow-diamond', 'looped-cross', 'rook'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-01', positions: 1 },
    },
    {
      id: 'specimen-03',
      glyphs: ['sun', 'rook', 'hollow-diamond', 'looped-cross', 'hollow-star'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-02', positions: 1 },
    },
    {
      id: 'specimen-04',
      glyphs: ['sun', 'rook', 'dotted-circle', 'looped-cross', 'hollow-star'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-03', positions: 1 },
    },
    {
      id: 'specimen-05',
      glyphs: ['sun', 'rook', 'dotted-circle', 'tall-strokes', 'hollow-star'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-04', positions: 1 },
    },
    {
      id: 'specimen-06',
      glyphs: ['sun', 'club', 'dotted-circle', 'tall-strokes', 'hollow-star'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-05', positions: 1 },
    },
    {
      id: 'specimen-07',
      glyphs: ['flag', 'club', 'dotted-circle', 'tall-strokes', 'hollow-star'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-06', positions: 1 },
    },
    {
      id: 'specimen-08',
      glyphs: ['flag', 'club', 'dotted-circle', 'tall-strokes', 'striped-circle'],
      relationship: { type: 'differs-by', previousSpecimenId: 'specimen-07', positions: 1 },
    },
  ],
  candidateWords: [
    'SHONE', 'SHARE', 'PHONY', 'START', 'SCORE', 'SMART',
    'PHONE', 'PLANE', 'STORE', 'SPARE', 'STARE', 'STONE',
  ],
  solution: {
    sun: 'S',
    moon: 'M',
    'hollow-diamond': 'A',
    'looped-cross': 'R',
    rook: 'T',
    'hollow-star': 'E',
    club: 'H',
    'dotted-circle': 'O',
    'tall-strokes': 'N',
    flag: 'P',
    'striped-circle': 'Y',
  },
  constraints: {
    bijection: true,
    uniqueCandidateUse: true,
  },
  hints: [
    {
      id: 'repeated-letter',
      text: 'The second row uses the same letter in positions 2 and 5.',
    },
    {
      id: 'second-row',
      text: 'The second row is START.',
    },
    {
      id: 'final-row',
      text: 'The last row is PHONY.',
    },
  ],
  metadata: {
    difficulty: 3,
    author: 'Florble Puzzle Desk',
  },
}));
