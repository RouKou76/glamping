import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GatewayService } from '../gateway/gateway.service';
import { PushService } from '../push/push.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private gateway: GatewayService,
    private push: PushService,
  ) {}

  async findAll(query: {
    houseId?: string;
    status?: string;
    assignedTo?: string;
    userRole?: string;
    userPermissions?: string[];
  }) {
    const where: Record<string, any> = {};

    if (query.houseId) where.houseId = query.houseId;
    if (query.status) where.status = query.status;
    if (query.assignedTo) where.assignedTo = query.assignedTo;

    if (query.userPermissions && query.userRole !== 'admin') {
      const hasAllView = query.userPermissions.includes('view_tickets');
      const viewTicketTypes = query.userPermissions
        .filter((p) => p.startsWith('view_tickets:'))
        .map((p) => p.split(':')[1]);
      if (!hasAllView && viewTicketTypes.length > 0) {
        where.type = { in: viewTicketTypes };
      }
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      orderBy: { sentAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      houseId: t.houseId,
      type: t.type,
      status: t.status,
      createdAt: t.sentAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      desiredAt: t.desiredAt?.toISOString(),
      description: t.description,
      geo: t.geo,
      assignedTo: t.assignedTo,
      items: (t.items as Array<Record<string, unknown>>) || undefined,
      location: t.location,
      guestCount: t.guestCount,
      priceFix: t.priceFix,
      km: t.km,
    }));
  }

  async findById(id: string) {
    return this.prisma.ticket.findUnique({ where: { id } });
  }

  async create(dto: CreateTicketDto) {
    if (dto.type === 'custom' && dto.desiredAt && dto.description) {
      const bracketMatch = dto.description.match(/^\[(.+?)\]/);
      const serviceName = bracketMatch ? bracketMatch[1] : null;
      if (serviceName) {
        const service = await this.prisma.service.findFirst({ where: { name: serviceName } });
        if (service) {
          const fields = service.fields as Record<string, unknown>;
          if (fields?.booking) {
            const limit = (fields.bookingLimit as number) ?? 1;
            const desiredDate = new Date(dto.desiredAt);
            const slotTime = `${String(desiredDate.getHours()).padStart(2, '0')}:${String(desiredDate.getMinutes()).padStart(2, '0')}`;
            const slotStart = new Date(desiredDate); slotStart.setSeconds(0, 0);
            const slotEnd = new Date(slotStart); slotEnd.setMinutes(slotEnd.getMinutes() + 1);
            const startOfDay = new Date(desiredDate); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(desiredDate); endOfDay.setHours(23, 59, 59, 999);
            const count = await this.prisma.ticket.count({
              where: {
                type: 'custom',
                description: { startsWith: `[${serviceName}]` },
                status: { not: 'archived' },
                desiredAt: { gte: slotStart, lt: slotEnd },
              },
            });
            if (count >= limit) {
              throw new Error(`Слот ${slotTime} уже занят. Попробуйте другое время.`);
            }
          }
        }
      }
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        houseId: dto.houseId,
        type: dto.type as never,
        description: dto.description,
        geo: dto.geo,
        assignedTo: dto.assignedTo as never,
        location: dto.location,
        guestCount: dto.guestCount,
        items: dto.items as never,
        priceFix: dto.priceFix,
        km: dto.km,
        desiredAt: dto.desiredAt ? new Date(dto.desiredAt) : undefined,
        sessionId: dto.sessionId,
      },
    });

    const result = {
      id: ticket.id,
      houseId: ticket.houseId,
      type: ticket.type,
      status: ticket.status,
      createdAt: ticket.sentAt.toISOString(),
      desiredAt: ticket.desiredAt?.toISOString(),
      description: ticket.description,
      geo: ticket.geo,
      assignedTo: ticket.assignedTo,
      items: (ticket.items as Array<Record<string, unknown>>) || undefined,
      location: ticket.location,
      guestCount: ticket.guestCount,
      priceFix: ticket.priceFix,
      km: ticket.km,
      updatedAt: ticket.updatedAt.toISOString(),
    };

    void this.gateway.broadcastToAdmins('server:ticket:created', result);

    if (!this.gateway.hasConnectedAdmins()) {
      const house = await this.prisma.house.findUnique({
        where: { id: dto.houseId },
      });
      const typeLabel =
        dto.type === 'custom' && dto.description ? dto.description : dto.type;
      void this.push.sendNotification({
        title: 'Новая заявка',
        body: `${typeLabel} — Домик №${house?.number ?? '?'}`,
        url: '/',
      });
    }

    return result;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: dto.status as never,
        assignedTo: dto.assignedTo as never,
      },
    });

    const house = await this.prisma.house.findUnique({
      where: { id: updated.houseId },
    });

    const result = {
      id: updated.id,
      houseId: updated.houseId,
      type: updated.type,
      status: updated.status,
      createdAt: updated.sentAt.toISOString(),
      desiredAt: updated.desiredAt?.toISOString(),
      description: updated.description,
      geo: updated.geo,
      assignedTo: updated.assignedTo,
      items: (updated.items as Array<Record<string, unknown>>) || undefined,
      location: updated.location,
      guestCount: updated.guestCount,
      priceFix: updated.priceFix,
      updatedAt: updated.updatedAt.toISOString(),
    };

    void this.gateway.broadcastToAdmins('server:ticket:updated', result);

    if (dto.status && !this.gateway.hasConnectedAdmins()) {
      const statusLabels: Record<string, string> = {
        in_progress: 'В работе',
        done: 'Готово',
        archived: 'В архив',
      };
      const label = statusLabels[dto.status] ?? dto.status;
      void this.push.sendNotification({
        title: 'Заявка обновлена',
        body: `${result.type} — Домик №${house?.number ?? '?'} → ${label}`,
        url: '/',
      });
    }

    return result;
  }
}
