import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      login: u.login,
      name: u.name,
      roleId: u.roleId,
      role: u.role?.name ?? 'Нет роли',
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (existing)
      throw new BadRequestException(
        'Пользователь с таким логином уже существует',
      );

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) throw new BadRequestException('Роль не найдена');

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.user.create({
      data: {
        login: dto.login,
        passwordHash,
        name: dto.name,
        roleId: dto.roleId,
      },
      include: { role: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) throw new BadRequestException('Роль не найдена');
    }

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.roleId) data.roleId = dto.roleId;
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
      await this.prisma.authSession.deleteMany({ where: { userId: id } });
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.login === 'admin')
      throw new BadRequestException('Нельзя удалить главного администратора');

    return this.prisma.user.delete({ where: { id } });
  }
}
