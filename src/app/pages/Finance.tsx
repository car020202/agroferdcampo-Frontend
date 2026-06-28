import { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, TrendingUp, Search, 
  ArrowDownCircle, ArrowUpCircle, Filter, CheckCircle2, XCircle, Clock, FileDown, FileSpreadsheet, FileText, Printer
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  generalCashService, GeneralCashEntry, GeneralCashSummary 
} from '../services/general-cash.service';
import { pettyCashService, PettyCashStatus, PettyCashMovement, PettyCashReplenishment } from '../services/petty-cash.service';
import { cashShiftsService } from '../services/cash-shifts.service';
import { reportsService } from '../services/reports.service';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { apiRequest } from '../config/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { NumberInput } from '../components/ui/number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';

const financeFilters: FilterConfig[] = [
  { id: 'type', label: 'Tipo', type: 'category', options: [
    { label: 'Ingreso', value: 'INGRESO' },
    { label: 'Egreso', value: 'EGRESO' }
  ]},
  { id: 'category', label: 'Categoría', type: 'category', options: [
    { label: 'Ventas', value: 'VENTAS' },
    { label: 'Gasto Operativo', value: 'GASTO_OPERATIVO' },
    { label: 'Pago a Proveedor', value: 'PAGO_PROVEEDOR' },
    { label: 'Reposición Caja Fuerte', value: 'REPOSICION_CAJA_CHICA' },
    { label: 'Transferencia a Caja Fuerte', value: 'TRANSFERENCIA_CAJA_FUERTE' },
    { label: 'Otro', value: 'OTRO' }
  ]},
  { id: 'date', label: 'Rango de Fechas', type: 'date_range' }
];

