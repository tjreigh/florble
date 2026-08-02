import { expect, test } from 'vitest';

import { renderWord } from '../../../src/domain/daily/daily-alphabet';
import { requireCanonicalWord } from '../../../src/domain/shared/words';
import {
  ACCEPTED_GUESSES,
  dailyDictionary,
  isAcceptedDailyGuess,
} from '../../../src/content/daily/accepted-guesses';
import {
  createStaticDailyTargetResolver,
  utcDateKey,
} from '../../../src/content/daily/target-resolver';
import { TARGET_WORDS } from '../../../src/content/daily/target-words';

test('Daily content has a broad accepted dictionary and a non-trivial curated target pool', () => {
  expect(ACCEPTED_GUESSES.length).toBeGreaterThanOrEqual(8_000);
  expect(TARGET_WORDS.length).toBeGreaterThanOrEqual(200);
  expect(TARGET_WORDS.length).toBeLessThan(ACCEPTED_GUESSES.length);
  expect(new Set(ACCEPTED_GUESSES).size).toBe(ACCEPTED_GUESSES.length);
  expect(new Set(TARGET_WORDS).size).toBe(TARGET_WORDS.length);

  for (const word of ACCEPTED_GUESSES) expect(word).toMatch(/^[A-Z]{5}$/);
  for (const target of TARGET_WORDS) {
    expect(ACCEPTED_GUESSES).toContain(target);
    expect(dailyDictionary.accepts(requireCanonicalWord(target))).toBe(true);
  }
});

test('accepted words cannot collide after glyph rendering', () => {
  expect(new Set(ACCEPTED_GUESSES.map(renderWord)).size).toBe(ACCEPTED_GUESSES.length);
});

test('guess validation is case-insensitive at the content boundary', () => {
  expect(isAcceptedDailyGuess('mouse')).toBe(true);
  expect(isAcceptedDailyGuess('about')).toBe(true);
  expect(isAcceptedDailyGuess('adieu')).toBe(true);
  expect(isAcceptedDailyGuess('crane')).toBe(true);
  expect(isAcceptedDailyGuess('slate')).toBe(true);
  expect(isAcceptedDailyGuess('trace')).toBe(true);
  expect(isAcceptedDailyGuess('zzzzz')).toBe(false);
  expect(isAcceptedDailyGuess(null)).toBe(false);
});

test('target resolution follows a deterministic UTC cycle without repeats', () => {
  const resolver = createStaticDailyTargetResolver();
  const morning = new Date('2026-07-08T00:01:00.000Z');
  const evening = new Date('2026-07-08T23:59:59.999Z');
  const tomorrow = new Date('2026-07-09T00:00:00.000Z');

  expect(resolver.resolve(morning)).toEqual(resolver.resolve(evening));
  expect(resolver.resolve(morning).id).toBe('2026-07-08');
  expect(resolver.resolve(tomorrow).id).toBe('2026-07-09');
  expect(resolver.resolve(tomorrow).answer).not.toBe(resolver.resolve(morning).answer);
  expect(utcDateKey(new Date('2026-07-08T12:00:00-05:00'))).toBe('2026-07-08');
  expect(() => utcDateKey(new Date('invalid'))).toThrow(/valid date/);

  const smallPool = ['ABOUT', 'ABOVE', 'ACTOR', 'ACUTE'] as const;
  const smallResolver = createStaticDailyTargetResolver(smallPool);
  const cycleStart = new Date('2026-01-01T00:00:00.000Z');
  const cycle = smallPool.map((_, day) => (
    smallResolver.resolve(addUtcDays(cycleStart, day)).answer
  ));

  expect(new Set(cycle)).toEqual(new Set(smallPool));
  expect(smallResolver.resolve(addUtcDays(cycleStart, smallPool.length)).answer).toBe(cycle[0]);
  expect(cycle.at(-1)).not.toBe(cycle[0]);
});

test('custom target resolvers validate their content', () => {
  expect(() => createStaticDailyTargetResolver([])).toThrow(/must not be empty/);
  expect(() => createStaticDailyTargetResolver(['ABOUT'])).toThrow(/at least two/);
  expect(() => createStaticDailyTargetResolver(['ABOUT', 'ABOUT'])).toThrow(/duplicate/);
  expect(() => createStaticDailyTargetResolver(['TOO-LONG'])).toThrow(/canonical word/);
});

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}
