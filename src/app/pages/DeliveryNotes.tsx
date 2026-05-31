import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Eye, Filter, Calendar as CalendarIcon, 
  TruckIcon, CheckCircle2, Trash2, X, PackageCheck, Plus, Mail, MapPin, PenTool, BarChart3, Camera, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router';

import { deliveryNotesService, DeliveryNoteResponse, DeliverDeliveryNoteDto, CreateDeliveryNoteDto, UpdateDeliveryNoteDto } from '../services/delivery-notes.service';
import { searchProducts } from '../services/sales.service';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { StateCards } from '../components/ui/state-cards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { NumberInput } from '../components/ui/number-input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { useVehicles } from '../hooks/useVehicles';
import { apiRequest } from '../config/api';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';
import { SignaturePad } from '../components/ui/signature/SignaturePad';

export function DeliveryNotes() {
  const [notes, setNotes] = useState<DeliveryNoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const typeFilter = searchParams.get('type') || 'all';
  const dateFilter = searchParams.get('date') || '';
  const vehicleFilter = searchParams.get('vehicle') || 'all';
  const routeFilter = searchParams.get('route') || 'all';
  const transportQuery = searchParams.get('transport');
  const withTransportFilter = transportQuery === 'true' ? true : (transportQuery === 'false' ? false : 'all');

  const { vehicles } = useVehicles({ status: 'ALL' });
  const [routesList, setRoutesList] = useState<any[]>([]);

  const [stats, setStats] = useState({ total: 0, emitidos: 0, entregados: 0, conDiferencias: 0 });

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverForm, setDeliverForm] = useState<DeliverDeliveryNoteDto>({ items: [] });
  const [delivering, setDelivering] = useState(false);

  // Email state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailNote, setEmailNote] = useState<DeliveryNoteResponse | null>(null);
  const [destinationEmail, setDestinationEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Assign Transport state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<UpdateDeliveryNoteDto>({});
  const [assigning, setAssigning] = useState(false);

  // Close with observation state
  const [closeObservationModalOpen, setCloseObservationModalOpen] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [closingNote, setClosingNote] = useState<any>(null);
  const [closing, setClosing] = useState(false);

  const deliveryNotesFilters: FilterConfig[] = useMemo(() => [
    { id: 'status', label: 'Estado', type: 'category', options: [
      { label: 'Emitido', value: 'EMITIDO' },
      { label: 'Entregado', value: 'ENTREGADO' },
      { label: 'Con Diferencias', value: 'CON_DIFERENCIAS' },
      { label: 'Cancelado', value: 'CANCELADO' }
    ]},
    { id: 'transport', label: 'Transporte', type: 'category', options: [
      { label: 'Con Transporte', value: 'true' },
      { label: 'Sin Transporte', value: 'false' }
    ]},
    { id: 'vehicle', label: 'Vehículo', type: 'category', options: Array.isArray(vehicles) ? vehicles.map((v: any) => ({ label: v.plate, value: v.id.toString() })) : [] },
    { id: 'route', label: 'Ruta', type: 'category', options: Array.isArray(routesList) ? routesList.map((r: any) => ({ label: r.name, value: r.id.toString() })) : [] },
    { id: 'date', label: 'Fecha Específica', type: 'date_range' }
  ], [vehicles, routesList]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
      fetchStats();
    }, 300);
    return () => clearTimeout(timer);
  }, [pagination.page, statusFilter, typeFilter, dateFilter, vehicleFilter, routeFilter, withTransportFilter]);

  const fetchRoutes = async () => {
    try {
      const res = await apiRequest<any>('/delivery-routes?limit=100');
      const dataObj = res.data || res;
      setRoutesList(Array.isArray(dataObj) ? dataObj : (dataObj.items || []));
    } catch(e) {}
  };

  const fetchStats = async () => {
    try {
      const url = dateFilter ? `/delivery-notes/stats?startDate=${dateFilter}&endDate=${dateFilter}` : '/delivery-notes/stats';
      const res = await apiRequest<any>(url);
      setStats({
        total: res.total || 0,
        emitidos: res.emitidos || 0,
        entregados: res.entregados || 0,
        conDiferencias: res.conDiferencias || 0,
      });
    } catch(e) {}
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const filters: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (dateFilter) filters.startDate = dateFilter;
      if (vehicleFilter !== 'all') filters.vehicleId = Number(vehicleFilter);
      if (routeFilter !== 'all') filters.routeId = Number(routeFilter);
      if (withTransportFilter !== 'all') filters.requiresTransport = withTransportFilter;

      const res = await deliveryNotesService.getDeliveryNotes(filters) as any;
      
      // El backend ahora devuelve { data: [...], total, page, limit, totalPages }
      const items = res.data ?? res.items ?? (Array.isArray(res) ? res : []);
      setNotes(items);
      setPagination({
        page: res.page || 1,
        limit: res.limit || 20,
        total: res.total || items.length,
        totalPages: res.totalPages || 1,
      });
    } catch (e) {
      toast.error('Error al cargar albaranes');
    } finally {
      setLoading(false);
    }
  };



  const handleOpenDetail = async (note: DeliveryNoteResponse) => {
    try {
      const fullNote = await deliveryNotesService.getDeliveryNoteDetail(note.id);
      setSelectedNote(fullNote);
      setDetailModalOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error('Error al cargar detalle: ' + (e.message || 'Desconocido'));
    }
  };

  const handleCancel = async (id: number) => {
    if(!confirm("¿Estás seguro de cancelar este albarán?")) return;
    try {
      await deliveryNotesService.cancelDeliveryNote(id);
      toast.success('Albarán cancelado');
      fetchNotes();
      fetchStats();
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
        clientSignedBy: '',
        clientSignature: '',
        proofPhoto: '',
        items: fullNote.items.map(i => ({
          productId: i.productId,
          receivedQty: i.quantity
        }))
      });
      setDeliverModalOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalle para entrega');
    }
  };

  const handleTotalRejection = () => {
    if (!selectedNote) return;
    setDeliverForm({
      ...deliverForm,
      notes: deliverForm.notes ? `${deliverForm.notes}\nRechazado en su totalidad.` : 'Rechazado en su totalidad.',
      items: selectedNote.items.map((i: any) => ({
        productId: i.productId,
        receivedQty: 0
      }))
    });
    toast.info('Se han puesto todas las cantidades a cero.');
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setDeliverForm(prev => ({ ...prev, proofPhoto: base64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeliverSubmit = async () => {
    if (!selectedNote) return;
    if (selectedNote.requiresTransport && !deliverForm.clientSignedBy) {
      toast.error('Debe ingresar el nombre de quien recibe');
      return;
    }
    setDelivering(true);
    try {
      await deliveryNotesService.confirmDelivery(selectedNote.id, deliverForm);
      toast.success('Entrega confirmada exitosamente');
      setDeliverModalOpen(false);
      fetchNotes();
      fetchStats();
      if (detailModalOpen) {
        handleOpenDetail(selectedNote); // Refresh detail
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al confirmar entrega');
    } finally {
      setDelivering(false);
    }
  };

  const handleCloseWithObservation = async () => {
    if (!closingNote) return;
    if (!observationText.trim()) {
      toast.error('Debe ingresar una observación');
      return;
    }
    setClosing(true);
    try {
      await deliveryNotesService.closeWithObservation(closingNote.id, observationText);
      toast.success('Albarán cerrado correctamente');
      setCloseObservationModalOpen(false);
      setObservationText('');
      setClosingNote(null);
      fetchNotes();
      fetchStats();
      if (detailModalOpen) {
        handleOpenDetail(closingNote);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al cerrar el albarán');
    } finally {
      setClosing(false);
    }
  };

  const handleOpenAssign = (note: DeliveryNoteResponse) => {
    setSelectedNote(note);
    setAssignForm({
      vehicleId: note.vehicleId || undefined,
      scheduledAt: note.scheduledAt ? note.scheduledAt.split('T')[0] : undefined,
    });
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedNote) return;
    setAssigning(true);
    try {
      await deliveryNotesService.updateDeliveryNote(selectedNote.id, assignForm);
      toast.success('Transporte asignado correctamente');
      setAssignModalOpen(false);
      fetchNotes();
      fetchStats();
      if (detailModalOpen) {
        handleOpenDetail(selectedNote); // Refresh detail
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al asignar transporte');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenEmailModal = (note: DeliveryNoteResponse) => {
    setEmailNote(note);
    setDestinationEmail(note.type === 'CLIENTE' ? '' : ''); 
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailNote) return;
    if (!destinationEmail || !destinationEmail.includes('@')) {
      toast.error('Ingrese un correo electrónico válido');
      return;
    }
    setSendingEmail(true);
    try {
      await deliveryNotesService.resendEmail(emailNote.id, destinationEmail);
      toast.success('Correo de albarán enviado correctamente');
      setEmailModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar correo');
    } finally {
      setSendingEmail(false);
    }
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
          <p className="text-xs text-[var(--text-sec)] italic">
            Los albaranes se generan automáticamente al confirmar ventas 
            o cotizaciones con envío activado.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <StateCards
          cards={[
            {
              label: "Total Documentos",
              value: stats.total || 0,
              icon: BarChart3,
              color: "var(--primary)"
            },
            {
              label: "Emitidos Pts",
              value: stats.emitidos || 0,
              icon: TruckIcon,
              color: "#d97706"
            },
            {
              label: "Entregados OK",
              value: stats.entregados || 0,
              icon: CheckCircle2,
              color: "#059669"
            },
            {
              label: "Diferencias",
              value: stats.conDiferencias || 0,
              icon: PenTool,
              color: "#ea580c"
            }
          ]}
        />
      </div>

      <div className="mb-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <SmartFilter config={deliveryNotesFilters} />
      </div>

      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Albarán</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Vehículo / Ruta</TableHead>
                <TableHead>Programado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center animate-pulse">Cargando...</TableCell></TableRow>
              ) : notes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center font-medium">No se encontraron albaranes</TableCell></TableRow>
              ) : (
                notes.map((note: any) => (
                  <TableRow key={note.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell className="font-bold text-[var(--primary)]">
                      {note.number}
                    </TableCell>
                    <TableCell className="text-[var(--text-main)] text-sm">
                      {note.issuedAt 
                        ? new Date(note.issuedAt).toLocaleDateString('es-SV') 
                        : new Date(note.createdAt).toLocaleDateString('es-SV')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-bold text-[var(--text-main)] block">
                          {note.type === 'CLIENTE' 
                            ? note.customer?.name || (note.saleId ? `Venta #${note.saleId}` : 'Consumidor Final')
                            : note.toBranch?.name || `Sucursal #${note.toBranchId}`}
                        </span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {note.saleId && (
                            <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600">
                              Venta #{note.saleId}
                            </Badge>
                          )}
                          {note.requiresTransport && (
                            <Badge variant="outline" className="text-[10px] border-[var(--primary)] text-[var(--primary)]">
                              Transporte
                            </Badge>
                          )}
                          {note.type === 'TRASLADO_SUCURSAL' && (
                            <Badge variant="outline" className="text-[10px]">Traslado</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {note.vehicle ? (
                        <div className="text-sm">
                          <span className="font-bold">{note.vehicle.plate}</span>
                          {note.vehicle.brand && <span className="text-muted-foreground text-xs ml-1">{note.vehicle.brand}</span>}
                          <br/>
                          {note.route?.user?.fullName 
                            ? <span className="text-xs text-[var(--text-sec)]">
                                Conductor: {note.route.user.fullName}
                              </span>
                            : note.driver?.fullName 
                              ? <span className="text-xs text-[var(--text-sec)]">
                                  {note.driver.fullName}
                                </span>
                              : <span className="text-xs text-[var(--text-sec)] italic">
                                  Se asigna en la ruta
                                </span>
                          }
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {note.scheduledAt ? new Date(note.scheduledAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(note.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Opciones</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenDetail(note); }} className="font-bold cursor-pointer">
                            <Eye size={14} className="mr-2 text-[var(--primary)]" /> Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEmailModal(note)} className="font-bold cursor-pointer text-blue-600">
                            <Mail size={14} className="mr-2" /> Enviar Notificación
                          </DropdownMenuItem>
                          {note.status === 'EMITIDO' && (
                            <>
                              {note.requiresTransport && (
                                <DropdownMenuItem onClick={() => handleOpenAssign(note)} className="font-bold cursor-pointer text-amber-600">
                                  <TruckIcon size={14} className="mr-2" /> Asignar Transporte
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleOpenDeliver(note)} className="font-bold cursor-pointer text-emerald-600">
                                <PackageCheck size={14} className="mr-2" /> {note.requiresTransport ? 'Registrar Entrega en Campo' : 'Confirmar Entrega'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(note.id)} className="font-bold cursor-pointer text-destructive">
                                <Trash2 size={14} className="mr-2" /> Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                          {note.status === 'CON_DIFERENCIAS' && (
                            <>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenDetail(note); }} className="font-bold cursor-pointer text-amber-600">
                                <Eye size={14} className="mr-2" /> Ver Diferencias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setClosingNote(note); setCloseObservationModalOpen(true); }} className="font-bold cursor-pointer text-emerald-600">
                                <CheckCircle2 size={14} className="mr-2" /> Cerrar con Observación
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
          <div className="p-4 border-t flex items-center justify-between bg-[var(--bg)]/5">
            <p className="text-xs font-bold text-[var(--text-sec)]">Página {pagination.page} de {pagination.totalPages} ({pagination.total})</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLE */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl flex flex-col p-0">
          {selectedNote && (
            <>
              <DialogHeader className="p-6 border-b">
                <DialogTitle className="flex items-center justify-between">
                  <span>Albarán {selectedNote.number}</span>
                  {getStatusBadge(selectedNote.status)}
                </DialogTitle>
                <DialogDescription>
                  Destino: {selectedNote.type === 'CLIENTE' ? selectedNote.customer?.name : selectedNote.toBranch?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 overflow-y-auto space-y-6">
                
                {selectedNote.requiresTransport && (
                  <Card className="p-4 border-[var(--border)] bg-blue-50/50 dark:bg-blue-900/10">
                    <h3 className="font-bold text-[var(--text-main)] mb-3 flex items-center gap-2"><TruckIcon size={18}/> Información de Transporte</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-[var(--text-sec)]">Vehículo:</span> <span className="font-bold">{selectedNote.vehicle?.plate || 'Pendiente'}</span></div>
                      <div><span className="text-[var(--text-sec)]">Conductor:</span> <span className="font-bold">{selectedNote.driver?.fullName || 'Sin asignar'}</span></div>
                      <div><span className="text-[var(--text-sec)]">Ruta:</span> <span className="font-bold">{selectedNote.route?.name || 'Sin ruta'}</span></div>
                      <div><span className="text-[var(--text-sec)]">Fecha Prog.:</span> <span className="font-bold">{selectedNote.scheduledAt ? new Date(selectedNote.scheduledAt).toLocaleDateString() : '-'}</span></div>
                      <div><span className="text-[var(--text-sec)]">Despacho:</span> <span className="font-bold">{selectedNote.dispatchType}</span></div>
                      <div className="col-span-2"><span className="text-[var(--text-sec)]">Dirección:</span> <span className="font-bold">{selectedNote.deliveryAddress}</span></div>
                      {selectedNote.clientSignedBy && (
                        <div className="col-span-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-xl mt-2">
                          <p className="text-emerald-800 dark:text-emerald-300 font-bold">Firma de Recibido:</p>
                          <p>{selectedNote.clientSignedBy}</p>
                          <p className="text-xs opacity-70">{new Date(selectedNote.deliveredAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant. Solicitada</TableHead>
                      <TableHead className="text-center">Cant. Entregada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedNote.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">{item.product?.name}</TableCell>
                        <TableCell className="text-center font-bold text-[var(--primary)]">{item.quantity}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-bold">{selectedNote.status === 'EMITIDO' ? '-' : item.receivedQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter className="p-4 border-t">
                {selectedNote.status === 'EMITIDO' && selectedNote.requiresTransport && (
                  <Button onClick={() => { setDetailModalOpen(false); handleOpenDeliver(selectedNote); }} className="bg-emerald-600 text-white">
                    Registrar Entrega en Campo
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR ENTREGA (Signature) */}
      <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
        <DialogContent className="max-w-5xl sm:max-w-5xl p-0 flex flex-col md:flex-row h-auto max-h-[90vh] md:h-[85vh] bg-[var(--bg)] border-[var(--border)] overflow-y-auto md:overflow-hidden rounded-2xl shadow-2xl">
          {selectedNote && (
            <>
              {/* Left Column: Details & Items */}
              <div className="flex-none md:flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
                
                <DialogHeader className="p-6 md:p-8 border-b border-[var(--border)]/50 relative z-10">
                  <DialogTitle className="flex items-center gap-3 text-2xl text-[var(--text-main)] font-bold">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-500 rounded-xl shadow-inner">
                      <PackageCheck size={26} strokeWidth={2.5} />
                    </div>
                    Confirmar Entrega
                  </DialogTitle>
                  <DialogDescription className="text-[var(--text-sec)] text-base mt-3 flex flex-col gap-1">
                    <span>Albarán <strong className="text-[var(--text-main)]">#{selectedNote.number}</strong></span>
                    <span>Destino: <strong className="text-[var(--text-main)]">{selectedNote.type === 'CLIENTE' ? selectedNote.customer?.name || 'Consumidor Final' : selectedNote.toBranch?.name}</strong></span>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="p-6 md:p-8 overflow-visible md:overflow-y-auto space-y-8 flex-none md:flex-1 scrollbar-thin">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-bold text-[var(--text-main)]">Cantidades a Entregar</Label>
                      <Button variant="outline" size="sm" onClick={handleTotalRejection} className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-colors rounded-xl">
                        <Ban size={16} className="mr-2"/> Rechazo Total
                      </Button>
                    </div>
                    
                    <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--card)] shadow-sm">
                      <Table>
                        <TableHeader className="bg-[var(--bg)]/50">
                          <TableRow className="border-[var(--border)]">
                            <TableHead className="font-semibold text-[var(--text-sec)]">Producto</TableHead>
                            <TableHead className="text-center font-semibold text-[var(--text-sec)]">Cant. Original</TableHead>
                            <TableHead className="text-right font-semibold text-[var(--text-sec)] pr-6">Cant. Real</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedNote.items?.map((item: any) => {
                            const formItem = deliverForm.items.find(i => i.productId === item.productId);
                            const isDiff = formItem?.receivedQty !== item.quantity;
                            return (
                              <TableRow key={item.id} className={`border-[var(--border)] transition-colors ${isDiff ? 'bg-amber-500/5 dark:bg-amber-500/10' : 'hover:bg-[var(--bg)]/50'}`}>
                                <TableCell className="font-semibold text-[var(--text-main)] py-4">{item.product?.name}</TableCell>
                                <TableCell className="text-center font-bold text-[var(--text-sec)] py-4">{item.quantity}</TableCell>
                                <TableCell className="text-right flex justify-end py-3 pr-4">
                                  <div className="w-28">
                                    <NumberInput value={formItem?.receivedQty || 0} max={item.quantity} min={0} onValueChange={(val) => {
                                      const newItems = [...deliverForm.items];
                                      const idx = newItems.findIndex(i => i.productId === item.productId);
                                      if (idx >= 0) newItems[idx].receivedQty = val || 0;
                                      setDeliverForm({ ...deliverForm, items: newItems });
                                    }}/>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
                    <Label className="text-base font-bold text-[var(--text-main)]">Notas u Observaciones (Opcional)</Label>
                    <textarea 
                      className="w-full flex min-h-[100px] rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-main)] ring-offset-background placeholder:text-[var(--text-sec)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-all resize-none"
                      placeholder="Ej. El cliente rechazó 1 producto porque la caja estaba húmeda..." 
                      value={deliverForm.notes || ''} 
                      onChange={e => setDeliverForm({ ...deliverForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Evidence & Signatures */}
              <div className="w-full md:w-[420px] flex flex-col bg-[var(--card)] relative z-20 md:shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
                <div className="p-6 md:p-8 flex-none md:flex-1 overflow-visible md:overflow-y-auto space-y-8 scrollbar-thin">
                  {selectedNote.requiresTransport && (
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Nombre del Receptor *
                        </Label>
                        <Input 
                          placeholder="Nombre o DPI de quien recibe..." 
                          value={deliverForm.clientSignedBy || ''} 
                          onChange={e => setDeliverForm({...deliverForm, clientSignedBy: e.target.value})}
                          className="h-12 border-[var(--border)] bg-[var(--bg)] focus-visible:ring-emerald-500 text-base rounded-xl font-medium"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Firma Digital</Label>
                        <SignaturePad 
                          onSignatureChange={(sig) => setDeliverForm({...deliverForm, clientSignature: sig || undefined})} 
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-[var(--text-sec)] uppercase tracking-wider">Evidencia Fotográfica</Label>
                    {!deliverForm.proofPhoto ? (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[var(--border)] rounded-2xl cursor-pointer hover:bg-[var(--bg)] transition-all group hover:border-emerald-500/50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-[var(--text-sec)] group-hover:text-emerald-500 transition-colors">
                          <div className="p-4 bg-[var(--bg)] rounded-full mb-3 group-hover:bg-emerald-500/10 transition-colors shadow-sm">
                            <Camera className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-bold">Capturar o Subir Foto</p>
                          <p className="text-xs mt-1 opacity-70">Opcional • JPG o PNG</p>
                        </div>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm group">
                        <img src={deliverForm.proofPhoto} alt="Evidencia" className="w-full h-48 object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="rounded-full px-5 py-2 h-auto text-sm font-bold shadow-lg"
                            onClick={() => setDeliverForm({...deliverForm, proofPhoto: undefined})}
                          >
                            <Trash2 size={16} className="mr-2"/> Eliminar Foto
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6 md:p-8 border-t border-[var(--border)] bg-[var(--bg)]/50 flex flex-col gap-3 backdrop-blur-md">
                  <Button 
                    onClick={handleDeliverSubmit} 
                    disabled={delivering} 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-14 text-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] rounded-xl"
                  >
                    {delivering ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Procesando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><CheckCircle2 size={22}/> Confirmar Entrega</span>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setDeliverModalOpen(false)} 
                    className="w-full h-12 text-[var(--text-sec)] hover:text-[var(--text-main)] hover:bg-[var(--border)]/50 rounded-xl font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL ASIGNAR TRANSPORTE */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600"><TruckIcon /> Asignar Transporte</DialogTitle>
            <DialogDescription>
              {selectedNote && `Albarán ${selectedNote.number} - Destino: ${selectedNote.type === 'CLIENTE' ? selectedNote.customer?.name || 'Consumidor Final' : selectedNote.toBranch?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vehículo</Label>
              <Select 
                value={assignForm.vehicleId ? String(assignForm.vehicleId) : 'none'} 
                onValueChange={v => setAssignForm({
                  ...assignForm, 
                  vehicleId: v === 'none' ? undefined : Number(v)
                })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccione vehículo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vehículo</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.plate} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>Fecha Programada (Opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`justify-start text-left font-normal ${!assignForm.scheduledAt ? "text-muted-foreground" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {assignForm.scheduledAt ? format(new Date(assignForm.scheduledAt + 'T12:00:00'), "dd/MM/yyyy") : <span>dd/mm/aaaa</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={assignForm.scheduledAt ? new Date(assignForm.scheduledAt + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const dateString = date.toLocaleDateString('en-CA');
                        setAssignForm({...assignForm, scheduledAt: dateString});
                      } else {
                        setAssignForm({...assignForm, scheduledAt: undefined});
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssignSubmit} disabled={assigning} className="bg-amber-600 text-white hover:bg-amber-700">{assigning ? 'Asignando...' : 'Asignar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CERRAR CON OBSERVACIÓN */}
      <Dialog open={closeObservationModalOpen} onOpenChange={setCloseObservationModalOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 /> Cerrar con Observación
            </DialogTitle>
            <DialogDescription>
              {closingNote && `Albarán ${closingNote.number} tiene diferencias. Ingresa una nota para cerrarlo.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Observación *</Label>
              <textarea 
                className="w-full flex min-h-[80px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Ej. El cliente reportó que faltaban 2 piezas..."
                value={observationText}
                onChange={e => setObservationText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCloseObservationModalOpen(false); setObservationText(''); setClosingNote(null); }}>Cancelar</Button>
            <Button onClick={handleCloseWithObservation} disabled={closing || !observationText.trim()} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {closing ? 'Cerrando...' : 'Cerrar Albarán'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
