import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NoteDto } from '../dto/note.dto.js';

describe('NoteDto', () => {
  const input = { title: 'A note', content: 'A useful reminder.' };

  it('accepts a title and content within their limits', async () => {
    const note = plainToInstance(NoteDto, {
      title: 't'.repeat(100),
      content: 'c'.repeat(1000),
    });
    expect(await validate(note)).toEqual([]);
  });

  it.each([
    { title: undefined },
    { title: null },
    { title: 123 },
    { title: '' },
    { title: ' \t\n' },
    { title: 't'.repeat(101) },
    { content: undefined },
    { content: null },
    { content: 123 },
    { content: '' },
    { content: ' \t\n' },
    { content: 'c'.repeat(1001) },
  ])('rejects invalid note fields: %j', async (invalid) => {
    const note = plainToInstance(NoteDto, { ...input, ...invalid });
    expect(await validate(note)).not.toHaveLength(0);
  });

  it('rejects a client-supplied owner', async () => {
    const note = plainToInstance(NoteDto, { ...input, userId: 'another-user' });
    const errors = await validate(note, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toEqual([expect.objectContaining({ property: 'userId' })]);
  });
});
