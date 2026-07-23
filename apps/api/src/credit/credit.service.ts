import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  // Outstanding credit bills (billed on credit, not yet settled).
  async outstanding() {
    const orders = await this.prisma.order.findMany({
      where: {
        isCredit: true,
        creditSettledAt: null,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        cashier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const items = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      customer: o.customer,
      cashier: o.cashier,
      notes: o.notes,
    }));

    return {
      totalOutstanding: Number(
        items.reduce((s, o) => s + o.total, 0).toFixed(2),
      ),
      count: items.length,
      items,
    };
  }

  // History of settled credit bills.
  async settled() {
    const orders = await this.prisma.order.findMany({
      where: { isCredit: true, creditSettledAt: { not: null } },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { creditSettledAt: 'desc' },
      take: 100,
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total),
      customer: o.customer,
      creditSettledAt: o.creditSettledAt?.toISOString() ?? null,
      creditSettleMethod: o.creditSettleMethod,
    }));
  }

  // Record payment against a credit bill and remove it from the outstanding list.
  async settle(id: string, method: PaymentMethod) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.isCredit) {
      throw new BadRequestException('This order is not a credit sale');
    }
    if (order.creditSettledAt) {
      throw new BadRequestException('This credit bill is already settled');
    }
    if (method === PaymentMethod.CREDIT) {
      throw new BadRequestException('Choose a real payment method to settle');
    }

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          orderId: id,
          method,
          amount: order.total,
          reference: 'Credit settlement',
        },
      }),
      this.prisma.order.update({
        where: { id },
        data: { creditSettledAt: new Date(), creditSettleMethod: method },
      }),
    ]);

    return { ok: true };
  }
}
