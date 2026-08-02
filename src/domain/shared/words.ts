import { isCanonicalLetter, type CanonicalLetter } from './alphabet';

declare const canonicalWordBrand: unique symbol;

export type CanonicalWord = string & {
  readonly [canonicalWordBrand]: true;
};

export function parseCanonicalWord(value: unknown, length = 5): CanonicalWord | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  if (normalized.length !== length || ![...normalized].every(isCanonicalLetter)) return null;
  return normalized as CanonicalWord;
}

export function requireCanonicalWord(value: unknown, length = 5): CanonicalWord {
  const word = parseCanonicalWord(value, length);
  if (!word) throw new TypeError(`Expected a ${length}-letter canonical word`);
  return word;
}

export function lettersOf(word: CanonicalWord): CanonicalLetter[] {
  return [...word] as CanonicalLetter[];
}

