import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '../auth/shared/constants/role.constant.js';
import type { AuthorizationActor } from '../auth/shared/contracts/authorization-actor.type.js';
import { Permission } from '../auth/shared/enums/permission.enum.js';
import { assertPermissions } from '../auth/shared/utils/permissions.js';
import { COMMENT_POLICY } from './policy/comment.policy.js';
import type { CommentDto } from './dto/comment.dto.js';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CommentDto, actor: AuthorizationActor) {
    assertPermissions(COMMENT_POLICY, actor.role, Permission.CREATE);
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
    assertPermissions(COMMENT_POLICY, actor.role, Permission.UPDATE);
    const comment = await this.prisma.db.orm.public.Comment.where({
      id,
      ...(actor.role === Role.SUPER_ADMIN ? {} : { userId: actor.id }),
    }).update({ content: input.content });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async remove(id: string, actor: AuthorizationActor) {
    assertPermissions(COMMENT_POLICY, actor.role, Permission.DELETE);
    const comment = await this.prisma.db.orm.public.Comment.where({
      id,
      ...(actor.role === Role.SUPER_ADMIN ? {} : { userId: actor.id }),
    }).delete();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
  }
}
