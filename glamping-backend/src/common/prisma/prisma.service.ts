import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Prisma');

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return;
      } catch (err) {
        this.logger.warn(
          `Database connection attempt ${i + 1}/${maxRetries} failed, retrying in ${(i + 1) * 2}s...`,
        );
        await new Promise((r) => setTimeout(r, (i + 1) * 2000));
      }
    }
    this.logger.error('Failed to connect to database after retries');
    throw new Error('Database connection failed');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
