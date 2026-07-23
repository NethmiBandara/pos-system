import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(s: {
    id: string;
    name: string;
    unitPrice: unknown;
    unitLabel: string;
    isActive: boolean;
    sortOrder: number;
  }) {
    return {
      id: s.id,
      name: s.name,
      unitPrice: Number(s.unitPrice),
      unitLabel: s.unitLabel,
      isActive: s.isActive,
      sortOrder: s.sortOrder,
    };
  }

  async findAll(includeInactive = false) {
    const items = await this.prisma.serviceItem.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map((s) => this.serialize(s));
  }

  async create(dto: CreateServiceDto) {
    const item = await this.prisma.serviceItem.create({
      data: {
        name: dto.name,
        unitPrice: dto.unitPrice,
        unitLabel: dto.unitLabel ?? 'page',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return this.serialize(item);
  }

  async update(id: string, dto: UpdateServiceDto) {
    const existing = await this.prisma.serviceItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');
    const item = await this.prisma.serviceItem.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        unitPrice: dto.unitPrice ?? undefined,
        unitLabel: dto.unitLabel ?? undefined,
        sortOrder: dto.sortOrder ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
    return this.serialize(item);
  }

  async remove(id: string) {
    const existing = await this.prisma.serviceItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');
    await this.prisma.serviceItem.delete({ where: { id } });
    return { ok: true };
  }
}
