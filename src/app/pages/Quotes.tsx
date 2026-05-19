import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, Eye, CheckCircle2, AlertCircle, Calendar as CalendarIcon, RefreshCcw, Filter, X
} from 'lucide-react';
import { quotesService, QuoteResponse } from '../services/quotes.service';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';

export function Quotes() {
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modales
  const [selectedQuote, setSelectedQuote] = useState<QuoteResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, dateFilter]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (dateFilter) filters.startDate = dateFilter;

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

  const resetFilters = () => {
    setStatusFilter('all');
    setDateFilter('');
    setPagination(p => ({ ...p, page: 1 }));
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

  const handleConfirmQuote = async (quote: QuoteResponse) => {
    setConfirmingId(quote.id);
    try {
      await quotesService.confirmQuote(quote.id);
      toast.success('Cotización confirmada y venta generada');
      fetchQuotes();
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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDIENTE': return <Badge variant="warning">Pendiente</Badge>;
      case 'CONFIRMADA': return <Badge variant="success">Confirmada</Badge>;
      case 'CANCELADA': return <Badge variant="destructive">Cancelada</Badge>;
      case 'EXPIRADA': return <Badge variant="outline">Expirada</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Cotizaciones</h1>
          <p className="text-[var(--text-sec)]">Gestiona las cotizaciones de clientes y conviértelas en ventas.</p>
        </div>
      </div>

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
                <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmadas</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
                <SelectItem value="EXPIRADA">Expiradas</SelectItem>
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
                <TableHead>N° Cotiz</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vence En</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando cotizaciones...
                  </TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[var(--text-sec)] font-medium">
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
                        {new Date(quote.expiresAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--text-main)]">
                      ${Number(quote.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(quote.status)}
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
                          
                          {quote.status === 'PENDIENTE' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleConfirmQuote(quote)} 
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
          className="flex flex-col p-0 overflow-hidden bg-[var(--card)] border-[var(--border)] max-w-3xl"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Cliente</p>
                    <p className="font-bold text-[var(--text-main)]">{selectedQuote.customer?.name || 'Consumidor Final'}</p>
                  </div>
                  <div className="bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                    <p className="text-[10px] font-bold text-[var(--text-sec)] uppercase">Estado</p>
                    <div className="mt-1">{getStatusBadge(selectedQuote.status)}</div>
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
                          <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-black text-[var(--primary)]">${Number(item.totalPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)] flex justify-end">
                    <p className="text-xl font-black">Total: <span className="text-[var(--primary)]">${Number(selectedQuote.totalAmount).toFixed(2)}</span></p>
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
