import React, { useState, useEffect } from 'react';
import { 
  Search, Eye, Filter, Calendar as CalendarIcon, 
  TruckIcon, CheckCircle2, Trash2, X, PackageCheck, Plus
} from 'lucide-react';
import { toast } from 'sonner';

import { deliveryNotesService, DeliveryNoteResponse, DeliverDeliveryNoteDto, CreateDeliveryNoteDto } from '../services/delivery-notes.service';
import { searchProducts } from '../services/sales.service';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { NumberInput } from '../components/ui/number-input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

export function DeliveryNotes() {
  const [notes, setNotes] = useState<DeliveryNoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const [selectedNote, setSelectedNote] = useState<DeliveryNoteResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverForm, setDeliverForm] = useState<DeliverDeliveryNoteDto>({ items: [] });
  const [delivering, setDelivering] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newNote, setNewNote] = useState<Partial<CreateDeliveryNoteDto>>({ type: 'CLIENTE', items: [] });
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, typeFilter, dateFilter]);

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

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (dateFilter) filters.startDate = dateFilter;

      const res = await deliveryNotesService.getDeliveryNotes(filters);
      setNotes(res.data || []);
      setPagination({
        page: res.page || 1,
        limit: res.limit || 20,
        total: res.total || (res.data || []).length,
        totalPages: res.totalPages || 1
      });
    } catch (e) {
      toast.error('Error al cargar albaranes');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFilter('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleOpenDetail = async (note: DeliveryNoteResponse) => {
    try {
      const fullNote = await deliveryNotesService.getDeliveryNoteDetail(note.id);
      setSelectedNote(fullNote);
      setDetailModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalle');
    }
  };

  const handleCancel = async (id: number) => {
    if(!confirm("¿Estás seguro de cancelar este albarán?")) return;
    try {
      await deliveryNotesService.cancelDeliveryNote(id);
      toast.success('Albarán cancelado');
      fetchNotes();
    } catch (e: any) {
      toast.error(e.message || 'Error al cancelar');
    }
  };

  const handleOpenDeliver = async (note: DeliveryNoteResponse) => {
    try {
      const fullNote = await deliveryNotesService.getDeliveryNoteDetail(note.id);
      setSelectedNote(fullNote);
      setDeliverForm({
        notes: '',
        items: fullNote.items.map(i => ({
          productId: i.productId,
          receivedQty: i.quantity // Por defecto todo
        }))
      });
      setDeliverModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalle para entrega');
    }
  };

  const handleDeliverSubmit = async () => {
    if (!selectedNote) return;
    setDelivering(true);
    try {
      await deliveryNotesService.confirmDelivery(selectedNote.id, deliverForm);
      toast.success('Entrega confirmada exitosamente');
      setDeliverModalOpen(false);
      fetchNotes();
    } catch (e: any) {
      toast.error(e.message || 'Error al confirmar entrega');
    } finally {
      setDelivering(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!newNote.items?.length) {
      toast.error('Agregue al menos un producto');
      return;
    }
    if (newNote.type === 'CLIENTE' && !newNote.customerId) {
      toast.error('Especifique el ID del cliente');
      return;
    }
    if (newNote.type === 'TRASLADO_SUCURSAL' && !newNote.toBranchId) {
      toast.error('Especifique el ID de la sucursal destino');
      return;
    }
    setSavingNote(true);
    try {
      await deliveryNotesService.createDeliveryNote({
        type: newNote.type as 'CLIENTE' | 'TRASLADO_SUCURSAL',
        customerId: newNote.type === 'CLIENTE' ? Number(newNote.customerId) : undefined,
        toBranchId: newNote.type === 'TRASLADO_SUCURSAL' ? Number(newNote.toBranchId) : undefined,
        saleId: newNote.saleId ? Number(newNote.saleId) : undefined,
        notes: newNote.notes,
        items: newNote.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity
        }))
      });
      toast.success('Albarán emitido exitosamente');
      setCreateModalOpen(false);
      setNewNote({ type: 'CLIENTE', items: [] });
      fetchNotes();
    } catch (e: any) {
      toast.error(e.message || 'Error al emitir el albarán');
    } finally {
      setSavingNote(false);
    }
  };

  const addProductToNote = (product: any) => {
    setNewNote(prev => {
      const items: any = prev.items || [];
      const existing = items.find((i: any) => i.productId === product.id);
      if (existing) {
        toast.info("El producto ya está en la lista");
        return prev;
      }
      return {
        ...prev,
        items: [...items, { 
          productId: product.id, 
          productName: product.name, 
          quantity: 1 
        }]
      };
    });
    setProductSearch("");
    setProductResults([]);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'EMITIDO': return <Badge variant="secondary">Emitido</Badge>;
      case 'ENTREGADO': return <Badge variant="success">Entregado</Badge>;
      case 'CON_DIFERENCIAS': return <Badge variant="warning" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Con Diferencias</Badge>;
      case 'CANCELADO': return <Badge variant="destructive">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return <Badge variant="outline" className="text-[var(--text-sec)]">{type.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Albaranes de Entrega</h1>
          <p className="text-[var(--text-sec)]">Gestiona los despachos y entregas de mercadería.</p>
        </div>
        <div className="flex">
          <Button onClick={() => setCreateModalOpen(true)} className="font-bold gap-2" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            <Plus size={18} /> Nuevo Despacho
          </Button>
        </div>
      </div>

      <Card className="p-4 border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-[var(--bg)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CLIENTE">A Cliente</SelectItem>
                <SelectItem value="TRASLADO_SUCURSAL">Traslado a Sucursal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-bold text-[var(--text-sec)] uppercase">Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[var(--bg)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="EMITIDO">Emitido</SelectItem>
                <SelectItem value="ENTREGADO">Entregado</SelectItem>
                <SelectItem value="CON_DIFERENCIAS">Con Diferencias</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
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
                <TableHead>N° Albarán</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando albaranes...
                  </TableCell>
                </TableRow>
              ) : notes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron albaranes con estos filtros
                  </TableCell>
                </TableRow>
              ) : (
                notes.map(note => (
                  <TableRow key={note.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell className="font-bold text-[var(--primary)]">
                      DN-{new Date(note.createdAt).getFullYear()}-{note.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell className="text-[var(--text-main)] text-sm">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(note.type)}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-[var(--text-main)] block">
                        {note.type === 'CLIENTE' ? note.customer?.name || `Cliente #${note.customerId}` : note.toBranch?.name || `Sucursal #${note.toBranchId}`}
                      </span>
                      {note.saleId && <span className="text-[10px] text-muted-foreground">Venta #{note.saleId}</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(note.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Opciones</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetail(note)} className="font-bold cursor-pointer">
                            <Eye size={14} className="mr-2 text-[var(--primary)]" /> Ver Detalle
                          </DropdownMenuItem>
                          
                          {note.status === 'EMITIDO' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleOpenDeliver(note)}
                                className="font-bold cursor-pointer text-emerald-600"
                              >
                                <PackageCheck size={14} className="mr-2" /> Confirmar Entrega
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleCancel(note.id)}
                                className="font-bold cursor-pointer text-destructive"
                              >
                                <Trash2 size={14} className="mr-2" /> Cancelar
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

      {/* --- MODAL DETALLE --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl flex flex-col p-0">
          {selectedNote && (
            <>
              <DialogHeader className="p-6 border-b">
                <DialogTitle className="flex items-center justify-between">
                  <span>Albarán DN-{new Date(selectedNote.createdAt).getFullYear()}-{selectedNote.id.toString().padStart(4, '0')}</span>
                  {getStatusBadge(selectedNote.status)}
                </DialogTitle>
                <DialogDescription>
                  Destino: {selectedNote.type === 'CLIENTE' ? selectedNote.customer?.name : selectedNote.toBranch?.name}
                  {selectedNote.notes && <div className="mt-2 text-xs p-2 bg-muted rounded">Notas: {selectedNote.notes}</div>}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 overflow-y-auto space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant. Solicitada</TableHead>
                      <TableHead className="text-center">Cant. Entregada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedNote.items?.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">{item.product?.name || `Prod #${item.productId}`}</TableCell>
                        <TableCell className="text-center font-bold text-[var(--primary)]">{item.quantity}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-bold">
                          {selectedNote.status === 'EMITIDO' ? '-' : item.receivedQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL CONFIRMAR ENTREGA --- */}
      <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
        <DialogContent className="max-w-2xl flex flex-col p-0">
          {selectedNote && (
            <>
              <DialogHeader className="p-6 border-b">
                <DialogTitle className="flex items-center gap-2 text-emerald-600">
                  <PackageCheck /> Confirmar Entrega Físicamente
                </DialogTitle>
                <DialogDescription>
                  DN-{new Date(selectedNote.createdAt).getFullYear()}-{selectedNote.id.toString().padStart(4, '0')} a {selectedNote.type === 'CLIENTE' ? selectedNote.customer?.name : selectedNote.toBranch?.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-3 text-sm rounded-lg border border-amber-200 dark:border-amber-800/30 font-medium">
                  Modifica la columna "Cant. Real" si el cliente no recibió o rechazó algunos productos. El sistema marcará diferencias automáticamente.
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cant. Original</TableHead>
                        <TableHead className="text-right">Cant. Real</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedNote.items?.map((item, idx) => {
                        const formItem = deliverForm.items.find(i => i.productId === item.productId);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-bold">{item.product?.name}</TableCell>
                            <TableCell className="text-center font-bold text-[var(--text-sec)]">{item.quantity}</TableCell>
                            <TableCell className="text-right flex justify-end">
                              <div className="w-24">
                                <NumberInput 
                                  value={formItem?.receivedQty || 0} 
                                  max={item.quantity}
                                  min={0}
                                  onValueChange={(val) => {
                                    const newItems = [...deliverForm.items];
                                    const itemIdx = newItems.findIndex(i => i.productId === item.productId);
                                    if (itemIdx >= 0) newItems[itemIdx].receivedQty = val || 0;
                                    setDeliverForm({ ...deliverForm, items: newItems });
                                  }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <Label>Notas de Entrega (Opcional)</Label>
                  <Input 
                    placeholder="Ej. El cliente rechazó 1 producto por caja dañada..."
                    value={deliverForm.notes || ''}
                    onChange={(e) => setDeliverForm({ ...deliverForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="p-6 border-t bg-[var(--card)]">
                <Button variant="outline" onClick={() => setDeliverModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleDeliverSubmit} disabled={delivering} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {delivering ? 'Procesando...' : 'Confirmar Entrega'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL CREAR ALBARÁN --- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="flex items-center gap-2 text-2xl text-[var(--primary)]">
              <TruckIcon /> Emitir Nuevo Albarán
            </DialogTitle>
            <DialogDescription>Crea un documento de despacho para salida física de mercadería.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)]/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tipo de Despacho</Label>
                <Select value={newNote.type} onValueChange={(v: any) => setNewNote({...newNote, type: v})}>
                  <SelectTrigger className="bg-[var(--card)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENTE">A Cliente</SelectItem>
                    <SelectItem value="TRASLADO_SUCURSAL">Traslado a Sucursal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID de Venta Vinculada (Opcional)</Label>
                <Input 
                  type="number"
                  placeholder="Ej. 890" 
                  value={newNote.saleId || ''} 
                  onChange={e => setNewNote({...newNote, saleId: e.target.value ? Number(e.target.value) : undefined})}
                  className="bg-[var(--card)]"
                />
              </div>
              {newNote.type === 'CLIENTE' ? (
                <div className="space-y-2">
                  <Label>ID de Cliente (Destino)</Label>
                  <Input 
                    type="number"
                    placeholder="ID del cliente..." 
                    value={newNote.customerId || ''} 
                    onChange={e => setNewNote({...newNote, customerId: e.target.value ? Number(e.target.value) : undefined})}
                    className="bg-[var(--card)]"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>ID Sucursal Destino</Label>
                  <Input 
                    type="number"
                    placeholder="ID sucursal..." 
                    value={newNote.toBranchId || ''} 
                    onChange={e => setNewNote({...newNote, toBranchId: e.target.value ? Number(e.target.value) : undefined})}
                    className="bg-[var(--card)]"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notas Generales (Opcional)</Label>
                <Input 
                  placeholder="Instrucciones de entrega..." 
                  value={newNote.notes || ''} 
                  onChange={e => setNewNote({...newNote, notes: e.target.value})}
                  className="bg-[var(--card)]"
                />
              </div>
            </div>

            <Card className="p-4 border-[var(--border)]">
              <Label className="mb-2 block">Buscar y Agregar Producto</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre..." 
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
                        onClick={() => addProductToNote(p)}
                      >
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-sm text-emerald-600 font-bold">Stock: {p.stock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {newNote.items && newNote.items.length > 0 && (
              <div className="rounded-xl border overflow-hidden bg-[var(--card)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-32 text-center">Cant. a Enviar</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newNote.items.map((item: any, idx) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-bold text-sm">{item.productName}</TableCell>
                        <TableCell>
                          <NumberInput 
                            value={item.quantity} 
                            min={1}
                            onValueChange={(val) => {
                              const newItems = [...newNote.items!];
                              newItems[idx].quantity = val || 1;
                              setNewNote({...newNote, items: newItems});
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" size="icon" 
                            className="text-destructive"
                            onClick={() => {
                              const newItems = newNote.items!.filter((_, i) => i !== idx);
                              setNewNote({...newNote, items: newItems});
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-[var(--card)]">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSubmit} disabled={savingNote || !newNote.items?.length} style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
              {savingNote ? 'Emitiendo...' : 'Emitir Albarán'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
