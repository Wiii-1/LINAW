const {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;

function encryptValue(plaintext, masterKey) {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(masterKey, salt, 32);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    encrypted,
    tag.toString('base64'),
  ].join(':');
}

function decryptValue(encrypted, masterKey) {
  const parts = encrypted.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted value format');
  }

  const salt = Buffer.from(parts[0], 'base64');
  const iv = Buffer.from(parts[1], 'base64');
  const encryptedData = parts[2];
  const tag = Buffer.from(parts[3], 'base64');

  const key = scryptSync(masterKey, salt, 32);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decryptedChunks = [];
  decryptedChunks.push(decipher.update(Buffer.from(encryptedData, 'hex')));
  decryptedChunks.push(decipher.final());
  return Buffer.concat(decryptedChunks).toString('utf8');
}

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (key) return key;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production');
  }
  return 'dev-insecure-key-change-in-prod';
}

module.exports = {
  encryptValue,
  decryptValue,
  getEncryptionKey,
};
