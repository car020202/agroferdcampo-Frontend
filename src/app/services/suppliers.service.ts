import { apiRequest } from '../config/api';

export const getSuppliers = async (name?: string, isActive?: string) => {
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (isActive) params.set('isActive', isActive);
  return await apiRequest(`/suppliers?${params.toString()}`);
};
