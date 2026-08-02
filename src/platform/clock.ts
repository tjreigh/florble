export interface Clock {
  now(): Date;
}

export const systemClock: Clock = Object.freeze({
  now: () => new Date(),
});

export function millisecondsUntilNextUtcDay(now: Date): number {
  if (Number.isNaN(now.getTime())) throw new TypeError('A valid date is required');
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return nextUtcMidnight - now.getTime();
}
