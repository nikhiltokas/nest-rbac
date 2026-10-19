import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CommentDto } from '../dto/comment.dto.js';

describe('CommentDto', () => {
  it.each(['a', 'c'.repeat(250)])(
    'accepts valid comment content',
    async (content) => {
      expect(await validate(plainToInstance(CommentDto, { content }))).toEqual(
        [],
      );
    },
  );

  it.each([undefined, null, 123, '', ' \t\n', 'c'.repeat(251)])(
    'rejects invalid comment content: %j',
    async (content) => {
      expect(
        await validate(plainToInstance(CommentDto, { content })),
      ).not.toHaveLength(0);
    },
  );

  it('rejects a client-supplied owner at the request boundary', async () => {
    const errors = await validate(
      plainToInstance(CommentDto, {
        content: 'A comment',
        userId: 'another-user',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors).toEqual([expect.objectContaining({ property: 'userId' })]);
  });
});
