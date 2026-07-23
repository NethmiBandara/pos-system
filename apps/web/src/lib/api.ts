const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  lowStockAt?: number;
  isActive: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string | null;
  createdAt: string;
  isCredit?: boolean;
  creditSettledAt?: string | null;
  creditSettleMethod?: string | null;
  cashier?: { id: string; name: string } | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    isCustom?: boolean;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    paidAt: string;
  }>;
}

// A catalog line provides productId; a custom/service line provides name + unitPrice.
export interface OrderItemInput {
  productId?: string;
  name?: string;
  unitPrice?: number;
  quantity: number;
  discount?: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  unitPrice: number;
  unitLabel: string;
  isActive: boolean;
  sortOrder: number;
}

export type CreditPaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'ACCOUNT_TRANSFER'
  | 'CHEQUE';

export interface CreditBill {
  id: string;
  orderNumber: string;
  total: number;
  createdAt: string;
  notes?: string | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  cashier?: { id: string; name: string } | null;
}

export interface CreditOutstanding {
  totalOutstanding: number;
  count: number;
  items: CreditBill[];
}

export interface StoreSettings {
  id: string;
  storeName: string;
  address?: string | null;
  phone?: string | null;
  taxRate: number;
  currency: string;
  receiptFooter?: string | null;
  lowStockThreshold: number;
}

export interface Dashboard {
  todaySales: number;
  todayOrders: number;
  lowStockCount: number;
  productCount: number;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pos_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('pos_token', token);
  else localStorage.removeItem('pos_token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    setToken(null);
    if (typeof window !== 'undefined' && !path.startsWith('/auth/login')) {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message
        ? Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message
        : message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),

  dashboard: () => request<Dashboard>('/reports/dashboard'),
  salesReport: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const s = q.toString();
    return request<{
      totalSales: number;
      orderCount: number;
      byDay: Array<{ date: string; total: number; count: number }>;
      byPayment: Array<{ method: string; total: number }>;
    }>(`/reports/sales${s ? `?${s}` : ''}`);
  },

  products: {
    list: (params?: {
      search?: string;
      categoryId?: string;
      includeInactive?: boolean;
    }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.categoryId) q.set('categoryId', params.categoryId);
      if (params?.includeInactive) q.set('includeInactive', 'true');
      const s = q.toString();
      return request<Product[]>(`/products${s ? `?${s}` : ''}`);
    },
    get: (id: string) => request<Product>(`/products/${id}`),
    create: (data: Partial<Product>) =>
      request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Product>) =>
      request<Product>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/products/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request<Category[]>('/categories'),
    create: (data: { name: string }) =>
      request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name: string }) =>
      request<Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/categories/${id}`, { method: 'DELETE' }),
  },

  customers: {
    list: (search?: string) =>
      request<Customer[]>(
        `/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
    create: (data: Partial<Customer>) =>
      request<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Customer>) =>
      request<Customer>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/customers/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: (params?: { status?: string; from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      const s = q.toString();
      return request<Order[]>(`/orders${s ? `?${s}` : ''}`);
    },
    get: (id: string) => request<Order>(`/orders/${id}`),
    create: (data: {
      items: OrderItemInput[];
      paymentMethod: string;
      discount?: number;
      taxRate?: number;
      customerId?: string;
      cashierId?: string;
      notes?: string;
    }) =>
      request<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    hold: (data: {
      items: OrderItemInput[];
      discount?: number;
      taxRate?: number;
      customerId?: string;
      cashierId?: string;
      notes?: string;
    }) =>
      request<Order>('/orders/hold', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    refund: (id: string) =>
      request<Order>(`/orders/${id}/refund`, { method: 'POST' }),
    cancel: (id: string) =>
      request<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
  },

  inventory: {
    lowStock: () => request<Product[]>('/inventory/low-stock'),
    adjustments: () =>
      request<
        Array<{
          id: string;
          delta: number;
          reason: string;
          note?: string | null;
          createdAt: string;
          product: { id: string; name: string; sku: string };
          user?: { name: string } | null;
        }>
      >('/inventory/adjustments'),
    adjust: (data: {
      productId: string;
      delta: number;
      reason: string;
      note?: string;
    }) =>
      request('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  users: {
    list: () => request<User[]>('/users'),
    staff: () =>
      request<Array<{ id: string; name: string; role: Role; email: string }>>(
        '/users/staff',
      ),
    create: (data: {
      email: string;
      name: string;
      password: string;
      role: Role;
    }) =>
      request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        email: string;
        name: string;
        password: string;
        role: Role;
        isActive: boolean;
      }>,
    ) =>
      request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/users/${id}`, { method: 'DELETE' }),
  },

  settings: {
    get: () => request<StoreSettings>('/settings'),
    update: (data: Partial<StoreSettings>) =>
      request<StoreSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  services: {
    list: (includeInactive?: boolean) =>
      request<ServiceItem[]>(
        `/services${includeInactive ? '?includeInactive=true' : ''}`,
      ),
    create: (data: {
      name: string;
      unitPrice: number;
      unitLabel?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) =>
      request<ServiceItem>('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<ServiceItem, 'id'>>) =>
      request<ServiceItem>(`/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/services/${id}`, { method: 'DELETE' }),
  },

  credit: {
    outstanding: () => request<CreditOutstanding>('/credit'),
    settled: () =>
      request<
        Array<{
          id: string;
          orderNumber: string;
          total: number;
          customer?: { id: string; name: string } | null;
          creditSettledAt: string | null;
          creditSettleMethod: string | null;
        }>
      >('/credit/settled'),
    settle: (id: string, method: CreditPaymentMethod) =>
      request<{ ok: boolean }>(`/credit/${id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ method }),
      }),
  },
};
