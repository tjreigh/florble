declare const glyphIdBrand: unique symbol;
declare const cipherFileIdBrand: unique symbol;

export type GlyphId = string & { readonly [glyphIdBrand]: true };
export type CipherFileId = string & { readonly [cipherFileIdBrand]: true };

export function requireGlyphId(value: unknown): GlyphId {
  return requireIdentifier(value, 'glyph') as GlyphId;
}

export function requireCipherFileId(value: unknown): CipherFileId {
  return requireIdentifier(value, 'Cipher File') as CipherFileId;
}

function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new TypeError(`${label} ID must use lowercase kebab-case`);
  }
  return value;
}
