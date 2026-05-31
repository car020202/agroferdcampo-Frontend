import { apiRequest } from '../config/api';

export interface CreditSummary {
  totalCxC: number;
  totalVencido: number;
  totalPorVencer: number;
  totalClientes: number;
  totalSinFecha: number;
}

export interface CreditPayment {
  id: number;
  creditSaleId?: number;
  amount: number | string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  user?: { fullName: string };
}

export interface CreditSale {
  id: number;
  saleId: number;
  customerId: number;
  branchId: number;
  originalAmount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  dueDate?: string | null;
  status: 'PENDIENTE' | 'VENCIDO' | 'PAGADO' | 'ANULADO';
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  sale?: {
    id: number;
    totalAmount: string;
    createdAt: string;
  };
  payments?: CreditPayment[];
}

export interface GroupedCreditCustomer {
  customer: {
    id: number;
    name: string;
    creditLimit: string | number;
    creditBalance: string | number;
  };
  creditSales: CreditSale[];
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  nearestDueDate: string | null;
  status: 'PENDIENTE' | 'VENCIDO' | 'PAGADO' | 'ANULADO';
}

export interface RegisterPaymentDto {
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export type CreditDocumentStatus = 'SOLICITADO' | 'RECIBIDO' | 'RECHAZADO';

export type CreditDocumentType =
  | 'DUI'
  | 'NIT'
  | 'COMPROBANTE_INGRESOS'
  | 'RECIBO_SERVICIOS'
  | 'CARTA_TRABAJO'
  | 'ESTADO_CUENTA_BANCO'
  | 'ESCRITURA_PROPIEDAD'
  | 'FIADOR'
  | 'REFERENCIA_COMERCIAL'
  | 'FOTO_NEGOCIO'
  | 'OTRO';

export interface CreditDocument {
  id: number;
  creditSaleId: number;
  documentType: CreditDocumentType;
  documentName: string;
  status: CreditDocumentStatus;
  notes?: string;
  fileUrl?: string;
  requestedAt: string;
  receivedAt?: string;
  creator?: { fullName: string };
}

export interface CreateCreditDocumentDto {
  documentType: CreditDocumentType;
  documentName: string;
  status?: CreditDocumentStatus;
  notes?: string;
  fileUrl?: string;
}

export interface UpdateCreditDocumentDto {
  status?: CreditDocumentStatus;
  notes?: string;
  fileUrl?: string;
  receivedAt?: string;
}


export const creditService = {
  getCredits: (params?: { page?: number; limit?: number; status?: string; customerId?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return apiRequest<any>(`/credit?${query.toString()}`);
  },

  getGroupedCredits: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.append(key, String(value));
        }
      });
    }
    return apiRequest<any>(`/credit/grouped?${query.toString()}`);
  },

  getSummary: () => {
    return apiRequest<CreditSummary>('/credit/summary');
  },

  getAging: () => {
    return apiRequest<any>('/credit/aging');
  },

  getCreditDetail: (id: number) => {
    return apiRequest<CreditSale>(`/credit/${id}`);
  },

  getPayments: (id: number) => {
    return apiRequest<CreditPayment[]>(`/credit/${id}/payments`);
  },

  registerPayment: (id: number, data: RegisterPaymentDto) => {
    return apiRequest<CreditPayment>(`/credit/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ ...data, amount: Number(data.amount) }),
    });
  },

  getDocuments: (creditSaleId: number) =>
    apiRequest<CreditDocument[]>(`/credit/${creditSaleId}/documents`),

  createDocument: (creditSaleId: number, data: CreateCreditDocumentDto) =>
    apiRequest<CreditDocument>(`/credit/${creditSaleId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDocument: (documentId: number, data: UpdateCreditDocumentDto) =>
    apiRequest<CreditDocument>(`/credit/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteDocument: (documentId: number) =>
    apiRequest<void>(`/credit/documents/${documentId}`, {
      method: 'DELETE',
    }),
};
