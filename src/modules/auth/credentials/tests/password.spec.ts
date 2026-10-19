import { hashPassword, verifyPassword } from '../utils/password.js';

describe('password hashing', () => {
  it('generates different hashes for the same password', async () => {
    const hashes = await Promise.all([
      hashPassword('password'),
      hashPassword('password'),
    ]);
    expect(hashes[0]).not.toBe(hashes[1]);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('password', 'scrypt:salt:broken')).toBe(false);
  });
});
