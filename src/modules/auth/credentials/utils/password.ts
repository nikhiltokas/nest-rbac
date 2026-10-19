import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const [algorithm, salt, encodedKey] = hash.split(':');
  if (
    algorithm !== 'scrypt' ||
    !salt ||
    !encodedKey ||
    !/^[a-f0-9]{128}$/.test(encodedKey)
  ) {
    return false;
  }

  const key = await deriveKey(password, salt);
  return timingSafeEqual(key, Buffer.from(encodedKey, 'hex'));
}
