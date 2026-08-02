import {
  OFFICIAL_GUESS_LIMIT,
  type DailyOfficialResult,
  type DailyResult,
} from './daily-types';

export function formatDailyOfficialResult(result: DailyOfficialResult): string {
  return result.status === 'solved'
    ? `${result.officialGuesses}/${OFFICIAL_GUESS_LIMIT}`
    : `${OFFICIAL_GUESS_LIMIT}+`;
}

export function formatDailyResult(result: DailyResult): string {
  if (result.status === 'solved') {
    return `${result.officialGuesses}/${OFFICIAL_GUESS_LIMIT}`;
  }
  if (result.status === 'solved-overtime') {
    return `${OFFICIAL_GUESS_LIMIT}+${result.overtimeGuesses}`;
  }
  return `${OFFICIAL_GUESS_LIMIT}+`;
}
