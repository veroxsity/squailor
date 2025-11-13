const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Calculate SHA-256 hash of a file (primary current hash)
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - SHA-256 hex digest
 */
async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Calculate legacy MD5 hash of a file for backward compatibility with
 * previously stored summaries that used MD5. New summaries store SHA-256.
 * @param {string} filePath
 * @returns {Promise<string>} - MD5 hex digest
 */
async function calculateLegacyMd5(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

module.exports = {
  calculateFileHash,
  calculateLegacyMd5
};
