import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async lowStock() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    return products
      .filter((p) => p.stock <= p.lowStockAt)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock: p.stock,
        lowStockAt: p.lowStockAt,
        categoryName: p.category?.name ?? null,
      }));
  }

  async adjustments(productId?: string) {
    const items = await this.prisma.inventoryAdjustment.findMany({
      where: productId ? { productId } : {},
      include: { product: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return items.map((a) => ({
      id: a.id,
      productId: a.productId,
      productName: a.product.name,
      delta: a.delta,
      reason: a.reason,
      note: a.note,
      userId: a.userId,
      userName: a.user?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async adjust(dto: AdjustInventoryDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    const newStock = product.stock + dto.delta;
    if (newStock < 0) {
      throw new BadRequestException('Adjustment would result in negative stock');
    }

    const [updatedProduct] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          productId: dto.productId,
          delta: dto.delta,
          reason: dto.reason,
          note: dto.note,
          userId,
        },
      }),
    ]);

    return {
      id: updatedProduct.id,
      sku: updatedProduct.sku,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
    };
  }
}
