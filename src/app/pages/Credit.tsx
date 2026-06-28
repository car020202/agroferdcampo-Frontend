import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FileText, Filter, CheckCircle2,
  CreditCard, DollarSign, AlertCircle, Plus, Eye, History, Users as UsersIcon, RefreshCcw, Trash2, Printer,
  Hash, User, Package, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router';

import { creditService, CreditSale, CreditSummary, CreditPayment, RegisterPaymentDto, GroupedCreditCustomer } from '../services/credit.service';
import { getSaleDetail } from '../services/sales.service';
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
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';
import { cn } from '../components/ui/utils';

const creditFilters: FilterConfig[] = [
  { id: 'search', label: 'Buscar cliente...', type: 'text', placeholder: 'Nombre del cliente...' },
  { id: 'status', label: 'Estado', type: 'category', options: [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Vencido', value: 'VENCIDO' },
    { label: 'Pagado', value: 'PAGADO' }
  ]}
];

let isAbonoSubmittingGlobal = false;

export function Credit() {
  const isSubmittingRef = useRef(false);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [groupedCredits, setGroupedCredits] = useState<GroupedCreditCustomer[]>([]);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const searchFilter = searchParams.get('search') || '';
  
  // Modals
  const [selectedGroup, setSelectedGroup] = useState<GroupedCreditCustomer | null>(null);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<CreditSale | null>(null);
  
  // Specific Sale Detail
  const [specificDetailModalOpen, setSpecificDetailModalOpen] = useState(false);
  const [selectedSpecificCredit, setSelectedSpecificCredit] = useState<CreditSale | null>(null);
  const [specificPayments, setSpecificPayments] = useState<CreditPayment[]>([]);
  const [specificPaymentsPage, setSpecificPaymentsPage] = useState(1);
  const [specificDetailTab, setSpecificDetailTab] = useState<'abonos' | 'factura'>('abonos');

  // Inner Modal Filters
  const [innerStatusFilter, setInnerStatusFilter] = useState('all');
  const [innerBuyDateStart, setInnerBuyDateStart] = useState('');
  const [innerBuyDateEnd, setInnerBuyDateEnd] = useState('');
  const [innerDueDateStart, setInnerDueDateStart] = useState('');
  const [innerDueDateEnd, setInnerDueDateEnd] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Payment Detail Modal
  const [paymentDetailModalOpen, setPaymentDetailModalOpen] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<CreditPayment | null>(null);
  
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
  }, [pagination.page, statusFilter, searchFilter]);

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
      if (searchFilter) filters.search = searchFilter;

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

  const [specificSaleDetail, setSpecificSaleDetail] = useState<any>(null);

  const handleOpenSpecificDetail = async (sale: CreditSale) => {
    try {
      const [creditPayments, saleDetail] = await Promise.all([
        creditService.getPayments(sale.id),
        getSaleDetail(sale.saleId)
      ]);
      setSelectedSpecificCredit(sale);
      setSpecificPayments(Array.isArray(creditPayments) ? creditPayments : []);
      setSpecificSaleDetail(saleDetail);
      setSpecificPaymentsPage(1);
      setSpecificDetailTab('abonos');
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

  const handleOpenPaymentDetail = (payment: CreditPayment) => {
    setSelectedPaymentDetail(payment);
    setPaymentDetailModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedCreditForPayment) return;
    if (isAbonoSubmittingGlobal) return;
    
    const amount = Number(paymentForm.amount);
    const maxAmount = Number(selectedCreditForPayment.remainingAmount) || 0;
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`El monto debe ser mayor a 0 y no puede exceder $${maxAmount.toFixed(4)}`);
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

  const printPaymentReceipt = (payment: CreditPayment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('El navegador bloqueó la ventana emergente de impresión.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Abono #${payment.id}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            margin: 0; 
            padding: 10px; 
            width: 80mm; 
            color: #000;
            font-size: 12px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          h2 { margin: 0 0 5px 0; font-size: 16px; }
          p { margin: 0 0 5px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>AGROFERR D'CAMPO</h2>
          <p>San Lorenzo, Ahuachapán,<br>El Salvador, 01009</p>
          <p>Tel: 7216 6748</p>
          <p>agroferreteriadcampo@gmail.com</p>
          <div class="divider"></div>
          <p class="bold" style="font-size: 14px;">COMPROBANTE DE ABONO</p>
        </div>
        <div class="divider"></div>
        
        <div class="row">
          <span>N° Recibo:</span>
          <span>${payment.id.toString().padStart(6, '0')}</span>
        </div>
        <div class="row">
          <span>Fecha:</span>
          <span>${new Date(payment.createdAt).toLocaleString('es-ES')}</span>
        </div>
        <div class="row">
          <span>Cajero:</span>
          <span>${payment.user?.fullName || 'Sistema'}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row bold">
          <span>MÉTODO DE PAGO</span>
        </div>
        <div class="row">
          <span>${payment.paymentMethod}</span>
          <span>$${Number(payment.amount).toFixed(4)}</span>
        </div>
        ${payment.reference ? `<div class="row"><span>Referencia:</span><span>${payment.reference}</span></div>` : ''}
        
        <div class="divider"></div>
        
        <div class="row bold" style="font-size: 14px; margin-top: 10px;">
          <span>TOTAL ABONADO:</span>
          <span>$${Number(payment.amount).toFixed(4)}</span>
        </div>
        
        <div class="divider"></div>
        <div class="center" style="margin-top: 20px;">
          <p style="font-size: 11px; margin-bottom: 8px;">
            * Este documento NO es una factura válida. 
            Es únicamente un comprobante de abono a cuenta. *
          </p>
          <p class="bold">¡Gracias por su pago!</p>
          <p>*** COPIA CLIENTE ***</p>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
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
          { label: 'Cartera Total', value: summary ? `$${Number(summary.totalCxC).toFixed(4)}` : '$0.00', status: 'info' },
          { label: 'Saldo Vencido', value: summary ? `$${Number(summary.totalVencido).toFixed(4)}` : '$0.00', status: 'danger' },
          { label: 'Por Vencer (7d)', value: summary ? `$${Number(summary.totalPorVencer).toFixed(4)}` : '$0.00', status: 'warning' },
          { label: 'Clientes Activos', value: summary ? summary.totalClientes : 0, status: 'success' },
        ]}
      />

      <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <SmartFilter config={creditFilters} />
      </div>

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
                      ${Number(group.totalDebt).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      ${Number(group.totalPaid).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--primary)]">
                      ${Number(group.totalRemaining).toFixed(4)}
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
                    <p className="text-lg font-bold">${Number(selectedGroup.totalDebt).toFixed(4)}</p>
                  </div>
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-4 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Abonado</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">${Number(selectedGroup.totalPaid).toFixed(4)}</p>
                  </div>
                  <div className="bg-[var(--primary)]/10 p-4 rounded-xl border border-[var(--primary)]/20">
                    <p className="text-xs font-bold text-[var(--primary)] uppercase">Saldo Pendiente</p>
                    <p className="text-lg font-black text-[var(--primary)]">${Number(selectedGroup.totalRemaining).toFixed(4)}</p>
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
                                <TableCell className="text-right">${Number(s.originalAmount).toFixed(4)}</TableCell>
                                <TableCell className="text-right text-emerald-600">${Number(s.paidAmount).toFixed(4)}</TableCell>
                                <TableCell className="text-right font-bold text-[var(--primary)]">${Number(s.remainingAmount).toFixed(4)}</TableCell>
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
              {selectedGroup?.customer?.name ?? `Cliente #${selectedCreditForPayment?.customerId}`} — Venta #{selectedCreditForPayment?.saleId} — Saldo: ${remaining.toFixed(4)}
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

      {/* DETALLE DE FACTURA ESPECÍFICA (HISTORIAL DE ABONOS Y DOCUMENTOS) */}
      <Dialog open={specificDetailModalOpen} onOpenChange={setSpecificDetailModalOpen}>
        <DialogContent className="sm:max-w-5xl w-full flex flex-col p-0 max-h-[90vh]">
          {selectedSpecificCredit && (
            <>
              <DialogHeader className="p-6 pr-16 border-b shrink-0 bg-[var(--bg)]/50">
                <DialogTitle className="flex items-center justify-between">
                  <span>Venta #{selectedSpecificCredit.saleId}</span>
                  {getStatusBadge(selectedSpecificCredit.status)}
                </DialogTitle>
                <DialogDescription>
                  Historial de abonos y documentos requeridos para esta compra.
                </DialogDescription>
              </DialogHeader>

              <div className="flex px-6 pt-2 gap-4 border-b shrink-0 bg-[var(--bg)]/30">
                <button
                  className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    specificDetailTab === 'abonos'
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--text-sec)] hover:text-[var(--text-main)]'
                  }`}
                  onClick={() => setSpecificDetailTab('abonos')}
                >
                  <History size={16} />
                  Historial de Abonos
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    specificDetailTab === 'factura'
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--text-sec)] hover:text-[var(--text-main)]'
                  }`}
                  onClick={() => setSpecificDetailTab('factura')}
                >
                  <FileText size={16} />
                  Detalle de Factura
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
                {specificDetailTab === 'abonos' ? (
                  <div className="border rounded-xl overflow-hidden shadow-sm bg-[var(--card)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Registrado por</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-center w-[80px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {specificPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
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
                                ${Number(p.amount).toFixed(4)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenPaymentDetail(p)} className="text-[var(--primary)] hover:bg-[var(--primary)]/10" title="Ver Detalle de Abono">
                                  <FileText size={16} />
                                </Button>
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
                ) : (
                  <div className="space-y-8">
                  {/* ESTADO BANNER */}
                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={specificSaleDetail?.dteResponse?.estado === 'PROCESADO' ? "text-emerald-500" : "text-[var(--text-sec)]"} size={24} />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Estado en Hacienda</p>
                        <p className={cn("text-sm font-black uppercase", specificSaleDetail?.dteResponse?.estado === 'PROCESADO' ? "text-emerald-600" : "text-[var(--text-main)]")}>
                          {specificSaleDetail?.dteResponse?.estado || 'NO ENVIADO'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right mt-4 sm:mt-0">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {specificSaleDetail?.createdAt ? new Date(specificSaleDetail.createdAt).toLocaleString('es-ES') : ''}
                      </p>
                      <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Fecha Procesamiento</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* IDENTIFICACION */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                        <Hash size={16} className="text-[var(--text-sec)]" />
                        <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">Identificación</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Número de Control</p>
                          <div className="bg-[var(--bg)] px-3 py-2 rounded-md border border-[var(--border)] font-mono text-sm text-[var(--text-main)]">
                            {specificSaleDetail?.dteResponse?.numeroControl || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Código de Generación</p>
                          <div className="bg-[var(--bg)] px-3 py-2 rounded-md border border-[var(--border)] font-mono text-sm text-amber-600 font-bold break-all">
                            {specificSaleDetail?.dteResponse?.codigoGeneracion || 'N/A'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Serie / POS</p>
                            <p className="font-bold text-[var(--text-main)] uppercase">{specificSaleDetail?.dteResponse?.serie || 'P001'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Ambiente</p>
                            <p className="font-bold text-[var(--text-main)] uppercase">{specificSaleDetail?.dteResponse?.ambiente || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RECEPTOR */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                        <User size={16} className="text-[var(--text-sec)]" />
                        <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">Receptor / Cliente</h3>
                      </div>
                      
                      <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4 space-y-4">
                        <div>
                          <p className="font-bold text-[var(--text-main)] text-base">{specificSaleDetail?.customer?.name || 'Consumidor Final'}</p>
                          <p className="text-sm text-[var(--text-sec)]">{specificSaleDetail?.customer?.email || 'Sin correo'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Documento</p>
                            <p className="font-medium text-[var(--text-main)] text-sm">{specificSaleDetail?.customer?.nit || specificSaleDetail?.customer?.documentNumber || 'S/N'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">NRC</p>
                            <p className="font-medium text-[var(--text-main)] text-sm">{specificSaleDetail?.customer?.customerType === 'CONTRIBUYENTE' ? 'S/N' : 'S/N'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PRODUCTOS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                      <Package size={16} className="text-[var(--text-sec)]" />
                      <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">Detalle de Productos / Servicios</h3>
                    </div>
                    
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-[var(--border)] hover:bg-transparent">
                            <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)]">Cant</TableHead>
                            <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)]">Descripción</TableHead>
                            <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)] text-right">P. Unit</TableHead>
                            <TableHead className="text-[10px] font-black tracking-widest uppercase text-[var(--text-sec)] text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {specificSaleDetail?.items?.map((item: any) => (
                            <TableRow key={item.id} className="border-b border-[var(--border)]/50 hover:bg-transparent">
                              <TableCell className="font-bold text-[var(--text-main)]">{item.quantity}</TableCell>
                              <TableCell>
                                <p className="font-bold text-[var(--text-main)] uppercase">{item.product?.name}</p>
                                <p className="text-[10px] text-[var(--text-sec)] uppercase">Cód: {item.product?.id}</p>
                              </TableCell>
                              <TableCell className="text-right text-[var(--text-sec)] font-medium">${Number(item.unitPrice).toFixed(4)}</TableCell>
                              <TableCell className="text-right font-black text-amber-500">${Number(item.totalPrice).toFixed(4)}</TableCell>
                            </TableRow>
                          ))}
                          {!specificSaleDetail?.items?.length && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                No hay productos en esta factura.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <div className="p-4 border-t border-[var(--border)] flex justify-end bg-[var(--bg)]/50">
                        <div className="flex items-center gap-8">
                          <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-widest">Total a Pagar</p>
                          <p className="text-xl font-black text-amber-500">${Number(specificSaleDetail?.totalAmount || 0).toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* FOOTER */}
                  <div className="flex items-center justify-between pt-4 pb-4">
                    <div className="flex items-center gap-2 text-[var(--text-sec)]">
                      <Building2 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Emisor: Agroferr D'Campo</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">MH-API-V2 / DTE-01</span>
                  </div>
                </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DETALLE DE ABONO (TIPO FACTURA) */}
      <Dialog open={paymentDetailModalOpen} onOpenChange={setPaymentDetailModalOpen}>
        <DialogContent 
          className="flex flex-col p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]"
          style={{ maxWidth: '600px', width: '90vw', maxHeight: '90vh' }}
        >
          {selectedPaymentDetail && (
            <>
              <div className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50 relative">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                      Detalle de Abono
                    </DialogTitle>
                    <DialogDescription className="text-sm font-mono text-[var(--text-sec)]">
                      COMPROBANTE #{selectedPaymentDetail.id.toString().padStart(6, '0')}
                    </DialogDescription>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 p-6">
                <div className="space-y-8">
                  {/* ESTADO BANNER */}
                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-500" size={24} />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Estado del Abono</p>
                        <p className="text-sm font-black uppercase text-emerald-600">
                          PROCESADO
                        </p>
                      </div>
                    </div>
                    <div className="text-right mt-4 sm:mt-0">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {new Date(selectedPaymentDetail.createdAt).toLocaleString('es-ES')}
                      </p>
                      <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Fecha Registro</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {/* DATOS DEL PAGO */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                        <DollarSign size={16} className="text-[var(--text-sec)]" />
                        <h3 className="text-xs font-black text-[var(--text-sec)] uppercase tracking-widest">Información del Pago</h3>
                      </div>
                      
                      <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Método de Pago</p>
                            <p className="font-bold text-[var(--text-main)] uppercase">{selectedPaymentDetail.paymentMethod}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Referencia</p>
                            <p className="font-medium text-[var(--text-main)] text-sm">{selectedPaymentDetail.reference || 'S/N'}</p>
                          </div>
                        </div>
                        <div className="border-t border-[var(--border)] pt-4">
                          <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Notas / Observaciones</p>
                          <p className="font-medium text-[var(--text-main)] text-sm">{selectedPaymentDetail.notes || 'Ninguna'}</p>
                        </div>
                        <div className="border-t border-[var(--border)] pt-4">
                          <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Registrado Por</p>
                          <p className="font-medium text-[var(--text-main)] text-sm">{selectedPaymentDetail.user?.fullName || 'Sistema'}</p>
                        </div>
                        <div className="border-t border-[var(--border)] pt-4 flex justify-between items-center">
                          <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-widest">Total Abonado</p>
                          <p className="text-xl font-black text-emerald-600">${Number(selectedPaymentDetail.amount).toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-between items-center gap-4">
                <Button 
                  onClick={() => printPaymentReceipt(selectedPaymentDetail)} 
                  variant="outline" 
                  className="font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                >
                  <Printer size={16} className="mr-2" /> IMPRIMIR RECIBO
                </Button>
                <Button onClick={() => setPaymentDetailModalOpen(false)} variant="outline" className="font-bold px-8">
                  CERRAR DETALLE
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
