import { requireCanonicalWord, type CanonicalWord } from '../../domain/shared/words';
import { TARGET_WORDS } from './target-words';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const SCHEDULE_SALT = 'florble-daily-v1';

export interface DailyPuzzle {
  readonly id: string;
  readonly answer: CanonicalWord;
}

export interface DailyTargetResolver {
  resolve(date: Date): DailyPuzzle;
}

export function utcDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid date is required');
  return date.toISOString().slice(0, 10);
}

export function createStaticDailyTargetResolver(
  targets: readonly string[] = TARGET_WORDS,
): DailyTargetResolver {
  if (targets.length === 0) throw new TypeError('Daily target dictionary must not be empty');
  const answers = targets.map((target) => requireCanonicalWord(target));
  if (answers.length < 2) throw new TypeError('Daily target dictionary must contain at least two words');
  if (new Set(answers).size !== answers.length) {
    throw new TypeError('Daily target dictionary must not contain duplicate words');
  }
  const schedule = [...answers].sort((left, right) => {
    const hashDifference = stableHash(`${SCHEDULE_SALT}:${left}`)
      - stableHash(`${SCHEDULE_SALT}:${right}`);
    return hashDifference || left.localeCompare(right);
  });

  return Object.freeze({
    resolve(date: Date): DailyPuzzle {
      const id = utcDateKey(date);
      const utcDay = Math.floor(Date.parse(`${id}T00:00:00.000Z`) / MILLISECONDS_PER_DAY);
      const scheduleIndex = ((utcDay % schedule.length) + schedule.length) % schedule.length;
      return { id, answer: schedule[scheduleIndex]! };
    },
  });
}

export const dailyTargetResolver = createStaticDailyTargetResolver();

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
