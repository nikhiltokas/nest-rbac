import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuthorizationActor } from '../../auth/shared/contracts/authorization-actor.type.js';
import { CommentService } from '../comment.service.js';
import { CommentDto } from '../dto/comment.dto.js';

describe('comment permissions and ownership', () => {
  const input = plainToInstance(CommentDto, { content: 'A comment' });
  const comment = {
    id: 'comment-id',
    userId: 'owner-id',
    content: input.content,
  };
  const owner: AuthorizationActor = { id: comment.userId, role: 'USER' };
  const otherUser: AuthorizationActor = { id: 'other-id', role: 'USER' };
  const moderator: AuthorizationActor = { id: 'mod-id', role: 'MODERATOR' };
  const admin: AuthorizationActor = { id: 'admin-id', role: 'SUPER_ADMIN' };
  let service: CommentService;
  let stored: typeof comment | null;
  let create: ReturnType<typeof vi.fn>;
  let where: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stored = { ...comment };
    create = vi.fn().mockResolvedValue(comment);
    const matches = (filter: { id: string; userId?: string }) =>
      stored?.id === filter.id &&
      (filter.userId === undefined || stored.userId === filter.userId);
    where = vi.fn((filter: { id: string; userId?: string }) => ({
      update: (data: CommentDto) => {
        if (!stored || !matches(filter)) return Promise.resolve(null);
        stored = { ...stored, content: data.content };
        return Promise.resolve(stored);
      },
      delete: () => {
        if (!matches(filter)) return Promise.resolve(null);
        const deleted = stored;
        stored = null;
        return Promise.resolve(deleted);
      },
    }));
    const collection = {
      create,
      where,
      first: ({ id }: { id: string }) =>
        Promise.resolve(stored?.id === id ? stored : null),
    };
    const prisma = {
      db: { orm: { public: { Comment: collection } } },
    } as unknown as PrismaService;
    service = new CommentService(prisma);
  });

  it('assigns new comments to the authenticated user', async () => {
    const suppliedInput = plainToInstance(CommentDto, {
      content: input.content,
      userId: 'someone-else',
    });
    await expect(service.create(suppliedInput, owner)).resolves.toEqual(
      comment,
    );
    expect(create).toHaveBeenCalledWith({
      content: input.content,
      userId: owner.id,
    });
  });

  it('allows the owner to edit a comment', async () => {
    const changes = plainToInstance(CommentDto, { content: 'Edited comment' });
    await expect(service.update(comment.id, changes, owner)).resolves.toEqual({
      ...comment,
      content: changes.content,
    });
  });

  it('returns an existing comment without requiring an actor', async () => {
    await expect(service.findOne(comment.id)).resolves.toEqual(comment);
  });

  it('returns 404 for a missing comment', async () => {
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('paginates comments with a stable newest-first order', async () => {
    const query = {
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([comment]),
    };
    const orderBy = vi.fn().mockReturnValue(query);
    const prisma = {
      db: { orm: { public: { Comment: { orderBy } } } },
    } as unknown as PrismaService;
    await expect(new CommentService(prisma).findAll(5, 10)).resolves.toEqual([
      comment,
    ]);
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.offset).toHaveBeenCalledWith(10);
    const fields = {
      createdAt: { desc: () => 'createdAt DESC' },
      id: { desc: () => 'id DESC' },
    };
    const [selectors] = orderBy.mock.calls[0];
    expect(
      selectors.map((select: (value: typeof fields) => string) =>
        select(fields),
      ),
    ).toEqual(['createdAt DESC', 'id DESC']);
  });

  it('allows a super admin to delete a comment', async () => {
    await expect(service.remove(comment.id, admin)).resolves.toBeUndefined();
    expect(stored).toBeNull();
  });

  it('rejects an edit by another user', async () => {
    await expect(
      service.update(comment.id, input, otherUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stored).toEqual(comment);
  });

  it.each([owner, { ...moderator, id: owner.id }])(
    'allows a $role to delete their own comment',
    async (actor) => {
      await expect(service.remove(comment.id, actor)).resolves.toBeUndefined();
      expect(stored).toBeNull();
    },
  );

  it.each([otherUser, moderator])(
    'rejects deletion of another users comment by a $role',
    async (actor) => {
      await expect(service.remove(comment.id, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(stored).toEqual(comment);
    },
  );

  it.each([moderator, { ...moderator, id: owner.id }])(
    'denies creation and editing by moderator $id before accessing storage',
    async (actor) => {
      expect(() => service.create(input, actor)).toThrow(ForbiddenException);
      await expect(
        service.update(comment.id, input, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(create).not.toHaveBeenCalled();
      expect(where).not.toHaveBeenCalled();
      expect(stored).toEqual(comment);
    },
  );

  it('allows a super admin to edit and delete another users comment', async () => {
    const changes = plainToInstance(CommentDto, { content: 'Admin edit' });
    await expect(service.update(comment.id, changes, admin)).resolves.toEqual({
      ...comment,
      content: changes.content,
    });
    await expect(service.remove(comment.id, admin)).resolves.toBeUndefined();
    expect(stored).toBeNull();
  });

  it.each([owner, admin])(
    'rejects an update to a missing comment for $role',
    async (actor) => {
      await expect(
        service.update('missing', input, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(stored).toEqual(comment);
    },
  );

  it.each([owner, moderator, admin])(
    'rejects deletion of a missing comment for $role',
    async (actor) => {
      await expect(service.remove('missing', actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(stored).toEqual(comment);
    },
  );

  it('denies direct service calls with an unknown role', async () => {
    const actor = {
      id: owner.id,
      role: 'UNKNOWN',
    } as unknown as AuthorizationActor;
    expect(() => service.create(input, actor)).toThrow(ForbiddenException);
    await expect(
      service.update(comment.id, input, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(comment.id, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
    expect(stored).toEqual(comment);
  });
});
