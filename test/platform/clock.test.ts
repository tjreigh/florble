import { expect, test } from 'vitest';

import { millisecondsUntilNextUtcDay } from '../../src/platform/clock';

test('calculates the next UTC puzzle boundary', () => {
  expect(millisecondsUntilNextUtcDay(new Date('2026-07-08T23:59:59.000Z'))).toBe(1_000);
  expect(millisecondsUntilNextUtcDay(new Date('2026-07-08T05:00:00.000-05:00'))).toBe(
    14 * 60 * 60 * 1_000,
  );
  expect(() => millisecondsUntilNextUtcDay(new Date('invalid'))).toThrow(/valid date/);
});
