import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TicketsService } from '../tickets/tickets.service';
import { CreateTicketDto } from '../tickets/dto/create-ticket.dto';
import { UpdateTicketDto } from '../tickets/dto/update-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tasks (alias for tickets)' })
  @ApiQuery({ name: 'houseId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  async findAll(
    @Query('houseId') houseId?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @CurrentUser() user?: { role?: { name: string; permissions: string[] } },
  ) {
    const perms = user?.role?.permissions ?? [];
    const hasTicketAccess = perms.some(
      (p) => p === 'view_tickets' || p.startsWith('view_tickets:'),
    );
    if (!hasTicketAccess) {
      throw new ForbiddenException('Нет прав на просмотр заявок');
    }

    return this.ticketsService.findAll({
      houseId,
      status,
      assignedTo,
      userRole: user?.role?.name,
      userPermissions: user?.role?.permissions,
    });
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create task (alias for ticket)' })
  async create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task status' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user?: { role?: { name: string; permissions: string[] } },
  ) {
    const ticket = await this.ticketsService.findById(id);
    if (ticket) {
      const isAdmin = user?.role?.name === 'admin';
      const perms = user?.role?.permissions ?? [];
      const hasGlobalManage = perms.includes('manage_tickets');
      const hasAllView = perms.includes('view_tickets');
      const hasTypeView = perms.includes(`view_tickets:${ticket.type}`);

      if (!isAdmin && !hasGlobalManage && !hasAllView && !hasTypeView) {
        throw new ForbiddenException(
          'Нет прав для управления этим типом заявок',
        );
      }
    }

    return this.ticketsService.update(id, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel task' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user?: { role?: { name: string; permissions: string[] } },
  ) {
    const ticket = await this.ticketsService.findById(id);
    if (ticket) {
      const isAdmin = user?.role?.name === 'admin';
      const perms = user?.role?.permissions ?? [];
      const hasGlobalManage = perms.includes('manage_tickets');
      const hasAllView = perms.includes('view_tickets');
      const hasTypeView = perms.includes(`view_tickets:${ticket.type}`);

      if (!isAdmin && !hasGlobalManage && !hasAllView && !hasTypeView) {
        throw new ForbiddenException(
          'Нет прав для управления этим типом заявок',
        );
      }
    }

    return this.ticketsService.update(id, { status: 'archived' });
  }
}
