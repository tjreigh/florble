import { expect, test } from 'vitest';

import {
  OVERTIME_ASSISTANCE_THRESHOLDS,
  OVERTIME_AUTHORIZATION_DELAY_MS,
  UNBOUNDED_OVERTIME_ALLOWANCE,
  assistanceLevelForAllowance,
  confirmedAssistancePositions,
  isUnboundedOvertimeAllowance,
} from '../../../src/domain/daily/overtime';

test('declares the authored authorization and unbounded-overtime thresholds', () => {
  expect(OVERTIME_AUTHORIZATION_DELAY_MS).toBe(900);
  expect(UNBOUNDED_OVERTIME_ALLOWANCE).toBe(3);
  expect(isUnboundedOvertimeAllowance(2)).toBe(false);
  expect(isUnboundedOvertimeAllowance(3)).toBe(true);
});

test('grants assistance at extensions three, five, seven, nine, and eleven', () => {
  expect(OVERTIME_ASSISTANCE_THRESHOLDS).toEqual([3, 5, 7, 9, 11]);
  expect(Array.from({ length: 12 }, (_, allowance) => assistanceLevelForAllowance(allowance)))
    .toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  expect(() => assistanceLevelForAllowance(-1)).toThrow(/non-negative integer/);
});

test('reveals positions in outside-in order', () => {
  expect(confirmedAssistancePositions(0)).toEqual([]);
  expect(confirmedAssistancePositions(1)).toEqual([0]);
  expect(confirmedAssistancePositions(3)).toEqual([0, 4, 2]);
  expect(confirmedAssistancePositions(5)).toEqual([0, 4, 2, 1, 3]);
  expect(() => confirmedAssistancePositions(6)).toThrow(/between 0 and 5/);
});
