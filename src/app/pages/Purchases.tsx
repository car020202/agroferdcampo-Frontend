import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, FileText, CheckCircle2, AlertCircle, Eye, Plus, 
  Trash2, RefreshCcw, Filter, Calendar as CalendarIcon, Store, Package, Download, X,
  ArrowDownToLine, DollarSign
} from 'lucide-react';
import { useSearchParams } from 'react-router';
import { SupplierManager } from '../components/suppliers/SupplierManager';
import { Payables } from './Payables';
import { purchasesService, PurchaseResponse, CreatePurchaseDto, getSuppliers, UnlinkedPayment } from '../services/purchases.service';
import { searchProducts } from '../services/sales.service';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { Input } from '../components/ui/input';
import { NumberInput } from '../components/ui/number-input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';

export function Purchases() {
  const [activeTab, setActiveTab] = useState<'compras' | 'proveedores' | 'pagar'>('compras');

  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const supplierFilter = searchParams.get('supplier') || 'all';
  const dateFilter = searchParams.get('date') || '';

  const purchasesFilters: FilterConfig[] = useMemo(() => [
    { id: 'supplier', label: 'Proveedor', type: 'category', options: suppliers.map(s => ({ label: s.name, value: s.id.toString() })) },
    { id: 'status', label: 'Estado', type: 'category', options: [
      { label: 'Borrador', value: 'BORRADOR' },
      { label: 'Confirmada', value: 'CONFIRMADA' },
      { label: 'Recibida', value: 'RECIBIDA' },
      { label: 'Cancelada', value: 'CANCELADA' }
    ]},
    { id: 'date', label: 'Fecha Específica', type: 'date_range' }
  ], [suppliers]);

  // Modales
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Nueva Compra
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPurchase, setNewPurchase] = useState<Partial<CreatePurchaseDto>>({ items: [] });
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [savingPurchase, setSavingPurchase] = useState(false);

  // Recepción de Mercadería
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ documentType: 'FACTURA' as any, documentNumber: '', notes: '' });
  const [receiving, setReceiving] = useState(false);
  const [receivedItems, setReceivedItems] = useState<Array<{ productId: number; productName: string; quantity: number; received: number }>>([]);
  
  const [unlinkedPayments, setUnlinkedPayments] = useState<UnlinkedPayment[]>([]);
  const [loadingUnlinkedPayments, setLoadingUnlinkedPayments] = useState(false);
  const [selectedLinkedPaymentId, setSelectedLinkedPaymentId] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'compras') {
      fetchSuppliers();
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, supplierFilter, dateFilter]);

  useEffect(() => {
    if (productSearch.length > 2) {
      const delay = setTimeout(async () => {
        try {
          const res = await searchProducts(productSearch, 1, 10);
          setProductResults(res?.data || []);
        } catch (e) {
          console.error(e);
        }
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setProductResults([]);
    }
  }, [productSearch]);

  const fetchSuppliers = async () => {
    try {
      const res: any = await getSuppliers('', 'true');
      setSuppliers(res.data || res);
    } catch (e) {
      toast.error('Error al cargar proveedores');
    }
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (supplierFilter !== 'all') filters.supplierId = Number(supplierFilter);
      if (dateFilter) filters.startDate = dateFilter;

      const res: any = await purchasesService.getPurchases(filters);
      const items = Array.isArray(res) ? res : res.data || [];
      setPurchases(items);
      setPagination({
        page: res.page || 1,
        limit: res.limit || 20,
        total: res.total || items.length,
        totalPages: res.totalPages || 1
      });
    } catch (error) {
      toast.error('Error al cargar historial de compras');
    } finally {
      setLoading(false);
    }
  };



  const handleOpenDetail = async (purchase: PurchaseResponse) => {
    try {
      const fullPurchase = await purchasesService.getPurchaseDetail(purchase.id);
      setSelectedPurchase(fullPurchase);
      setDetailModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalles de la compra');
    }
  };

  const handleConfirmPurchase = async (id: number) => {
    try {
      await purchasesService.confirmPurchase(id);
      toast.success('Orden de compra confirmada');
      fetchPurchases();
    } catch (e: any) {
      toast.error(e.message || 'Error al confirmar la orden');
    }
  };

  const handleCancelPurchase = async (id: number) => {
    if(!confirm("¿Estás seguro de cancelar esta orden?")) return;
    try {
      await purchasesService.cancelPurchase(id);
      toast.success('Orden cancelada');
      fetchPurchases();
    } catch (e: any) {
      toast.error(e.message || 'Error al cancelar');
    }
  };

  const handleOpenReceiveModal = async (purchase: PurchaseResponse) => {
    try {
      const fullPurchase = await purchasesService.getPurchaseDetail(purchase.id);
      setSelectedPurchase(fullPurchase);
      setReceivedItems(
        fullPurchase.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || 'Producto',
          quantity: item.quantity,
          received: item.quantity
        }))
      );
      setReceiveForm({ documentType: 'FACTURA', documentNumber: '', notes: '' });
      setSelectedLinkedPaymentId('');

      setLoadingUnlinkedPayments(true);
      try {
        const payments = await purchasesService.getUnlinkedPayments();
        setUnlinkedPayments(payments);
      } catch {
        setUnlinkedPayments([]);
      } finally {
        setLoadingUnlinkedPayments(false);
      }

      setReceiveModalOpen(true);
    } catch (e) {
      toast.error('Error al obtener los detalles de la orden');
    }
  };

  const handleReceivePurchaseSubmit = async () => {
    if (!selectedPurchase) return;
    if (!receiveForm.documentNumber) {
      toast.error("El número de documento es obligatorio");
      return;
    }

    for (const item of receivedItems) {
      if (item.received < 0) {
        toast.error(`La cantidad recibida de ${item.productName} no puede ser negativa.`);
        return;
      }
      if (item.received > item.quantity) {
        toast.error(`La cantidad recibida de ${item.productName} (${item.received}) no puede exceder la cantidad ordenada (${item.quantity}).`);
        return;
      }
    }

    setReceiving(true);
    try {
      const payload = {
        notes: receiveForm.notes || `Doc: ${receiveForm.documentType} ${receiveForm.documentNumber}`,
        items: receivedItems.map((item) => ({
          productId: item.productId,
          received: Number(item.received)
        })),
        ...(selectedLinkedPaymentId ? { linkedCashEntryId: Number(selectedLinkedPaymentId) } : {}),
      };

      await purchasesService.receivePurchase(selectedPurchase.id, payload as any);
      toast.success('Mercadería recibida e inventario actualizado');
      setReceiveModalOpen(false);
      fetchPurchases();
    } catch (e: any) {
      toast.error(e.message || 'Error al recibir mercadería');
    } finally {
      setReceiving(false);
    }
  };

  const handleCreatePurchase = async () => {
    if (!newPurchase.supplierId) {
      toast.error("Seleccione un proveedor");
      return;
    }
    if (!newPurchase.items || newPurchase.items.length === 0) {
      toast.error("Agregue al menos un producto");
      return;
    }
    setSavingPurchase(true);
    try {
      const finalNotes = [
        newPurchase.referenceDoc ? `Ref: ${newPurchase.referenceDoc}` : '',
        newPurchase.notes || ''
      ].filter(Boolean).join(' | ');

      await purchasesService.createPurchase({
        supplierId: newPurchase.supplierId,
        notes: finalNotes || undefined,
        items: newPurchase.items.map(i => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity) || 1,
          unitCost: Number(i.unitCost) || 0
        }))
      });
      toast.success('Orden de compra creada como borrador');
      setCreateModalOpen(false);
      setNewPurchase({ items: [] });
      fetchPurchases();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear la orden');
    } finally {
      setSavingPurchase(false);
    }
  };

  const addProductToNewPurchase = (product: any) => {
    setNewPurchase(prev => {
      const items = prev.items || [];
      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        toast.info("El producto ya está en la lista");
        return prev;
      }
      return {
        ...prev,
        items: [...items, { 
          productId: product.id, 
          productName: product.name, 
          quantity: 1, 
          unitCost: product.price // Defaulting to price, user should adjust to cost
        }]
      };
    });
    setProductSearch("");
    setProductResults([]);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'BORRADOR': return <Badge variant="secondary">Borrador</Badge>;
      case 'CONFIRMADA': return <Badge variant="warning" className="bg-blue-500/10 text-blue-600">Confirmada</Badge>;
      case 'RECIBIDA': return <Badge variant="success">Recibida</Badge>;
      case 'CANCELADA': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Compras y Abastecimiento</h1>
          <p className="text-[var(--text-sec)]">Gestiona las órdenes de compra y el directorio de proveedores.</p>
        </div>
        <div className="flex p-1 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
          <button 
            className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'compras' ? 'bg-[var(--card)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-sec)] hover:text-[var(--text-main)]'}`}
            onClick={() => setActiveTab('compras')}
          >
            Órdenes de Compra
          </button>
          <button 
            className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'proveedores' ? 'bg-[var(--card)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-sec)] hover:text-[var(--text-main)]'}`}
            onClick={() => setActiveTab('proveedores')}
          >
            Proveedores
          </button>
          <button 
            className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'pagar' ? 'bg-[var(--card)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-sec)] hover:text-[var(--text-main)]'}`}
            onClick={() => setActiveTab('pagar')}
          >
            Cuentas por Pagar
          </button>
        </div>
      </div>

      {activeTab === 'proveedores' && (
        <SupplierManager />
      )}
      
      {activeTab === 'pagar' && (
        <Payables />
      )}

      {activeTab === 'compras' && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCreateModalOpen(true)} className="font-bold gap-2" variant="premium">
              <Plus size={18} /> Nueva Orden
            </Button>
          </div>

          <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <SmartFilter config={purchasesFilters} />
          </div>

      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Orden</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Pago</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando compras...
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron órdenes con estos filtros
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map(purchase => (
                  <TableRow key={purchase.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell className="font-bold text-[var(--primary)]">
                      OC-{purchase.id.toString().padStart(6, '0')}
                    </TableCell>
                    <TableCell className="text-[var(--text-main)] text-sm">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-[var(--text-main)] block">
                        {purchase.supplier?.name}
                      </span>
                      {purchase.referenceDoc && <span className="text-[10px] text-muted-foreground">Ref: {purchase.referenceDoc}</span>}
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--text-main)]">
                      ${Number(purchase.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(purchase.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={purchase.isPaid ? 'success' : 'outline'}>
                        {purchase.isPaid ? 'PAGADO' : 'PENDIENTE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Opciones</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetail(purchase)} className="font-bold cursor-pointer">
                            <Eye size={14} className="mr-2 text-[var(--primary)]" /> Ver Detalle
                          </DropdownMenuItem>
                          
                          {purchase.status === 'BORRADOR' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleConfirmPurchase(purchase.id)}
                                className="font-bold cursor-pointer text-blue-600"
                              >
                                <CheckCircle2 size={14} className="mr-2" /> Confirmar Orden
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleCancelPurchase(purchase.id)}
                                className="font-bold cursor-pointer text-destructive"
                              >
                                <Trash2 size={14} className="mr-2" /> Cancelar
                              </DropdownMenuItem>
                            </>
                          )}

                          {purchase.status === 'CONFIRMADA' && (
                            <DropdownMenuItem 
                              onClick={() => handleOpenReceiveModal(purchase)}
                              className="font-bold cursor-pointer text-emerald-600"
                            >
                              <ArrowDownToLine size={14} className="mr-2" /> Recibir Mercadería
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
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} órdenes)
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

      {/* --- MODAL CREAR ORDEN --- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Package className="text-[var(--primary)]" />
              Nueva Orden de Compra
            </DialogTitle>
            <DialogDescription>Crea un borrador de compra para enviarlo o confirmarlo con el proveedor.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)]/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={newPurchase.supplierId?.toString()} onValueChange={(v) => setNewPurchase({...newPurchase, supplierId: Number(v)})}>
                  <SelectTrigger className="bg-[var(--card)]"><SelectValue placeholder="Seleccione proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Documento Referencia (Opcional)</Label>
                <Input 
                  placeholder="Ej. Proforma 123" 
                  value={newPurchase.referenceDoc || ''} 
                  onChange={e => setNewPurchase({...newPurchase, referenceDoc: e.target.value})}
                  className="bg-[var(--card)]"
                />
              </div>
            </div>

            <Card className="p-4 border-[var(--border)]">
              <Label className="mb-2 block">Buscar y Agregar Producto</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre o código..." 
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-9"
                />
                {productResults && productResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {productResults.map(p => (
                      <div 
                        key={p.id} 
                        className="p-3 hover:bg-muted cursor-pointer flex justify-between border-b last:border-0"
                        onClick={() => addProductToNewPurchase(p)}
                      >
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-sm text-muted-foreground">Stock: {p.stock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {newPurchase.items && newPurchase.items.length > 0 && (
              <div className="rounded-xl border overflow-hidden bg-[var(--card)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-32 text-right">Costo Unit.</TableHead>
                      <TableHead className="w-32 text-right">Subtotal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newPurchase.items.map((item: any, idx) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-bold text-sm">{item.productName}</TableCell>
                        <TableCell>
                          <NumberInput 
                            value={item.quantity} 
                            onValueChange={(val) => {
                              const newItems = [...newPurchase.items!];
                              newItems[idx].quantity = val || 1;
                              setNewPurchase({...newPurchase, items: newItems});
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <NumberInput 
                            value={item.unitCost} 
                            step={0.01}
                            onValueChange={(val) => {
                              const newItems = [...newPurchase.items!];
                              newItems[idx].unitCost = val || 0;
                              setNewPurchase({...newPurchase, items: newItems});
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right font-black text-[var(--primary)]">
                          ${(Number(item.quantity) * Number(item.unitCost)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" size="icon" 
                            className="text-destructive"
                            onClick={() => {
                              const newItems = newPurchase.items!.filter((_, i) => i !== idx);
                              setNewPurchase({...newPurchase, items: newItems});
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-muted/30 border-t flex justify-end">
                  <p className="text-xl font-black">
                    Total: <span className="text-[var(--primary)]">
                      ${newPurchase.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.unitCost)), 0).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-[var(--card)]">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePurchase} disabled={savingPurchase || !newPurchase.items?.length}>
              {savingPurchase ? 'Guardando...' : 'Guardar Borrador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DETALLE --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-3xl flex flex-col p-0">
          {selectedPurchase && (
            <>
              <DialogHeader className="p-6 border-b">
                <DialogTitle className="flex items-center justify-between pr-8">
                  <span>Orden de Compra OC-{selectedPurchase.id.toString().padStart(6, '0')}</span>
                  {getStatusBadge(selectedPurchase.status)}
                </DialogTitle>
                <DialogDescription className="flex flex-col gap-1">
                  <span>Proveedor: {selectedPurchase.supplier?.name}</span>
                  {selectedPurchase.dueDate && (
                    <span className="text-amber-600 font-bold">
                      Vencimiento de Pago: {new Date(selectedPurchase.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 overflow-y-auto space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant. Solicitada</TableHead>
                      <TableHead className="text-center">Cant. Recibida</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPurchase.items?.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">{item.product?.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-bold">{item.receivedQuantity}</TableCell>
                        <TableCell className="text-right">${Number(item.unitCost).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-black">${Number(item.totalCost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end p-4 border-t">
                  <p className="text-xl font-black">Total: <span className="text-[var(--primary)]">${Number(selectedPurchase.totalAmount).toFixed(2)}</span></p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL RECIBIR MERCADERÍA --- */}
      <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="text-emerald-500" />
              Recibir Mercadería
            </DialogTitle>
            <DialogDescription>
              OC-{selectedPurchase?.id.toString().padStart(6, '0')} - Esto ingresará los productos al inventario inmediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Documento Recibido</Label>
                <Select value={receiveForm.documentType} onValueChange={(v: any) => setReceiveForm({...receiveForm, documentType: v})}>
                  <SelectTrigger className="bg-[var(--card)]"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACTURA">Factura Consumidor Final</SelectItem>
                    <SelectItem value="CREDITO_FISCAL">Comprobante Crédito Fiscal</SelectItem>
                    <SelectItem value="TICKET">Ticket</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de Documento</Label>
                <Input 
                  required 
                  placeholder="Ej. FAC-12345"
                  value={receiveForm.documentNumber}
                  onChange={e => setReceiveForm({...receiveForm, documentNumber: e.target.value})}
                  className="bg-[var(--card)]"
                />
              </div>
              <div className="space-y-2">
                <Label>Notas Adicionales (Opcional)</Label>
                <Input 
                  placeholder="Observaciones de la entrega..."
                  value={receiveForm.notes}
                  onChange={e => setReceiveForm({...receiveForm, notes: e.target.value})}
                  className="bg-[var(--card)]"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Vincular Pago Previo
                  <span className="text-[var(--text-sec)] font-normal text-xs">(Opcional)</span>
                </Label>
                {loadingUnlinkedPayments ? (
                  <p className="text-xs text-[var(--text-sec)] animate-pulse">Buscando pagos registrados...</p>
                ) : unlinkedPayments.length === 0 ? (
                  <p className="text-xs text-[var(--text-sec)] italic">No hay pagos previos sin vincular</p>
                ) : (
                  <Select
                    value={selectedLinkedPaymentId || 'none'}
                    onValueChange={v => setSelectedLinkedPaymentId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="bg-[var(--card)]">
                      <SelectValue placeholder="No vincular" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vincular</SelectItem>
                      {unlinkedPayments.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          ${Number(p.amount).toFixed(2)} — {p.description} ({new Date(p.date).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-[var(--text-sec)]">
                  Si ya registraste el pago a este proveedor en caja, puedes vincularlo aquí.
                </p>
              </div>
            </div>

            <div className="border rounded-xl p-4 bg-[var(--bg)]/50 max-h-[300px] overflow-y-auto space-y-2">
              <Label className="font-bold text-xs uppercase text-[var(--text-sec)]">Cantidades Físicas Recibidas</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs p-2">Producto</TableHead>
                    <TableHead className="text-xs text-center p-2 w-16">Ord.</TableHead>
                    <TableHead className="text-xs text-center p-2 w-24">Recibido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedItems.map((item, idx) => (
                    <TableRow key={item.productId}>
                      <TableCell className="text-xs p-2 font-medium">{item.productName}</TableCell>
                      <TableCell className="text-xs text-center p-2">{item.quantity}</TableCell>
                      <TableCell className="p-1">
                        <NumberInput
                          value={item.received}
                          min={0}
                          max={item.quantity}
                          onValueChange={(val) => {
                            const newItems = [...receivedItems];
                            newItems[idx].received = val || 0;
                            setReceivedItems(newItems);
                          }}
                          className="h-8 text-xs bg-[var(--card)] text-center"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleReceivePurchaseSubmit} disabled={receiving || !receiveForm.documentNumber} className="bg-emerald-600 hover:bg-emerald-700">
              {receiving ? 'Procesando...' : 'Confirmar Recepción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
