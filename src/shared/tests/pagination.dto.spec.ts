import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto } from '../dto/pagination.dto.js';

describe('PaginationDto', () => {
  it('provides a bounded default page', async () => {
    const query = plainToInstance(PaginationDto, {});
    expect(query).toEqual({ limit: 20, offset: 0 });
    expect(await validate(query)).toEqual([]);
  });

  it('converts query strings to numbers', async () => {
    const query = plainToInstance(PaginationDto, {
      limit: '100',
      offset: '25',
    });
    expect(query).toEqual({ limit: 100, offset: 25 });
    expect(await validate(query)).toEqual([]);
  });

  it.each([
    { limit: 0 },
    { limit: -1 },
    { limit: 101 },
    { limit: 1.5 },
    { limit: 'invalid' },
    { limit: '' },
    { limit: null },
    { offset: -1 },
    { offset: 0.5 },
    { offset: 'invalid' },
    { limit: Infinity },
    { offset: Infinity },
  ])('rejects invalid pagination: %j', async (input) => {
    expect(
      await validate(plainToInstance(PaginationDto, input)),
    ).not.toHaveLength(0);
  });
});
