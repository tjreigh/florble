import { z } from 'zod';

import { isCanonicalLetter } from '../domain/shared/alphabet';
import {
  requireCipherFileId,
  requireGlyphId,
  type CipherFileId,
} from '../domain/shared/identifiers';
import type { CipherState } from '../domain/cipher/cipher-types';

const IdentifierSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const GlyphIdSchema = IdentifierSchema.transform(requireGlyphId);
const CipherFileIdSchema = IdentifierSchema.transform(requireCipherFileId);
const CanonicalLetterSchema = z.string().refine(isCanonicalLetter).transform((value) => {
  if (!isCanonicalLetter(value)) throw new TypeError('Invalid canonical letter');
  return value;
});

export const PersistedCipherStateSchema = z.object({
  schemaVersion: z.literal(1),
  fileId: CipherFileIdSchema,
  assignments: z.array(z.object({
    glyphId: GlyphIdSchema,
    letter: CanonicalLetterSchema,
    confidence: z.union([z.literal('tentative'), z.literal('confirmed')]),
  })),
  revealedHintIds: z.array(IdentifierSchema),
  status: z.union([z.literal('active'), z.literal('solved')]),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).nullable(),
});

export interface CipherPersistence {
  load(fileId: CipherFileId): CipherState | null;
  save(state: CipherState): void;
}

export function createLocalCipherPersistence(storage: Storage): CipherPersistence {
  return {
    load(fileId) {
      try {
        const value: unknown = JSON.parse(storage.getItem(cipherStateKey(fileId)) ?? 'null');
        const result = PersistedCipherStateSchema.safeParse(value);
        if (!result.success || result.data.fileId !== fileId) return null;
        return result.data;
      } catch {
        return null;
      }
    },
    save(state) {
      const validated = PersistedCipherStateSchema.parse(state);
      storage.setItem(cipherStateKey(validated.fileId), JSON.stringify(validated));
    },
  };
}

export function cipherStateKey(fileId: CipherFileId): string {
  return `florble:v4:cipher:${fileId}`;
}
