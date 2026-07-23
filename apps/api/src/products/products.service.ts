import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryReason, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_INCLUDE = { category: true } satisfies Prisma.ProductInclude;
type ProductWithCategory = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = {
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { sku: { contains: query.search } },
              { barcode: { contains: query.search } },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: { name: 'asc' },
    });

    return products.map((p) => this.serialize(p));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return this.serialize(product);
  }

  async create(dto: CreateProductDto) {
    await this.assertUnique(dto.sku, dto.barcode);

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku,
        barcode: dto.barcode,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        cost: dto.cost,
        stock: dto.stock ?? 0,
        lowStockAt: dto.lowStockAt ?? 5,
        categoryId: dto.categoryId,
        isActive: dto.isActive ?? true,
      },
      include: PRODUCT_INCLUDE,
    });

    if (product.stock > 0) {
      await this.prisma.inventoryAdjustment.create({
        data: {
          productId: product.id,
          delta: product.stock,
          reason: InventoryReason.INITIAL,
          note: 'Initial stock on product creation',
        },
      });
    }

    return this.serialize(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    if (dto.sku || dto.barcode) {
      await this.assertUnique(dto.sku, dto.barcode, id);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku,
        barcode: dto.barcode,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        cost: dto.cost,
        stock: dto.stock,
        lowStockAt: dto.lowStockAt,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
      include: PRODUCT_INCLUDE,
    });

    return this.serialize(product);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  private async assertUnique(sku?: string, barcode?: string, excludeId?: string) {
    if (sku) {
      const existing = await this.prisma.product.findUnique({ where: { sku } });
      if (existing && existing.id !== excludeId) {
        throw new ConflictException('SKU already in use');
      }
    }
    if (barcode) {
      const existing = await this.prisma.product.findUnique({ where: { barcode } });
      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Barcode already in use');
      }
    }
  }

  private serialize(product: ProductWithCategory) {
    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      cost: product.cost !== null ? Number(product.cost) : null,
      stock: product.stock,
      lowStockAt: product.lowStockAt,
      isActive: product.isActive,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
