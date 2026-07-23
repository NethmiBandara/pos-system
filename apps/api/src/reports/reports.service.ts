import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DateRangeDto } from './dto/date-range.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [todayOrders, activeProducts, topProductsRaw] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: OrderStatus.PAID,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        select: { total: true },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { stock: true, lowStockAt: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { not: null },
          order: {
            status: OrderStatus.PAID,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const lowStockCount = activeProducts.filter((p) => p.stock <= p.lowStockAt).length;

    const topProductIds = topProductsRaw
      .map((t) => t.productId)
      .filter((id): id is string => id !== null);
    const products = await this.prisma.product.findMany({
      where: { id: { in: topProductIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topProductsRaw.map((t) => ({
      productId: t.productId,
      productName:
        (t.productId ? productMap.get(t.productId)?.name : undefined) ??
        'Unknown',
      quantitySold: t._sum.quantity ?? 0,
      revenue: Number(t._sum.lineTotal ?? 0),
    }));

    return {
      todaySales: Number(todaySales.toFixed(2)),
      todayOrderCount: todayOrders.length,
      lowStockCount,
      topProducts,
    };
  }

  async sales(query: DateRangeDto) {
    const from = query.from ? new Date(query.from) : this.daysAgo(30);
    const to = query.to ? new Date(query.to) : new Date();

    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAID, createdAt: { gte: from, lte: to } },
      include: {
        payments: true,
        items: { include: { product: { include: { category: true } } } },
      },
    });

    const byDay = new Map<string, { total: number; count: number }>();
    const byPaymentMethod = new Map<string, number>();
    const byCategory = new Map<string, number>();

    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      const prev = byDay.get(day) ?? { total: 0, count: 0 };
      byDay.set(day, {
        total: prev.total + Number(order.total),
        count: prev.count + 1,
      });

      for (const payment of order.payments) {
        byPaymentMethod.set(
          payment.method,
          (byPaymentMethod.get(payment.method) ?? 0) + Number(payment.amount),
        );
      }

      for (const item of order.items) {
        const categoryName = item.product
          ? (item.product.category?.name ?? 'Uncategorized')
          : 'Services / Custom';
        byCategory.set(
          categoryName,
          (byCategory.get(categoryName) ?? 0) + Number(item.lineTotal),
        );
      }
    }

    const round = (n: number) => Number(n.toFixed(2));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalSales: round(orders.reduce((sum, o) => sum + Number(o.total), 0)),
      orderCount: orders.length,
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          total: round(v.total),
          count: v.count,
        })),
      byPayment: [...byPaymentMethod.entries()].map(([method, total]) => ({
        method,
        total: round(total),
      })),
      byCategory: [...byCategory.entries()].map(([category, total]) => ({
        category,
        total: round(total),
      })),
    };
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
