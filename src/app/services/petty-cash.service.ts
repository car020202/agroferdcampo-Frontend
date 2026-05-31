import { apiRequest } from '../config/api';

const BASE = '/petty-cash';

export interface PettyCashStatus {
  id: number;
  currentBalance: number;
  maxBalance: number;
  minBalance: number;
  needsReplenishment: boolean;
  lastMovement?: {
    id: number;
    type: 'INGRESO' | 'EGRESO';
    amount: number;
    description: string;
    createdAt: string;
    user: { id: number; fullName: string };
  };
}

export interface PettyCashMovement {
  id: number;
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  description: string;
  receiptRef?: string;
  createdAt: string;
}

export interface PettyCashReplenishment {
  id: number;
  amount: number;
  reason: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  createdAt: string;
  approverNotes?: string;
}

export const pettyCashService = {
  setup: async (data: { maxBalance: number, minBalance: number }) => {
    return await apiRequest(`${BASE}/setup`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getStatus: async (): Promise<PettyCashStatus> => {
    return await apiRequest<PettyCashStatus>(BASE);
  },
  updateConfig: async (data: { maxBalance: number, minBalance: number }) => {
    return await apiRequest(`${BASE}/config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  registerExpense: async (data: { amount: number, description: string, receiptRef?: string }) => {
    return await apiRequest(`${BASE}/expense`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getMovements: async (filters: { startDate?: string, endDate?: string, page?: number, limit?: number }) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    return await apiRequest<{ data: PettyCashMovement[], total: number, page: number, totalPages: number }>(`${BASE}/movements?${params.toString()}`);
  },
  requestReplenishment: async (data: { amount: number, reason: string }) => {
    return await apiRequest(`${BASE}/replenishment/request`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getReplenishments: async (): Promise<PettyCashReplenishment[]> => {
    return await apiRequest<PettyCashReplenishment[]>(`${BASE}/replenishment`);
  },
  approveReplenishment: async (id: number) => {
    return await apiRequest(`${BASE}/replenishment/${id}/approve`, {
      method: 'PATCH',
    });
  },
  rejectReplenishment: async (id: number, reason?: string) => {
    return await apiRequest(`${BASE}/replenishment/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }
};
