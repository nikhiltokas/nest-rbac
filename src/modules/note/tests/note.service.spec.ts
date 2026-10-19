import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import { NoteDto } from '../dto/note.dto.js';
import { NoteService } from '../note.service.js';

describe('notes', () => {
  const fields = {
    title: 'RBAC practice',
    content: 'Try different permissions for this resource.',
  };
  const input = plainToInstance(NoteDto, fields);
  const note = { id: 'note-id', userId: 'owner-id', ...fields };
  let service: NoteService;
  let create: ReturnType<typeof vi.fn>;
  let stored: typeof note | null;

  beforeEach(() => {
    stored = { ...note };
    create = vi.fn().mockResolvedValue(note);
    const collection = {
      create,
      first: ({ id }: { id: string }) =>
        Promise.resolve(stored?.id === id ? stored : null),
      where: (filter: { id: string; userId: string }) => ({
        update: (data: NoteDto) => {
          if (stored?.id !== filter.id || stored?.userId !== filter.userId) {
            return Promise.resolve(null);
          }
          stored = { ...stored, title: data.title, content: data.content };
          return Promise.resolve(stored);
        },
        delete: () => {
          if (stored?.id !== filter.id || stored?.userId !== filter.userId) {
            return Promise.resolve(null);
          }
          const deleted = stored;
          stored = null;
          return Promise.resolve(deleted);
        },
      }),
    };
    const prisma = {
      db: { orm: { public: { Note: collection } } },
    } as unknown as PrismaService;
    service = new NoteService(prisma);
  });

  it('assigns new notes to the authenticated user', async () => {
    const suppliedInput = plainToInstance(NoteDto, {
      ...fields,
      userId: 'another-user',
    });
    await expect(service.create(suppliedInput, note.userId)).resolves.toEqual(
      note,
    );
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

  it('allows the owner to edit a note', async () => {
    const changes = {
      title: 'Updated title',
      content: 'Updated content',
    };
    await expect(
      service.update(note.id, plainToInstance(NoteDto, changes), note.userId),
    ).resolves.toEqual({ ...note, ...changes });
    expect(stored).toEqual({ ...note, ...changes });
  });

  it('allows the owner to delete a note', async () => {
    await expect(service.remove(note.id, note.userId)).resolves.toBeUndefined();
    expect(stored).toBeNull();
  });

  it('rejects edits by another user without changing the note', async () => {
    await expect(
      service.update(note.id, input, 'another-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stored).toEqual(note);
  });

  it('rejects deletion by another user without deleting the note', async () => {
    await expect(
      service.remove(note.id, 'another-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stored).toEqual(note);
  });

  it('rejects an update to a missing note', async () => {
    await expect(
      service.update('missing', input, note.userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deletion of a missing note', async () => {
    await expect(service.remove('missing', note.userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
