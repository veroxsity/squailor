const { encrypt, decrypt, validateEncryption } = require('../../src/utils/encryption');

describe('encryption round-trip', () => {
  test('encrypt -> decrypt returns original', () => {
    const inputs = ['hello', 'Pa$$w0rd!', 'unicode-✓ åäö 字'];
    for (const input of inputs) {
      const enc = encrypt(input);
      expect(typeof enc).toBe('string');
      const dec = decrypt(enc);
      expect(dec).toBe(input);
    }
  });

  test('validateEncryption returns true', () => {
    expect(validateEncryption()).toBe(true);
  });
});
