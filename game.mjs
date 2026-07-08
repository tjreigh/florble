export const GLYPH_MAP = Object.freeze({
  A: 'А',
  B: 'В',
  C: 'Ϲ',
  D: 'ᗞ',
  E: 'Е',
  F: 'Ϝ',
  G: 'Ԍ',
  H: 'Н',
  I: 'А',
  J: 'Ј',
  K: 'Κ',
  L: 'Ⅼ',
  M: 'Н',
  N: 'Ν',
  O: 'Ο',
  P: 'Р',
  Q: 'Ⴓ',
  R: 'Ꭱ',
  S: 'Ѕ',
  T: 'Τ',
  U: 'Ս',
  V: 'Ⅴ',
  W: 'Ԝ',
  X: 'Χ',
  Y: 'Υ',
  Z: 'Ζ',
});

export const TARGETS = Object.freeze([
  'MOUSE',
  'HOUSE',
  'MONEY',
  'HONEY',
  'WITCH',
  'WATCH',
  'BREAD',
  'PLANT',
  'RIVER',
  'CLOUD',
]);

export const GUESSES = Object.freeze([...new Set([
  ...TARGETS,
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
  'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE',
  'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARGUE',
  'ARISE', 'ARRAY', 'ASIDE', 'ASSET', 'AUDIO', 'AVOID', 'AWARD', 'AWARE', 'BADLY', 'BAKER',
  'BASIC', 'BEACH', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BIRTH', 'BLACK', 'BLAME', 'BLIND',
  'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRAVE',
  'BREAK', 'BRICK', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER',
  'CABLE', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK',
  'CHEEK', 'CHEST', 'CHIEF', 'CHILD', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR',
  'CLERK', 'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT',
  'COVER', 'CRAFT', 'CRASH', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CURVE', 'CYCLE',
  'DAILY', 'DANCE', 'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN',
  'DRAFT', 'DRAMA', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'EAGER', 'EARLY', 'EARTH', 'EIGHT',
  'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT',
  'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FAVOR', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT',
  'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLOOR', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM',
  'FOUND', 'FRAME', 'FRESH', 'FRONT', 'FRUIT', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE',
  'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GREAT', 'GREEN', 'GROSS', 'GROUP',
  'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HEART', 'HEAVY', 'HORSE', 'HOTEL',
  'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JOINT', 'JUDGE', 'KNOWN',
  'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEAST', 'LEAVE', 'LEGAL',
  'LIGHT', 'LIMIT', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH', 'MAGIC', 'MAJOR',
  'MAKER', 'MARCH', 'MATCH', 'MAYBE', 'MAYOR', 'METAL', 'MIGHT', 'MINOR', 'MODEL', 'MONTH',
  'MOTOR', 'MOUNT', 'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH',
  'NOVEL', 'NURSE', 'OCCUR', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL',
  'PAPER', 'PARTY', 'PEACE', 'PHASE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT', 'PITCH', 'PLACE',
  'PLAIN', 'PLANE', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME',
  'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'QUEEN', 'QUICK', 'QUIET', 'RADIO', 'RAISE',
  'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER', 'RIGHT', 'ROUGH', 'ROUND', 'ROUTE',
  'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHAPE',
  'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHOCK',
  'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SINCE', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART',
  'SMILE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED',
  'SPEND', 'SPENT', 'SPLIT', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE',
  'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY',
  'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'TABLE', 'TAKEN', 'TASTE', 'TEACH',
  'TEETH', 'THEIR', 'THEME', 'THERE', 'THESE', 'THING', 'THINK', 'THIRD', 'THOSE',
  'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL',
  'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRUCK',
  'TRULY', 'TRUST', 'TRUTH', 'TWICE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET',
  'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VISIT', 'VITAL', 'VOICE', 'WASTE',
  'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN',
  'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUNG',
])].sort());

