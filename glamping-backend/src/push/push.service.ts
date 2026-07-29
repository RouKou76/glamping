import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as webPush from 'web-push';

@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  private initialized = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT');

    if (publicKey && privateKey && subject) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.initialized = true;
      this.logger.log('Push initialized');
    } else {
      this.logger.warn('Push NOT initialized — VAPID keys missing');
    }
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') || null;
  }

  async getStats() {
    const count = await this.prisma.pushSubscription.count();
    return { initialized: this.initialized, subscriptions: count };
  }

  async subscribe(endpoint: string, p256dh: string, p256da: string) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, p256da },
      create: { endpoint, p256dh, p256da },
    });
    this.logger.log(`Push subscription added (${await this.prisma.pushSubscription.count()} total)`);
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendNotification(payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
  }) {
    if (!this.initialized) {
      this.logger.warn('Push skipped: not initialized (VAPID keys missing)');
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany();
    if (subscriptions.length === 0) {
      this.logger.warn('Push skipped: no subscriptions');
      return;
    }

    this.logger.log(`Push: sending "${payload.title}" to ${subscriptions.length} subscriptions`);
    const message = JSON.stringify(payload);
    const CONCURRENCY = 10;

    const staleEndpoints: string[] = [];
    let failures = 0;

    const chunks: typeof subscriptions[] = [];
    for (let i = 0; i < subscriptions.length; i += CONCURRENCY) {
      chunks.push(subscriptions.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((sub) =>
          webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, p256da: sub.p256da } },
            message,
          ).catch((err: any) => {
            this.logger.warn(`Push fail: ${sub.endpoint.substring(0, 50)}... ${err.statusCode || '?'} ${err.message || err}`);
            if (err.statusCode === 404 || err.statusCode === 410) {
              staleEndpoints.push(sub.endpoint);
            }
            throw err;
          }),
        ),
      );

      failures += results.filter((r) => r.status === 'rejected').length;
    }

    this.logger.log(`Push: delivered ${subscriptions.length - failures}/${subscriptions.length}${failures > 0 ? ` (${failures} failed)` : ''}`);

    if (staleEndpoints.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: staleEndpoints } },
      });
      this.logger.log(`Push: cleaned ${staleEndpoints.length} stale endpoints`);
    }
  }
}
