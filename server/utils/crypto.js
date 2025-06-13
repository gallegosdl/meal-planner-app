const crypto = require('crypto');

/**
 * Generate a secure hash of a string
 * @param {string} text - The text to hash
 * @returns {string} The hashed text
 */
const hash = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Generate a secure random token
 * @param {number} length - The length of the token in bytes (will be twice this in hex)
 * @returns {string} The random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Compare a plain text string with its hash
 * @param {string} plain - The plain text string
 * @param {string} hashed - The hashed string to compare against
 * @returns {boolean} True if they match, false otherwise
 */
const compare = (plain, hashed) => {
  const hashedPlain = hash(plain);
  return crypto.timingSafeEqual(
    Buffer.from(hashedPlain, 'hex'),
    Buffer.from(hashed, 'hex')
  );
};

module.exports = {
  hash,
  generateToken,
  compare
}; 