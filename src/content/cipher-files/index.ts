export { CIPHER_FILE_001 } from './file-001';
export { CIPHER_FILE_002 } from './file-002';
export { CIPHER_FILE_003 } from './file-003';

import type { CipherFileDefinition } from '../../domain/cipher/cipher-types';
import { CIPHER_FILE_001 } from './file-001';
import { CIPHER_FILE_002 } from './file-002';
import { CIPHER_FILE_003 } from './file-003';

export const CIPHER_FILES: readonly CipherFileDefinition[] = Object.freeze([
  CIPHER_FILE_001,
  CIPHER_FILE_002,
  CIPHER_FILE_003,
]);
