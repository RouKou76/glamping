import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @Get('vapid-key')
  @Public()
  @ApiOperation({ summary: 'Get VAPID public key' })
  getVapidKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Push notification stats' })
  getStats() {
    return this.pushService.getStats();
  }

  @Post('subscribe')
  @Public()
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.pushService.subscribe(dto.endpoint, dto.p256dh, dto.p256da);
  }

  @Delete('unsubscribe')
  @Public()
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribe(body.endpoint);
  }
}
