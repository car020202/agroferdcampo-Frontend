import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Package, AlertTriangle, FileText, ShoppingBag, 
  TrendingUp, Users, ArrowUpRight, ArrowDownRight, RefreshCcw, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { reportsService, DailySalesResponse, LowStockReportItem, SalesPeriodResponse, ProductSaleReportItem } from '../services/reports.service';
import { deliveryNotesService } from '../services/delivery-notes.service';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function Dashboard() {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const [loading, setLoading] = useState(true);

  // Estados de datos
  const [dailySales, setDailySales] = useState<DailySalesResponse | null>(null);
  const [pendingNotesCount, setPendingNotesCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [inventoryValuation, setInventoryValuation] = useState(0);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriodResponse | null>(null);
  const [topProducts, setTopProducts] = useState<ProductSaleReportItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fechas para rango: últimos 30 días
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 30);
      const startDateStr = pastDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];

      // Peticiones paralelas
      const [dailyRes, notesRes, lowStockRes, valuationRes, periodRes, productsRes] = await Promise.all([
        reportsService.getDailySales(),
        deliveryNotesService.getDeliveryNotes({ status: 'EMITIDO', limit: 1 }),
        reportsService.getLowStock(),
        reportsService.getInventoryValuation(),
        reportsService.getSalesByPeriod(startDateStr, endDateStr),
        reportsService.getSalesByProduct(startDateStr, endDateStr)
      ]);

      setDailySales(dailyRes);
      setPendingNotesCount(notesRes.total || 0);
      setLowStockCount(lowStockRes.length || 0);
      setInventoryValuation(valuationRes.totalValuation || 0);
      setSalesPeriod(periodRes);
      
      // Ordenar productos por cantidad vendida de forma descendente y tomar top 5
      const sortedProducts = [...productsRes]
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);
      setTopProducts(sortedProducts);
    } catch (error: any) {
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch]);

  // Formateadores
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 h-full animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-[var(--border)] rounded w-48"></div>
          <div className="h-10 bg-[var(--border)] rounded w-32"></div>
        </div>
        
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"></div>
          ))}
        </div>

        {/* Skeleton Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"></div>
          <div className="h-[350px] bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"></div>
        </div>
      </div>
    );
  }

  // Preparar datos del gráfico
  const chartData = salesPeriod?.dailyBreakdown.map(item => ({
    fecha: new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    monto: Number(item.total)
  })) || [];

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Dashboard General
          </h1>
          <p className="text-[var(--text-sec)]">
            Hola, {user?.name}. Sucursal: <span className="font-semibold text-[var(--text-main)]">{selectedBranch?.name || 'Cargando...'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 font-semibold text-xs border-[var(--border)] bg-[var(--card)]">
            Últimos 30 días
          </Badge>
          <Button variant="outline" size="icon" onClick={loadData} title="Refrescar datos">
            <RefreshCcw size={16} />
          </Button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* VENTAS DIARIAS */}
        <Card className="border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Ventas del Día</p>
              <h3 className="text-3xl font-black text-[var(--text-main)]">
                {formatCurrency(dailySales?.totalVentas || 0)}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-sec)]">
            <span>{dailySales?.cantidadTransacciones || 0} transacciones hoy</span>
            <span className="flex items-center text-emerald-600 font-bold">
              <TrendingUp size={12} className="mr-1" /> Activo
            </span>
          </div>
        </Card>

        {/* ALBARANES PENDIENTES */}
        <Card className="border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Albaranes Pendientes</p>
              <h3 className="text-3xl font-black text-[var(--text-main)]">
                {pendingNotesCount}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
              <ShoppingBag size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-sec)]">
            <span>Por despachar/entregar</span>
            <Badge variant={pendingNotesCount > 0 ? "warning" : "success"} className="text-[10px]">
              {pendingNotesCount > 0 ? 'Pendientes' : 'Al día'}
            </Badge>
          </div>
        </Card>

        {/* STOCK BAJO */}
        <Card className="border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Stock Crítico</p>
              <h3 className="text-3xl font-black text-[var(--text-main)]">
                {lowStockCount}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-sec)]">
            <span>Productos bajo mínimo</span>
            {lowStockCount > 0 ? (
              <span className="text-amber-600 font-bold">Revisar</span>
            ) : (
              <span className="text-emerald-600 font-bold">Ok</span>
            )}
          </div>
        </Card>

        {/* VALOR DE INVENTARIO */}
        <Card className="border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Valor de Inventario</p>
              <h3 className="text-3xl font-black text-[var(--text-main)]">
                {formatCurrency(inventoryValuation)}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Package size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-sec)]">
            <span>Valoración a costo</span>
            <span className="font-bold text-[var(--primary)]">Activo</span>
          </div>
        </Card>
      </div>

      {/* DETALLES DE VENTAS Y TOP PRODUCTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO DE VENTAS */}
        <Card className="lg:col-span-2 border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Histórico de Ventas</h3>
            <p className="text-xs text-[var(--text-sec)]">Ventas diarias netas en dólares para los últimos 30 días</p>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--text-sec)] text-sm">
                No hay ventas en este periodo.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border-rgb), 0.05)" />
                  <XAxis 
                    dataKey="fecha" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--text-sec)' }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--text-sec)' }}
                    tickFormatter={(tick) => `$${tick}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: '12px',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                    formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Ventas']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="monto" 
                    stroke="var(--primary)" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* TOP PRODUCTOS */}
        <Card className="border-[var(--border)] bg-[var(--card)] p-6 rounded-2xl flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Productos Más Vendidos</h3>
            <p className="text-xs text-[var(--text-sec)] font-medium">Top de productos con mayor volumen del mes</p>
          </div>
          <div className="flex-1 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs text-center">Cant</TableHead>
                  <TableHead className="text-xs text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-[var(--text-sec)] py-8">
                      Sin datos disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  topProducts.map((p) => (
                    <TableRow key={p.productId} className="hover:bg-[var(--bg)]/30">
                      <TableCell className="p-2.5">
                        <span className="text-xs font-bold text-[var(--text-main)] block truncate max-w-[140px] uppercase">
                          {p.productName}
                        </span>
                        <span className="text-[10px] text-[var(--text-sec)]">ID: #{p.productId}</span>
                      </TableCell>
                      <TableCell className="text-center p-2.5 text-xs font-semibold text-[var(--text-main)]">
                        {p.totalQty}
                      </TableCell>
                      <TableCell className="text-right p-2.5 text-xs font-black text-emerald-600">
                        {formatCurrency(p.margin)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
