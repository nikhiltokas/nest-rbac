import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthorizationActor } from '../auth/authorization/contracts/authorization-actor.type.js';
import { Permissions } from '../auth/authorization/enums/permissions.enum.js';
import { AuthorizationService } from '../auth/authorization/services/authorization.service.js';
import type { NoteDto } from './dto/note.dto.js';
import { NOTE_POLICY } from './policy/note.policy.js';

@Injectable()
export class NoteService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  create(input: NoteDto, actor: AuthorizationActor) {
    this.authorization.assertCan({
      actor,
      policy: NOTE_POLICY,
      action: Permissions.CREATE,
      resource: { ownerId: actor.id },
    });

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
    const filter = this.authorization.authorizedWhere({
      actor,
      policy: NOTE_POLICY,
      action: Permissions.UPDATE,
      match: { id },
      ownerField: 'userId',
    });

    const note = await this.prismaService.db.orm.public.Note.where(
      filter,
    ).update({ title: input.title, content: input.content });

    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async remove(id: string, actor: AuthorizationActor) {
    const filter = this.authorization.authorizedWhere({
      actor,
      policy: NOTE_POLICY,
      action: Permissions.DELETE,
      match: { id },
      ownerField: 'userId',
    });

    const note =
      await this.prismaService.db.orm.public.Note.where(filter).delete();

    if (!note) {
      throw new NotFoundException('Note not found');
    }
  }
}
