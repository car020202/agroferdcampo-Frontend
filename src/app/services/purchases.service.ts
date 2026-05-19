import { apiRequest } from '../config/api';

export interface PurchaseItemDto {
  productId: number;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseDto {
  supplierId: number;
  referenceDoc?: string;
  expectedDate?: string;
  notes?: string;
  items: PurchaseItemDto[];
}

export interface ReceivePurchaseDto {
  documentType: 'FACTURA' | 'CREDITO_FISCAL' | 'TICKET' | 'OTRO';
  documentNumber: string;
  notes?: string;
}

export interface PayPurchaseDto {
  amount: number;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'CREDITO';
  referenceNumber?: string;
  notes?: string;
}

export interface PurchaseResponse {
  id: number;
  branchId: number;
  userId: number;
  supplierId: number;
  referenceDoc?: string;
  status: 'BORRADOR' | 'CONFIRMADA' | 'RECIBIDA' | 'CANCELADA';
  paymentStatus: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
  totalAmount: string | number;
  paidAmount: string | number;
  expectedDate?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
  supplier?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    nit?: string;
  };
  user?: {
    id: number;
    fullName: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    receivedQuantity: number;
    unitCost: string | number;
    totalCost: string | number;
    product?: {
      id: number;
      name: string;
      internalCode?: string;
    };
  }>;
}

export interface PaginatedPurchases {
  data: PurchaseResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseFilters {
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: number;
  startDate?: string;
  endDate?: string;
}

export const purchasesService = {
  createPurchase: async (payload: CreatePurchaseDto): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>('/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPurchases: async (filters: PurchaseFilters = {}): Promise<PaginatedPurchases> => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.status && filters.status !== 'TODOS') params.set('status', filters.status);
    if (filters.supplierId) params.set('supplierId', String(filters.supplierId));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    return await apiRequest<PaginatedPurchases>(`/purchases?${params.toString()}`);
  },

  getPurchaseDetail: async (id: number): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>(`/purchases/${id}`);
  },

  updatePurchase: async (id: number, payload: Partial<CreatePurchaseDto>): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>(`/purchases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  confirmPurchase: async (id: number): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>(`/purchases/${id}/confirm`, {
      method: 'POST',
    });
  },

  cancelPurchase: async (id: number): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>(`/purchases/${id}/cancel`, {
      method: 'POST',
    });
  },

  receivePurchase: async (id: number, payload: ReceivePurchaseDto): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>(`/purchases/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  payPurchase: async (id: number, payload: PayPurchaseDto): Promise<PurchaseResponse> => {
    return await apiRequest<PurchaseResponse>(`/purchases/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};

export const getSuppliers = async (name?: string, isActive?: string) => {
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (isActive) params.set('isActive', isActive);
  return await apiRequest(`/suppliers?${params.toString()}`);
};

export const createSupplier = async (data: any) => {
  return await apiRequest('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateSupplier = async (id: number, data: any) => {
  return await apiRequest(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

