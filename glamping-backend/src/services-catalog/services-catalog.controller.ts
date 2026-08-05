import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ServicesCatalogService } from './services-catalog.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('services')
@Controller('services')
export class ServicesCatalogController {
  constructor(private servicesService: ServicesCatalogService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get services' })
  @ApiQuery({ name: 'showInactive', required: false })
  async findAll(@Query('showInactive') showInactive?: string) {
    return this.servicesService.findAll(showInactive === 'true');
  }

  @Get(':id/availability')
  @Public()
  @ApiOperation({ summary: 'Get booking availability for a service' })
  @ApiQuery({ name: 'date', required: true })
  async getAvailability(@Param('id') id: string, @Query('date') date: string) {
    return this.servicesService.getAvailability(id, date);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_services')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create service' })
  async create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_services')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service' })
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_services')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete service' })
  async delete(@Param('id') id: string) {
    await this.servicesService.delete(id);
  }
}
