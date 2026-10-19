import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../../login/dto/login.dto.js';
import { CredentialsDto } from '../dto/credentials.dto.js';

describe.each([CredentialsDto, LoginDto])('%s credential boundary', (Dto) => {
  const input = { email: 'alex@example.com', password: 'a-long-password' };

  it('normalizes email without altering the password', async () => {
    const credentials = plainToInstance(Dto, {
      email: ' ALEX@EXAMPLE.COM ',
      password: '  password  ',
    });
    expect(credentials.email).toBe(input.email);
    expect(credentials.password).toBe('  password  ');
    expect(await validate(credentials)).toEqual([]);
  });

  it.each([
    { email: undefined },
    { email: null },
    { email: 123 },
    { email: 'invalid' },
    { email: `${'a'.repeat(243)}@example.com` },
    { password: undefined },
    { password: null },
    { password: 123 },
    { password: 'p'.repeat(7) },
    { password: 'p'.repeat(41) },
  ])('rejects invalid credentials: %j', async (invalid) => {
    expect(
      await validate(plainToInstance(Dto, { ...input, ...invalid })),
    ).not.toHaveLength(0);
  });

  it.each([8, 40])(
    'accepts a password at the %i-character boundary',
    async (length) => {
      expect(
        await validate(
          plainToInstance(Dto, { ...input, password: 'p'.repeat(length) }),
        ),
      ).toEqual([]);
    },
  );
});
