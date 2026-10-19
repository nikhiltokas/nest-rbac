import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '../auth/shared/constants/role.constant.js';
import type { AuthorizationActor } from '../auth/shared/contracts/authorization-actor.type.js';
import { Permission } from '../auth/shared/enums/permission.enum.js';
import { assertPermissions } from '../auth/shared/utils/permissions.js';
import type { NoteDto } from './dto/note.dto.js';
import { NOTE_POLICY } from './policy/note.policy.js';

@Injectable()
export class NoteService {
  constructor(private readonly prismaService: PrismaService) {}

  create(input: NoteDto, actor: AuthorizationActor) {
    assertPermissions(NOTE_POLICY, actor.role, Permission.CREATE);
    return this.prismaService.db.orm.public.Note.create({
      title: input.title,
      content: input.content,
      userId: actor.id,
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

  async update(id: string, input: NoteDto, actor: AuthorizationActor) {
    assertPermissions(NOTE_POLICY, actor.role, Permission.UPDATE);
    const note = await this.prismaService.db.orm.public.Note.where({
      id,
      ...(actor.role === Role.SUPER_ADMIN ? {} : { userId: actor.id }),
    }).update({ title: input.title, content: input.content });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async remove(id: string, actor: AuthorizationActor) {
    assertPermissions(NOTE_POLICY, actor.role, Permission.DELETE);
    const note = await this.prismaService.db.orm.public.Note.where({
      id,
      ...(actor.role === Role.SUPER_ADMIN ? {} : { userId: actor.id }),
    }).delete();
    if (!note) {
      throw new NotFoundException('Note not found');
    }
  }
}
