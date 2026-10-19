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
import { NoteDto } from './dto/note.dto.js';
import { NoteService } from './note.service.js';

@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  create(@Body() input: NoteDto, @CurrentUser('id') userId: string) {
    return this.noteService.create(input, userId);
  }

  @Get()
  @Public()
  findAll(@Query() query: PaginationDto) {
    return this.noteService.findAll(query.limit, query.offset);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.noteService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: NoteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.noteService.update(id, input, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.noteService.remove(id, userId);
  }
}
