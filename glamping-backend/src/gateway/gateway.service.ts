import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';

@WebSocketGateway()
export class GatewayService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('Gateway');

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  afterInit() {
    this.server.engine.opts.cors = {
      origin: this.config.get('FRONTEND_URL', '*'),
      credentials: true,
    };
  }

  async handleConnection(client: Socket) {
    const role = client.handshake.auth?.role as string | undefined;
    const houseId = client.handshake.auth?.houseId as string | undefined;
    const token = client.handshake.auth?.token as string | undefined;

    if (role === 'admin') {
      if (!token) {
        this.logger.warn(`Admin connection rejected: no token`);
        return;
      }
      try {
        this.jwtService.verify(token, {
          secret: this.config.get('JWT_SECRET'),
        });
      } catch {
        this.logger.warn(`Admin connection rejected: invalid token`);
        return;
      }
      this.logger.log(`Admin connected: ${client.id}`);
      void client.join('admins');
    } else if (houseId) {
      const house = await this.prisma.house.findUnique({
        where: { id: houseId },
      });
      if (!house) {
        this.logger.warn(
          `House connection rejected: invalid houseId ${houseId}`,
        );
        return;
      }
      this.logger.log(`House ${house.number} connected: ${client.id}`);
      void client.join(`house:${houseId}`);
    }

    client.emit('server:connection:status', { connected: true });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastToAdmins(event: string, payload: unknown) {
    this.server.to('admins').emit(event, payload);
  }

  hasConnectedAdmins(): boolean {
    const adminsRoom = this.server.sockets.adapter.rooms.get('admins');
    return !!adminsRoom && adminsRoom.size > 0;
  }

  sendToHouse(houseId: string, event: string, payload: unknown) {
    this.server.to(`house:${houseId}`).emit(event, payload);
  }

  broadcastToAllHouses(event: string, payload: unknown) {
    const houseRooms: string[] = [];
    for (const [roomName] of this.server.sockets.adapter.rooms) {
      if (roomName.startsWith('house:')) {
        houseRooms.push(roomName);
        this.server.to(roomName).emit(event, payload);
      }
    }
    this.logger.log(`Broadcast ${event} to houses: [${houseRooms.join(', ')}]`);
  }
}
