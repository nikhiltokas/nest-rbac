import { getJwtSecret } from '../config/jwt.config.js';

describe('JWT configuration', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, '', 'x'.repeat(31)])(
    'rejects a missing or short secret',
    (secret) => {
      vi.stubEnv('JWT_SECRET', secret);
      expect(() => getJwtSecret()).toThrow(
        'JWT_SECRET must contain at least 32 characters',
      );
    },
  );

  it.each(['x'.repeat(32), 'x'.repeat(64)])(
    'accepts a sufficiently long secret',
    (secret) => {
      vi.stubEnv('JWT_SECRET', secret);
      expect(getJwtSecret()).toBe(secret);
    },
  );
});
