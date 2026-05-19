import { apiRequest, API_BASE_URL } from '../config/api';

export interface DailySalesResponse {
  date: string;
  totalVentas: number;
  totalIVA: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalCredito: number;
  cantidadTransacciones: number;
  productoMasVendido: { id: number; name: string; qty: number } | null;
}

export interface SalesPeriodResponse {
  granTotal: number;
  dailyBreakdown: Array<{ date: string; total: number }>;
}

export interface ProductSaleReportItem {
  productId: number;
  productName: string;
  totalQty: number;
  totalRevenue: number;
  totalCost: number;
  margin: number;
}

export interface ReceivableReportItem {
  customerId: number;
  name: string;
  creditLimit: number;
  creditBalance: number;
  lastPurchaseDate: string | null;
}

export interface AgingReportResponse {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '>90': number;
}

export interface LowStockReportItem {
  productId: number;
  productName: string;
  quantity: number;
  minStock: number;
}

export interface ValuationDetailItem {
  productId: number;
  productName: string;
  quantity: number;
  costPrice: number;
  totalValue: number;
}

export interface ValuationReportResponse {
  totalValuation: number;
  details: ValuationDetailItem[];
}

export interface CashSummaryResponse {
  totalShifts: number;
  totalInitial: number;
  totalExpected: number;
  totalCounted: number;
  totalDifference: number;
}

export const reportsService = {
  getDailySales: async (date?: string): Promise<DailySalesResponse> => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    return await apiRequest<DailySalesResponse>(`/reports/sales/daily?${params.toString()}`);
  },

  getSalesByPeriod: async (startDate: string, endDate: string): Promise<SalesPeriodResponse> => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    return await apiRequest<SalesPeriodResponse>(`/reports/sales/period?${params.toString()}`);
  },

  getSalesByProduct: async (startDate: string, endDate: string): Promise<ProductSaleReportItem[]> => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    return await apiRequest<ProductSaleReportItem[]>(`/reports/sales/by-product?${params.toString()}`);
  },

  getReceivables: async (): Promise<ReceivableReportItem[]> => {
    return await apiRequest<ReceivableReportItem[]>('/reports/receivables');
  },

  getReceivablesAging: async (): Promise<AgingReportResponse> => {
    return await apiRequest<AgingReportResponse>('/reports/receivables/aging');
  },

  getLowStock: async (): Promise<LowStockReportItem[]> => {
    return await apiRequest<LowStockReportItem[]>('/reports/inventory/low-stock');
  },

  getInventoryValuation: async (): Promise<ValuationReportResponse> => {
    return await apiRequest<ValuationReportResponse>('/reports/inventory/valuation');
  },

  getCashSummary: async (startDate: string, endDate: string): Promise<CashSummaryResponse> => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    return await apiRequest<CashSummaryResponse>(`/reports/cash/summary?${params.toString()}`);
  },

  downloadReport: async (endpointPath: string, filename: string): Promise<void> => {
    const token = localStorage.getItem('agro-token');
    const url = `${API_BASE_URL}/reports/${endpointPath}`;

    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Error al descargar reporte (${response.status}): ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }
};
