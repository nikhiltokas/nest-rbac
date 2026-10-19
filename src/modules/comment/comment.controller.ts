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

import { PaginationDto } from '../../shared/dto/pagination.dto.js';
import { CurrentUser } from '../auth/shared/decorators/current.user.decorator.js';
import { Public } from '../auth/shared/decorators/public.decorator.js';
import { CommentService } from './comment.service.js';
import { CommentDto } from './dto/comment.dto.js';

@Controller('comments')
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Post()
  create(@Body() input: CommentDto, @CurrentUser('id') userId: string) {
    return this.comments.create(input, userId);
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CommentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.comments.update(id, input, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.comments.remove(id, userId);
  }
}
