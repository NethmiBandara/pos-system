import { Injectable } from '@nestjs/common';
import { StoreSetting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.storeSetting.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
    return this.serialize(settings);
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.prisma.storeSetting.upsert({
      where: { id: SETTINGS_ID },
      update: dto,
      create: { id: SETTINGS_ID, ...dto },
    });
    return this.serialize(settings);
  }

  private serialize(settings: StoreSetting) {
    return {
      ...settings,
      taxRate: Number(settings.taxRate),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
