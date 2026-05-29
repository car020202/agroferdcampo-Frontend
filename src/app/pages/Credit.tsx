import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FileText, Filter,
  CreditCard, DollarSign, AlertCircle, Plus, Eye, History, Users as UsersIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { creditService, CreditSale, CreditSummary, CreditPayment, RegisterPaymentDto, GroupedCreditCustomer } from '../services/credit.service';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { NumberInput } from '../components/ui/number-input';
import { SemaphoreBanner } from '../components/ui/semaphore-banner';

let isAbonoSubmittingGlobal = false;

export function Credit() {
  const isSubmittingRef = useRef(false);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [groupedCredits, setGroupedCredits] = useState<GroupedCreditCustomer[]>([]);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals
  const [selectedGroup, setSelectedGroup] = useState<GroupedCreditCustomer | null>(null);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<CreditSale | null>(null);
  
  // Specific Sale Detail
  const [specificDetailModalOpen, setSpecificDetailModalOpen] = useState(false);
  const [selectedSpecificCredit, setSelectedSpecificCredit] = useState<CreditSale | null>(null);
  const [specificPayments, setSpecificPayments] = useState<CreditPayment[]>([]);
  const [specificPaymentsPage, setSpecificPaymentsPage] = useState(1);

  // Inner Modal Filters
  const [innerStatusFilter, setInnerStatusFilter] = useState('all');
  const [innerBuyDateStart, setInnerBuyDateStart] = useState('');
  const [innerBuyDateEnd, setInnerBuyDateEnd] = useState('');
  const [innerDueDateStart, setInnerDueDateStart] = useState('');
  const [innerDueDateEnd, setInnerDueDateEnd] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Payment Form
  const [paymentForm, setPaymentForm] = useState<RegisterPaymentDto>({
    amount: 0,
    paymentMethod: 'EFECTIVO',
    reference: '',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCredits();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter]);

  const fetchSummary = async () => {
    try {
      const res = await creditService.getSummary();
      setSummary(res);
    } catch (e) {
      console.error('Error fetching summary', e);
    }
  };

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;

      const res = await creditService.getGroupedCredits(filters);
      setGroupedCredits(res.data || []);
      setPagination({
        page: res.page || 1,
        limit: res.limit || 20,
        total: res.total || 0,
        totalPages: res.totalPages || 1
      });
    } catch (e) {
      toast.error('Error al cargar cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (group: GroupedCreditCustomer) => {
    setSelectedGroup(group);
    setInnerStatusFilter('all');
    setInnerBuyDateStart('');
    setInnerBuyDateEnd('');
    setInnerDueDateStart('');
    setInnerDueDateEnd('');
    setDetailModalOpen(true);
  };

  const handleOpenSpecificDetail = async (sale: CreditSale) => {
    try {
      const creditPayments = await creditService.getPayments(sale.id);
      setSelectedSpecificCredit(sale);
      setSpecificPayments(Array.isArray(creditPayments) ? creditPayments : []);
      setSpecificPaymentsPage(1);
      setSpecificDetailModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalle del crédito');
    }
  };

  const handleOpenPayment = (credit: CreditSale) => {
    const remaining = Number(credit.remainingAmount) || 0;
    setSelectedCreditForPayment(credit);
    setPaymentForm({
      amount: remaining,
      paymentMethod: 'EFECTIVO',
      reference: '',
      notes: ''
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedCreditForPayment) return;
    if (isAbonoSubmittingGlobal) return;
    
    const amount = Number(paymentForm.amount);
    const maxAmount = Number(selectedCreditForPayment.remainingAmount) || 0;
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`El monto debe ser mayor a 0 y no puede exceder $${maxAmount.toFixed(2)}`);
      return;
    }
    
    // Bloquear el botón a nivel DOM ANTES de cualquier código asíncrono
    isAbonoSubmittingGlobal = true;
    isSubmittingRef.current = true;
    if (submitBtnRef.current) {
      submitBtnRef.current.disabled = true;
      submitBtnRef.current.style.pointerEvents = 'none';
      submitBtnRef.current.style.opacity = '0.6';
    }
    
    setSavingPayment(true);
    try {
      await creditService.registerPayment(selectedCreditForPayment.id, {
        ...paymentForm,
        amount,
      });
      toast.success('Abono registrado correctamente');
      setPaymentModalOpen(false);
      
      // Update selectedGroup dynamically to reflect new balances without closing modal
      if (selectedGroup) {
        const updatedSales = selectedGroup.creditSales.map(s => {
          if (s.id === selectedCreditForPayment.id) {
            const paid = Number(s.paidAmount) + amount;
            const remain = Number(s.remainingAmount) - amount;
            return {
              ...s,
              paidAmount: paid,
              remainingAmount: remain,
              status: remain <= 0 ? 'PAGADO' : s.status
            };
          }
          return s;
        }) as CreditSale[];
        
        setSelectedGroup({
          ...selectedGroup,
          creditSales: updatedSales,
          totalPaid: selectedGroup.totalPaid + amount,
          totalRemaining: selectedGroup.totalRemaining - amount,
        });
      }

      fetchSummary();
      fetchCredits();
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar abono');
      // Si falla, rehabilitar el botón para que el cajero corrija y reintente
      if (submitBtnRef.current) {
        submitBtnRef.current.disabled = false;
        submitBtnRef.current.style.pointerEvents = '';
        submitBtnRef.current.style.opacity = '';
      }
    } finally {
      // Siempre liberar el lock al terminar (éxito o error)
      isAbonoSubmittingGlobal = false;
      isSubmittingRef.current = false;
      setSavingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDIENTE': return <Badge variant="warning">Pendiente</Badge>;
      case 'VENCIDO': return <Badge variant="destructive">Vencido</Badge>;
      case 'PAGADO': return <Badge variant="success">Pagado</Badge>;
      case 'ANULADO': return <Badge variant="outline">Anulado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const remaining = Number(selectedCreditForPayment?.remainingAmount) || 0;

  const filteredInnerSales = selectedGroup?.creditSales.filter(s => {
    if (innerStatusFilter !== 'all' && s.status !== innerStatusFilter) return false;
    
    if (innerBuyDateStart || innerBuyDateEnd) {
      const buyDate = new Date(s.createdAt);
      if (innerBuyDateStart && buyDate < new Date(innerBuyDateStart)) return false;
      if (innerBuyDateEnd && buyDate > new Date(new Date(innerBuyDateEnd).setHours(23, 59, 59))) return false;
    }
    
    if (innerDueDateStart || innerDueDateEnd) {
      const dueDate = s.dueDate ? new Date(s.dueDate) : new Date(new Date(s.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      if (innerDueDateStart && dueDate < new Date(innerDueDateStart)) return false;
      if (innerDueDateEnd && dueDate > new Date(new Date(innerDueDateEnd).setHours(23, 59, 59))) return false;
    }
    return true;
  }) || [];

  const itemsPerPage = 10;
  const specificPaymentsTotalPages = Math.ceil(specificPayments.length / itemsPerPage);
  const currentSpecificPayments = specificPayments.slice(
    (specificPaymentsPage - 1) * itemsPerPage,
    specificPaymentsPage * itemsPerPage
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Cuentas por Cobrar (CxC)</h1>
          <p className="text-[var(--text-sec)]">Gestiona la cartera de créditos y abonos de clientes.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <SemaphoreBanner
        metrics={[
          { label: 'Cartera Total', value: summary ? `$${Number(summary.totalCxC).toFixed(2)}` : '$0.00', status: 'info' },
          { label: 'Saldo Vencido', value: summary ? `$${Number(summary.totalVencido).toFixed(2)}` : '$0.00', status: 'danger' },
          { label: 'Por Vencer (7d)', value: summary ? `$${Number(summary.totalPorVencer).toFixed(2)}` : '$0.00', status: 'warning' },
          { label: 'Clientes Activos', value: summary ? summary.totalClientes : 0, status: 'success' },
        ]}
      />

      <Card className="p-4 border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[var(--bg)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="PAGADO">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimiento Próximo</TableHead>
                <TableHead className="text-right">Total Original</TableHead>
                <TableHead className="text-right">Abonado</TableHead>
                <TableHead className="text-right">Saldo Restante</TableHead>
                <TableHead className="text-center">Estado General</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando cartera...
                  </TableCell>
                </TableRow>
              ) : groupedCredits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron créditos con estos filtros
                  </TableCell>
                </TableRow>
              ) : (
                groupedCredits.map(group => (
                  <TableRow key={group.customer.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell>
                      <span className="font-bold text-[var(--text-main)] block">
                        {group.customer.name}
                      </span>
                      <span className="text-xs text-[var(--text-sec)] block mt-0.5">
                        {group.creditSales.length} {group.creditSales.length === 1 ? 'compra' : 'compras'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {group.nearestDueDate ? (
                        <span className={group.status === 'VENCIDO' ? 'text-rose-500 font-bold' : ''}>
                          {new Date(group.nearestDueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[var(--text-sec)]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(group.totalDebt).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      ${Number(group.totalPaid).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--primary)]">
                      ${Number(group.totalRemaining).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(group.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(group)} className="text-[var(--primary)] hover:bg-[var(--primary)]/10">
                          <Eye size={16} className="mr-1.5" /> Ver Detalle
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/5">
            <p className="text-xs font-bold text-[var(--text-sec)]">
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" size="sm" 
                disabled={pagination.page === 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                Anterior
              </Button>
              <Button 
                variant="outline" size="sm" 
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DETALLE DEL CLIENTE Y FACTURAS */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-5xl w-full flex flex-col p-0 max-h-[90vh]">
          {selectedGroup && (
            <>
              <DialogHeader className="p-6 pr-16 border-b shrink-0 bg-[var(--bg)]/50">
                <DialogTitle className="flex items-center justify-between">
                  <span className="text-xl font-black">{selectedGroup.customer.name}</span>
                  {getStatusBadge(selectedGroup.status)}
                </DialogTitle>
                <DialogDescription>
                  Resumen de cuenta y facturas pendientes.
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[var(--bg)] p-4 rounded-xl border">
                    <p className="text-xs font-bold text-[var(--text-sec)] uppercase">Total Deuda</p>
                    <p className="text-lg font-bold">${Number(selectedGroup.totalDebt).toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-4 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Abonado</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">${Number(selectedGroup.totalPaid).toFixed(2)}</p>
                  </div>
                  <div className="bg-[var(--primary)]/10 p-4 rounded-xl border border-[var(--primary)]/20">
                    <p className="text-xs font-bold text-[var(--primary)] uppercase">Saldo Pendiente</p>
                    <p className="text-lg font-black text-[var(--primary)]">${Number(selectedGroup.totalRemaining).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><History size={18}/> Compras a Crédito</h3>
                  
                  {/* Filtros Internos */}
                  <div className="flex flex-wrap gap-3 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[var(--text-sec)]">Estado</Label>
                      <Select value={innerStatusFilter} onValueChange={setInnerStatusFilter}>
                        <SelectTrigger className="h-8 text-xs bg-[var(--card)] min-w-[120px]">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                          <SelectItem value="VENCIDO">Vencido</SelectItem>
                          <SelectItem value="PAGADO">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[var(--text-sec)]">Fecha Compra (Desde)</Label>
                      <Input type="date" className="h-8 text-xs bg-[var(--card)]" value={innerBuyDateStart} onChange={e => setInnerBuyDateStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[var(--text-sec)]">Fecha Compra (Hasta)</Label>
                      <Input type="date" className="h-8 text-xs bg-[var(--card)]" value={innerBuyDateEnd} onChange={e => setInnerBuyDateEnd(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[var(--text-sec)]">Vencimiento (Desde)</Label>
                      <Input type="date" className="h-8 text-xs bg-[var(--card)]" value={innerDueDateStart} onChange={e => setInnerDueDateStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[var(--text-sec)]">Vencimiento (Hasta)</Label>
                      <Input type="date" className="h-8 text-xs bg-[var(--card)]" value={innerDueDateEnd} onChange={e => setInnerDueDateEnd(e.target.value)} />
                    </div>
                    {(innerStatusFilter !== 'all' || innerBuyDateStart || innerBuyDateEnd || innerDueDateStart || innerDueDateEnd) && (
                      <div className="space-y-1 flex items-end">
                        <Button 
                          variant="ghost" size="sm" className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => {
                            setInnerStatusFilter('all'); setInnerBuyDateStart(''); setInnerBuyDateEnd(''); setInnerDueDateStart(''); setInnerDueDateEnd('');
                          }}
                        >
                          Limpiar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-xl overflow-hidden shadow-sm bg-[var(--card)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ref. Venta</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Abonado</TableHead>
                          <TableHead className="text-right">Restante</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInnerSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-[var(--text-sec)]">
                              No hay compras que coincidan con los filtros
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredInnerSales.map(s => {
                            const dateToUse = s.dueDate 
                              ? new Date(s.dueDate) 
                              : new Date(new Date(s.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
                            const isOverdue = dateToUse < new Date() && s.status !== 'PAGADO';
                            
                            return (
                              <TableRow key={s.id}>
                                <TableCell className="font-bold">Venta #{s.saleId}</TableCell>
                                <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className={isOverdue ? 'text-rose-500 font-bold' : ''}>
                                  {dateToUse.toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">${Number(s.originalAmount).toFixed(2)}</TableCell>
                                <TableCell className="text-right text-emerald-600">${Number(s.paidAmount).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold text-[var(--primary)]">${Number(s.remainingAmount).toFixed(2)}</TableCell>
                                <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenSpecificDetail(s)} className="text-[var(--primary)] hover:bg-[var(--primary)]/10" title="Ver Historial de Abonos">
                                      <Eye size={16} />
                                    </Button>
                                    {s.status !== 'PAGADO' && s.status !== 'ANULADO' && (
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenPayment(s)} className="text-emerald-600 hover:bg-emerald-600/10" title="Abonar">
                                        <Plus size={16} />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* REGISTRAR ABONO */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>
              {selectedGroup?.customer?.name ?? `Cliente #${selectedCreditForPayment?.customerId}`} — Venta #{selectedCreditForPayment?.saleId} — Saldo: ${remaining.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto a Abonar ($)</Label>
              <NumberInput 
                value={paymentForm.amount || 0} 
                min={0.01}
                max={remaining}
                onValueChange={(val) => setPaymentForm({...paymentForm, amount: val ?? 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(val) => setPaymentForm({...paymentForm, paymentMethod: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TARJETA">Tarjeta</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referencia (Opcional)</Label>
              <Input 
                placeholder="N° Transacción, Cheque..." 
                value={paymentForm.reference}
                onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (Opcional)</Label>
              <Input 
                placeholder="Detalles adicionales..." 
                value={paymentForm.notes}
                onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
            <Button
              ref={submitBtnRef}
              onPointerDown={() => {
                if (!isAbonoSubmittingGlobal) handlePaymentSubmit();
              }}
              disabled={savingPayment}
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              {savingPayment ? 'Registrando...' : 'Confirmar Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETALLE DE FACTURA ESPECÍFICA (HISTORIAL DE ABONOS) */}
      <Dialog open={specificDetailModalOpen} onOpenChange={setSpecificDetailModalOpen}>
        <DialogContent className="sm:max-w-3xl w-full flex flex-col p-0">
          {selectedSpecificCredit && (
            <>
              <DialogHeader className="p-6 pr-16 border-b">
                <DialogTitle className="flex items-center justify-between">
                  <span>Venta #{selectedSpecificCredit.saleId}</span>
                  {getStatusBadge(selectedSpecificCredit.status)}
                </DialogTitle>
                <DialogDescription>
                  Historial de abonos para esta compra.
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History size={18}/> Historial de Abonos</h3>
                  <div className="border rounded-xl overflow-hidden shadow-sm bg-[var(--card)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Registrado por</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {specificPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No hay abonos registrados
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentSpecificPayments.map(p => (
                            <TableRow key={p.id}>
                              <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                              <TableCell>{p.paymentMethod}</TableCell>
                              <TableCell>{p.reference || '-'}</TableCell>
                              <TableCell>{p.user?.fullName || '-'}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600">
                                ${Number(p.amount).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    {specificPaymentsTotalPages > 1 && (
                      <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/5">
                        <p className="text-xs font-bold text-[var(--text-sec)]">
                          Página {specificPaymentsPage} de {specificPaymentsTotalPages} ({specificPayments.length} abonos)
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" size="sm" 
                            disabled={specificPaymentsPage === 1}
                            onClick={() => setSpecificPaymentsPage(p => p - 1)}
                          >
                            Anterior
                          </Button>
                          <Button 
                            variant="outline" size="sm" 
                            disabled={specificPaymentsPage === specificPaymentsTotalPages}
                            onClick={() => setSpecificPaymentsPage(p => p + 1)}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
