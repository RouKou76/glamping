import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HousesService } from './houses.service';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateHouseDto } from './dto/update-house.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@ApiTags('houses')
@Controller('houses')
export class HousesController {
  constructor(private housesService: HousesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all houses' })
  async findAll() {
    return this.housesService.findAll();
  }

  @Get('sessions')
  @Public()
  @ApiOperation({ summary: 'Get active sessions' })
  async findSessions() {
    return this.housesService.findSessions();
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_houses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update house' })
  async update(@Param('id') id: string, @Body() dto: UpdateHouseDto) {
    return this.housesService.update(id, dto);
  }

  @Post(':id/check-in')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_houses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in to house' })
  async checkin(@Param('id') id: string, @Body() dto: CheckInDto) {
    return this.housesService.checkin(id, dto);
  }

  @Post(':id/check-out')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_houses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check out from house' })
  async checkout(@Param('id') id: string) {
    return this.housesService.checkout(id);
  }

  @Post(':id/checkout-request')
  @Public()
  @UseGuards(new RateLimitGuard(3, 60_000))
  @ApiOperation({ summary: 'Guest requests checkout' })
  async checkoutRequest(@Param('id') id: string) {
    return this.housesService.checkoutRequest(id);
  }

  @Post(':id/device-token')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_houses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate device token for house' })
  async generateDeviceToken(@Param('id') id: string) {
    return this.housesService.generateDeviceToken(id);
  }

  @Delete(':id/device-token')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_houses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset device token' })
  async resetDeviceToken(@Param('id') id: string) {
    return this.housesService.resetDeviceToken(id);
  }
}
