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

export interface ProfitPeriodItem {
  fecha: string;
  ventas: number;
  costo: number;
  utilidad: number;
  margenPct: number;
  transacciones: number;
}

export interface ManagerDashboardResponse {
  periodo: {
    startDate: string;
    endDate: string;
    label: string;
  };
  ventas: {
    totalMes: number;
    totalMesAnterior: number;
    trendPct: number;
    ticketPromedio: number;
    ticketPromedioAnterior: number;
    transaccionesMes: number;
  };
  utilidad: {
    totalVentas: number;
    totalCosto: number;
    utilidad: number;
    margenPct: number;
    utilidadAnterior: number;
    trendPct: number;
  };
  cartera: {
    totalPorCobrar: number;
    creditosVencidosCount: number;
    creditosVencidosAmount: number;
    cobrosHoy: number;
    cobrosHoyCount: number;
  };
  payables: {
    totalPorPagar: number;
    comprasPendientesCount: number;
  };
  operaciones: {
    cotizacionesPendientes: number;
    tasaConversionPct: number;
    devolucionesMesAmount: number;
    devolucionesMesCount: number;
    rutasActivas: number;
  };
  rrhh: {
    empleadosActivos: number;
    asistenciaHoyPct: number;
    asistenciaHoyPresentes: number;
    asistenciaHoyTotal: number;
    permisosPendientes: number;
  };
}

export const reportsService = {
  getManagerDashboard: async (startDate?: string, endDate?: string): Promise<ManagerDashboardResponse> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return await apiRequest<ManagerDashboardResponse>(`/reports/dashboard/manager?${params.toString()}`);
  },

  getProfitByPeriod: async (
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'month' | 'quarter' | 'year' = 'day',
  ): Promise<ProfitPeriodItem[]> => {
    const params = new URLSearchParams({ startDate, endDate, groupBy });
    return await apiRequest<ProfitPeriodItem[]>(`/reports/dashboard/profit?${params.toString()}`);
  },

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

  getPurchasesByPeriod: async (startDate: string, endDate: string, status?: string): Promise<any[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (status) params.set('status', status);
    return await apiRequest<any[]>(`/reports/purchases/period?${params.toString()}`);
  },

  getInventoryMovements: async (startDate: string, endDate: string, type?: string): Promise<any[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (type) params.set('type', type);
    return await apiRequest<any[]>(`/reports/inventory/movements?${params.toString()}`);
  },

  getSalesByCashier: async (startDate: string, endDate: string): Promise<any[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    return await apiRequest<any[]>(`/reports/sales/by-cashier?${params.toString()}`);
  },

  getReturns: async (startDate: string, endDate: string): Promise<any[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    return await apiRequest<any[]>(`/reports/returns/period?${params.toString()}`);
  },

  getCashDetail: async (startDate: string, endDate: string): Promise<any[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    return await apiRequest<any[]>(`/reports/cash/detail?${params.toString()}`);
  },

  getCashShiftsHistory: async (page: number = 1, limit: number = 20): Promise<{ data: any[], total: number, page: number, totalPages: number }> => {
    return await apiRequest<{ data: any[], total: number, page: number, totalPages: number }>(`/cash-shifts?page=${page}&limit=${limit}`);
  },

  downloadReport: async (endpointPath: string, filename: string): Promise<void> => {
    const token = localStorage.getItem('agro-token');

    // Si el path empieza con '../' es una ruta relativa fuera de /reports/
    const url = endpointPath.startsWith('../')
      ? `${API_BASE_URL}/${endpointPath.replace('../', '')}`
      : `${API_BASE_URL}/reports/${endpointPath}`;

    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Error al descargar reporte (${response.status}): ${response.statusText}`);
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
