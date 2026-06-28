import { apiRequest } from '../config/api';

const BASE = '/pre-sales';

export interface PreSaleItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  unitType?: string;
  unitFactor?: number;
}

export interface CreatePreSaleDto {
  customerId?: number;
  totalAmount: number;
  taxAmount: number;
  description?: string;
  items: PreSaleItemDto[];
}

export interface ConfirmPaymentDto {
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  amount: number;
  reference?: string;
  transferReceiptUrl?: string;
}

export interface ConfirmPreSaleDto {
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  payments?: ConfirmPaymentDto[];
  dueDate?: string;
}

export interface PreSaleItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitType?: string;
  unitFactor?: number;
  product: { id: number; name: string; internalCode?: string; unit: string };
}

export interface PreSaleTicket {
  id: number;
  ticketNumber: string;
  branchId: number;
  userId: number;
  customerId?: number;
  status: 'PENDIENTE' | 'COBRADA' | 'CANCELADA';
  totalAmount: number;
  taxAmount: number;
  description?: string;
  cashierId?: number;
  paymentMethod?: string;
  paidAt?: string;
  saleId?: number;
  createdAt: string;
  updatedAt: string;
  items: PreSaleItem[];
  user: { id: number; fullName: string };
  cashier?: { id: number; fullName: string };
  customer?: { id: number; name: string; documentNumber?: string };
}

export interface PaginatedPreSales {
  data: PreSaleTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PreSaleFilters {
  status?: 'PENDIENTE' | 'COBRADA' | 'CANCELADA';
  fecha?: string;
  page?: number;
  limit?: number;
}

export function createPreSale(payload: CreatePreSaleDto): Promise<PreSaleTicket> {
  return apiRequest<PreSaleTicket>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPreSales(filters: PreSaleFilters = {}): Promise<PaginatedPreSales> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.fecha) params.set('fecha', filters.fecha);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return apiRequest<PaginatedPreSales>(`${BASE}?${params.toString()}`);
}

export function getPreSale(id: number): Promise<PreSaleTicket> {
  return apiRequest<PreSaleTicket>(`${BASE}/${id}`);
}

export function confirmPreSale(id: number, payload: ConfirmPreSaleDto): Promise<{ ticket: PreSaleTicket; sale: any }> {
  return apiRequest<{ ticket: PreSaleTicket; sale: any }>(`${BASE}/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelPreSale(id: number): Promise<PreSaleTicket> {
  return apiRequest<PreSaleTicket>(`${BASE}/${id}/cancel`, { method: 'POST' });
}
