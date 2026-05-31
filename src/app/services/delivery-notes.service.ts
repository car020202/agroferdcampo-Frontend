// src/app/services/delivery-notes.service.ts
import { apiRequest } from '../config/api';

export interface DeliveryNoteItemDto {
  productId: number;
  quantity: number;
}

export interface CreateDeliveryNoteDto {
  type: 'CLIENTE' | 'TRASLADO_SUCURSAL';
  saleId?: number;
  toBranchId?: number;
  customerId?: number;
  notes?: string;
  items: DeliveryNoteItemDto[];
  requiresTransport?: boolean;
  vehicleId?: number;
  driverId?: number;
  deliveryAddress?: string;
  scheduledAt?: string;
  dispatchType?: 'TOTAL' | 'PARCIAL';
}

export interface UpdateDeliveryNoteDto {
  vehicleId?: number;
  scheduledAt?: string;
  notes?: string;
}

export interface DeliverDeliveryNoteItemDto {
  productId: number;
  receivedQty: number;
}

export interface DeliverDeliveryNoteDto {
  notes?: string;
  items: DeliverDeliveryNoteItemDto[];
  clientSignedBy?: string;
  clientSignature?: string;
  proofPhoto?: string;
}

export interface DeliveryNoteResponse {
  id: number;
  fromBranchId: number;
  type: 'CLIENTE' | 'TRASLADO_SUCURSAL';
  status: 'EMITIDO' | 'ENTREGADO' | 'CON_DIFERENCIAS' | 'CANCELADO';
  saleId?: number;
  toBranchId?: number;
  customerId?: number;
  notes?: string;
  issuedAt: string;
  vehicleId?: number;
  driverId?: number;
  scheduledAt?: string;
  deliveryAddress?: string;
  clientSignedBy?: string;
  deliveredAt?: string;
  customer?: {
    id: number;
    name: string;
  };
  toBranch?: {
    id: number;
    name: string;
  };
  vehicle?: any;
  driver?: any;
  route?: any;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    receivedQty: number;
    product?: {
      id: number;
      name: string;
      internalCode?: string;
    };
  }>;
}

export interface PaginatedDeliveryNotes {
  data: DeliveryNoteResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeliveryNoteFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  customerId?: number;
  startDate?: string;
  endDate?: string;
  vehicleId?: number;
  routeId?: number;
  requiresTransport?: boolean;
}

export const deliveryNotesService = {
  createDeliveryNote: async (payload: CreateDeliveryNoteDto): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>('/delivery-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDeliveryNotes: async (filters: DeliveryNoteFilters = {}): Promise<any> => {
    const params = new URLSearchParams();
    if (filters.page)  params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.type && filters.type !== 'all')     params.set('type', filters.type);
    if (filters.customerId) params.set('customerId', String(filters.customerId));
    if (filters.startDate) {
      params.set('startDate', filters.startDate);
      // Siempre enviar endDate — si no hay rango, usar el mismo día
      params.set('endDate', filters.endDate || filters.startDate);
    }
    if (filters.vehicleId) params.set('vehicleId', String(filters.vehicleId));
    if (filters.routeId)   params.set('routeId',   String(filters.routeId));
    if (filters.requiresTransport !== undefined) {
      params.set('requiresTransport', String(filters.requiresTransport));
    }
    return await apiRequest<any>(`/delivery-notes?${params.toString()}`);
  },

  createFromSale: async (saleId: number, payload?: { vehicleId?: number; deliveryAddress?: string; scheduledAt?: string }): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/from-sale/${saleId}`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  createFromQuote: async (quoteId: number, payload?: { vehicleId?: number; deliveryAddress?: string }): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/from-quote/${quoteId}`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  getDeliveryNoteDetail: async (id: number): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/${id}`);
  },

  updateDeliveryNote: async (id: number, payload: UpdateDeliveryNoteDto): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  confirmDelivery: async (id: number, payload: DeliverDeliveryNoteDto): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/${id}/deliver`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelDeliveryNote: async (id: number): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/${id}/cancel`, {
      method: 'POST',
    });
  },

  resendEmail: async (id: number, email?: string): Promise<any> => {
    return await apiRequest(`/delivery-notes/${id}/resend-email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  closeWithObservation: async (id: number, observation: string): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/${id}/close-with-observation`, {
      method: 'POST',
      body: JSON.stringify({ observation }),
    });
  }
};
