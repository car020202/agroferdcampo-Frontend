import { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, TrendingUp, Search, 
  ArrowDownCircle, ArrowUpCircle, Filter, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { 
  generalCashService, GeneralCashEntry, GeneralCashSummary 
} from '../services/general-cash.service';
import { 
  pettyCashService, PettyCashStatus, PettyCashMovement, PettyCashReplenishment 
} from '../services/petty-cash.service';
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
    { label: 'Reposición Caja Chica', value: 'REPOSICION_CAJA_CHICA' },
    { label: 'Otro', value: 'OTRO' }
  ]},
  { id: 'date', label: 'Rango de Fechas', type: 'date_range' }
];

export function Finance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'petty'>('general');

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

  useEffect(() => {
    if (activeTab === 'general') {
      fetchGeneralCash();
    } else {
      fetchPettyCash();
    }
  }, [activeTab, generalFilters.page, generalFilters.category, typeFilter, categoryFilter, startDateFilter, endDateFilter]);

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
    if (!newGeneralEntry.description) {
      toast.error('La descripción es requerida'); return;
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

  const isPettyLow = pettyStatus ? pettyStatus.currentBalance <= pettyStatus.minBalance : false;

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
          Caja Chica
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
                ${generalSummary?.balance?.toFixed(2) || '0.00'}
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
                ${generalSummary?.totalIngresos?.toFixed(2) || '0.00'}
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
                ${generalSummary?.totalEgresos?.toFixed(2) || '0.00'}
              </p>
            </Card>
          </div>

          {/* FILTROS Y ACCIONES */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="flex-1 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
              <SmartFilter config={financeFilters} />
            </div>
            <Button onClick={() => setShowAddGeneralModal(true)} className="font-bold whitespace-nowrap h-fit">
              Registrar Movimiento
            </Button>
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
                      <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={m.type === 'INGRESO' ? 'success' : 'destructive'}>{m.type}</Badge>
                      </TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>
                        <p className="font-medium text-[var(--text-main)]">{m.description}</p>
                        {m.reference && <p className="text-xs text-[var(--text-sec)]">Ref: {m.reference}</p>}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'INGRESO' ? '+' : '-'}${Number(m.amount).toFixed(2)}
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
          {!pettyStatus ? (
            <Card className="p-8 text-center flex flex-col items-center gap-4 bg-[var(--card)] border-[var(--border)] shadow-sm">
              <Wallet size={48} className="text-[var(--text-sec)] opacity-50" />
              <div>
                <h3 className="text-xl font-bold text-[var(--text-main)]">Caja Chica no configurada</h3>
                <p className="text-[var(--text-sec)]">El fondo de caja chica de esta sucursal no ha sido inicializado.</p>
              </div>
              <Button onClick={() => setShowSetupModal(true)}>Configurar Caja Chica</Button>
            </Card>
          ) : (
            <>
              {/* STATS PETTY */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
                  <h3 className="text-sm font-bold text-[var(--text-sec)] mb-2">Saldo Actual</h3>
                  <p className={`text-3xl font-black ${isPettyLow ? 'text-amber-500' : 'text-[var(--primary)]'}`}>
                    ${pettyStatus.currentBalance.toFixed(2)}
                  </p>
                  {isPettyLow && <p className="text-xs text-amber-500 font-bold mt-1">Saldo bajo mínimo</p>}
                </Card>
                <Card className="p-6 bg-[var(--card)] border-[var(--border)] shadow-sm">
                  <h3 className="text-sm font-bold text-[var(--text-sec)] mb-2">Límite Máximo</h3>
                  <p className="text-3xl font-black text-[var(--text-main)]">${pettyStatus.maxBalance.toFixed(2)}</p>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setShowExpenseModal(true)} variant="destructive" className="font-bold">
                  Registrar Gasto (Egreso)
                </Button>
                {isPettyLow && (
                  <Button onClick={() => setShowReplenishModal(true)} variant="outline" className="border-amber-500 text-amber-600">
                    Solicitar Reposición
                  </Button>
                )}
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
                              {m.type === 'INGRESO' ? '+' : '-'}${Number(m.amount).toFixed(2)}
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
                              <p className="font-bold">Monto solicitado: ${Number(r.amount).toFixed(2)}</p>
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
                    <SelectItem value="REPOSICION_CAJA_CHICA">Reposición Caja Chica</SelectItem>
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
              <label className="text-sm font-bold">Descripción</label>
              <Input value={newGeneralEntry.description} onChange={e => setNewGeneralEntry({...newGeneralEntry, description: e.target.value})} placeholder="Ej. Pago de luz" />
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
                          OC-{p.id.toString().padStart(6, '0')} — {p.supplier?.name} — ${Number(p.totalAmount).toFixed(2)}
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

      {/* Registrar Gasto Caja Chica */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Gasto de Caja Chica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Monto ($)</label>
              <NumberInput value={newExpense.amount} onValueChange={v => setNewExpense({...newExpense, amount: v as any})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Descripción</label>
              <Input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRegisterExpense}>Registrar Gasto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Caja Chica */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Caja Chica</DialogTitle>
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

    </div>
  );
}
