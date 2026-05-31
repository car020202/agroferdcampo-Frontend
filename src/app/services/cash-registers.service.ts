import { apiRequest } from '../config/api';
import { CashRegister } from './cash-shifts.service';

export interface CreateCashRegisterDto {
  name: string;
}

export interface UpdateCashRegisterDto {
  name?: string;
  isActive?: boolean;
}

const BASE = '/cash-registers';

export const cashRegistersService = {
  findAll: async (): Promise<CashRegister[]> => {
    return await apiRequest<CashRegister[]>(BASE);
  },

  create: async (data: CreateCashRegisterDto): Promise<CashRegister> => {
    return await apiRequest<CashRegister>(BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: UpdateCashRegisterDto): Promise<CashRegister> => {
    return await apiRequest<CashRegister>(`${BASE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    return await apiRequest<void>(`${BASE}/${id}`, {
      method: 'DELETE',
    });
  }
};
