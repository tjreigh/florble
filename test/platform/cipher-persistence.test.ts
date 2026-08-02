// @vitest-environment jsdom

import { beforeEach, expect, test } from 'vitest';

import { CIPHER_FILE_001 } from '../../src/content/cipher-files/file-001';
import { createCipherState } from '../../src/domain/cipher/cipher-reducer';
import {
  cipherStateKey,
  createLocalCipherPersistence,
} from '../../src/platform/cipher-persistence';

beforeEach(() => localStorage.clear());

test('round-trips a validated Cipher File state', () => {
  const persistence = createLocalCipherPersistence(localStorage);
  const state = createCipherState({
    file: CIPHER_FILE_001,
    startedAt: '2026-08-02T12:00:00.000Z',
  });

  persistence.save(state);

  expect(persistence.load(CIPHER_FILE_001.id)).toEqual(state);
  expect(localStorage.getItem(cipherStateKey(CIPHER_FILE_001.id))).toContain('"fileId":"file-001"');
});

test('ignores malformed and mismatched Cipher File state', () => {
  const persistence = createLocalCipherPersistence(localStorage);
  localStorage.setItem(cipherStateKey(CIPHER_FILE_001.id), JSON.stringify({
    schemaVersion: 1,
    fileId: 'file-001',
    assignments: [{ glyphId: 'diamond', letter: '?', confidence: 'confirmed' }],
    revealedHintIds: [],
    status: 'active',
    startedAt: 'now',
    completedAt: null,
  }));
  expect(persistence.load(CIPHER_FILE_001.id)).toBeNull();

  localStorage.setItem(cipherStateKey(CIPHER_FILE_001.id), JSON.stringify({
    schemaVersion: 1,
    fileId: 'file-002',
    assignments: [],
    revealedHintIds: [],
    status: 'active',
    startedAt: 'now',
    completedAt: null,
  }));
  expect(persistence.load(CIPHER_FILE_001.id)).toBeNull();
});
