import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { existsSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CatalogService {
  private readonly uploadsDir = join(process.cwd(), 'uploads', 'catalogs');

  constructor(private prisma: PrismaService) {}

  private async getSetting(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async setSetting(key: string, value: string) {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getInfo(catalogId: string) {
    let current = await this.getSetting(`${catalogId}_current`);
    const previous = await this.getSetting(`${catalogId}_previous`);
    const active = await this.getSetting(`${catalogId}_active`);

    if (!current) {
      const oldFile = await this.getSetting('andetta_pdf');
      if (oldFile) {
        await this.setSetting(`${catalogId}_current`, oldFile);
        current = oldFile;
      }
    }

    return {
      current,
      previous,
      active: (active as 'current' | 'previous') || 'current',
      currentExists: current ? existsSync(join(this.uploadsDir, current)) : false,
      previousExists: previous ? existsSync(join(this.uploadsDir, previous)) : false,
    };
  }

  async getActivePdf(catalogId: string): Promise<string> {
    const info = await this.getInfo(catalogId);
    const filename = info.active === 'previous' ? info.previous : info.current;
    if (!filename) throw new NotFoundException('PDF not found');
    const filePath = join(this.uploadsDir, filename);
    if (!existsSync(filePath)) throw new NotFoundException('PDF not found');
    return filePath;
  }

  async upload(catalogId: string, filename: string) {
    const currentFilename = await this.getSetting(`${catalogId}_current`);
    const previousFilename = await this.getSetting(`${catalogId}_previous`);

    if (previousFilename) {
      const oldPrevPath = join(this.uploadsDir, previousFilename);
      if (existsSync(oldPrevPath)) unlinkSync(oldPrevPath);
    }

    if (currentFilename) {
      const curPath = join(this.uploadsDir, currentFilename);
      const newPrevName = `${catalogId}-prev-${Date.now()}.pdf`;
      const prevPath = join(this.uploadsDir, newPrevName);
      if (existsSync(curPath)) renameSync(curPath, prevPath);
      await this.setSetting(`${catalogId}_previous`, newPrevName);
    }

    await this.setSetting(`${catalogId}_current`, filename);
    await this.setSetting(`${catalogId}_active`, 'current');

    return this.getInfo(catalogId);
  }

  async switchVersion(catalogId: string, version: 'current' | 'previous') {
    const info = await this.getInfo(catalogId);
    const filename = version === 'previous' ? info.previous : info.current;
    if (!filename) throw new NotFoundException(`Version "${version}" not found`);
    await this.setSetting(`${catalogId}_active`, version);
    return this.getInfo(catalogId);
  }
}
