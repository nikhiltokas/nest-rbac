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
import { NOTE_POLICY } from './policy/note.policy.js';

// Shared
import { PaginationDto } from '../../shared/dto/pagination.dto.js';

// Feature
import { NoteService } from './note.service.js';
import { NoteDto } from './dto/note.dto.js';

@Controller('notes')
@Policy(NOTE_POLICY)
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @RequirePermissions(Permission.CREATE)
  create(@Body() input: NoteDto, @CurrentUser() actor: AuthorizationActor) {
    return this.noteService.create(input, actor);
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
  @RequirePermissions(Permission.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: NoteDto,
    @CurrentUser() actor: AuthorizationActor,
  ) {
    return this.noteService.update(id, input, actor);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthorizationActor,
  ) {
    return this.noteService.remove(id, actor);
  }
}
