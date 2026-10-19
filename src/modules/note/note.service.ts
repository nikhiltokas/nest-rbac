import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { NoteDto } from './dto/note.dto.js';

@Injectable()
export class NoteService {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: NoteDto, userId: string) {
    return this.prismaService.db.orm.public.Note.create({
      title: input.title,
      content: input.content,
      userId,
    });
  }

  async findAll(limit: number, offset: number) {
    return await this.prismaService.db.orm.public.Note.orderBy([
      (note) => note.createdAt.desc(),
      (note) => note.id.desc(),
    ])
      .limit(limit)
      .offset(offset)
      .all();
  }

  async findOne(id: string) {
    const note = await this.prismaService.db.orm.public.Note.first({ id });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(id: string, input: NoteDto, userId: string) {
    const note = await this.prismaService.db.orm.public.Note.where({
      id,
      userId,
    }).update({ title: input.title, content: input.content });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async remove(id: string, userId: string) {
    const note = await this.prismaService.db.orm.public.Note.where({
      id,
      userId,
    }).delete();
    if (!note) {
      throw new NotFoundException('Note not found');
    }
  }
}
