const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Calculate MD5 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - MD5 hash of the file
 */
async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const hash = crypto.createHash('md5');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

module.exports = {
  calculateFileHash
};
