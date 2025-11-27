const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { calculateFileHash, calculateLegacyMd5 } = require('../../src/utils/fileHash');

describe('file hashing', () => {
  test('SHA-256 matches expected digest for known content', async () => {
    const tmp = path.join(os.tmpdir(), `hash-test-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'hello', 'utf8');
    const sha256 = await calculateFileHash(tmp);
    expect(sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('Legacy MD5 matches expected digest for known content', async () => {
    const tmp = path.join(os.tmpdir(), `hash-test-md5-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'hello', 'utf8');
    const md5 = await calculateLegacyMd5(tmp);
    expect(md5).toBe('5d41402abc4b2a76b9719d911017c592');
  });
});
