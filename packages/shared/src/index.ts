export type PaymentMethodDto =
  | 'CASH'
  | 'CARD'
  | 'CREDIT'
  | 'ACCOUNT_TRANSFER'
  | 'CHEQUE';

export type OrderStatusDto =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface CartItemDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderDto {
  items: CartItemDto[];
  paymentMethod: PaymentMethodDto;
  discount?: number;
  taxRate?: number;
  notes?: string;
  customerId?: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatusDto;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
}
