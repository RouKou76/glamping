import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InfoService } from './info.service';
import { UpdateInfoDto } from './dto/update-info.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('info')
@Controller('info')
export class InfoController {
  constructor(private infoService: InfoService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get settings/info' })
  async getInfo() {
    return this.infoService.getInfo();
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_info')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update settings/info' })
  async updateInfo(@Body() dto: UpdateInfoDto) {
    return this.infoService.updateInfo(dto);
  }
}
