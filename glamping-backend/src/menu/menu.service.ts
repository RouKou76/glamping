import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GatewayService } from '../gateway/gateway.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private gateway: GatewayService,
  ) {}

  async findAll(showHidden = false) {
    const where = showHidden ? {} : { hidden: false };
    const items = await this.prisma.menuItem.findMany({ where });
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      category: i.category,
      subcat: i.subcat ?? null,
      price: i.price,
      isAvailable: !i.hidden,
    }));
  }

  async create(dto: CreateMenuItemDto) {
    const item = await this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category as never,
        subcat: (dto.subcat ?? null) as never,
        price: dto.price,
        hidden: !dto.isAvailable,
        showPrice: dto.showPrice ?? true,
      },
    });

    void this.gateway.broadcastToAdmins(
      'server:menu:updated',
      await this.findAll(true),
    );

    void this.gateway.broadcastToAllHouses(
      'server:menu:updated',
      await this.findAll(),
    );

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      subcat: item.subcat ?? null,
      price: item.price,
      isAvailable: !item.hidden,
    };
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category as never,
        subcat: (dto.subcat !== undefined ? dto.subcat : undefined) as never,
        price: dto.price,
        hidden: dto.isAvailable !== undefined ? !dto.isAvailable : undefined,
        showPrice: dto.showPrice,
      },
    });

    void this.gateway.broadcastToAdmins(
      'server:menu:updated',
      await this.findAll(true),
    );

    void this.gateway.broadcastToAllHouses(
      'server:menu:updated',
      await this.findAll(),
    );

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      subcat: updated.subcat ?? null,
      price: updated.price,
      isAvailable: !updated.hidden,
    };
  }

  async delete(id: string) {
    await this.prisma.menuItem.delete({ where: { id } });
    void this.gateway.broadcastToAdmins(
      'server:menu:updated',
      await this.findAll(true),
    );
    void this.gateway.broadcastToAllHouses(
      'server:menu:updated',
      await this.findAll(),
    );
  }
}
