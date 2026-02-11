const crypto = require('crypto');

const ENC_PREFIX = 'enc:';
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  // Accept 32-byte hex or base64.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  } catch (_) {
    return null;
  }
  return null;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

function encryptValue(plain) {
  if (plain === undefined || plain === null || plain === '') return plain;
  if (isEncrypted(plain)) return plain;
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString('base64');
  return `${ENC_PREFIX}${payload}`;
}

function decryptValue(cipherText) {
  if (!isEncrypted(cipherText)) return cipherText;
  const key = getKey();
  if (!key) return cipherText;
  const payload = Buffer.from(cipherText.slice(ENC_PREFIX.length), 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = {
  encryptValue,
  decryptValue,
  isEncrypted,
};
