import { z } from 'zod';

const CanonicalWordSchema = z.string().regex(/^[A-Z]{5}$/);

const PersistedGuessSchema = z.object({
  word: CanonicalWordSchema,
  submittedAt: z.string().min(1),
});

const PersistedOfficialResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('solved'),
    officialGuesses: z.number().int().min(1).max(6),
  }),
  z.object({
    status: z.literal('overtime'),
    officialGuesses: z.literal(6),
  }),
]);

export const PersistedDailySessionSchema = z.object({
  schemaVersion: z.literal(4),
  puzzleId: z.string().min(1),
  answer: CanonicalWordSchema,
  guesses: z.array(PersistedGuessSchema),
  currentGuess: z.string().regex(/^[A-Z]{0,5}$/),
  overtimeAllowance: z.number().int().nonnegative(),
  assistanceLevel: z.number().int().min(0).max(5),
  officialResult: PersistedOfficialResultSchema.nullable().default(null),
});

const LegacyStoredGameSchema = z.object({
  date: z.string(),
  answer: CanonicalWordSchema,
  guesses: z.array(CanonicalWordSchema),
  finished: z.boolean().optional(),
});

export type PersistedDailySession = z.infer<typeof PersistedDailySessionSchema>;

export interface DailyPersistence {
  load(puzzleId: string): PersistedDailySession | null;
  save(session: PersistedDailySession): void;
  loadDevelopmentTarget(): string | null;
  saveDevelopmentTarget(target: string): void;
}

export function createLocalDailyPersistence(storage: Storage): DailyPersistence {
  return {
    load(puzzleId) {
      const current = parseStored(storage, sessionKey(puzzleId), PersistedDailySessionSchema);
      if (current?.puzzleId === puzzleId) return current;

      const legacy = parseStored(storage, legacySessionKey(puzzleId), LegacyStoredGameSchema);
      if (!legacy || legacy.date !== puzzleId) return null;
      return {
        schemaVersion: 4,
        puzzleId,
        answer: legacy.answer,
        guesses: legacy.guesses.map((word) => ({
          word,
          submittedAt: `${puzzleId}T00:00:00.000Z`,
        })),
        currentGuess: '',
        overtimeAllowance: Math.max(0, legacy.guesses.length - 6),
        assistanceLevel: 0,
        officialResult: null,
      };
    },
    save(session) {
      const validated = PersistedDailySessionSchema.parse(session);
      storage.setItem(sessionKey(validated.puzzleId), JSON.stringify(validated));
    },
    loadDevelopmentTarget() {
      return storage.getItem('florble:development-target');
    },
    saveDevelopmentTarget(target) {
      storage.setItem('florble:development-target', target);
    },
  };
}

export function sessionKey(puzzleId: string): string {
  return `florble:daily:v4:${puzzleId}`;
}

function legacySessionKey(puzzleId: string): string {
  return `florble:v3:${puzzleId}`;
}

function parseStored<T>(
  storage: Storage,
  key: string,
  schema: z.ZodType<T>,
): T | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? 'null');
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
