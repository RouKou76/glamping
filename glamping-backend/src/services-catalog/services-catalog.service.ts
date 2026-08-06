import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GatewayService } from '../gateway/gateway.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesCatalogService {
  constructor(
    private prisma: PrismaService,
    private gateway: GatewayService,
  ) {}

  async findAll(showInactive = false) {
    const where = showInactive ? {} : { active: true };
    const services = await this.prisma.service.findMany({ where });
    return services.map((s) => {
      const fields = s.fields as Record<string, unknown>;
      return {
        id: s.id,
        name: s.name,
        requiresTime: fields?.requiresTime ?? false,
        priceInfo: s.price,
        icon: s.icon,
        description: (fields?.description as string) || undefined,
        showDescription: (fields?.showDescription as boolean) ?? false,
        booking: (fields?.booking as boolean) ?? false,
        bookingSlots: (fields?.bookingSlots as string[]) || [],
        bookingLimit: (fields?.bookingLimit as number) ?? 1,
        bookingSchedule:
          (fields?.bookingSchedule as { date: string; slots: string[] }[]) ||
          [],
        externalUrl: (fields?.externalUrl as string) || undefined,
        jsonSchema: s.jsonSchema,
        active: s.active,
        assignedTo: s.assignedTo,
      };
    });
  }

  async create(dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        name: dto.name,
        price: dto.priceInfo,
        icon: dto.icon,
        active: dto.active ?? true,
        assignedTo: dto.assignedTo as never,
        fields: dto.fields || {},
        items: dto.items || undefined,
        jsonSchema: dto.jsonSchema || undefined,
      },
    });

    void this.gateway.broadcastToAdmins(
      'server:services:updated',
      await this.findAll(true),
    );

    void this.gateway.broadcastToAllHouses(
      'server:services:updated',
      await this.findAll(),
    );

    return {
      id: service.id,
      name: service.name,
      requiresTime:
        (service.fields as Record<string, unknown>)?.requiresTime ?? false,
      priceInfo: service.price,
      icon: service.icon,
      jsonSchema: service.jsonSchema,
      active: service.active,
      assignedTo: service.assignedTo,
    };
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.priceInfo,
        icon: dto.icon,
        active: dto.active,
        assignedTo: dto.assignedTo as never,
        fields: dto.fields,
        items: dto.items,
        jsonSchema: dto.jsonSchema,
      },
    });

    void this.gateway.broadcastToAdmins(
      'server:services:updated',
      await this.findAll(true),
    );

    void this.gateway.broadcastToAllHouses(
      'server:services:updated',
      await this.findAll(),
    );

    return {
      id: updated.id,
      name: updated.name,
      requiresTime:
        (updated.fields as Record<string, unknown>)?.requiresTime ?? false,
      priceInfo: updated.price,
      icon: updated.icon,
      jsonSchema: updated.jsonSchema,
      active: updated.active,
      assignedTo: updated.assignedTo,
    };
  }

  async getAvailability(serviceId: string, date: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException('Service not found');
    const fields = service.fields as Record<string, unknown>;
    const defaultSlots = (fields?.bookingSlots as string[]) || [];
    const limit = (fields?.bookingLimit as number) ?? 1;
    const schedule =
      (fields?.bookingSchedule as { date: string; slots: string[] }[]) || [];
    const scheduleEntry = schedule.find((s) => s.date === date);
    const slots = scheduleEntry ? scheduleEntry.slots : defaultSlots;

    const startOfDay = new Date(date + 'T00:00:00');
    const endOfDay = new Date(date + 'T23:59:59');

    const booked = await this.prisma.ticket.findMany({
      where: {
        type: 'custom',
        OR: [
          { serviceName: service.name },
          { description: { startsWith: `[${service.name}]` } },
        ],
        status: { not: 'archived' },
        desiredAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { desiredAt: true, slotTime: true },
    });

    const bookedByTime: Record<string, number> = {};
    for (const t of booked) {
      const time =
        t.slotTime ||
        (t.desiredAt
          ? `${String(t.desiredAt.getHours()).padStart(2, '0')}:${String(t.desiredAt.getMinutes()).padStart(2, '0')}`
          : null);
      if (!time) continue;
      bookedByTime[time] = (bookedByTime[time] || 0) + 1;
    }

    return slots.map((time) => ({
      time,
      booked: bookedByTime[time] || 0,
      limit,
    }));
  }

  async delete(id: string) {
    await this.prisma.service.delete({ where: { id } });
    void this.gateway.broadcastToAdmins(
      'server:services:updated',
      await this.findAll(true),
    );
    void this.gateway.broadcastToAllHouses(
      'server:services:updated',
      await this.findAll(),
    );
  }
}
