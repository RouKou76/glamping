import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiProperty,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { join } from 'path';
import { IsIn } from 'class-validator';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

class SwitchVersionDto {
  @ApiProperty({ enum: ['current', 'previous'] })
  @IsIn(['current', 'previous'])
  version: 'current' | 'previous';
}

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get(':catalogId')
  @Public()
  @ApiOperation({ summary: 'Get catalog PDF info' })
  async getInfo(@Param('catalogId') catalogId: string) {
    return this.catalogService.getInfo(catalogId);
  }

  @Get(':catalogId/pdf')
  @Public()
  @ApiOperation({ summary: 'Download active catalog PDF' })
  async getPdf(@Param('catalogId') catalogId: string, @Res() res: Response) {
    const filePath = await this.catalogService.getActivePdf(catalogId);
    res.set('Cache-Control', 'no-store');
    return res.sendFile(filePath);
  }

  @Post(':catalogId/upload')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_catalog')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload new catalog PDF version' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'catalogs'),
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${req.params.catalogId}-${uniqueSuffix}.pdf`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      },
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @Param('catalogId') catalogId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalogService.upload(catalogId, file.filename);
  }

  @Post(':catalogId/switch')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('manage_catalog')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active catalog PDF version' })
  async switchVersion(
    @Param('catalogId') catalogId: string,
    @Body() dto: SwitchVersionDto,
  ) {
    return this.catalogService.switchVersion(catalogId, dto.version);
  }
}
