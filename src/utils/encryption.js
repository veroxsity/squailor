const crypto = require('crypto');
const os = require('os');

// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Generate a machine-specific key using system information
 * This ensures the encryption is tied to the specific machine
 */
function getMachineKey() {
  const machineId = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.userInfo().username}`;
  return crypto.createHash('sha256').update(machineId).digest();
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - The text to encrypt
 * @returns {string} - Base64 encoded encrypted data with IV, salt, and auth tag
 */
function encrypt(text) {
  if (!text) {
    throw new Error('No text provided for encryption');
  }

  // Generate a random salt
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive key from machine key and salt
  const machineKey = getMachineKey();
  const key = crypto.pbkdf2Sync(machineKey, salt, 100000, KEY_LENGTH, 'sha256');
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine salt + iv + authTag + encrypted data
  const result = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]);
  
  return result.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedData) {
  if (!encryptedData) {
    throw new Error('No data provided for decryption');
  }

  // Decode from base64
  const buffer = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  // Derive key from machine key and salt
  const machineKey = getMachineKey();
  const key = crypto.pbkdf2Sync(machineKey, salt, 100000, KEY_LENGTH, 'sha256');
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Validate that data can be encrypted and decrypted correctly
 * @returns {boolean} - True if encryption is working
 */
function validateEncryption() {
  try {
    const testData = 'test-encryption-validation';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    return decrypted === testData;
  } catch (error) {
    console.error('Encryption validation failed:', error);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  validateEncryption
};
