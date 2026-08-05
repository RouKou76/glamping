import {
  Controller,
  Get,
  Post,
  Patch,
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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tickets' })
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
  @UseGuards(new RateLimitGuard(10, 60_000))
  @ApiOperation({ summary: 'Create ticket (guest device)' })
  async create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user?: { role?: { name: string; permissions: string[] } },
  ) {
    const ticket = await this.ticketsService.findById(id);
    if (!ticket) {
      return this.ticketsService.update(id, dto);
    }

    const isAdmin = user?.role?.name === 'admin';
    const perms = user?.role?.permissions ?? [];
    const hasGlobalManage = perms.includes('manage_tickets');
    const hasAllView = perms.includes('view_tickets');
    const hasTypeManage = perms.includes(`view_tickets:${ticket.type}`);

    if (!isAdmin && !hasGlobalManage && !hasAllView && !hasTypeManage) {
      throw new ForbiddenException('Нет прав для управления этим типом заявок');
    }

    return this.ticketsService.update(id, dto);
  }
}
