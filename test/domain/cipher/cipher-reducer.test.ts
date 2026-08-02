import { expect, test } from 'vitest';

import { CIPHER_FILE_001 } from '../../../src/content/cipher-files/file-001';
import { findCipherContradictions } from '../../../src/domain/cipher/cipher-constraints';
import { createCipherState, reduceCipher } from '../../../src/domain/cipher/cipher-reducer';
import type { CipherEvent, CipherState } from '../../../src/domain/cipher/cipher-types';
import type { CanonicalLetter } from '../../../src/domain/shared/alphabet';
import { requireGlyphId } from '../../../src/domain/shared/identifiers';

const STARTED_AT = '2026-08-02T12:00:00.000Z';

test('sets, replaces, confirms, and clears one assignment per glyph', () => {
  let state = createCipherState({ file: CIPHER_FILE_001, startedAt: STARTED_AT });
  state = apply(state, set('diamond', 'S'));
  expect(state.assignments).toEqual([{
    glyphId: 'diamond', letter: 'S', confidence: 'tentative',
  }]);

  state = apply(state, set('diamond', 'T'));
  expect(state.assignments).toHaveLength(1);
  expect(state.assignments[0]).toMatchObject({ letter: 'T', confidence: 'tentative' });

  state = apply(state, confirm('diamond'));
  expect(state.assignments[0]?.confidence).toBe('confirmed');

  state = apply(state, { type: 'assignment-cleared', glyphId: requireGlyphId('diamond') });
  expect(state.assignments).toEqual([]);
});

test('allows tentative contradictions but rejects a duplicate confirmed letter', () => {
  let state = createCipherState({ file: CIPHER_FILE_001, startedAt: STARTED_AT });
  state = apply(state, set('diamond', 'S'));
  state = apply(state, confirm('diamond'));
  state = apply(state, set('triangle', 'S'));

  expect(findCipherContradictions(CIPHER_FILE_001, state)[0]).toMatchObject({
    code: 'duplicate-letter',
    glyphIds: ['diamond', 'triangle'],
  });

  const rejected = reduceCipher(state, confirm('triangle'), CIPHER_FILE_001);
  expect(rejected.accepted).toBe(false);
  if (rejected.accepted) throw new Error('Expected confirmation rejection');
  expect(rejected.rejection.code).toBe('letter-confirmed-elsewhere');
  expect(rejected.rejection.message).toContain('diamond');
});

test('reports assignments that eliminate every valid ladder', () => {
  let state = createCipherState({ file: CIPHER_FILE_001, startedAt: STARTED_AT });
  state = apply(state, set('diamond', 'Q'));
  expect(findCipherContradictions(CIPHER_FILE_001, state)[0]?.code).toBe('no-valid-ladder');
});

test('reveals authored hints once', () => {
  let state = createCipherState({ file: CIPHER_FILE_001, startedAt: STARTED_AT });
  state = apply(state, { type: 'hint-revealed', hintId: 'shared-tail' });
  expect(state.revealedHintIds).toEqual(['shared-tail']);

  const repeated = reduceCipher(
    state,
    { type: 'hint-revealed', hintId: 'shared-tail' },
    CIPHER_FILE_001,
  );
  expect(repeated.accepted).toBe(false);
});

test('completes only after the complete authored mapping is confirmed', () => {
  let state = createCipherState({ file: CIPHER_FILE_001, startedAt: STARTED_AT });
  for (const glyph of CIPHER_FILE_001.glyphs) {
    state = apply(state, set(glyph.id, CIPHER_FILE_001.solution[glyph.id]!));
    state = apply(state, confirm(glyph.id));
  }

  expect(state.status).toBe('solved');
  expect(state.completedAt).toBe('2026-08-02T13:00:00.000Z');

  const closed = reduceCipher(state, set('diamond', 'Q'), CIPHER_FILE_001);
  expect(closed.accepted).toBe(false);
  if (closed.accepted) throw new Error('Expected closed file');
  expect(closed.rejection.code).toBe('file-complete');
});

function set(glyphId: string, letter: CanonicalLetter): CipherEvent {
  return {
    type: 'assignment-set',
    glyphId: requireGlyphId(glyphId),
    letter,
  };
}

function confirm(glyphId: string): CipherEvent {
  return {
    type: 'assignment-confirmed',
    glyphId: requireGlyphId(glyphId),
    occurredAt: '2026-08-02T13:00:00.000Z',
  };
}

function apply(state: CipherState, event: CipherEvent): CipherState {
  const transition = reduceCipher(state, event, CIPHER_FILE_001);
  if (!transition.accepted) throw new Error(transition.rejection.message);
  return transition.state;
}
