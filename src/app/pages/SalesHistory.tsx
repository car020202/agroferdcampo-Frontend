import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, CheckCircle2, AlertCircle, Eye, Trash2, 
  Mail, X, RefreshCcw, Filter, Calendar as CalendarIcon, Download, FilePlus2, FileMinus2, Send,
  Hash, User, Package, Building2
} from 'lucide-react';
import { getSalesHistory, voidSale, resendDteEmail, SaleResponse, sendNotaCredito, sendNotaDebito, requestMonthlyReport, sendFacturaConsumidor, sendCreditoFiscal, getSaleDetail } from '../services/sales.service';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { API_BASE_URL } from '../config/api';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';

export function SalesHistory() {
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Void Modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidForm, setVoidForm] = useState({
    motivoAnulacion: '',
    nombreResponsable: '',
    tipDocResponsable: '13',
    numDocResponsable: '',
    nombreSolicita: '',
    tipDocSolicita: '13',
    numDocSolicita: ''
  });
  const [voiding, setVoiding] = useState(false);

  // Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Notas de Crédito/Débito
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<'CREDITO' | 'DEBITO'>('CREDITO');
  const [noteItems, setNoteItems] = useState<any[]>([]);
  const [sendingNote, setSendingNote] = useState(false);

  // Reporte Mensual
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), email: '' });
  const [requestingReport, setRequestingReport] = useState(false);

  // Emisión de DTE
  const [emittingDteId, setEmittingDteId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, paymentFilter, dateFilter, searchTerm]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (paymentFilter !== 'all') filters.paymentMethod = paymentFilter;
      if (dateFilter) filters.fecha = dateFilter;
      if (searchTerm) filters.search = searchTerm;

      const res = await getSalesHistory(filters);
      setSales(res.data);
      setPagination({
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages
      });
    } catch (error) {
      toast.error('Error al cargar historial de ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setVoiding(true);
    try {
      await voidSale(selectedSale.id, voidForm);
      toast.success('Factura anulada correctamente');
      setVoidModalOpen(false);
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || 'Error al anular la factura');
    } finally {
      setVoiding(false);
    }
  };

  const handleResendEmail = async () => {
    if (!selectedSale) return;
    setSendingEmail(true);
    try {
      await resendDteEmail(selectedSale.id, emailInput || undefined);
      toast.success('Correo enviado correctamente');
      setEmailModalOpen(false);
      setEmailInput('');
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar correo');
    } finally {
      setSendingEmail(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateFilter('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleOpenDetail = async (sale: SaleResponse) => {
    try {
      const fullSale = await getSaleDetail(sale.id);
      setSelectedSale(fullSale);
      setDetailModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalles de la venta');
    }
  };

  const openNoteModal = async (sale: SaleResponse, type: 'CREDITO' | 'DEBITO') => {
    try {
      const fullSale = await getSaleDetail(sale.id);
      setSelectedSale(fullSale);
      setNoteType(type);
      setNoteItems(fullSale.items?.map(i => ({ ...i, adjustQuantity: i.quantity })) || []);
      setNoteModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalles de la venta');
    }
  };

  const handleViewPdf = async (url?: string) => {
    if (!url) return;
    
    if (url.startsWith('http')) {
      window.open(url, '_blank');
      return;
    }

    try {
      const toastId = toast.loading('Cargando documento...');
      const finalUrl = `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
      const token = localStorage.getItem('agro-token');
      
      const response = await fetch(finalUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener el documento');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      toast.dismiss(toastId);
    } catch (e) {
      toast.error('No se pudo abrir el documento. Es posible que no esté disponible.');
    }
  };

  const handleNoteSubmit = async () => {
    if (!selectedSale) return;
    setSendingNote(true);
    try {
      const payload = {
        items: noteItems.map(i => ({
          productId: i.productId,
          quantity: Number(i.adjustQuantity),
          unitPrice: Number(i.unitPrice)
        }))
      };

      if (noteType === 'CREDITO') {
        await sendNotaCredito(selectedSale.id, payload);
        toast.success('Nota de Crédito emitida exitosamente');
      } else {
        await sendNotaDebito(selectedSale.id, payload);
        toast.success('Nota de Débito emitida exitosamente');
      }
      setNoteModalOpen(false);
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || `Error al emitir Nota de ${noteType}`);
    } finally {
      setSendingNote(false);
    }
  };

  const handleRequestReport = async () => {
    setRequestingReport(true);
    try {
      await requestMonthlyReport(reportForm.year.toString(), reportForm.month.toString().padStart(2, '0'), reportForm.email);
      toast.success('Solicitud recibida. Recibirás el ZIP en tu correo en unos minutos.');
      setReportModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al solicitar el reporte');
    } finally {
      setRequestingReport(false);
    }
  };

  const handleEmitDte = async (sale: SaleResponse) => {
    setEmittingDteId(sale.id);
    try {
      const isCreditFiscal = sale.customer?.customerType === 'CONTRIBUYENTE';
      if (isCreditFiscal) {
        await sendCreditoFiscal(sale.id);
      } else {
        await sendFacturaConsumidor(sale.id);
      }
      toast.success('DTE emitido exitosamente');
      fetchSales();
    } catch (error: any) {
      toast.error(error.message || 'Error al emitir el DTE en Hacienda');
    } finally {
      setEmittingDteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Historial de Ventas</h1>
          <p className="text-[var(--text-sec)]">Consulta, anulación y reenvío de facturas y créditos fiscales.</p>
        </div>
        <Button onClick={() => setReportModalOpen(true)} className="font-bold">
          <Download size={16} className="mr-2" /> Descargar DTEs (ZIP)
        </Button>
      </div>

      <Card className="p-4 border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-[1.5] w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Buscar Cliente / # Venta</Label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" />
              <Input 
                placeholder="Ej. Consumidor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-[var(--bg)]"
              />
            </div>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Estado Venta</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[var(--bg)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Método de Pago</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="bg-[var(--bg)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="CREDITO">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Fecha Específica</Label>
            <div className="relative">
              <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sec)]" />
              <Input 
                type="date" 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="pl-9 bg-[var(--bg)]"
              />
            </div>
          </div>

          <Button variant="outline" onClick={resetFilters} className="font-bold">
            <Filter size={16} className="mr-2" /> Limpiar
          </Button>
        </div>
      </Card>

      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Venta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Hacienda (DTE)</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando ventas...
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron ventas con estos filtros
                  </TableCell>
                </TableRow>
              ) : (
                sales.map(sale => (
                  <TableRow key={sale.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell className="font-bold text-[var(--primary)]">
                      #{sale.id.toString().padStart(6, '0')}
                    </TableCell>
                    <TableCell className="text-[var(--text-main)] text-sm">
                      {new Date(sale.createdAt).toLocaleDateString()}
                      <br/>
                      <span className="text-[10px] text-[var(--text-sec)]">
                        {new Date(sale.createdAt).toLocaleTimeString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-[var(--text-main)] block">
                        {sale.customer ? sale.customer.name : 'Consumidor Final'}
                      </span>
                      {sale.customer?.nit && (
                        <span className="text-[10px] text-[var(--text-sec)]">{sale.customer.nit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{sale.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--text-main)]">
                      ${Number(sale.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={sale.status === 'COMPLETADA' ? 'success' : 'destructive'}>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {!sale.dteResponse ? (
                        <span className="text-[10px] font-bold text-gray-400">Sin DTE</span>
                      ) : sale.dteResponse.estado === 'PROCESADO' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                          PROCESADO
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200">
                          {sale.dteResponse.estado || 'ERROR'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Opciones</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetail(sale)} className="font-bold cursor-pointer">
                            <Eye size={14} className="mr-2 text-[var(--primary)]" /> Ver Detalle
                          </DropdownMenuItem>
                          
                          {!sale.dteResponse && sale.status === 'COMPLETADA' && (
                            <DropdownMenuItem 
                              onClick={() => handleEmitDte(sale)} 
                              disabled={emittingDteId === sale.id}
                              className="font-bold cursor-pointer text-emerald-600 focus:text-emerald-700"
                            >
                              {emittingDteId === sale.id ? (
                                <RefreshCcw size={14} className="mr-2 animate-spin" />
                              ) : (
                                <Send size={14} className="mr-2" />
                              )}
                              Emitir DTE a Hacienda
                            </DropdownMenuItem>
                          )}
                          
                          {/* Bloqueado por el momento
                          {sale.dteResponse?.dteJsonUrl && (
                            <DropdownMenuItem onClick={() => handleViewPdf(sale.dteResponse?.dteJsonUrl)} className="font-bold cursor-pointer">
                              <FileText size={14} className="mr-2 text-blue-500" /> Ver PDF
                            </DropdownMenuItem>
                          )}
                          */}
                          
                          {sale.dteResponse?.estado === 'PROCESADO' && sale.status === 'COMPLETADA' && (
                            <>
                              <DropdownMenuItem onClick={() => { setSelectedSale(sale); setEmailModalOpen(true); }} className="font-bold cursor-pointer">
                                <Mail size={14} className="mr-2 text-indigo-500" /> Enviar Correo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openNoteModal(sale, 'CREDITO')} className="font-bold cursor-pointer">
                                <FileMinus2 size={14} className="mr-2 text-amber-500" /> Emitir Nota de Crédito
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openNoteModal(sale, 'DEBITO')} className="font-bold cursor-pointer">
                                <FilePlus2 size={14} className="mr-2 text-blue-500" /> Emitir Nota de Débito
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {sale.status === 'COMPLETADA' && (
                            <DropdownMenuItem 
                              onClick={() => { setSelectedSale(sale); setVoidModalOpen(true); }} 
                              className="font-bold text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 size={14} className="mr-2" /> Anular Factura
                            </DropdownMenuItem>
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
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} ventas)
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

      {/* --- MODAL DETALLE --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent 
          className="flex flex-col p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]"
          style={{ maxWidth: '900px', width: '90vw', maxHeight: '90vh' }}
        >
          {selectedSale && (
            <>
              <div className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50 relative">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">
                      Detalle de Factura Electrónica
                    </h2>
                    <p className="text-sm font-mono text-[var(--text-sec)]">
                      {selectedSale.dteResponse?.codigoGeneracion || `Venta Interna #${selectedSale.id.toString().padStart(6, '0')}`}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 p-6">
                <div className="space-y-8">
                  {/* ESTADO BANNER */}
                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={selectedSale.dteResponse?.estado === 'PROCESADO' ? "text-emerald-500" : "text-[var(--text-sec)]"} size={24} />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Estado en Hacienda</p>
                        <p className={cn("text-sm font-black uppercase", selectedSale.dteResponse?.estado === 'PROCESADO' ? "text-emerald-600" : "text-[var(--text-main)]")}>
                          {selectedSale.dteResponse?.estado || 'NO ENVIADO'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right mt-4 sm:mt-0">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {new Date(selectedSale.createdAt).toLocaleString('es-ES')}
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
                            {selectedSale.dteResponse?.numeroControl || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Código de Generación</p>
                          <div className="bg-[var(--bg)] px-3 py-2 rounded-md border border-[var(--border)] font-mono text-sm text-amber-600 font-bold break-all">
                            {selectedSale.dteResponse?.codigoGeneracion || 'N/A'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Serie / POS</p>
                            <p className="font-bold text-[var(--text-main)] uppercase">{selectedSale.dteResponse?.serie || 'P001'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Ambiente</p>
                            <p className="font-bold text-[var(--text-main)] uppercase">{selectedSale.dteResponse?.ambiente || 'N/A'}</p>
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
                          <p className="font-bold text-[var(--text-main)] text-base">{selectedSale.customer?.name || 'Consumidor Final'}</p>
                          <p className="text-sm text-[var(--text-sec)]">{selectedSale.customer?.email || 'Sin correo'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">Documento</p>
                            <p className="font-medium text-[var(--text-main)] text-sm">{selectedSale.customer?.nit || selectedSale.customer?.documentNumber || 'S/N'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase tracking-wider mb-1">NRC</p>
                            <p className="font-medium text-[var(--text-main)] text-sm">{selectedSale.customer?.customerType === 'CONTRIBUYENTE' ? 'S/N' : 'S/N'}</p>
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
                          {selectedSale.items?.map(item => (
                            <TableRow key={item.id} className="border-b border-[var(--border)]/50 hover:bg-transparent">
                              <TableCell className="font-bold text-[var(--text-main)]">{item.quantity}</TableCell>
                              <TableCell>
                                <p className="font-bold text-[var(--text-main)] uppercase">{item.product?.name}</p>
                                <p className="text-[10px] text-[var(--text-sec)] uppercase">Cód: {item.product?.id}</p>
                              </TableCell>
                              <TableCell className="text-right text-[var(--text-sec)] font-medium">${Number(item.unitPrice).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-black text-amber-500">${Number(item.totalPrice).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-4 border-t border-[var(--border)] flex justify-end bg-[var(--bg)]/50">
                        <div className="flex items-center gap-8">
                          <p className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-widest">Total a Pagar</p>
                          <p className="text-xl font-black text-amber-500">${Number(selectedSale.totalAmount).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* FOOTER */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-[var(--text-sec)]">
                      <Building2 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Emisor: Agroferr D'Campo</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">MH-API-V2 / DTE-01</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-end">
                <Button onClick={() => setDetailModalOpen(false)} variant="outline" className="font-bold px-8">
                  CERRAR DETALLE
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL ANULACIÓN --- */}
      <Dialog open={voidModalOpen} onOpenChange={setVoidModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-[var(--card)] border-[var(--border)]">
          {/* HEADER */}
          <div className="p-6 border-b border-[var(--border)] flex items-start gap-4">
            <div className="size-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
               <AlertCircle size={24} />
            </div>
            <div>
               <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide">Anular Factura</h2>
               <p className="text-sm font-mono text-[var(--text-sec)]">
                 {selectedSale?.dteResponse?.codigoGeneracion || `FAC-${selectedSale?.id.toString().padStart(5, '0')}`}
               </p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* ALERT BANNER */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600">
               <AlertCircle size={20} className="shrink-0" />
               <p className="text-sm font-medium">Esta acción enviará una solicitud de <b>Invalidación</b> a Hacienda. Completa los datos requeridos.</p>
            </div>

            <form onSubmit={handleVoidSubmit} className="space-y-6">
              {/* MOTIVO */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-sec)]">Motivo de anulación (Descripción)</Label>
                <Input required placeholder="Ej. Error en datos del receptor" value={voidForm.motivoAnulacion} onChange={e => setVoidForm({...voidForm, motivoAnulacion: e.target.value})} className="bg-[var(--bg)]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* RESPONSABLE */}
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-blue-500">Responsable (Cajero)</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">Nombre Completo</Label>
                    <Input required value={voidForm.nombreResponsable} onChange={e => setVoidForm({...voidForm, nombreResponsable: e.target.value})} className="bg-[var(--bg)]" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">Tipo Doc.</Label>
                      <Select value={voidForm.tipDocResponsable} onValueChange={v => setVoidForm({...voidForm, tipDocResponsable: v})}>
                        <SelectTrigger className="bg-[var(--bg)]"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13">DUI</SelectItem>
                          <SelectItem value="36">NIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">No. Documento</Label>
                      <Input required placeholder="00000000-0" value={voidForm.numDocResponsable} onChange={e => setVoidForm({...voidForm, numDocResponsable: e.target.value})} className="bg-[var(--bg)]" />
                    </div>
                  </div>
                </div>

                {/* SOLICITANTE */}
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-emerald-500">Solicitante (Cliente)</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">Nombre Completo</Label>
                    <Input required value={voidForm.nombreSolicita} onChange={e => setVoidForm({...voidForm, nombreSolicita: e.target.value})} className="bg-[var(--bg)]" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">Tipo Doc.</Label>
                      <Select value={voidForm.tipDocSolicita} onValueChange={v => setVoidForm({...voidForm, tipDocSolicita: v})}>
                        <SelectTrigger className="bg-[var(--bg)]"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13">DUI</SelectItem>
                          <SelectItem value="36">NIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-sec)]">No. Documento</Label>
                      <Input required placeholder="00000000-0" value={voidForm.numDocSolicita} onChange={e => setVoidForm({...voidForm, numDocSolicita: e.target.value})} className="bg-[var(--bg)]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4">
                <Button type="button" variant="outline" className="font-bold py-6" onClick={() => setVoidModalOpen(false)}>REGRESAR</Button>
                <Button type="submit" variant="destructive" className="font-bold py-6" disabled={voiding}>
                  {voiding ? 'PROCESANDO...' : 'INVALIDAR DOCUMENTO'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL EMAIL --- */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reenviar DTE</DialogTitle>
            <DialogDescription>
              Envíe una copia del PDF y JSON al correo del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Correo electrónico (opcional)</Label>
              <Input 
                type="email" 
                placeholder="Si está vacío se usará el original" 
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleResendEmail} disabled={sendingEmail}>
              {sendingEmail ? 'Enviando...' : 'Enviar Correo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL NOTA DE CRÉDITO/DÉBITO --- */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {noteType === 'CREDITO' ? <FileMinus2 className="text-amber-500" /> : <FilePlus2 className="text-blue-500" />}
              Emitir Nota de {noteType === 'CREDITO' ? 'Crédito' : 'Débito'} - Venta #{selectedSale?.id.toString().padStart(6, '0')}
            </DialogTitle>
            <DialogDescription>
              Ajuste las cantidades de los productos para emitir la nota de {noteType.toLowerCase()}. 
              Los productos con cantidad 0 serán excluidos.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
            <Table>
              <TableHeader className="bg-[var(--bg)]">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cant. Original</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-center w-32">Cant. Ajustar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noteItems.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-bold">{item.product?.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-20 mx-auto text-center h-8"
                        value={item.adjustQuantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newItems = [...noteItems];
                          newItems[index].adjustQuantity = val;
                          setNoteItems(newItems);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleNoteSubmit} disabled={sendingNote} className={noteType === 'CREDITO' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}>
              {sendingNote ? 'Procesando...' : `Confirmar Nota de ${noteType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL REPORTE MENSUAL --- */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Reporte Mensual</DialogTitle>
            <DialogDescription>
              Se enviará un archivo ZIP con todos los PDFs y JSONs del mes seleccionado a su correo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={reportForm.month.toString()} onValueChange={v => setReportForm({...reportForm, month: parseInt(v)})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2000, m - 1).toLocaleString('es-ES', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={reportForm.year.toString()} onValueChange={v => setReportForm({...reportForm, year: parseInt(v)})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input 
                type="email" 
                required
                placeholder="admin@ferreteria.com" 
                value={reportForm.email}
                onChange={e => setReportForm({...reportForm, email: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRequestReport} disabled={requestingReport || !reportForm.email}>
              {requestingReport ? 'Enviando...' : 'Solicitar Reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
