import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CommentDto } from './dto/comment.dto.js';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CommentDto, userId: string) {
    return this.prisma.db.orm.public.Comment.create({
      content: input.content,
      userId,
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

  async update(id: string, input: CommentDto, userId: string) {
    const comment = await this.prisma.db.orm.public.Comment.where({
      id,
      userId,
    }).update({ content: input.content });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.db.orm.public.Comment.where({
      id,
      userId,
    }).delete();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
  }
}
