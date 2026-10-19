import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import { CommentService } from '../comment.service.js';
import { CommentDto } from '../dto/comment.dto.js';

describe('comment ownership', () => {
  const input = plainToInstance(CommentDto, { content: 'A comment' });
  const comment = {
    id: 'comment-id',
    userId: 'owner-id',
    content: input.content,
  };
  let service: CommentService;

  beforeEach(() => {
    const collection = {
      where: (filter: { id: string; userId: string }) => ({
        update: vi
          .fn()
          .mockResolvedValue(
            filter.id === comment.id && filter.userId === comment.userId
              ? comment
              : null,
          ),
        delete: vi
          .fn()
          .mockResolvedValue(
            filter.id === comment.id && filter.userId === comment.userId
              ? comment
              : null,
          ),
      }),
    };
    const prisma = {
      db: { orm: { public: { Comment: collection } } },
    } as unknown as PrismaService;
    service = new CommentService(prisma);
  });

  it('allows the owner to edit a comment', async () => {
    await expect(
      service.update(comment.id, input, comment.userId),
    ).resolves.toEqual(comment);
  });

  it('allows the owner to delete a comment', async () => {
    await expect(
      service.remove(comment.id, comment.userId),
    ).resolves.toBeUndefined();
  });

  it('rejects an edit by another user', async () => {
    await expect(
      service.update(comment.id, input, 'other-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a deletion by another user', async () => {
    await expect(
      service.remove(comment.id, 'other-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects changes to a missing comment', async () => {
    await expect(
      service.update('missing', input, comment.userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
