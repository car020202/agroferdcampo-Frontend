// src/app/services/cash-shifts.service.ts
import { apiRequest } from '../config/api';

const BASE = '/cash-shifts';

export interface CashShift {
  id: number;
  userId: number;
  branchId: number;
  openedAt: string;
  closedAt: string | null;
  initialAmount: number;
  expectedAmount: number | null;
  countedCash: number | null;
  difference: number | null;
  notes: string | null;
  status: 'ABIERTO' | 'CERRADO';
}

export interface CloseShiftResponse {
  shift: CashShift;
  summary: {
    expectedAmount: number;
    countedCash: number;
    difference: number;
  };
}

export const cashShiftsService = {
  openShift: async (initialAmount: number): Promise<CashShift> => {
    return await apiRequest<CashShift>(`${BASE}/open`, {
      method: 'POST',
      body: JSON.stringify({ initialAmount }),
    });
  },

  getActiveShift: async (): Promise<CashShift | null> => {
    try {
      return await apiRequest<CashShift>(`${BASE}/active`);
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('404')) {
        return null; // No active shift
      }
      throw error;
    }
  },

  closeShift: async (countedCash: number, notes?: string): Promise<CloseShiftResponse> => {
    return await apiRequest<CloseShiftResponse>(`${BASE}/close`, {
      method: 'POST',
      body: JSON.stringify({ countedCash, notes }),
    });
  }
};
