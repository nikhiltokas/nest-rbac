import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

// Decorators
import { CurrentUser } from '../auth/shared/decorators/current.user.decorator.js';
import { RequirePermissions } from '../auth/shared/decorators/permissions.decorator.js';
import { Public } from '../auth/shared/decorators/public.decorator.js';
import { Policy } from '../auth/shared/decorators/policy.decorator.js';

// Authorization
import type { AuthorizationActor } from '../auth/shared/contracts/authorization-actor.type.js';
import { Permission } from '../auth/shared/enums/permission.enum.js';
import { COMMENT_POLICY } from './policy/comment.policy.js';

// Shared
import { PaginationDto } from '../../shared/dto/pagination.dto.js';

// Feature
import { CommentService } from './comment.service.js';
import { CommentDto } from './dto/comment.dto.js';

@Controller('comments')
@Policy(COMMENT_POLICY)
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Post()
  @RequirePermissions(Permission.CREATE)
  create(@Body() input: CommentDto, @CurrentUser() actor: AuthorizationActor) {
    return this.comments.create(input, actor);
  }

  @Get()
  @Public()
  findAll(@Query() query: PaginationDto) {
    return this.comments.findAll(query.limit, query.offset);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.comments.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CommentDto,
    @CurrentUser() actor: AuthorizationActor,
  ) {
    return this.comments.update(id, input, actor);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthorizationActor,
  ) {
    return this.comments.remove(id, actor);
  }
}
