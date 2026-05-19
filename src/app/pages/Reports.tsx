import React, { useState } from 'react';
import { 
  FileText, Download, Calendar, TrendingUp, DollarSign, 
  Package, AlertTriangle, ShieldAlert, Users, Percent, CreditCard, RefreshCw
} from 'lucide-react';
import { reportsService } from '../services/reports.service';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: any;
  endpointPrefix: string;
  paramsType: 'none' | 'date' | 'range';
}

const REPORTS: ReportType[] = [
  { 
    id: 'daily_sales', 
    title: 'Reporte de Ventas Diarias', 
    description: 'Detalle de todas las ventas facturadas y métodos de pago de un día específico.', 
    icon: DollarSign,
    endpointPrefix: 'sales/daily',
    paramsType: 'date'
  },
  { 
    id: 'period_sales', 
    title: 'Ventas por Período', 
    description: 'Histórico consolidado de ventas diarias facturadas dentro de un rango de fechas.', 
    icon: TrendingUp,
    endpointPrefix: 'sales/period',
    paramsType: 'range'
  },
  { 
    id: 'product_sales', 
    title: 'Ventas y Rentabilidad por Producto', 
    description: 'Reporte de productos vendidos en un rango de fechas, detallando ingresos, costo y margen de ganancia.', 
    icon: Percent,
    endpointPrefix: 'sales/by-product',
    paramsType: 'range'
  },
  { 
    id: 'receivables', 
    title: 'Cuentas por Cobrar (Cartera)', 
    description: 'Saldo pendiente de cobro de clientes con línea de crédito otorgada.', 
    icon: CreditCard,
    endpointPrefix: 'receivables',
    paramsType: 'none'
  },
  { 
    id: 'receivables_aging', 
    title: 'Antigüedad de Saldos', 
    description: 'Distribución consolidada de saldos pendientes de crédito por plazos (0-30, 31-60, 61-90, +90 días).', 
    icon: Users,
    endpointPrefix: 'receivables/aging',
    paramsType: 'none'
  },
  { 
    id: 'inventory_low_stock', 
    title: 'Inventario Bajo Mínimo', 
    description: 'Alertas de stock crítico para productos que se encuentran por debajo o en su límite mínimo establecido.', 
    icon: ShieldAlert,
    endpointPrefix: 'inventory/low-stock',
    paramsType: 'none'
  },
  { 
    id: 'inventory_valuation', 
    title: 'Valorización de Inventario', 
    description: 'Detalle del costo y valor monetario total del stock de la sucursal actual.', 
    icon: Package,
    endpointPrefix: 'inventory/valuation',
    paramsType: 'none'
  },
  { 
    id: 'cash_summary', 
    title: 'Resumen de Cierres de Caja', 
    description: 'Historial de turnos de caja cerrados indicando fondos iniciales, ventas esperadas y diferencias físicas.', 
    icon: FileText,
    endpointPrefix: 'cash/summary',
    paramsType: 'range'
  }
];

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(REPORTS[0]);
  
  // Parámetros de formulario
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  
  const getInitialDates = () => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    return {
      start: past.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDates());
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  const handleDownload = async (format: 'excel' | 'pdf') => {
    setDownloading(format);
    const toastId = toast.loading(`Generando reporte en formato ${format.toUpperCase()}...`);
    try {
      let endpointPath = `${selectedReport.endpointPrefix}/export/${format}`;
      const params = new URLSearchParams();

      if (selectedReport.paramsType === 'date') {
        params.set('date', singleDate);
      } else if (selectedReport.paramsType === 'range') {
        params.set('startDate', dateRange.start);
        params.set('endDate', dateRange.end);
      }

      const queryString = params.toString();
      if (queryString) {
        endpointPath += `?${queryString}`;
      }

      const filename = `${selectedReport.id}-${singleDate}`;
      await reportsService.downloadReport(endpointPath, filename);
      toast.success('Reporte descargado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al descargar el archivo del reporte');
    } finally {
      toast.dismiss(toastId);
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">Centro de Reportes</h1>
        <p className="text-[var(--text-sec)]">Genera y exporta reportes detallados del estado de la empresa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LISTA DE REPORTES */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <Label className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Reportes Disponibles</Label>
          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
            {REPORTS.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReport.id === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`flex items-start gap-4 p-4 rounded-xl text-left border transition-all duration-200 group relative ${
                    isSelected 
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md' 
                      : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--bg)]'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg)] text-[var(--primary)]'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-[var(--text-main)] group-hover:text-[var(--primary)]'}`}>
                      {report.title}
                    </h3>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${isSelected ? 'text-white/80' : 'text-[var(--text-sec)]'}`}>
                      {report.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PARÁMETROS Y EXPORTACIÓN */}
        <Card className="lg:col-span-2 border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl flex flex-col gap-6">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              <selectedReport.icon size={22} className="text-[var(--primary)]" />
              {selectedReport.title}
            </h2>
            <p className="text-sm text-[var(--text-sec)] mt-1.5">{selectedReport.description}</p>
          </div>

          {/* PARÁMETROS DINÁMICOS */}
          {selectedReport.paramsType !== 'none' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Parámetros del Reporte</h3>
              
              {selectedReport.paramsType === 'date' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-sec)]">Selecciona la fecha</Label>
                    <Input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="bg-[var(--bg)]"
                    />
                  </div>
                </div>
              )}

              {selectedReport.paramsType === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-sec)]">Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="bg-[var(--bg)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[var(--text-sec)]">Fecha Fin</Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="bg-[var(--bg)]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedReport.paramsType === 'none' && (
            <div className="bg-[var(--bg)]/50 border border-[var(--border)] rounded-xl p-4 text-xs text-[var(--text-sec)] leading-relaxed">
              Este reporte consolidado se genera en tiempo real con el estado actual del sistema y no requiere configurar fechas ni filtros adicionales.
            </div>
          )}

          {/* ACCIONES DE DESCARGA */}
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Formatos de Exportación</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleDownload('excel')}
                disabled={downloading !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                {downloading === 'excel' ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                Descargar en Excel (.xlsx)
              </Button>

              <Button
                onClick={() => handleDownload('pdf')}
                disabled={downloading !== null}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                {downloading === 'pdf' ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                Descargar en PDF (.pdf)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
