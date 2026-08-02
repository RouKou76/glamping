import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GatewayService } from '../gateway/gateway.service';
import { PushService } from '../push/push.service';
import { HousesService } from '../houses/houses.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const TYPE_LABELS: Record<string, string> = {
  food: 'Питание',
  minibar: 'Минибар',
  transfer: 'Трансфер',
  cleaning: 'Уборка',
  towels: 'Полотенца',
  gates: 'Ворота',
  custom: 'Услуга',
  kupe: 'Купель',
};

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private gateway: GatewayService,
    private push: PushService,
    private housesService: HousesService,
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
      slotTime: t.slotTime,
      serviceName: t.serviceName,
    }));
  }

  async findById(id: string) {
    return this.prisma.ticket.findUnique({ where: { id } });
  }

  async create(dto: CreateTicketDto) {
    if (dto.desiredAt) {
      const desired = new Date(dto.desiredAt);
      if (desired < new Date()) {
        throw new BadRequestException('Нельзя заказать на прошлое время');
      }
    }

    const matchName = dto.serviceName || (() => {
      if (!dto.description) return null;
      const m = dto.description.match(/^\[(.+?)\]/);
      return m ? m[1] : null;
    })();

    if (dto.type === 'custom' && dto.desiredAt && matchName) {
      const service = await this.prisma.service.findFirst({ where: { name: matchName } });
      if (service) {
        const fields = service.fields as Record<string, unknown>;
        if (fields?.booking) {
          const limit = (fields.bookingLimit as number) ?? 1;
          const desiredDate = new Date(dto.desiredAt);
          const slotTime = dto.slotTime
            || `${String(desiredDate.getHours()).padStart(2, '0')}:${String(desiredDate.getMinutes()).padStart(2, '0')}`;
          const slotStart = new Date(desiredDate); slotStart.setSeconds(0, 0);
          const slotEnd = new Date(slotStart); slotEnd.setMinutes(slotEnd.getMinutes() + 1);

          const nameMatch = { OR: [
            { serviceName: matchName },
            { description: { startsWith: `[${matchName}]` } },
          ] };

          const ticket = await this.prisma.$transaction(async (tx) => {
            const count = await tx.ticket.count({
              where: {
                type: 'custom',
                ...nameMatch,
                status: { not: 'archived' },
                desiredAt: { gte: slotStart, lt: slotEnd },
              },
            });
            if (count >= limit) {
              throw new BadRequestException(`Слот ${slotTime} уже занят. Попробуйте другое время.`);
            }
            return tx.ticket.create({
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
                desiredAt: new Date(dto.desiredAt!),
                sessionId: dto.sessionId,
                slotTime: dto.slotTime,
                serviceName: matchName,
              },
            });
          });

          return this.broadcastAndNotify(ticket, dto);
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
        slotTime: dto.slotTime,
        serviceName: dto.serviceName,
      },
    });

    return this.broadcastAndNotify(ticket, dto);
  }

  private broadcastAndNotify(ticket: any, dto: CreateTicketDto) {
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
      slotTime: ticket.slotTime,
      serviceName: ticket.serviceName,
      updatedAt: ticket.updatedAt.toISOString(),
    };

    void this.gateway.broadcastToAdmins('server:ticket:created', result);

    this.prisma.house.findUnique({ where: { id: dto.houseId } }).then((house) => {
      const typeLabel =
        dto.type === 'custom' && dto.description ? dto.description : (TYPE_LABELS[dto.type] ?? dto.type);
      void this.push.sendNotification({
        title: 'Новая заявка',
        body: `${typeLabel} — Домик №${house?.number ?? '?'}`,
        url: '/admin/',
      });
    });

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

    if (dto.status === 'done' && ticket.status !== 'done' && ticket.description === 'Заявка на выезд') {
      try {
        await this.housesService.checkout(ticket.houseId);
      } catch (e) {
        // ignore — checkout may fail if already done
      }
    }

    if (dto.status) {
      const statusLabels: Record<string, string> = {
        in_progress: 'В работе',
        done: 'Готово',
        archived: 'В архив',
      };
      const label = statusLabels[dto.status] ?? dto.status;
      void this.push.sendNotification({
        title: 'Заявка обновлена',
        body: `${TYPE_LABELS[result.type] ?? result.type} — Домик №${house?.number ?? '?'} → ${label}`,
        url: '/admin/',
      });
    }

    return result;
  }
}
