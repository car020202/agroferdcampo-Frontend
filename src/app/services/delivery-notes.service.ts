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
}

export interface DeliverDeliveryNoteItemDto {
  productId: number;
  receivedQty: number;
}

export interface DeliverDeliveryNoteDto {
  notes?: string;
  items: DeliverDeliveryNoteItemDto[];
}

export interface DeliveryNoteResponse {
  id: number;
  branchId: number;
  type: 'CLIENTE' | 'TRASLADO_SUCURSAL';
  status: 'EMITIDO' | 'ENTREGADO' | 'CON_DIFERENCIAS' | 'CANCELADO';
  saleId?: number;
  toBranchId?: number;
  customerId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
  };
  toBranch?: {
    id: number;
    name: string;
  };
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
}

export const deliveryNotesService = {
  createDeliveryNote: async (payload: CreateDeliveryNoteDto): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>('/delivery-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDeliveryNotes: async (filters: DeliveryNoteFilters = {}): Promise<PaginatedDeliveryNotes> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status && filters.status !== 'TODOS') params.set('status', filters.status);
    if (filters.type && filters.type !== 'TODOS') params.set('type', filters.type);
    if (filters.customerId) params.set('customerId', String(filters.customerId));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    return await apiRequest<PaginatedDeliveryNotes>(`/delivery-notes?${params.toString()}`);
  },

  getDeliveryNoteDetail: async (id: number): Promise<DeliveryNoteResponse> => {
    return await apiRequest<DeliveryNoteResponse>(`/delivery-notes/${id}`);
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
  }
};