export function Finance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'petty' | 'shifts'>('general');

  // --- SHIFT STATE ---
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [checkingShift, setCheckingShift] = useState(true);

  useEffect(() => {
    const checkShift = async () => {
      try {
        const shift = await cashShiftsService.getActiveShift();
        setHasActiveShift(!!shift);
      } catch {
        setHasActiveShift(false);
      } finally {
        setCheckingShift(false);
      }
    };
    checkShift();
  }, []);

  // --- GENERAL CASH STATE ---
  const [generalSummary, setGeneralSummary] = useState<GeneralCashSummary | null>(null);
  const [generalMovements, setGeneralMovements] = useState<GeneralCashEntry[]>([]);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [generalFilters, setGeneralFilters] = useState({ page: 1, limit: 20, category: 'all' });
  const [generalPagination, setGeneralPagination] = useState({ total: 0, totalPages: 1 });

  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';
  const startDateFilter = searchParams.get('startDate') || '';
  const endDateFilter = searchParams.get('endDate') || '';

  const [showAddGeneralModal, setShowAddGeneralModal] = useState(false);
  const [newGeneralEntry, setNewGeneralEntry] = useState({
    type: 'INGRESO',
    category: 'VENTAS',
    amount: '',
    description: '',
    reference: '',
    purchaseId: '' as string | number,
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierPurchases, setSupplierPurchases] = useState<any[]>([]);
  const [loadingPurchasesForLink, setLoadingPurchasesForLink] = useState(false);

  // --- PETTY CASH STATE ---
  const [pettyStatus, setPettyStatus] = useState<PettyCashStatus | null>(null);
  const [pettyMovements, setPettyMovements] = useState<PettyCashMovement[]>([]);
  const [pettyReplenishments, setPettyReplenishments] = useState<PettyCashReplenishment[]>([]);
  const [pettyLoading, setPettyLoading] = useState(true);
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', receiptRef: '' });
  
  const [showReplenishModal, setShowReplenishModal] = useState(false);
  const [replenishForm, setReplenishForm] = useState({ amount: '', reason: '' });

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupForm, setSetupForm] = useState({ maxBalance: '', minBalance: '' });

  // --- SHIFTS HISTORY STATE ---
  const [shiftsHistory, setShiftsHistory] = useState<any[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsPagination, setShiftsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [adminCloseShiftId, setAdminCloseShiftId] = useState<number | null>(null);
  const [adminCloseTotals, setAdminCloseTotals] = useState<any>(null);
  const [adminCloseLoading, setAdminCloseLoading] = useState(false);
  const [adminCloseCash, setAdminCloseCash] = useState<number | ''>('');
  const [adminCloseNotes, setAdminCloseNotes] = useState("");

  useEffect(() => {
    if (activeTab === 'general') {
      fetchGeneralCash();
    } else if (activeTab === 'petty') {
      fetchPettyCash();
    } else if (activeTab === 'shifts') {
      fetchShiftsHistory();
    }
  }, [activeTab, generalFilters.page, generalFilters.category, typeFilter, categoryFilter, startDateFilter, endDateFilter, shiftsPagination.page]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'shifts' || tab === 'petty' || tab === 'general') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (newGeneralEntry.category === 'PAGO_PROVEEDOR') {
      setLoadingPurchasesForLink(true);
      apiRequest<any>('/purchases?isPaid=false&limit=50')
        .then((res: any) => {
          const items = Array.isArray(res) ? res : res.data || [];
          setSupplierPurchases(items.filter((p: any) => p.status !== 'BORRADOR' && p.status !== 'CANCELADA'));
        })
        .catch(() => setSupplierPurchases([]))
        .finally(() => setLoadingPurchasesForLink(false));
    } else {
      setNewGeneralEntry(prev => ({ ...prev, purchaseId: '' }));
    }
  }, [newGeneralEntry.category]);

  // --- GENERAL CASH LOGIC ---
  const fetchGeneralCash = async () => {
    setGeneralLoading(true);
    try {
      const summary = await generalCashService.getSummary(
        startDateFilter || undefined, 
        endDateFilter || undefined
      );
      setGeneralSummary(summary);

      const filters: any = { page: generalFilters.page, limit: generalFilters.limit };
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      if (startDateFilter) filters.startDate = startDateFilter;
      if (endDateFilter) filters.endDate = endDateFilter;

      const res = await generalCashService.findAll(filters);
      setGeneralMovements(res.data);
      setGeneralPagination({ total: res.total, totalPages: res.totalPages });
    } catch (error: any) {
      toast.error('Error al cargar caja general');
    } finally {
      setGeneralLoading(false);
    }
  };

  const handleCreateGeneralEntry = async () => {
    if (!newGeneralEntry.amount || Number(newGeneralEntry.amount) <= 0) {
      toast.error('Monto inválido'); return;
    }
    if (newGeneralEntry.type === 'EGRESO' && !newGeneralEntry.description.trim()) {
      toast.error('La descripción es requerida para los egresos'); return;
    }

    try {
      await generalCashService.create({
        type: newGeneralEntry.type,
        category: newGeneralEntry.category,
        amount: Number(newGeneralEntry.amount),
        description: newGeneralEntry.description,
        reference: newGeneralEntry.reference,
        ...(newGeneralEntry.purchaseId ? { purchaseId: Number(newGeneralEntry.purchaseId) } : {}),
      });
      toast.success('Movimiento registrado exitosamente');
      setShowAddGeneralModal(false);
      setNewGeneralEntry({ type: 'INGRESO', category: 'VENTAS', amount: '', description: '', reference: '', purchaseId: '' });
      fetchGeneralCash();
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar movimiento');
    }
  };

  // --- PETTY CASH LOGIC ---
  const fetchPettyCash = async () => {
    setPettyLoading(true);
    try {
      const status = await pettyCashService.getStatus();
      setPettyStatus(status);

      const movs = await pettyCashService.getMovements({ page: 1, limit: 20 });
      setPettyMovements(movs.data);

      const repls = await pettyCashService.getReplenishments();
      setPettyReplenishments(repls);
    } catch (error: any) {
      if (error.status === 404) {
        setPettyStatus(null);
      } else {
        toast.error('Error al cargar caja chica');
      }
    } finally {
      setPettyLoading(false);
    }
  };

  // --- SHIFTS HISTORY LOGIC ---
  const fetchShiftsHistory = async () => {
    setShiftsLoading(true);
    try {
      const res = await reportsService.getCashShiftsHistory(shiftsPagination.page, shiftsPagination.limit);
      setShiftsHistory(res.data);
      setShiftsPagination(prev => ({ ...prev, total: res.total, totalPages: res.totalPages }));
    } catch (error: any) {
      toast.error('Error al cargar historial de turnos');
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleExportShiftPdf = async (id: number) => {
    try {
      await reportsService.downloadReport(`cash-shifts/${id}/export/pdf`, `cierre-turno-${id}.pdf`);
      toast.success('Reporte exportado correctamente');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExportShiftExcel = async (id: number) => {
    try {
      await reportsService.downloadReport(`cash-shifts/${id}/export/excel`, `cierre-turno-${id}.xlsx`);
    } catch (e) {
      toast.error('Error al exportar a Excel');
    }
  };

  const handlePrintShiftTicket = (shift: any) => {
    const totalVentas = (Number(shift.totalVentasEfectivo) || 0) + (Number(shift.totalVentasTarjeta) || 0) + (Number(shift.totalVentasTransferencia) || 0);
    const date = new Date(shift.closedAt || new Date()).toLocaleString('es-ES');
    let breakdownHtml = '';
    
    if (shift.closingBreakdown) {
      const breakdown = typeof shift.closingBreakdown === 'string' ? JSON.parse(shift.closingBreakdown) : shift.closingBreakdown;
      const { bills, coins } = breakdown;
      
      if (bills || coins) {
        breakdownHtml += `<div class="divider">================================</div>
          <div class="text-center bold">ARQUEO DE CAJA</div>
          <div class="divider">--------------------------------</div>`;
          
        if (bills) {
          Object.entries(bills).forEach(([denom, count]) => {
            const denomValue = Number(denom.replace('d', ''));
            if (Number(count) > 0) {
              breakdownHtml += `<div class="flex-between"><span>Billetes $${denomValue} x${count}</span><span>$${(denomValue * Number(count)).toFixed(4)}</span></div>`;
            }
          });
        }
        if (coins) {
          Object.entries(coins).forEach(([denom, count]) => {
            const denomValue = Number(denom.replace('c', '')) / 100;
            if (Number(count) > 0) {
              breakdownHtml += `<div class="flex-between"><span>Monedas $${denomValue.toFixed(4)} x${count}</span><span>$${(denomValue * Number(count)).toFixed(4)}</span></div>`;
            }
          });
        }
      }
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; width: 300px; margin: 0; padding: 10px; font-size: 14px; color: #000; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; }
            .divider { text-align: center; margin: 5px 0; }
            h2, h3 { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2>Agroferretería</h2>
            <h3>Recibo de Cierre de Caja</h3>
          </div>
          <div class="divider">================================</div>
          <div>Turno #${shift.id}</div>
          <div>Cajero: ${shift.user?.fullName || 'Usuario'}</div>
          <div>Caja: ${shift.cashRegister?.name || 'General'}</div>
          <div>Fecha: ${date}</div>
          <div class="divider">--------------------------------</div>
          <div class="flex-between"><span>Fondo Base:</span><span>$${Number(shift.initialAmount).toFixed(4)}</span></div>
          <div class="flex-between"><span>Total Ventas:</span><span>$${totalVentas.toFixed(4)}</span></div>
          <div class="flex-between"><span>Monto Esperado:</span><span>$${Number(shift.expectedAmount).toFixed(4)}</span></div>
          <div class="flex-between"><span>Monto Contado:</span><span>$${Number(shift.countedAmount).toFixed(4)}</span></div>
          <div class="flex-between bold"><span>Diferencia:</span><span>$${Number(shift.difference).toFixed(4)}</span></div>
          ${breakdownHtml}
          <div class="divider">================================</div>
          <div class="text-center" style="margin-top: 30px;">
            _______________________<br>Firma Cajero
          </div>
          <div class="text-center" style="margin-top: 30px;">
            _______________________<br>Firma Supervisor
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handleOpenAdminCloseShift = async (id: number) => {
    try {
      setAdminCloseLoading(true);
      setAdminCloseShiftId(id);
      const totals = await cashShiftsService.getExpectedTotalsById(id);
      setAdminCloseTotals(totals);
      setAdminCloseCash(totals.expectedAmount); // Sugerir el esperado
    } catch (error: any) {
      toast.error(error.message);
      setAdminCloseShiftId(null);
    } finally {
      setAdminCloseLoading(false);
    }
  };

  const handleConfirmAdminCloseShift = async () => {
    if (!adminCloseShiftId) return;
    try {
      setAdminCloseLoading(true);
      await cashShiftsService.closeShiftById(adminCloseShiftId, {
        countedCash: Number(adminCloseCash),
        notes: adminCloseNotes,
        breakdown: adminCloseTotals?.closingBreakdown
      });
      toast.success('Cierre de caja aprobado exitosamente');
      setAdminCloseShiftId(null);
      setAdminCloseTotals(null);
      fetchShiftsHistory();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAdminCloseLoading(false);
    }
  };

  const handleSetupPettyCash = async () => {
    try {
      await pettyCashService.setup({
        maxBalance: Number(setupForm.maxBalance),
        minBalance: Number(setupForm.minBalance)
      });
      toast.success('Caja chica configurada exitosamente');
      setShowSetupModal(false);
      fetchPettyCash();
    } catch (error: any) {
      toast.error(error.message || 'Error al configurar caja chica');
    }
  };

  const handleRegisterExpense = async () => {
    if (!newExpense.amount || Number(newExpense.amount) <= 0) {
      toast.error('Monto inválido'); return;
    }
    if (!newExpense.description.trim()) {
      toast.error('La descripción es requerida'); return;
    }
    try {
      await pettyCashService.registerExpense({
        amount: Number(newExpense.amount),
        description: newExpense.description,
        receiptRef: newExpense.receiptRef
      });
      toast.success('Gasto registrado exitosamente');
      setShowExpenseModal(false);
      setNewExpense({ amount: '', description: '', receiptRef: '' });
      fetchPettyCash();
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar gasto');
    }
  };

  const handleRequestReplenish = async () => {
    try {
      await pettyCashService.requestReplenishment({
        amount: Number(replenishForm.amount),
        reason: replenishForm.reason
      });
      toast.success('Solicitud enviada exitosamente');
      setShowReplenishModal(false);
      setReplenishForm({ amount: '', reason: '' });
      fetchPettyCash();
    } catch (error: any) {
      toast.error(error.message || 'Error al solicitar reposición');
    }
  };

  const handleApproveReplenish = async (id: number) => {
    try {
      await pettyCashService.approveReplenishment(id);
      toast.success('Reposición aprobada');
      fetchPettyCash();
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar reposición');
    }
  };

  const handleRejectReplenish = async (id: number) => {
    try {
      await pettyCashService.rejectReplenishment(id, 'Rechazado por administrador');
      toast.success('Reposición rechazada');
      fetchPettyCash();
    } catch (error: any) {
      toast.error(error.message || 'Error al rechazar reposición');
    }
  };

  const isPettyLow = pettyStatus?.needsReplenishment ?? false;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-main)]">Finanzas y Caja</h1>
        <p className="text-[var(--text-sec)]">Control de Caja General y Caja Chica de la sucursal.</p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-[var(--border)] -mb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === 'general' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          Caja General
        </button>
        <button
          onClick={() => setActiveTab('petty')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === 'petty' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          Caja Fuerte
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] cursor-pointer ${
            activeTab === 'shifts' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          Turnos de Caja
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="flex flex-col gap-6">
          {/* STATS GENERAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                  <Wallet size={20} className="text-[var(--primary)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-sec)]">Saldo Caja General</h3>
              </div>
              <p className={`text-3xl font-black ${generalSummary && generalSummary.balance >= 0 ? 'text-[var(--primary)]' : 'text-red-500'}`}>
                ${generalSummary?.balance?.toFixed(4) || '0.00'}
              </p>
            </Card>
            <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <TrendingUp size={20} className="text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-sec)]">Total Ingresos</h3>
              </div>
              <p className="text-3xl font-black text-emerald-600">
                ${generalSummary?.totalIngresos?.toFixed(4) || '0.00'}
              </p>
            </Card>
            <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <DollarSign size={20} className="text-rose-600" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-sec)]">Total Egresos</h3>
              </div>
              <p className="text-3xl font-black text-rose-600">
                ${generalSummary?.totalEgresos?.toFixed(4) || '0.00'}
              </p>
            </Card>
          </div>

          {/* FILTROS Y ACCIONES */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="flex-1 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
              <SmartFilter config={financeFilters} />
            </div>
            {user?.roleId !== 4 && (
              <Button 
                onClick={() => setShowAddGeneralModal(true)} 
                disabled={checkingShift || !hasActiveShift}
                title={!hasActiveShift ? "Debes abrir caja para registrar movimientos" : ""}
                className="font-bold whitespace-nowrap h-fit"
              >
                Registrar Movimiento
              </Button>
            )}
          </div>

          {/* TABLA GENERAL */}
          <Card className="bg-[var(--card)] border-[var(--border)] shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell></TableRow>
                ) : generalMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">No hay movimientos</TableCell></TableRow>
                ) : (
                  generalMovements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.date || m.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={m.type === 'INGRESO' ? 'success' : 'destructive'}>{m.type}</Badge>
                      </TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>
                        <p className="font-medium text-[var(--text-main)]">{m.description}</p>
                        {m.reference && <p className="text-xs text-[var(--text-sec)]">Ref: {m.reference}</p>}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'INGRESO' ? '+' : '-'}${Number(m.amount).toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === 'petty' && (
        <div className="flex flex-col gap-6">
          {pettyLoading ? (
            <div className="flex items-center justify-center h-40 text-[var(--text-sec)]">
              Cargando caja fuerte...
            </div>
          ) : !pettyStatus ? (
            <Card className="p-8 text-center flex flex-col items-center gap-4 bg-[var(--card)] border-[var(--border)] shadow-sm">
              <Wallet size={48} className="text-[var(--text-sec)] opacity-50" />
              <div>
                <h3 className="text-xl font-bold text-[var(--text-main)]">Caja Fuerte no configurada</h3>
                <p className="text-[var(--text-sec)]">El fondo de caja fuerte de esta sucursal no ha sido inicializado.</p>
              </div>
              <Button onClick={() => setShowSetupModal(true)}>Configurar Caja Fuerte</Button>
            </Card>
          ) : (
            <>
              {/* STATS PETTY */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
                  <h3 className="text-sm font-bold text-[var(--text-sec)] mb-2">Saldo Actual</h3>
                  <p className={`text-3xl font-black ${isPettyLow ? 'text-amber-500' : 'text-[var(--primary)]'}`}>
                    ${Number(pettyStatus.currentBalance).toFixed(4)}
                  </p>
                  {isPettyLow && <p className="text-xs text-amber-500 font-bold mt-1">Saldo bajo mínimo</p>}
                </Card>
                <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
                  <h3 className="text-sm font-bold text-[var(--text-sec)] mb-2">Límite Máximo</h3>
                  <p className="text-3xl font-black text-[var(--text-main)]">${Number(pettyStatus.maxBalance).toFixed(4)}</p>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setShowExpenseModal(true)} variant="destructive" className="font-bold">
                  Registrar Gasto (Egreso)
                </Button>
                <Button 
                  onClick={() => setShowReplenishModal(true)} 
                  variant="outline" 
                  className={isPettyLow ? 'border-amber-500 text-amber-600' : ''}
                >
                  Solicitar Reposición
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MOVIMIENTOS CAJA CHICA */}
                <Card className="bg-[var(--card)] border-[var(--border)] shadow-sm flex flex-col">
                  <div className="p-4 border-b border-[var(--border)] font-bold">Últimos Gastos</div>
                  <div className="p-0 flex-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pettyMovements.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{m.description}</p>
                              <span className="text-[10px] text-[var(--text-sec)]">
                                {m.type === 'INGRESO' ? 'Reposición' : 'Gasto'}
                              </span>
                            </TableCell>
                            <TableCell className={`text-right font-bold ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.type === 'INGRESO' ? '+' : '-'}${Number(m.amount).toFixed(4)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* SOLICITUDES DE REPOSICIÓN */}
                <Card className="bg-[var(--card)] border-[var(--border)] shadow-sm flex flex-col">
                  <div className="p-4 border-b border-[var(--border)] font-bold">Solicitudes de Reposición</div>
                  <div className="p-4 flex flex-col gap-3">
                    {pettyReplenishments.length === 0 ? (
                      <p className="text-sm text-[var(--text-sec)]">No hay solicitudes recientes.</p>
                    ) : (
                      pettyReplenishments.map(r => (
                        <div key={r.id} className="p-3 border rounded-xl bg-[var(--bg)]">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold">Monto solicitado: ${Number(r.amount).toFixed(4)}</p>
                              <p className="text-xs text-[var(--text-sec)]">{r.reason}</p>
                            </div>
                            <Badge variant={r.status === 'PENDIENTE' ? 'secondary' : r.status === 'APROBADA' ? 'success' : 'destructive'}>
                              {r.status}
                            </Badge>
                          </div>
                          {r.status === 'PENDIENTE' && user?.roleId && user.roleId <= 2 && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={() => handleApproveReplenish(r.id)} className="bg-emerald-600 hover:bg-emerald-700">Aprobar</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectReplenish(r.id)}>Rechazar</Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* SHIFTS TAB */}
      {activeTab === 'shifts' && (
        <div className="flex flex-col gap-6">
          <Card className="bg-[var(--card)] border-[var(--border)] shadow-sm flex flex-col">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
              <span className="font-bold">Historial de Turnos de Caja</span>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cajero</TableHead>
                    <TableHead>Caja Fís.</TableHead>
                    <TableHead>Apertura / Cierre</TableHead>
                    <TableHead className="text-right">Inicial</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Exportar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftsLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow>
                  ) : shiftsHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">No hay turnos registrados</TableCell></TableRow>
                  ) : (
                    shiftsHistory.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-bold text-[var(--text-main)]">
                          {s.user?.fullName || '-'}
                        </TableCell>
                        <TableCell>
                          {s.cashRegister ? s.cashRegister.name : <span className="text-[var(--text-sec)]">-</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="text-emerald-600 font-bold whitespace-nowrap">Ap: {new Date(s.openedAt).toLocaleString()}</div>
                          {s.closedAt ? (
                            <div className="text-rose-600 font-bold whitespace-nowrap">Ci: {new Date(s.closedAt).toLocaleString()}</div>
                          ) : s.closeRequested ? (
                            <div className="text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">Cierre Solicitado</div>
                          ) : (
                            <div className="text-amber-500 font-bold">En curso</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">${Number(s.initialAmount).toFixed(4)}</TableCell>
                        <TableCell className="text-right">{s.expectedAmount !== null ? `$${Number(s.expectedAmount).toFixed(4)}` : '-'}</TableCell>
                        <TableCell className={`text-right font-bold ${Number(s.difference) < 0 ? 'text-rose-500' : Number(s.difference) > 0 ? 'text-emerald-500' : 'text-[var(--text-sec)]'}`}>
                          {s.difference !== null ? `$${Number(s.difference).toFixed(4)}` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={s.status === 'ABIERTO' ? 'default' : 'secondary'}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {s.status === 'CERRADO' ? (
                            <div className="flex gap-2 justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                    <FileDown size={14} className="mr-2" /> Exportar
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handlePrintShiftTicket(s)} className="cursor-pointer font-semibold text-[var(--text-main)]">
                                    <Printer size={16} className="mr-2 text-slate-500" /> Imprimir Recibo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportShiftPdf(s.id)} className="cursor-pointer font-semibold text-[var(--text-main)]">
                                    <FileText size={16} className="mr-2 text-rose-500" /> Exportar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportShiftExcel(s.id)} className="cursor-pointer font-semibold text-[var(--text-main)]">
                                    <FileSpreadsheet size={16} className="mr-2 text-emerald-500" /> Exportar Excel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : s.closeRequested ? (
                            user?.roleId && user.roleId <= 3 ? (
                              <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={() => handleOpenAdminCloseShift(s.id)}>Aprobar Cierre</Button>
                            ) : <span className="text-xs text-[var(--text-sec)]">Pendiente de aprobación</span>
                          ) : (
                            <span className="text-xs text-[var(--text-sec)]">Pendiente</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {shiftsPagination.totalPages > 1 && (
              <div className="p-4 border-t border-[var(--border)] flex justify-between items-center text-sm font-bold">
                <span className="text-[var(--text-sec)]">
                  Página {shiftsPagination.page} de {shiftsPagination.totalPages} ({shiftsPagination.total} turnos)
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    disabled={shiftsPagination.page === 1}
                    onClick={() => setShiftsPagination(p => ({ ...p, page: p.page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={shiftsPagination.page === shiftsPagination.totalPages}
                    onClick={() => setShiftsPagination(p => ({ ...p, page: p.page + 1 }))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODALS */}
      {/* Agregar Movimiento General */}
      <Dialog open={showAddGeneralModal} onOpenChange={setShowAddGeneralModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento - Caja General</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Tipo</label>
                <Select value={newGeneralEntry.type} onValueChange={(v: any) => setNewGeneralEntry({...newGeneralEntry, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Categoría</label>
                <Select value={newGeneralEntry.category} onValueChange={v => setNewGeneralEntry({...newGeneralEntry, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENTAS">Ventas</SelectItem>
                    <SelectItem value="GASTO_OPERATIVO">Gasto Operativo</SelectItem>
                    <SelectItem value="PAGO_PROVEEDOR">Pago Proveedor</SelectItem>
                    <SelectItem value="REPOSICION_CAJA_CHICA">Reposición Caja Fuerte</SelectItem>
                    <SelectItem value="TRANSFERENCIA_CAJA_FUERTE">Transferencia a Caja Fuerte</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Monto ($)</label>
              <NumberInput value={newGeneralEntry.amount} onValueChange={v => setNewGeneralEntry({...newGeneralEntry, amount: v as any})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">
                Descripción {newGeneralEntry.type === 'EGRESO' && <span className="text-rose-500">*</span>}
              </label>
              <Input value={newGeneralEntry.description} onChange={e => setNewGeneralEntry({...newGeneralEntry, description: e.target.value})} placeholder="Ej. Pago de luz" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">
                Referencia <span className="font-normal text-[var(--text-sec)]">(Opcional — Nº factura, recibo)</span>
              </label>
              <Input
                value={newGeneralEntry.reference}
                onChange={e => setNewGeneralEntry({...newGeneralEntry, reference: e.target.value})}
                placeholder="Ej. FAC-2026-00123"
              />
            </div>
            {newGeneralEntry.category === 'PAGO_PROVEEDOR' && (
              <div className="space-y-2">
                <label className="text-sm font-bold">
                  Vincular a Orden de Compra{' '}
                  <span className="font-normal text-[var(--text-sec)]">(Opcional)</span>
                </label>
                {loadingPurchasesForLink ? (
                  <p className="text-xs text-[var(--text-sec)] animate-pulse">Cargando órdenes...</p>
                ) : (
                  <Select
                    value={newGeneralEntry.purchaseId?.toString() || 'none'}
                    onValueChange={v => setNewGeneralEntry({ ...newGeneralEntry, purchaseId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="bg-[var(--card)]">
                      <SelectValue placeholder="Seleccionar orden (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vincular por ahora</SelectItem>
                      {supplierPurchases.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          OC-{p.id.toString().padStart(6, '0')} — {p.supplier?.name} — ${Number(p.totalAmount).toFixed(4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-[var(--text-sec)]">
                  Si el proveedor llegó sin tiempo de registrar el ingreso, puedes vincular este pago a la orden de compra y luego recibir la mercadería.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGeneralModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateGeneralEntry}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar Gasto Caja Fuerte */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Gasto de Caja Fuerte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Monto ($)</label>
              <NumberInput value={newExpense.amount} onValueChange={v => setNewExpense({...newExpense, amount: v as any})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">
                Descripción <span className="text-rose-500">*</span>
              </label>
              <Input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRegisterExpense}>Registrar Gasto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Caja Fuerte */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Caja Fuerte</DialogTitle>
            <DialogDescription>Establece los límites iniciales del fondo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Monto Máximo (Fondo) ($)</label>
              <NumberInput value={setupForm.maxBalance} onValueChange={v => setSetupForm({...setupForm, maxBalance: v as any})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Monto Mínimo (Alerta) ($)</label>
              <NumberInput value={setupForm.minBalance} onValueChange={v => setSetupForm({...setupForm, minBalance: v as any})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupModal(false)}>Cancelar</Button>
            <Button onClick={handleSetupPettyCash}>Configurar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solicitar Reposición */}
      <Dialog open={showReplenishModal} onOpenChange={setShowReplenishModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Reposición</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Monto Solicitado ($)</label>
              <NumberInput value={replenishForm.amount} onValueChange={v => setReplenishForm({...replenishForm, amount: v as any})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Justificación</label>
              <Input value={replenishForm.reason} onChange={e => setReplenishForm({...replenishForm, reason: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplenishModal(false)}>Cancelar</Button>
            <Button onClick={handleRequestReplenish}>Enviar Solicitud</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADMIN CLOSE SHIFT MODAL */}
      <Dialog open={adminCloseShiftId !== null} onOpenChange={(open) => {
        if (!open) {
          setAdminCloseShiftId(null);
          setAdminCloseTotals(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl bg-[var(--card)] border-[var(--border)] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Aprobar Cierre de Caja</DialogTitle>
            <DialogDescription>
              Revisa los montos y confirma el cierre físico del turno del cajero.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Totals and Inputs */}
              <div className="flex flex-col gap-4">
                {adminCloseTotals && (
                  <div className="p-4 bg-[var(--bg)] border rounded-xl space-y-3">
                    <h4 className="font-bold text-sm text-[var(--text-main)] mb-2 border-b border-[var(--border)] pb-2">Valores del Sistema</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-sec)]">Efectivo Esperado:</span>
                      <span className="font-bold">${Number(adminCloseTotals.expectedAmount).toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-sec)]">Tarjeta Esperada:</span>
                      <span className="font-bold">${Number(adminCloseTotals.expectedTarjeta).toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-sec)]">Transferencia Esperada:</span>
                      <span className="font-bold">${Number(adminCloseTotals.expectedTransferencia).toFixed(4)}</span>
                    </div>
                  </div>
                )}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl space-y-4">
                  <div>
                    <label className="text-sm font-bold text-blue-900 dark:text-blue-300">Efectivo Real Contado por ti ($)</label>
                    <p className="text-xs text-[var(--text-sec)] mb-2">Ingresa el total físico de efectivo entregado.</p>
                    <NumberInput
                      value={adminCloseCash}
                      onValueChange={(v) => setAdminCloseCash(v as number)}
                      className="bg-white dark:bg-black"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-blue-900 dark:text-blue-300">Notas Adicionales (Opcional)</label>
                    <Input
                      value={adminCloseNotes}
                      onChange={(e) => setAdminCloseNotes(e.target.value)}
                      placeholder="Escribe alguna observación sobre la diferencia..."
                      className="bg-white dark:bg-black"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Cashier's reported breakdown */}
              <div className="flex flex-col gap-4">
                {adminCloseTotals?.closingBreakdown ? (
                  <div className="p-4 bg-[var(--bg)] border rounded-xl h-full flex flex-col">
                    <h4 className="font-bold text-sm text-[var(--text-main)] mb-2 border-b border-[var(--border)] pb-2">Desglose Reportado por el Cajero</h4>
                    <p className="text-xs text-[var(--text-sec)] mb-4">
                      Total reportado: <span className="font-bold text-emerald-600 text-sm">${Number(adminCloseTotals.countedAmount).toFixed(4)}</span>
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs flex-1">
                      <div>
                        <span className="font-bold text-[var(--text-sec)] mb-2 block">Billetes</span>
                        <ul className="space-y-1">
                          <li className="flex justify-between"><span>$100:</span> <span>{adminCloseTotals.closingBreakdown.bills?.d100 || 0}</span></li>
                          <li className="flex justify-between"><span>$50:</span> <span>{adminCloseTotals.closingBreakdown.bills?.d50 || 0}</span></li>
                          <li className="flex justify-between"><span>$20:</span> <span>{adminCloseTotals.closingBreakdown.bills?.d20 || 0}</span></li>
                          <li className="flex justify-between"><span>$10:</span> <span>{adminCloseTotals.closingBreakdown.bills?.d10 || 0}</span></li>
                          <li className="flex justify-between"><span>$5:</span> <span>{adminCloseTotals.closingBreakdown.bills?.d5 || 0}</span></li>
                          <li className="flex justify-between"><span>$1:</span> <span>{adminCloseTotals.closingBreakdown.bills?.d1 || 0}</span></li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-[var(--text-sec)] mb-2 block">Monedas</span>
                        <ul className="space-y-1">
                          <li className="flex justify-between"><span>$0.25:</span> <span>{adminCloseTotals.closingBreakdown.coins?.c25 || 0}</span></li>
                          <li className="flex justify-between"><span>$0.10:</span> <span>{adminCloseTotals.closingBreakdown.coins?.c10 || 0}</span></li>
                          <li className="flex justify-between"><span>$0.05:</span> <span>{adminCloseTotals.closingBreakdown.coins?.c5 || 0}</span></li>
                          <li className="flex justify-between"><span>$0.01:</span> <span>{adminCloseTotals.closingBreakdown.coins?.c1 || 0}</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[var(--bg)] border rounded-xl h-full flex flex-col justify-center items-center text-center opacity-70">
                    <p className="text-sm font-bold text-[var(--text-sec)]">Sin desglose reportado</p>
                    <p className="text-xs text-[var(--text-sec)] mt-1">El cajero no envió detalle de billetes o monedas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t border-[var(--border)] shrink-0">
            <Button variant="outline" onClick={() => setAdminCloseShiftId(null)}>Cancelar</Button>
            <Button 
              className="bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20" 
              onClick={handleConfirmAdminCloseShift}
              disabled={adminCloseLoading || adminCloseCash === ''}
            >
              {adminCloseLoading ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
