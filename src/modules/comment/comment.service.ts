import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthorizationActor } from '../auth/authorization/contracts/authorization-actor.type.js';
import { Permissions } from '../auth/authorization/enums/permissions.enum.js';
import { AuthorizationService } from '../auth/authorization/services/authorization.service.js';
import { COMMENT_POLICY } from './policy/comment.policy.js';
import type { CommentDto } from './dto/comment.dto.js';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  create(input: CommentDto, actor: AuthorizationActor) {
    this.authorization.assertCan({
      actor,
      policy: COMMENT_POLICY,
      action: Permissions.CREATE,
      resource: { ownerId: actor.id },
    });

    return this.prisma.db.orm.public.Comment.create({
      content: input.content,
      userId: actor.id,
    });
  }

  async findAll(limit: number, offset: number) {
    return await this.prisma.db.orm.public.Comment.orderBy([
      (comment) => comment.createdAt.desc(),
      (comment) => comment.id.desc(),
    ])
      .limit(limit)
      .offset(offset)
      .all();
  }

  async findOne(id: string) {
    const comment = await this.prisma.db.orm.public.Comment.first({ id });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async update(id: string, input: CommentDto, actor: AuthorizationActor) {
    const filter = this.authorization.authorizedWhere({
      actor,
      policy: COMMENT_POLICY,
      action: Permissions.UPDATE,
      match: { id },
      ownerField: 'userId',
    });

    const comment = await this.prisma.db.orm.public.Comment.where(
      filter,
    ).update({ content: input.content });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async remove(id: string, actor: AuthorizationActor) {
    const filter = this.authorization.authorizedWhere({
      actor,
      policy: COMMENT_POLICY,
      action: Permissions.DELETE,
      match: { id },
      ownerField: 'userId',
    });

    const comment =
      await this.prisma.db.orm.public.Comment.where(filter).delete();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
  }
}
