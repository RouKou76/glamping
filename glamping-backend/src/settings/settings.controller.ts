import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InfoService } from '../info/info.service';
import { UpdateInfoDto } from '../info/dto/update-info.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private infoService: InfoService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get settings (alias for info)' })
  async getSettings() {
    return this.infoService.getInfo();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_info')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update settings' })
  async updateSettings(@Body() dto: UpdateInfoDto) {
    return this.infoService.updateInfo(dto);
  }
}
