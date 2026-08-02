import { z } from 'zod';

import { isCanonicalLetter } from '../../domain/shared/alphabet';
import {
  requireCipherFileId,
  requireGlyphId,
} from '../../domain/shared/identifiers';
import { requireCanonicalWord } from '../../domain/shared/words';
import type { CipherFileDefinition } from '../../domain/cipher/cipher-types';

const IdentifierSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const GlyphIdSchema = IdentifierSchema.transform(requireGlyphId);
const CipherFileIdSchema = IdentifierSchema.transform(requireCipherFileId);
const CanonicalLetterSchema = z.string().refine(isCanonicalLetter).transform((value) => {
  if (!isCanonicalLetter(value)) throw new TypeError('Invalid canonical letter');
  return value;
});
const CanonicalWordSchema = z.string().regex(/^[A-Z]{5}$/).transform((value) => (
  requireCanonicalWord(value)
));

const CipherFileSchema = z.object({
  schemaVersion: z.literal(1),
  id: CipherFileIdSchema,
  title: z.string().min(1),
  brief: z.string().min(1),
  glyphs: z.array(z.object({
    id: GlyphIdSchema,
    display: z.string().min(1),
    accessibleName: z.string().min(1),
  })).min(1),
  specimens: z.array(z.object({
    id: IdentifierSchema,
    glyphs: z.array(GlyphIdSchema).length(5),
    relationship: z.object({
      type: z.literal('differs-by'),
      previousSpecimenId: IdentifierSchema,
      positions: z.literal(1),
    }).optional(),
  })).min(2),
  candidateWords: z.array(CanonicalWordSchema).min(2),
  solution: z.record(IdentifierSchema, CanonicalLetterSchema),
  constraints: z.object({
    bijection: z.literal(true),
    uniqueCandidateUse: z.literal(true),
  }),
  hints: z.array(z.object({
    id: IdentifierSchema,
    text: z.string().min(1),
  })),
  metadata: z.object({
    difficulty: z.union([
      z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
    ]),
    author: z.string().min(1),
  }),
});

export function parseCipherFile(value: unknown): CipherFileDefinition {
  return CipherFileSchema.parse(value) as CipherFileDefinition;
}
