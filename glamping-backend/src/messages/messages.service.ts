import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GatewayService } from '../gateway/gateway.service';
import { PushService } from '../push/push.service';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private gateway: GatewayService,
    private push: PushService,
  ) {}

  async findByHouseId(houseId: string) {
    const session = await this.prisma.guestSession.findFirst({
      where: { houseId, isActive: true },
    });
    if (!session) return [];

    const messages = await this.prisma.chatMessage.findMany({
      where: { houseId, sessionId: session.id },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      houseId: m.houseId,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp.toISOString(),
      read: m.read,
    }));
  }

  async findAll() {
    const messages = await this.prisma.chatMessage.findMany({
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      houseId: m.houseId,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp.toISOString(),
      read: m.read,
    }));
  }

  async findHistoryByHouseId(houseId: string) {
    const sessions = await this.prisma.guestSession.findMany({
      where: { houseId },
      orderBy: { checkInAt: 'desc' },
    });

    const result: {
      sessionId: string;
      checkInAt: string | undefined;
      checkOutAt: string | undefined;
      messages: {
        id: string;
        sender: string;
        text: string;
        timestamp: string;
        read: boolean;
      }[];
    }[] = [];
    for (const session of sessions) {
      const messages = await this.prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { timestamp: 'asc' },
      });
      if (messages.length > 0) {
        result.push({
          sessionId: session.id,
          checkInAt: session.checkInAt?.toISOString(),
          checkOutAt: session.checkOutAt?.toISOString(),
          messages: messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp.toISOString(),
            read: m.read,
          })),
        });
      }
    }
    return result;
  }

  async create(houseId: string, text: string, sender = 'GUEST') {
    const session = await this.prisma.guestSession.findFirst({
      where: { houseId, isActive: true },
    });

    const message = await this.prisma.chatMessage.create({
      data: { houseId, sender, text: escapeHtml(text), sessionId: session?.id },
    });

    const result = {
      id: message.id,
      houseId: message.houseId,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp.toISOString(),
      read: message.read,
    };

    this.gateway.sendToHouse(houseId, 'server:message:new', result);
    this.gateway.broadcastToAdmins('server:message:new', result);

    if (!this.gateway.hasConnectedAdmins()) {
      const house = await this.prisma.house.findUnique({
        where: { id: houseId },
      });
      void this.push.sendNotification({
        title: 'Новое сообщение',
        body: `Домик №${house?.number ?? '?'}: ${text.slice(0, 50)}`,
        url: '/admin/chats',
      });
    }

    return result;
  }

  async markAsRead(id: string) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');

    const updated = await this.prisma.chatMessage.update({
      where: { id },
      data: { read: true },
    });

    return {
      id: updated.id,
      houseId: updated.houseId,
      sender: updated.sender,
      text: updated.text,
      timestamp: updated.timestamp.toISOString(),
      read: updated.read,
    };
  }
}
