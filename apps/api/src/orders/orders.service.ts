import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryReason,
  OrderStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { HoldOrderDto } from './dto/hold-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  payments: true,
  cashier: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

interface LineItem {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryOrdersDto) {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return orders.map((o) => this.serialize(o));
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return this.serialize(order);
  }

  async create(dto: CreateOrderDto, actorId: string) {
    const isCredit = dto.paymentMethod === PaymentMethod.CREDIT;
    if (isCredit && !dto.customerId) {
      throw new BadRequestException(
        'Credit sales require a customer so the balance can be tracked',
      );
    }

    const cashierId = await this.resolveCashierId(dto.cashierId, actorId);

    const { lineItems, subtotal, tax, discount, total } = await this.buildLineItems(
      dto.items,
      dto.taxRate ?? 0,
      dto.discount ?? 0,
      { requireStock: true },
    );

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of lineItems) {
        // Custom / service lines (photocopy, printout, ad-hoc) have no
        // productId and do not touch inventory.
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.inventoryAdjustment.create({
          data: {
            productId: item.productId,
            delta: -item.quantity,
            reason: InventoryReason.SALE,
            userId: cashierId,
          },
        });
      }

      return tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          status: OrderStatus.PAID,
          subtotal,
          tax,
          discount,
          total,
          notes: dto.notes,
          cashierId,
          customerId: dto.customerId,
          isCredit,
          items: { create: lineItems },
          // Credit sales are unpaid until settled — the real payment is
          // recorded from the Credit tab, so we don't create one here.
          payments: isCredit
            ? undefined
            : {
                create: {
                  method: dto.paymentMethod,
                  amount: total,
                  reference: dto.paymentReference,
                },
              },
        },
        include: ORDER_INCLUDE,
      });
    });

    return this.serialize(order);
  }

  async hold(dto: HoldOrderDto, actorId: string) {
    const cashierId = await this.resolveCashierId(dto.cashierId, actorId);
    const { lineItems, subtotal, tax, discount, total } = await this.buildLineItems(
      dto.items,
      dto.taxRate ?? 0,
      dto.discount ?? 0,
      { requireStock: false },
    );

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        status: OrderStatus.HELD,
        subtotal,
        tax,
        discount,
        total,
        notes: dto.notes,
        cashierId,
        customerId: dto.customerId,
        items: { create: lineItems },
      },
      include: ORDER_INCLUDE,
    });

    return this.serialize(order);
  }

  async refund(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // Only restock catalog products; custom/service lines have no stock.
        if (!item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.inventoryAdjustment.create({
          data: {
            productId: item.productId,
            delta: item.quantity,
            reason: InventoryReason.REFUND,
            userId,
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.REFUNDED },
        include: ORDER_INCLUDE,
      });
    });

    return this.serialize(updated);
  }

  async cancel(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    const cancellable: OrderStatus[] = [
      OrderStatus.DRAFT,
      OrderStatus.HELD,
      OrderStatus.PENDING,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        `Order in status ${order.status} cannot be cancelled`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: ORDER_INCLUDE,
    });

    return this.serialize(updated);
  }

  private async resolveCashierId(
    requestedId: string | undefined,
    actorId: string,
  ): Promise<string> {
    const id = requestedId || actorId;
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) {
      throw new BadRequestException('Billing person is invalid or inactive');
    }
    return user.id;
  }

  private async buildLineItems(
    items: CreateOrderItemDto[],
    taxRate: number,
    orderDiscount: number,
    options: { requireStock: boolean },
  ): Promise<{
    lineItems: LineItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  }> {
    const productIds = items
      .filter((i) => i.productId)
      .map((i) => i.productId as string);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('One or more products are invalid');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    let itemDiscountTotal = 0;

    const lineItems: LineItem[] = items.map((item) => {
      const lineDiscount = Math.max(0, Number(item.discount ?? 0));

      // Custom / service line (photocopy, printout, ad-hoc item).
      if (!item.productId) {
        if (!item.name || item.unitPrice === undefined) {
          throw new BadRequestException(
            'Custom items require a name and unit price',
          );
        }
        const unitPrice = Number(item.unitPrice);
        const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
        if (lineDiscount > lineTotal) {
          throw new BadRequestException(
            `Discount exceeds line total for ${item.name}`,
          );
        }
        subtotal += lineTotal;
        itemDiscountTotal += lineDiscount;
        return {
          productId: null,
          name: item.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        };
      }

      // Catalog product line.
      const product = productMap.get(item.productId)!;
      if (options.requireStock && product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
      const unitPrice = Number(product.price);
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      if (lineDiscount > lineTotal) {
        throw new BadRequestException(
          `Discount exceeds line total for ${product.name}`,
        );
      }
      subtotal += lineTotal;
      itemDiscountTotal += lineDiscount;
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    // Frontend may send the combined discount on the order and/or per line.
    // Use the max so we never double-count when both are equal.
    const discount = Number(
      Math.max(orderDiscount, itemDiscountTotal).toFixed(2),
    );
    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot exceed subtotal');
    }
    const taxable = Math.max(0, subtotal - discount);
    const tax = Number((taxable * taxRate).toFixed(2));
    const total = Number((taxable + tax).toFixed(2));
    if (total < 0) {
      throw new BadRequestException('Total cannot be negative');
    }

    return { lineItems, subtotal, tax, discount, total };
  }

  private generateOrderNumber() {
    return `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  private serialize(order: OrderWithRelations) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      notes: order.notes,
      cashierId: order.cashierId,
      customerId: order.customerId,
      cashier: order.cashier
        ? { id: order.cashier.id, name: order.cashier.name }
        : null,
      customer: order.customer
        ? {
            id: order.customer.id,
            name: order.customer.name,
            phone: order.customer.phone,
          }
        : null,
      isCredit: order.isCredit,
      creditSettledAt: order.creditSettledAt
        ? order.creditSettledAt.toISOString()
        : null,
      creditSettleMethod: order.creditSettleMethod,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.name || i.product?.name || 'Item',
        isCustom: !i.productId,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference,
        paidAt: p.paidAt.toISOString(),
      })),
    };
  }
}
