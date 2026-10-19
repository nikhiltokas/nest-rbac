import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../dto/register.dto.js';

describe('RegisterDto', () => {
  const input = {
    email: 'alex@example.com',
    password: 'a-long-password',
    firstName: 'Alex',
    username: 'alex_1',
  };

  it.each([undefined, null, 'Smith'])(
    'accepts an optional last name: %j',
    async (lastName) => {
      expect(
        await validate(plainToInstance(RegisterDto, { ...input, lastName })),
      ).toEqual([]);
    },
  );

  it.each([
    { firstName: undefined },
    { firstName: '' },
    { firstName: '  ' },
    { firstName: 123 },
    { firstName: 'a'.repeat(51) },
    { lastName: '' },
    { lastName: '  ' },
    { lastName: 123 },
    { lastName: 'a'.repeat(51) },
    { username: undefined },
    { username: 'ab' },
    { username: 'a'.repeat(31) },
    { username: 'alex name' },
    { username: 'alex@name' },
    { email: 'invalid' },
    { password: 'short' },
  ])('rejects invalid registration fields: %j', async (invalid) => {
    expect(
      await validate(plainToInstance(RegisterDto, { ...input, ...invalid })),
    ).not.toHaveLength(0);
  });

  it('rejects privilege escalation through submitted fields', async () => {
    const errors = await validate(
      plainToInstance(RegisterDto, {
        ...input,
        role: 'SUPER_ADMIN',
        id: 'chosen-id',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'id',
      'role',
    ]);
  });
});
