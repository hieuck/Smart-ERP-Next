import { encryptConfig, decryptConfig } from './config-encryption';

describe('config-encryption', () => {
  it('encrypts and decrypts plaintext back to original', () => {
    const plaintext = JSON.stringify({ apiKey: 'secret-key', token: 'abc123' });
    const encrypted = encryptConfig(plaintext);

    expect(encrypted).not.toEqual(plaintext);
    expect(encrypted.length).toBeGreaterThan(plaintext.length);

    const decrypted = decryptConfig(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it('produces different ciphertexts for the same plaintext', () => {
    const plaintext = 'same-secret';
    const encrypted1 = encryptConfig(plaintext);
    const encrypted2 = encryptConfig(plaintext);

    expect(encrypted1).not.toEqual(encrypted2);
    expect(decryptConfig(encrypted1)).toEqual(plaintext);
    expect(decryptConfig(encrypted2)).toEqual(plaintext);
  });

  it('throws on invalid ciphertext', () => {
    expect(() => decryptConfig('not-valid-base64!!!')).toThrow();
  });
});
