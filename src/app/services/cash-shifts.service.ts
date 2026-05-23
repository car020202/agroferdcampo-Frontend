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

export interface BillsBreakdown {
  d100: number; d50: number; d20: number;
  d10: number; d5: number; d1: number;
}

export interface CoinsBreakdown {
  c25: number; c10: number;
  c5: number; c1: number;
}

export interface DenominationBreakdown {
  bills: BillsBreakdown;
  coins: CoinsBreakdown;
}

export interface OpenShiftPayload {
  breakdown: DenominationBreakdown;
}

export interface CloseShiftPayload {
  breakdown: DenominationBreakdown;
  notes?: string;
}

export interface ExpectedTotals {
  expectedAmount: number;
  expectedTarjeta: number;
  expectedTransferencia: number;
}

export const cashShiftsService = {
  openShift: async (payload: OpenShiftPayload): Promise<CashShift> => {
    return await apiRequest<CashShift>(`${BASE}/open`, {
      method: 'POST',
      body: JSON.stringify(payload),
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

  getActiveShiftExpectedTotals: async (): Promise<ExpectedTotals | null> => {
    try {
      return await apiRequest<ExpectedTotals>(`${BASE}/active/totals`);
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('404') || error.message?.includes('No hay un turno activo')) {
        return null; // No active shift
      }
      throw error;
    }
  },

  closeShift: async (payload: CloseShiftPayload): Promise<CloseShiftResponse> => {
    return await apiRequest<CloseShiftResponse>(`${BASE}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};
