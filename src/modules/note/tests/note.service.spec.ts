import { AuthorizationService } from '../../auth/authorization/services/authorization.service.js';
import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuthorizationActor } from '../../auth/authorization/contracts/authorization-actor.type.js';
import { NoteDto } from '../dto/note.dto.js';
import { NoteService } from '../note.service.js';

describe('notes', () => {
  const fields = {
    title: 'RBAC practice',
    content: 'Try different permissions for this resource.',
  };
  const input = plainToInstance(NoteDto, fields);
  const note = { id: 'note-id', userId: 'owner-id', ...fields };
  const owner: AuthorizationActor = { id: note.userId, role: 'MODERATOR' };
  const otherUser: AuthorizationActor = { id: 'other-id', role: 'MODERATOR' };
  const admin: AuthorizationActor = { id: 'admin-id', role: 'SUPER_ADMIN' };
  let service: NoteService;
  let create: ReturnType<typeof vi.fn>;
  let stored: typeof note | null;
  let where: ReturnType<typeof vi.fn>;
  let first: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stored = { ...note };
    create = vi.fn().mockResolvedValue(note);
    where = vi.fn((filter: { id: string; userId?: string }) => ({
      update: (data: NoteDto) => {
        if (
          stored?.id !== filter.id ||
          (filter.userId !== undefined && stored.userId !== filter.userId)
        ) {
          return Promise.resolve(null);
        }
        stored = { ...stored, title: data.title, content: data.content };
        return Promise.resolve(stored);
      },
      delete: () => {
        if (
          stored?.id !== filter.id ||
          (filter.userId !== undefined && stored.userId !== filter.userId)
        ) {
          return Promise.resolve(null);
        }
        const deleted = stored;
        stored = null;
        return Promise.resolve(deleted);
      },
    }));
    first = vi.fn(({ id }: { id: string }) =>
      Promise.resolve(stored?.id === id ? stored : null),
    );
    const collection = {
      create,
      first,
      where,
    };
    const prisma = {
      db: { orm: { public: { Note: collection } } },
    } as unknown as PrismaService;
    service = new NoteService(prisma, new AuthorizationService());
  });

  it('assigns new notes to the authenticated user', async () => {
    const suppliedInput = plainToInstance(NoteDto, {
      ...fields,
      userId: 'another-user',
    });
    await expect(service.create(suppliedInput, owner)).resolves.toEqual(note);
    expect(create).toHaveBeenCalledWith({ ...fields, userId: note.userId });
  });

  it('returns an existing note', async () => {
    await expect(service.findOne(note.id)).resolves.toEqual(note);
  });

  it('returns 404 for a missing note', async () => {
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('paginates notes with a stable newest-first order', async () => {
    const query = {
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([note]),
    };
    const orderBy = vi.fn().mockReturnValue(query);
    const prisma = {
      db: { orm: { public: { Note: { orderBy } } } },
    } as unknown as PrismaService;
    await expect(
      new NoteService(prisma, new AuthorizationService()).findAll(5, 10),
    ).resolves.toEqual([note]);
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

  it('allows the owner to edit a note', async () => {
    const changes = {
      title: 'Updated title',
      content: 'Updated content',
    };
    await expect(
      service.update(note.id, plainToInstance(NoteDto, changes), owner),
    ).resolves.toEqual({ ...note, ...changes });
    expect(stored).toEqual({ ...note, ...changes });
    expect(where).toHaveBeenCalledWith({ id: note.id, userId: owner.id });
    expect(first).not.toHaveBeenCalled();
  });

  it('allows a super admin to delete a note', async () => {
    await expect(service.remove(note.id, admin)).resolves.toBeUndefined();
    expect(stored).toBeNull();
    expect(where).toHaveBeenCalledWith({ id: note.id });
    expect(first).not.toHaveBeenCalled();
  });

  it('rejects edits by another user without changing the note', async () => {
    await expect(
      service.update(note.id, input, otherUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stored).toEqual(note);
    expect(where).toHaveBeenCalledWith({ id: note.id, userId: otherUser.id });
  });

  it('denies deletion by a moderator without deleting the note', async () => {
    await expect(service.remove(note.id, otherUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(stored).toEqual(note);
    expect(where).not.toHaveBeenCalled();
  });

  it('rejects an update to a missing note', async () => {
    await expect(
      service.update('missing', input, owner),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deletion of a missing note', async () => {
    await expect(service.remove('missing', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps moderators from editing other users notes', async () => {
    const moderator: AuthorizationActor = { id: 'mod-id', role: 'MODERATOR' };
    await expect(
      service.update(note.id, input, moderator),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stored).toEqual(note);
  });

  it('allows super admins to edit and delete another users note', async () => {
    const changes = plainToInstance(NoteDto, {
      title: 'Admin edit',
      content: 'Updated by an admin',
    });
    await expect(service.update(note.id, changes, admin)).resolves.toEqual({
      ...note,
      title: changes.title,
      content: changes.content,
    });
    await expect(service.remove(note.id, admin)).resolves.toBeUndefined();
    expect(stored).toBeNull();
  });

  it('still returns 404 for a super admin targeting a missing note', async () => {
    await expect(
      service.update('missing', input, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('missing', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(stored).toEqual(note);
  });

  it('denies direct service calls with an unknown role', async () => {
    const actor = {
      id: note.userId,
      role: 'UNKNOWN',
    } as unknown as AuthorizationActor;
    expect(() => service.create(input, actor)).toThrow(ForbiddenException);
    await expect(service.update(note.id, input, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.remove(note.id, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
    expect(stored).toEqual(note);
  });

  it('keeps users read-only even when they own the note', async () => {
    const user: AuthorizationActor = { id: note.userId, role: 'USER' };
    expect(() => service.create(input, user)).toThrow(ForbiddenException);
    await expect(service.update(note.id, input, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.remove(note.id, user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
    expect(stored).toEqual(note);
  });

  it('denies deletion by a moderator even when they own the note', async () => {
    await expect(service.remove(note.id, owner)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(stored).toEqual(note);
    expect(where).not.toHaveBeenCalled();
  });
});
