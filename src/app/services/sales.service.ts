// src/app/services/sales.service.ts
import { apiRequest } from '../config/api';

const BASE = '/sales';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface SaleItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  unitType?: string;
  unitFactor?: number;
}

export interface SalePaymentDto {
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  amount: number;
  reference?: string;
  transferReceiptUrl?: string;
}

export interface CreateSaleDto {
  customerId?: number;
  paymentMethod?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'; // Maintained for backwards compatibility
  payments?: SalePaymentDto[];
  totalAmount: number;
  taxAmount: number;
  dueDate?: string;
  creditNotes?: string;
  items: SaleItemDto[];
  requiresTransport?: boolean;
  vehicleId?: number;
  deliveryAddress?: string;
  scheduledAt?: string;
}

export interface VoidSaleDto {
  motivoAnulacion: string;
  nombreResponsable: string;
  tipDocResponsable: string;
  numDocResponsable: string;
  nombreSolicita: string;
  tipDocSolicita: string;
  numDocSolicita: string;
}

export interface AdjustSaleDto {
  items: SaleItemDto[];
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface SaleResponse {
  id: number;
  branchId: number;
  userId: number;
  customerId?: number;
  paymentMethod: string;
  totalAmount: string | number;
  taxAmount: string | number;
  status: 'COMPLETADA' | 'CANCELADA' | 'PENDIENTE';
  createdAt: string;
  customer?: {
    id: number;
    name: string;
    customerType: string;
    email?: string;
    nit?: string;
    documentNumber?: string;
  };
  user?: { id: number; fullName: string };
  items?: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
    product?: { id: number; name: string; internalCode?: string };
  }>;
  dteResponse?: DteResponse | null;
}

export interface DteResponse {
  id: number;
  saleId: number;
  codigoGeneracion?: string;
  numeroControl?: string;
  selloRecibido?: string;
  estado?: 'PROCESADO' | 'RECHAZADO' | 'PENDIENTE' | null;
  ambiente?: 'PRUEBA' | 'PRODUCCION';
  total?: string | number;
  dteJsonUrl?: string;
  serie?: string;
  sequenceNumber?: string;
}

export interface PaginatedSales {
  data: SaleResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  fecha?: string;
  customerId?: number;
  search?: string;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/** Paso 1 — Crear venta y descontar inventario */
export function createSale(payload: CreateSaleDto): Promise<SaleResponse> {
  return apiRequest<SaleResponse>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Paso 2a — Emitir Factura Consumidor Final (DTE01) */
export function sendFacturaConsumidor(saleId: number): Promise<DteResponse> {
  return apiRequest<DteResponse>(`${BASE}/${saleId}/send-dte`, { method: 'POST' });
}

/** Paso 2b — Emitir Comprobante de Crédito Fiscal (DTE03) */
export function sendCreditoFiscal(saleId: number): Promise<DteResponse> {
  return apiRequest<DteResponse>(`${BASE}/${saleId}/send-dte-03`, { method: 'POST' });
}

/** Emitir Nota de Crédito (DTE05) */
export function sendNotaCredito(saleId: number, payload: AdjustSaleDto): Promise<DteResponse> {
  return apiRequest<DteResponse>(`${BASE}/${saleId}/send-dte-05`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Emitir Nota de Débito (DTE06) */
export function sendNotaDebito(saleId: number, payload: AdjustSaleDto): Promise<DteResponse> {
  return apiRequest<DteResponse>(`${BASE}/${saleId}/send-dte-06`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Anular una venta y su DTE */
export function voidSale(saleId: number, payload: VoidSaleDto): Promise<SaleResponse> {
  return apiRequest<SaleResponse>(`${BASE}/${saleId}/void`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Reenviar el DTE al correo del cliente */
export function resendDteEmail(saleId: number, email?: string): Promise<any> {
  return apiRequest(`${BASE}/${saleId}/resend-email`, {
    method: 'POST',
    body: JSON.stringify(email ? { email } : {}),
  });
}

/** Obtener historial paginado de ventas */
export function getSalesHistory(filters: SaleFilters = {}): Promise<PaginatedSales> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
  if (filters.fecha) params.set('fecha', filters.fecha);
  if (filters.customerId) params.set('customerId', String(filters.customerId));
  if (filters.search) params.set('search', filters.search);
  return apiRequest<PaginatedSales>(`${BASE}?${params.toString()}`);
}

/** Obtener detalle de una venta */
export function getSaleDetail(saleId: number): Promise<SaleResponse> {
  return apiRequest<SaleResponse>(`${BASE}/${saleId}`);
}

/** Solicitar Reporte Mensual (ZIP) */
export function requestMonthlyReport(year: string, month: string, email: string): Promise<any> {
  return apiRequest(`${BASE}/reports/monthly?year=${year}&month=${month}&email=${email}`, {
    method: 'GET',
  });
}

/** Buscar Productos en el Catálogo */
export async function searchProducts(query: string, page = 1, limit = 10): Promise<any> {
  const isSearch = !!query;
  const endpoint = isSearch
    ? `/catalog/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    : `/catalog/products?isActive=true&limit=${limit}&page=${page}`;

  const response = await apiRequest<any>(endpoint);
  
  // Normalizar respuesta
  const items = isSearch
    ? Array.isArray(response) ? response : []
    : response.data || [];
    
  return { data: items };
}
