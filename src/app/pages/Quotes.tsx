import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, Eye, CheckCircle2, AlertCircle, Calendar as CalendarIcon, RefreshCcw, Filter, X,
  Mail, UserCog, Clock, Send, Plus, Banknote, CreditCard, Smartphone, Trash2, Truck as TruckIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { quotesService, QuoteResponse } from '../services/quotes.service';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { apiRequest } from '../config/api';
import { TransportSelector, TransportData } from '../components/transport/TransportSelector';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';
import { useAuth } from '../context/AuthContext';
import { 
  Command, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem 
} from '../components/ui/command';

const quotesFilters: FilterConfig[] = [
  { id: 'search', label: 'Buscar Cotización', type: 'text', placeholder: 'N°, Cliente, Total...' },
  { id: 'status', label: 'Estado', type: 'category', options: [
    { label: 'Pendientes', value: 'PENDIENTE' },
    { label: 'Confirmadas', value: 'CONFIRMADA' },
    { label: 'Canceladas', value: 'CANCELADA' },
    { label: 'Expiradas', value: 'EXPIRADA' }
  ]},
  { id: 'date', label: 'Fecha Específica', type: 'date_range' }
];
export function Quotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const dateFilter = searchParams.get('date') || '';
  const searchTerm = searchParams.get('search') || '';

  const navigate = useNavigate();

  // Modales
  const [selectedQuote, setSelectedQuote] = useState<QuoteResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [quoteToConfirm, setQuoteToConfirm] = useState<QuoteResponse | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('EFECTIVO');
  const [transportData, setTransportData] = useState<TransportData | null>(null);

  // --- Estados para Crear Cotización ---
  const [createQuoteModalOpen, setCreateQuoteModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({
    customerId: undefined as number | undefined,
    validDays: 7,
    notes: '',
    items: [] as { productId: number; productName: string; quantity: number; unitPrice: number }[],
    requiresTransport: false,
    vehicleId: undefined as number | undefined,
    deliveryAddress: '',
  });
  const [productSearchCreate, setProductSearchCreate] = useState('');
  const [productResultsCreate, setProductResultsCreate] = useState<any[]>([]);
  const [customerSearchCreate, setCustomerSearchCreate] = useState('');
  const [customerResultsCreate, setCustomerResultsCreate] = useState<any[]>([]);
  const [selectedCustomerCreate, setSelectedCustomerCreate] = useState<any>(null);
  const [savingQuote, setSavingQuote] = useState(false);

  // --- Estados para Modales Extras de la Guía ---
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteResponse | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailQuote, setEmailQuote] = useState<QuoteResponse | null>(null);
  const [destinationEmail, setDestinationEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, dateFilter, searchTerm]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (dateFilter) filters.startDate = dateFilter;
      if (searchTerm) filters.search = searchTerm;

      const res = await quotesService.getQuotes(filters);
      setQuotes(res.data);
      setPagination({
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages
      });
    } catch (error) {
      toast.error('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };



  const handleOpenDetail = async (quote: QuoteResponse) => {
    try {
      const fullQuote = await quotesService.getQuoteDetail(quote.id);
      setSelectedQuote(fullQuote);
      setDetailModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalles de la cotización');
    }
  };

  const handleOpenConfirmModal = (quote: QuoteResponse) => {
    setQuoteToConfirm(quote);
    setSelectedPaymentMethod('EFECTIVO');
    setTransportData(null);
    setPaymentModalOpen(true);
  };

  const handleConfirmQuote = async () => {
    if (!quoteToConfirm) return;
    setConfirmingId(quoteToConfirm.id);
    try {
      await quotesService.confirmQuote(quoteToConfirm.id, {
        paymentMethod: selectedPaymentMethod,
        ...(transportData && transportData.requiresTransport ? {
          requiresTransport: true,
          vehicleId: transportData.vehicleId,
          driverId: transportData.driverId,
          deliveryAddress: transportData.deliveryAddress,
          scheduledAt: transportData.scheduledDeliveryAt,
        } : {})
      });
      toast.success('Cotización confirmada y venta generada');
      fetchQuotes();
      setPaymentModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al confirmar la cotización');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelQuote = async (quote: QuoteResponse) => {
    setCancelingId(quote.id);
    try {
      await quotesService.cancelQuote(quote.id);
      toast.success('Cotización cancelada');
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar la cotización');
    } finally {
      setCancelingId(null);
    }
  };

  useEffect(() => {
    if (productSearchCreate.length > 2) {
      const delay = setTimeout(async () => {
        try {
          const res = await apiRequest<any>(`/catalog/products/search?q=${encodeURIComponent(productSearchCreate)}&limit=10`);
          setProductResultsCreate(res.data || res || []);
        } catch (e) { console.error(e); }
      }, 400);
      return () => clearTimeout(delay);
    } else {
      setProductResultsCreate([]);
    }
  }, [productSearchCreate]);

  const handleCreateQuote = async () => {
    if (!newQuote.items.length) {
      toast.error('Agrega al menos un producto a la cotización');
      return;
    }
    setSavingQuote(true);
    try {
      await quotesService.createQuote({
        customerId: selectedCustomerCreate?.id,
        validDays: newQuote.validDays || 7,
        notes: newQuote.notes || undefined,
        requiresTransport: newQuote.requiresTransport,
        vehicleId: newQuote.requiresTransport ? newQuote.vehicleId : undefined,
        deliveryAddress: newQuote.requiresTransport ? newQuote.deliveryAddress : undefined,
        items: newQuote.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      toast.success('Cotización creada exitosamente');
      setCreateQuoteModalOpen(false);
      setNewQuote({ customerId: undefined, validDays: 7, notes: '', items: [], requiresTransport: false, vehicleId: undefined, deliveryAddress: '' });
      setSelectedCustomerCreate(null);
      setProductSearchCreate('');
      fetchQuotes();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear la cotización');
    } finally {
      setSavingQuote(false);
    }
  };

  // Buscar clientes con debounce
  const searchCustomers = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const res = await apiRequest<any>(`/customers/search?q=${encodeURIComponent(query)}`);
      setCustomerResults(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingCustomers(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchCustomers(customerSearchQuery);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [customerSearchQuery]);



  const handleOpenEditCustomer = (quote: QuoteResponse) => {
    setEditingQuote(quote);
    setSelectedCustomerId(quote.customerId || null);
    setCustomerSearchQuery('');
    setCustomerResults([]);
    setEditCustomerModalOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingQuote || !selectedCustomerId) {
      toast.error('Seleccione un cliente válido');
      return;
    }
    setUpdatingCustomer(true);
    try {
      await quotesService.updateQuote(editingQuote.id, selectedCustomerId);
      toast.success('Cliente de la cotización actualizado con éxito');
      setEditCustomerModalOpen(false);
      fetchQuotes();
      if (selectedQuote && selectedQuote.id === editingQuote.id) {
        const fullQuote = await quotesService.getQuoteDetail(editingQuote.id);
        setSelectedQuote(fullQuote);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar cliente');
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const handleOpenEmailModal = (quote: QuoteResponse) => {
    setEmailQuote(quote);
    setDestinationEmail(quote.customer?.email || '');
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailQuote) return;
    if (!destinationEmail || !destinationEmail.includes('@')) {
      toast.error('Ingrese un correo electrónico válido');
      return;
    }
    setSendingEmail(true);
    try {
      await quotesService.resendEmail(emailQuote.id, destinationEmail);
      toast.success('Correo de cotización enviado correctamente');
      setEmailModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar correo');
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (quote: QuoteResponse) => {
    if (quote.status === 'EXPIRADA') {
      return <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/5">Expirada</Badge>;
    }
    if (quote.status === 'CANCELADA') {
      return <Badge variant="destructive">Cancelada</Badge>;
    }
    if (quote.status === 'CONFIRMADA') {
      return <Badge variant="success">Confirmada</Badge>;
    }

    // Para PENDIENTE: verificar si está próxima a vencer (3 días)
    const now = new Date();
    const expiry = new Date(quote.validUntil);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      return <Badge variant="outline" className="border-rose-500 text-rose-500 bg-rose-500/10 font-bold">Vencida</Badge>;
    }
    if (diffDays <= 3) {
      return <Badge variant="warning" className="animate-pulse bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">Por vencer ({Math.ceil(diffDays)}d)</Badge>;
    }
    return <Badge variant="secondary" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-bold">Vigente</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Cotizaciones</h1>
          <p className="text-[var(--text-sec)]">Gestiona las cotizaciones de clientes y conviértelas en ventas.</p>
        </div>
        <Button onClick={() => navigate('/quotes/new')} className="font-bold whitespace-nowrap bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90">
          <Plus size={16} className="mr-2" /> Nueva Cotización
        </Button>
      </div>

      <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <SmartFilter config={quotesFilters} />
      </div>

      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Cotiz</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vence En</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Envío</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando cotizaciones...
                  </TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron cotizaciones con estos filtros
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map(quote => (
                  <TableRow key={quote.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell className="font-bold text-[var(--primary)]">
                      #{quote.id.toString().padStart(6, '0')}
                    </TableCell>
                    <TableCell className="text-[var(--text-main)] text-sm">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-[var(--text-main)] block">
                        {quote.customer ? quote.customer.name : 'Consumidor Final'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {quote.validDays} días
                      </span>
                      <br/>
                      <span className="text-[10px] text-[var(--text-sec)]">
                        {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'Sin fecha'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--text-main)]">
                      ${Number(quote.totalAmount).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(quote)}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        if (!quote.requiresTransport) return <span className="text-gray-400 text-xs font-medium">N/A</span>;
                        const dNotes = quote.sale?.deliveryNotes || [];
                        if (dNotes.length > 0) {
                          const dn = dNotes[0];
                          if (dn.status === 'ENTREGADO') return <span className="text-emerald-500 font-bold text-[11px] bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Entregado</span>;
                          if (dn.status === 'EN_RUTA') return <span className="text-blue-500 font-bold text-[11px] bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">En Ruta</span>;
                          if (dn.status === 'CANCELADO') return <span className="text-rose-500 font-bold text-[11px] bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">Cancelado</span>;
                          return <span className="text-amber-500 font-bold text-[11px] bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">Pendiente Envío</span>;
                        }
                        if (quote.status === 'CONFIRMADA') {
                          return <span className="text-amber-500 font-bold text-[11px] bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">Pendiente Envío</span>;
                        }
                        return <span className="text-indigo-500 font-bold text-[11px] bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">Con Envío</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Opciones</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetail(quote)} className="font-bold cursor-pointer">
                            <Eye size={14} className="mr-2 text-[var(--primary)]" /> Ver Detalle
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleOpenEmailModal(quote)} className="font-bold cursor-pointer">
                            <Mail size={14} className="mr-2 text-indigo-600" /> Enviar por Correo
                          </DropdownMenuItem>
                          
                          {quote.status === 'PENDIENTE' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleOpenEditCustomer(quote)} 
                                className="font-bold cursor-pointer text-amber-600 focus:text-amber-700"
                              >
                                <UserCog size={14} className="mr-2" />
                                Editar Cliente
                              </DropdownMenuItem>
                              
                              {user?.roleId !== 4 && (
                                <DropdownMenuItem 
                                  onClick={() => handleOpenConfirmModal(quote)} 
                                  disabled={confirmingId === quote.id}
                                  className="font-bold cursor-pointer text-emerald-600 focus:text-emerald-700"
                                >
                                  {confirmingId === quote.id ? (
                                    <RefreshCcw size={14} className="mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={14} className="mr-2" />
                                  )}
                                  Confirmar a Venta
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleCancelQuote(quote)} 
                                disabled={cancelingId === quote.id}
                                className="font-bold cursor-pointer text-destructive focus:text-destructive"
                              >
                                {cancelingId === quote.id ? (
                                  <RefreshCcw size={14} className="mr-2 animate-spin" />
                                ) : (
                                  <X size={14} className="mr-2" />
                                )}
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} cotizaciones)
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

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent 
          className="flex flex-col p-0 overflow-hidden bg-[var(--card)] border-[var(--border)] sm:max-w-4xl w-full"
        >
          {selectedQuote && (
            <>
              <div className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                      Detalle de Cotización
                    </h2>
                    <p className="text-sm font-mono text-[var(--text-sec)]">
                      #{selectedQuote.id.toString().padStart(6, '0')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Cliente</p>
                    <p className="font-bold text-[var(--text-main)] block truncate">
                      {selectedQuote.customer?.name || 'Consumidor Final'}
                    </p>
                    {selectedQuote.customer?.email && (
                      <span className="text-[10px] text-[var(--text-sec)] block truncate">
                        {selectedQuote.customer.email}
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Vendedor / Creado por</p>
                    <p className="font-bold text-[var(--text-main)]">{selectedQuote.user?.fullName || 'Sistema'}</p>
                    <span className="text-[10px] text-[var(--text-sec)] block">
                      {new Date(selectedQuote.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Fecha Límite</p>
                    <p className="font-bold text-[var(--text-main)]">
                      {selectedQuote.validUntil ? new Date(selectedQuote.validUntil).toLocaleDateString() : 'Sin fecha'}
                    </p>
                    <span className="text-[10px] text-[var(--text-sec)] block">
                      Vence en {selectedQuote.validDays} días
                    </span>
                  </div>

                  <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Estado</p>
                    <div className="mt-1">{getStatusBadge(selectedQuote)}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[var(--bg)]">
                      <TableRow>
                        <TableHead>Cant</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuote.items?.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold">{item.quantity}</TableCell>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell className="text-right">${Number(item.unitPrice).toFixed(4)}</TableCell>
                          <TableCell className="text-right font-black text-[var(--primary)]">${Number(item.totalPrice).toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)] flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="text-[var(--text-sec)]">
                      {(() => {
                        let totalCost = 0;
                        selectedQuote.items?.forEach(i => {
                          const cost = Number(i.costPrice) || Number(i.product?.costPrice) || 0;
                          totalCost += cost * Number(i.quantity);
                        });
                        const estimatedGain = Number(selectedQuote.totalAmount) - totalCost;
                        const gainPercent = totalCost > 0 ? (estimatedGain / totalCost) * 100 : 0;
                        return (
                          <div className="flex gap-4 text-xs font-bold bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl shadow-sm">
                            <div className="flex flex-col">
                              <span className="uppercase text-[10px] tracking-wider mb-1">Costo Total</span>
                              <span className="text-[var(--text-main)]">${totalCost.toFixed(4)}</span>
                            </div>
                            <div className="w-px bg-[var(--border)]"></div>
                            <div className="flex flex-col">
                              <span className="uppercase text-[10px] tracking-wider mb-1 text-emerald-600">Ganancia Estimada</span>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600">${estimatedGain.toFixed(4)}</span>
                                <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-md border", gainPercent < 5 ? "text-rose-500 border-rose-500/30 bg-rose-500/10" : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10")}>
                                  {gainPercent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Total Cotización</p>
                      <p className="text-3xl font-black text-[var(--primary)]">${Number(selectedQuote.totalAmount).toFixed(4)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedQuote.status === 'PENDIENTE' && (
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/30 flex justify-end gap-3 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleOpenEmailModal(selectedQuote);
                      setDetailModalOpen(false);
                    }}
                    className="font-bold"
                  >
                    <Mail size={16} className="mr-2 text-indigo-600" /> Enviar por Correo
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleOpenEditCustomer(selectedQuote);
                      setDetailModalOpen(false);
                    }}
                    className="font-bold"
                  >
                    <UserCog size={16} className="mr-2 text-amber-600" /> Editar Cliente
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleCancelQuote(selectedQuote);
                      setDetailModalOpen(false);
                    }}
                    disabled={cancelingId === selectedQuote.id}
                    className="font-bold"
                  >
                    Cancelar Cotización
                  </Button>
                  {user?.roleId !== 4 && (
                    <Button 
                      onClick={() => {
                        handleOpenConfirmModal(selectedQuote);
                        setDetailModalOpen(false);
                      }}
                      disabled={confirmingId === selectedQuote.id}
                      className="font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                    >
                      Confirmar Venta
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG DE EDITAR CLIENTE (PATCH) */}
      <Dialog open={editCustomerModalOpen} onOpenChange={setEditCustomerModalOpen}>
        <DialogContent className="max-w-md bg-[var(--card)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="text-amber-500" size={20} />
              Editar Cliente de Cotización
            </DialogTitle>
            <DialogDescription>
              Asocia un cliente de la base de datos a la cotización #{editingQuote?.id}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-[var(--text-sec)]">Buscar Cliente</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" />
                <Input 
                  placeholder="Escribe el nombre o documento..." 
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  className="pl-9 bg-[var(--bg)]"
                />
              </div>
              {searchingCustomers && (
                <p className="text-xs text-[var(--text-sec)] animate-pulse">Buscando clientes...</p>
              )}
            </div>

            {customerResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y bg-[var(--bg)]/10">
                {customerResults.map(cust => (
                  <div 
                    key={cust.id} 
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={cn(
                      "p-3 text-sm cursor-pointer transition-colors flex items-center justify-between",
                      selectedCustomerId === cust.id 
                        ? "bg-[var(--primary)]/10 font-bold border-l-4 border-[var(--primary)]" 
                        : "hover:bg-[var(--bg)]/40"
                    )}
                  >
                    <div>
                      <p className="text-[var(--text-main)] font-semibold">{cust.name}</p>
                      <p className="text-xs text-[var(--text-sec)]">{cust.documentNumber || cust.nit || 'Sin Documento'}</p>
                    </div>
                    {selectedCustomerId === cust.id && (
                      <CheckCircle2 size={16} className="text-[var(--primary)]" />
                    )}
                  </div>
                ))}
              </div>
            ) : customerSearchQuery.trim().length >= 2 ? (
              <p className="text-sm text-[var(--text-sec)] text-center py-4">No se encontraron clientes</p>
            ) : null}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomerModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateCustomer} 
              disabled={updatingCustomer || !selectedCustomerId}
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              className="font-bold"
            >
              {updatingCustomer ? 'Guardando...' : 'Asociar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE ENVIAR CORREO (resend-email) */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md bg-[var(--card)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="text-indigo-500" size={20} />
              Enviar Cotización por Correo
            </DialogTitle>
            <DialogDescription>
              La cotización se enviará como un reporte al correo especificado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-[var(--text-sec)]">Correo Destinatario</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" />
                <Input 
                  type="email"
                  placeholder="ejemplo@correo.com" 
                  value={destinationEmail}
                  onChange={e => setDestinationEmail(e.target.value)}
                  className="pl-9 bg-[var(--bg)]"
                />
              </div>
              {emailQuote?.customer && !emailQuote.customer.email && (
                <p className="text-xs text-rose-500 font-bold flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> El cliente asociado no tiene un correo registrado.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={sendingEmail || !destinationEmail}
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              className="font-bold flex items-center gap-2"
            >
              {sendingEmail ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send size={14} /> Enviar Correo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG CONFIRMAR VENTA Y MÉTODO DE PAGO */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md bg-[var(--card)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={20} />
              Confirmar a Venta
            </DialogTitle>
            <DialogDescription>
              Seleccione el método de pago con el que el cliente pagará la cotización. Esta venta se sumará a su caja actual.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="text-xs font-bold uppercase text-[var(--text-sec)] mb-3 block">Método de Pago</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                onClick={() => setSelectedPaymentMethod('EFECTIVO')}
                className={cn(
                  "border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                  selectedPaymentMethod === 'EFECTIVO' 
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold" 
                    : "border-[var(--border)] text-[var(--text-sec)] hover:bg-[var(--bg)]/50"
                )}
              >
                <Banknote size={24} />
                <span className="text-sm">Efectivo</span>
              </div>
              <div 
                onClick={() => setSelectedPaymentMethod('TRANSFERENCIA')}
                className={cn(
                  "border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                  selectedPaymentMethod === 'TRANSFERENCIA' 
                    ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold" 
                    : "border-[var(--border)] text-[var(--text-sec)] hover:bg-[var(--bg)]/50"
                )}
              >
                <Smartphone size={24} />
                <span className="text-sm">Transf.</span>
              </div>
              <div 
                onClick={() => setSelectedPaymentMethod('TARJETA')}
                className={cn(
                  "border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                  selectedPaymentMethod === 'TARJETA' 
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" 
                    : "border-[var(--border)] text-[var(--text-sec)] hover:bg-[var(--bg)]/50"
                )}
              >
                <CreditCard size={24} />
                <span className="text-sm">Tarjeta</span>
              </div>
              <div 
                onClick={() => setSelectedPaymentMethod('CREDITO')}
                className={cn(
                  "border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                  selectedPaymentMethod === 'CREDITO' 
                    ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold" 
                    : "border-[var(--border)] text-[var(--text-sec)] hover:bg-[var(--bg)]/50"
                )}
              >
                <Clock size={24} />
                <span className="text-sm">Crédito</span>
              </div>
            </div>
            {quoteToConfirm && (
              <div className="mt-6 p-4 rounded-lg bg-[var(--bg)]/50 border border-[var(--border)] flex justify-between items-center">
                <span className="text-sm text-[var(--text-sec)] font-medium">Total a cobrar:</span>
                <span className="text-xl font-black text-[var(--text-main)]">${Number(quoteToConfirm.totalAmount).toFixed(4)}</span>
              </div>
            )}

            {quoteToConfirm?.requiresTransport && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 text-sm flex items-center gap-2">
                <TruckIcon size={16} className="text-blue-600" />
                <span className="text-blue-800 dark:text-blue-300 font-medium">
                  Esta cotización incluye entrega a domicilio. Se generará un albarán automáticamente al confirmar.
                </span>
              </div>
            )}

            <div className="mt-4">
              <TransportSelector
                customerId={quoteToConfirm?.customerId}
                value={transportData}
                onChange={setTransportData}
                disabled={!!confirmingId}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmQuote}
              disabled={!!confirmingId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2"
            >
              {confirmingId ? (
                <><RefreshCcw size={16} className="animate-spin" /> Procesando...</>
              ) : (
                <><CheckCircle2 size={16} /> Confirmar Venta</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL CREAR COTIZACIÓN */}
      <Dialog open={createQuoteModalOpen} onOpenChange={setCreateQuoteModalOpen}>
        <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl max-h-[90vh] flex flex-col p-0 bg-[var(--card)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader className="p-6 border-b border-[var(--border)]">
            <DialogTitle className="flex items-center gap-2 text-2xl text-[var(--primary)]">
              <FileText /> Nueva Cotización
            </DialogTitle>
            <DialogDescription>
              Crea una cotización para un cliente. Puedes indicar si requiere entrega a domicilio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Fila 1: Cliente + Vigencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Búsqueda de cliente */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-[var(--text-sec)]">Cliente (Opcional)</Label>
                {selectedCustomerCreate ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                    <div>
                      <p className="font-bold text-sm">{selectedCustomerCreate.name}</p>
                      <p className="text-xs text-[var(--text-sec)]">{selectedCustomerCreate.documentNumber || selectedCustomerCreate.nit || 'Sin documento'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomerCreate(null); setCustomerSearchCreate(''); }}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" />
                    <Input
                      className="pl-9 bg-[var(--bg)]"
                      placeholder="Buscar cliente por nombre..."
                      value={customerSearchCreate}
                      onChange={e => {
                        setCustomerSearchCreate(e.target.value);
                        if (e.target.value.length > 1) {
                          apiRequest<any>(`/customers/search?q=${encodeURIComponent(e.target.value)}`)
                            .then(res => setCustomerResultsCreate(Array.isArray(res) ? res : []))
                            .catch(console.error);
                        } else {
                          setCustomerResultsCreate([]);
                        }
                      }}
                    />
                    {customerResultsCreate.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                        {customerResultsCreate.map(c => (
                          <div
                            key={c.id}
                            className="p-3 hover:bg-[var(--bg)]/50 cursor-pointer flex justify-between border-b border-[var(--border)] text-sm"
                            onClick={() => { setSelectedCustomerCreate(c); setCustomerResultsCreate([]); setCustomerSearchCreate(''); }}
                          >
                            <span className="font-bold">{c.name}</span>
                            <span className="text-[var(--text-sec)] text-xs">{c.documentNumber || c.nit || ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Vigencia en días */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-[var(--text-sec)]">Vigencia (días)</Label>
                <Select
                  value={String(newQuote.validDays)}
                  onValueChange={v => setNewQuote(prev => ({ ...prev, validDays: Number(v) }))}
                >
                  <SelectTrigger className="bg-[var(--bg)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 2: Transporte + Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección de Transporte */}
              <Card className="p-4 border-l-4 border-l-[var(--primary)] border-[var(--border)] bg-[var(--card)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TruckIcon size={18} className="text-[var(--primary)]" />
                    <Label className="font-bold">¿Requiere entrega a domicilio?</Label>
                  </div>
                  <Switch
                    checked={newQuote.requiresTransport}
                    onCheckedChange={c => setNewQuote(prev => ({ ...prev, requiresTransport: c }))}
                  />
                </div>
                {newQuote.requiresTransport && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3 animate-in fade-in">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-[var(--text-sec)]">Dirección de Entrega</Label>
                      <Input
                        placeholder="Dirección exacta de entrega..."
                        value={newQuote.deliveryAddress}
                        onChange={e => setNewQuote(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                        className="bg-[var(--bg)]"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Notas */}
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-[var(--text-sec)]">Notas (Opcional)</Label>
                <Input
                  placeholder="Condiciones especiales, comentarios..."
                  value={newQuote.notes}
                  onChange={e => setNewQuote(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-[var(--bg)]"
                />
              </div>
            </div>

            {/* Búsqueda de productos mejorada con soporte de teclado */}
            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)] shadow-sm">
              <Command shouldFilter={false} className="w-full bg-transparent">
                <CommandInput 
                  placeholder="Buscar producto por nombre o código... (Usa las flechas y Enter)"
                  value={productSearchCreate}
                  onValueChange={setProductSearchCreate}
                  className="h-12 text-sm"
                />
                <CommandList className={cn("transition-all", productSearchCreate.length > 2 ? "max-h-60 border-t border-[var(--border)]" : "max-h-0 hidden")}>
                  {productSearchCreate.length > 2 && productResultsCreate.length === 0 ? (
                    <CommandEmpty className="py-6 text-center text-sm text-[var(--text-sec)]">
                      No se encontraron productos.
                    </CommandEmpty>
                  ) : (
                    <CommandGroup heading="Resultados (Presiona Enter para seleccionar)">
                      {productResultsCreate.map(p => {
                        const price = p.price || (p.prices?.[0]?.price) || 0;
                        const stock = p.inventory?.[0]?.quantity ?? p.stock ?? 'N/A';
                        return (
                          <CommandItem
                            key={p.id}
                            value={p.id.toString()}
                            onSelect={() => {
                              const existing = newQuote.items.find(i => i.productId === p.id);
                              if (existing) { toast.info('Producto ya agregado'); return; }
                              
                              setNewQuote(prev => ({
                                ...prev,
                                items: [...prev.items, {
                                  productId: p.id,
                                  productName: p.name,
                                  quantity: 1,
                                  unitPrice: Number(price),
                                }]
                              }));
                              setProductSearchCreate('');
                              setProductResultsCreate([]);
                            }}
                            className="flex justify-between items-center py-3 cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-[var(--text-main)] text-sm leading-tight">{p.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--text-sec)] font-mono">
                                  {p.internalCode || p.barcode || 'S/C'}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-bold", 
                                  Number(stock) > 0 ? "text-emerald-600" : "text-rose-500"
                                )}>
                                  Stock: {stock}
                                </span>
                              </div>
                            </div>
                            <span className="text-[var(--primary)] font-black text-sm">
                              ${Number(price).toFixed(4)}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </div>

            {/* Lista de items */}
            {newQuote.items.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
                <Table>
                  <TableHeader className="bg-[var(--bg)]">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-28 text-center">Cantidad</TableHead>
                      <TableHead className="w-32 text-center">Precio Unit.</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newQuote.items.map((item, idx) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-bold text-sm">{item.productName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-center">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              const items = [...newQuote.items];
                              if (items[idx].quantity > 1) items[idx].quantity--;
                              setNewQuote(prev => ({ ...prev, items }));
                            }}>-</Button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              const items = [...newQuote.items];
                              items[idx].quantity++;
                              setNewQuote(prev => ({ ...prev, items }));
                            }}>+</Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 text-center h-8 bg-[var(--bg)]"
                            value={item.unitPrice}
                            min={0}
                            step={0.01}
                            onChange={e => {
                              const items = [...newQuote.items];
                              items[idx].unitPrice = Number(e.target.value);
                              setNewQuote(prev => ({ ...prev, items }));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-[var(--primary)]">
                          ${(item.quantity * item.unitPrice).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => {
                            setNewQuote(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
                          }}>
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-[var(--bg)] flex justify-end border-t border-[var(--border)]">
                  <div className="text-right">
                    <p className="text-sm text-[var(--text-sec)]">Total Cotización</p>
                    <p className="text-2xl font-black text-[var(--primary)]">
                      ${newQuote.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 border-t border-[var(--border)] bg-[var(--card)]">
            <Button variant="outline" onClick={() => setCreateQuoteModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateQuote}
              disabled={savingQuote || !newQuote.items.length}
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              className="font-bold"
            >
              {savingQuote ? 'Guardando...' : 'Crear Cotización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
