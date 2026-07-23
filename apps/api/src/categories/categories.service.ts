import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Category name already in use');
    }
    return this.prisma.category.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException('Category name already in use');
    }
    return this.prisma.category.update({ where: { id }, data: { name: dto.name } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new ConflictException('Cannot delete a category that has products');
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
