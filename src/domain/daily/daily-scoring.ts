export type LetterFeedback = 'exact' | 'present' | 'absent';

/** Standard Wordle scoring, including finite allocation of duplicate letters. */
export function scorePositional(guess: string, answer: string): LetterFeedback[] {
  assertComparableWords(guess, answer);
  const normalizedGuess = guess.toUpperCase();
  const normalizedAnswer = answer.toUpperCase();
  const result: LetterFeedback[] = Array<LetterFeedback>(normalizedGuess.length).fill('absent');
  const remaining = new Map<string, number>();

  for (let index = 0; index < normalizedAnswer.length; index += 1) {
    const guessedLetter = normalizedGuess.charAt(index);
    const answerLetter = normalizedAnswer.charAt(index);
    if (guessedLetter === answerLetter) {
      result[index] = 'exact';
    } else {
      remaining.set(answerLetter, (remaining.get(answerLetter) ?? 0) + 1);
    }
  }

  for (let index = 0; index < normalizedGuess.length; index += 1) {
    if (result[index] === 'exact') continue;
    const letter = normalizedGuess.charAt(index);
    const available = remaining.get(letter) ?? 0;
    if (available > 0) {
      result[index] = 'present';
      remaining.set(letter, available - 1);
    }
  }

  return result;
}

function assertComparableWords(guess: string, answer: string): void {
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
