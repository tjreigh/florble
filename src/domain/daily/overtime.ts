import { DAILY_WORD_LENGTH } from './daily-types';

export const OVERTIME_AUTHORIZATION_DELAY_MS = 900;
export const UNBOUNDED_OVERTIME_ALLOWANCE = 3;
export const OVERTIME_ASSISTANCE_THRESHOLDS = [3, 5, 7, 9, 11] as const;

const ASSISTANCE_POSITION_ORDER = [0, 4, 2, 1, 3] as const;

export function assistanceLevelForAllowance(allowance: number): number {
  if (!Number.isInteger(allowance) || allowance < 0) {
    throw new TypeError('Overtime allowance must be a non-negative integer');
  }
  return OVERTIME_ASSISTANCE_THRESHOLDS.filter((threshold) => allowance >= threshold).length;
}

export function confirmedAssistancePositions(
  level: number,
): readonly number[] {
  if (!Number.isInteger(level) || level < 0 || level > DAILY_WORD_LENGTH) {
    throw new TypeError(`Assistance level must be between 0 and ${DAILY_WORD_LENGTH}`);
  }
  return ASSISTANCE_POSITION_ORDER.slice(0, level);
}

export function isUnboundedOvertimeAllowance(allowance: number): boolean {
  return allowance >= UNBOUNDED_OVERTIME_ALLOWANCE;
}