/** One picker entry per canonical letter; non-bijective mappings naturally render duplicates. */
export const GLYPH_PICKER_LETTERS = Object.freeze([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);

export const POSITIONAL_GUESSES = 4;
export const INITIAL_CAP = 6;
export const FINAL_CAP = 12;

const GUESS_SET = new Set(GUESSES);
const DAY_IN_MS = 86_400_000;

/** Neutral identity marker for canonical letters that share one rendered glyph. */
export function glyphVariantMarker(letter) {
  const normalized = typeof letter === 'string' ? letter.toUpperCase() : '';
  const glyph = GLYPH_MAP[normalized];
  if (glyph === undefined) throw new TypeError(`Unsupported canonical letter: ${letter}`);
  const variants = Object.keys(GLYPH_MAP).filter((candidate) => GLYPH_MAP[candidate] === glyph);
  if (variants.length === 1) return '';
  return '•'.repeat(variants.indexOf(normalized) + 1);
}

/** Render a canonical Latin word through Florble's fixed substitution alphabet. */
export function renderWord(word) {
  return [...word.toUpperCase()].map((letter) => {
    const glyph = GLYPH_MAP[letter];
    if (glyph === undefined) {
      throw new TypeError(`Unsupported canonical letter: ${letter}`);
    }
    return glyph;
  }).join('');
}

/** Standard Wordle scoring, including finite allocation of duplicate letters. */
export function scorePositional(guess, answer) {
  assertComparableWords(guess, answer);
  const normalizedGuess = guess.toUpperCase();
  const normalizedAnswer = answer.toUpperCase();
  const result = Array(normalizedGuess.length).fill('absent');
  const remaining = new Map();

  for (let index = 0; index < normalizedAnswer.length; index += 1) {
    if (normalizedGuess[index] === normalizedAnswer[index]) {
      result[index] = 'exact';
    } else {
      const letter = normalizedAnswer[index];
      remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
    }
  }

  for (let index = 0; index < normalizedGuess.length; index += 1) {
    if (result[index] === 'exact') continue;
    const letter = normalizedGuess[index];
    const available = remaining.get(letter) ?? 0;
    if (available > 0) {
      result[index] = 'present';
      remaining.set(letter, available - 1);
    }
  }

  return result;
}

/**
 * Positionless scoring reveals only multiset membership. Duplicate occurrences are
 * allocated from left to right, making the result deterministic without leaking
 * the answer's positions.
 */
export function scorePositionless(guess, answer) {
  assertComparableWords(guess, answer);
  const counts = countLetters(answer.toUpperCase());

  return [...guess.toUpperCase()].map((letter) => {
    const available = counts.get(letter) ?? 0;
    if (available === 0) return 'absent';
    counts.set(letter, available - 1);
    return 'present';
  });
}

export function isValidGuess(word) {
  return typeof word === 'string' && GUESS_SET.has(word.toUpperCase());
}

/** Identify hosts used by the project's local static development server. */
export function isDevelopmentHostname(hostname) {
  if (typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '127.0.0.1'
    || normalized === '0.0.0.0'
    || normalized === '::1'
    || normalized === '[::1]';
}

/** Select the target for a UTC calendar date. */
export function dailyAnswer(date = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError('dailyAnswer requires a valid date');
  }

  const utcDay = Math.floor(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
  ) / DAY_IN_MS);

  return TARGETS[((utcDay % TARGETS.length) + TARGETS.length) % TARGETS.length];
}

function countLetters(word) {
  const counts = new Map();
  for (const letter of word) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return counts;
}

function assertComparableWords(guess, answer) {
  if (typeof guess !== 'string' || typeof answer !== 'string') {
    throw new TypeError('Guess and answer must be strings');
  }
  if (guess.length !== answer.length) {
    throw new RangeError('Guess and answer must have the same length');
  }
  if (!/^[A-Za-z]+$/.test(guess) || !/^[A-Za-z]+$/.test(answer)) {
    throw new TypeError('Guess and answer must contain only canonical Latin letters');
  }
}
