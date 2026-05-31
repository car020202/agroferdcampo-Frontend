import React, { useState, useEffect } from 'react';
import { 
  MapPin, Plus, Search, Filter, Truck, User, Play, CheckCircle2, XCircle, Printer, Eye, Trash2, PackageCheck, CalendarIcon
} from 'lucide-react';
import { useSearchParams } from 'react-router';
import { format } from 'date-fns';

const getRouteBadgeColors = (status: string) => {
  switch(status) {
    case 'PLANIFICADA': return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case 'EN_PROCESO': return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case 'COMPLETADA': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case 'CANCELADA': return "bg-red-500/10 text-red-400 border-red-500/30";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
  }
};
import { toast } from 'sonner';
import { apiRequest } from '../config/api';
import { DeliveryRoute, RouteStatus, DeliveryNote } from '../types/transport';
import { ROUTE_STATUS_LABELS, DELIVERY_NOTE_STATUS_LABELS, deliveryNoteStatusColor } from '../utils/transport';
import { useVehicles } from '../hooks/useVehicles';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';

const deliveryRoutesFilters: FilterConfig[] = [
  { id: 'search', label: 'Buscar ruta...', type: 'text', placeholder: 'Nombre o placa...' },
  { id: 'status', label: 'Estado de Ruta', type: 'category', options: Object.entries(ROUTE_STATUS_LABELS).map(([k, v]) => ({ label: v, value: k })) },
  { id: 'date', label: 'Fecha Específica', type: 'date_range' }
];

export default function DeliveryRoutes() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams] = useSearchParams();
  const searchFilter = searchParams.get('search') || '';
  const statusFilter = (searchParams.get('status') as RouteStatus | 'ALL') || 'ALL';
  const startDateFilter = searchParams.get('startDate') || '';
  const endDateFilter = searchParams.get('endDate') || '';
  
  // Create Route Form
  const [createData, setCreateData] = useState<{
    name?: string;
    vehicleId?: number;
    userId?: number;
    scheduledAt?: string;
    zones?: string;
    notes?: string;
  }>({});
  const [conductores, setConductores] = useState<any[]>([]);
  const { vehicles } = useVehicles({ status: 'DISPONIBLE' });
  const [availableNotes, setAvailableNotes] = useState<DeliveryNote[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  // Detail Dialog
  const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchAvailableNotes();
    apiRequest<any>('/users/role/conductor')
      .then(res => {
        const data = res?.data ?? res;
        const items = data?.items ?? data;
        setConductores(Array.isArray(items) ? items : []);
      })
      .catch(console.error);
  }, [statusFilter, searchFilter, startDateFilter, endDateFilter]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      let endpoint = `/delivery-routes?limit=50`;
      if (statusFilter !== 'ALL') endpoint += `&status=${statusFilter}`;
      if (searchFilter) endpoint += `&search=${encodeURIComponent(searchFilter)}`;
      if (startDateFilter) endpoint += `&startDate=${startDateFilter}`;
      if (endDateFilter) endpoint += `&endDate=${endDateFilter}`;
      const res = await apiRequest<any>(endpoint);
      const dataObj = res.data || res;
      setRoutes(Array.isArray(dataObj) ? dataObj : (dataObj.items || []));
    } catch (e) {
      toast.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableNotes = async () => {
    try {
      // Fetch EMITIDO notes without route
      const res = await apiRequest<any>('/delivery-notes?status=EMITIDO&limit=100');
      // We assume the backend filters out those with routeId if we pass something, 
      // but let's filter locally just in case if no parameter is available
      const dataObj = res.data || res;
      const notesArray = Array.isArray(dataObj) ? dataObj : (dataObj.items || dataObj.data || []);
      const notes = notesArray.filter((n: DeliveryNote) => !n.routeId);
      setAvailableNotes(notes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRoute = async () => {
    if (!createData.name || !createData.vehicleId) {
      toast.error('Nombre y vehículo son obligatorios');
      return;
    }
    setCreating(true);
    try {
      await apiRequest('/delivery-routes', {
        method: 'POST',
        body: JSON.stringify({
          name: createData.name,
          vehicleId: createData.vehicleId,
          userId: createData.userId,
          scheduledAt: createData.scheduledAt,
          zones: createData.zones,
          notes: createData.notes,
          deliveryNoteIds: selectedNotes,
        })
      });
      toast.success('Ruta planificada correctamente');
      setCreateData({});
      setSelectedNotes([]);
      fetchRoutes();
      fetchAvailableNotes();
      // Switch back to list tab (requires moving to state if we want to force it, skipping for simplicity)
    } catch (e: any) {
      toast.error(e.message || 'Error al crear ruta');
    } finally {
      setCreating(false);
    }
  };

  const loadRouteDetail = async (route: DeliveryRoute) => {
    try {
      const fullRoute = await apiRequest<DeliveryRoute>(`/delivery-routes/${route.id}`);
      setSelectedRoute(fullRoute);
      setDetailOpen(true);
    } catch (e) {
      toast.error('Error al cargar detalle');
    }
  };

  const handleAction = async (id: number, action: 'start' | 'complete' | 'cancel') => {
    setActionLoading(true);
    try {
      await apiRequest(`/delivery-routes/${id}/${action}`, { method: 'POST', body: JSON.stringify({}) });
      toast.success(`Ruta ${action === 'start' ? 'iniciada' : action === 'complete' ? 'completada' : 'cancelada'}`);
      setDetailOpen(false);
      fetchRoutes();
    } catch (e: any) {
      toast.error(e.message || `Error al ${action} ruta`);
    } finally {
      setActionLoading(false);
    }
  };

  const printRouteSheet = (route: DeliveryRoute) => {
    // Generar un HTML simple para impresión
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita las ventanas emergentes para imprimir');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hoja de Ruta - ${route.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { text-align: center; margin-bottom: 5px; font-size: 18px; }
          .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; margin-top: 50px; }
        </style>
      </head>
      <body onload="window.print(); setTimeout(()=>window.close(), 500);">
        <h1>HOJA DE RUTA</h1>
        <div class="header-info">
          <div>
            <p><strong>Ruta:</strong> ${route.name}</p>
            <p><strong>Vehículo:</strong> ${route.vehicle?.plate || ''} - ${route.vehicle?.brand || ''}</p>
          </div>
          <div>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Conductor:</strong> ${route.user?.fullName || '_________'}</p>
          </div>
        </div>
        
        <h2>Entregas Programadas</h2>
        <table>
          <thead>
            <tr>
              <th>N° Albarán</th>
              <th>Cliente / Destino</th>
              <th>Dirección</th>
              <th>Firma Recibido</th>
            </tr>
          </thead>
          <tbody>
            ${(route.deliveryNotes || []).map((note: any) => `
              <tr>
                <td><strong>DN-${note.id}</strong></td>
                <td>${note.customer?.name || note.toBranch?.name || ''}</td>
                <td>${note.deliveryAddress || ''}</td>
                <td style="height: 50px;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Total paradas: ${(route.deliveryNotes || []).length}</p>
          <div class="signature">Firma Conductor</div>
          <div class="signature">Sello Despacho</div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-main)]">Rutas de Reparto</h1>
        <p className="text-[var(--text-sec)]">Planifica, asigna y controla los despachos diarios.</p>
      </div>

      <Tabs defaultValue="list" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full md:w-auto bg-[var(--card)] border border-[var(--border)] p-1 h-auto">
          <TabsTrigger value="list" className="py-2.5 px-6 font-bold text-sm">Listado de Rutas</TabsTrigger>
          <TabsTrigger value="plan" className="py-2.5 px-6 font-bold text-sm">Planificar Nueva Ruta</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 flex flex-col min-h-0 mt-4 border-0 p-0">
          <div className="mb-4 bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <SmartFilter config={deliveryRoutesFilters} />
          </div>

          <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre / Zonas</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Programada</TableHead>
                    <TableHead className="text-center">Entregas</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center animate-pulse">Cargando...</TableCell></TableRow>
                  ) : !Array.isArray(routes) || routes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center">No hay rutas</TableCell></TableRow>
                  ) : (
                    routes.map(route => (
                      <TableRow key={route.id} className="group hover:bg-[var(--bg)]/30">
                        <TableCell>
                          <span className="font-bold text-[var(--text-main)] block">{route.name}</span>
                          {route.zones && <span className="text-[10px] text-[var(--text-sec)]"><MapPin size={10} className="inline mr-1"/>{route.zones}</span>}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">{route.vehicle?.plate || 'S/A'}</span>
                          <span className="text-xs text-[var(--text-sec)] block">{route.vehicle?.brand}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{route.user?.fullName || 'Sin asignar'}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {route.scheduledAt ? new Date(route.scheduledAt).toLocaleDateString() : 'Sin fecha'}
                        </TableCell>
                        <TableCell className="text-center font-black text-[var(--primary)] text-lg">
                          {route._count?.deliveryNotes || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-bold border ${getRouteBadgeColors(route.status)}`}>
                            {ROUTE_STATUS_LABELS[route.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => loadRouteDetail(route)} title="Ver detalle">
                              <Eye size={18} className="text-[var(--primary)]" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => printRouteSheet(route)} title="Imprimir hoja">
                              <Printer size={18} className="text-[var(--text-sec)]" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="mt-4 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <Card className="lg:col-span-1 p-6 border-[var(--border)] flex flex-col gap-4 overflow-y-auto">
              <h2 className="text-lg font-black text-[var(--text-main)] border-b pb-2">Datos de la Ruta</h2>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-[var(--text-sec)]">Nombre / Identificador *</Label>
                <Input 
                  placeholder="Ej. Zona Norte - Lunes" 
                  value={createData.name || ''}
                  onChange={e => setCreateData({...createData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-[var(--text-sec)]">Vehículo Asignado *</Label>
                <Select value={createData.vehicleId?.toString()} onValueChange={v => setCreateData({...createData, vehicleId: Number(v)})}>
                  <SelectTrigger><SelectValue placeholder="Seleccione vehículo disponible" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.plate} - {v.capacityKg ? `${v.capacityKg}kg` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-[var(--text-sec)]">Conductor Asignado *</Label>
                <Select
                  value={createData.userId?.toString() ?? ''}
                  onValueChange={v => setCreateData({ ...createData, userId: Number(v) })}
                >
                  <SelectTrigger className="bg-[var(--bg)]">
                    <SelectValue placeholder="Seleccione conductor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {conductores.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label className="text-xs font-bold uppercase tracking-wide text-[var(--text-sec)]">Fecha Programada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`justify-start text-left font-normal ${!createData.scheduledAt ? "text-muted-foreground" : ""}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createData.scheduledAt ? format(new Date(createData.scheduledAt + 'T12:00:00'), "dd/MM/yyyy") : <span>dd/mm/aaaa</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={createData.scheduledAt ? new Date(createData.scheduledAt + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const dateString = date.toLocaleDateString('en-CA'); // format YYYY-MM-DD
                          setCreateData({...createData, scheduledAt: dateString});
                        } else {
                          setCreateData({...createData, scheduledAt: undefined});
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-[var(--text-sec)]">Zonas a cubrir</Label>
                <Input 
                  placeholder="Municipios o colonias..."
                  value={createData.zones || ''}
                  onChange={e => setCreateData({...createData, zones: e.target.value})}
                />
              </div>

              <div className="mt-auto pt-6 border-t border-[var(--border)]">
                <Button
                  onClick={handleCreateRoute}
                  disabled={creating || !createData.name || !createData.vehicleId || !createData.userId || selectedNotes.length === 0}
                  className="w-full font-bold bg-[var(--primary)] text-white py-3 text-base"
                >
                  {creating ? (
                    'Guardando...'
                  ) : selectedNotes.length === 0 ? (
                    'Selecciona al menos un albarán'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Guardar Ruta
                      <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
                        {selectedNotes.length} paradas
                      </span>
                    </span>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="lg:col-span-2 border-[var(--border)] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[var(--border)] bg-[var(--bg)]/50">
                <h2 className="font-bold text-[var(--text-main)]">
                  Seleccionar Albaranes Pendientes
                </h2>
                <p className="text-xs text-[var(--text-sec)]">
                  {availableNotes.length} albarán{availableNotes.length !== 1 ? 'es' : ''} disponible{availableNotes.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>N° Albarán</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead className="text-right">Productos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(availableNotes) || availableNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <div className="flex flex-col items-center gap-3 text-[var(--text-sec)]">
                            <PackageCheck size={40} className="opacity-30" />
                            <p className="font-semibold">No hay albaranes pendientes</p>
                            <p className="text-xs max-w-xs">
                              Los albaranes aparecen aquí automáticamente cuando se confirma 
                              una venta o cotización con envío activado.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableNotes.map(note => (
                        <TableRow key={note.id} className={`transition-colors ${
                          selectedNotes.includes(note.id)
                            ? 'bg-[var(--primary)]/10 border-l-4 border-[var(--primary)]'
                            : 'hover:bg-[var(--bg)]/40'
                        }`}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedNotes.includes(note.id)}
                              onCheckedChange={(c) => {
                                if (c) setSelectedNotes([...selectedNotes, note.id]);
                                else setSelectedNotes(selectedNotes.filter(id => id !== note.id));
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-bold text-[var(--primary)]">DN-{note.id}</TableCell>
                          <TableCell>{note.customer?.name || note.toBranch?.name}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={note.deliveryAddress}>{note.deliveryAddress}</TableCell>
                          <TableCell className="text-right font-black">{note.items?.length || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl p-0 flex flex-col bg-[var(--card)] border-[var(--border)]">
          {selectedRoute && (
            <>
              <DialogHeader className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase text-[var(--text-main)]">
                      {selectedRoute.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-2">
                      <Truck size={14}/> {selectedRoute.vehicle?.plate} • {selectedRoute.vehicle?.brand}
                    </DialogDescription>
                  </div>
                  <Badge className={`font-bold text-sm px-3 py-1 border ${getRouteBadgeColors(selectedRoute.status)}`}>
                    {ROUTE_STATUS_LABELS[selectedRoute.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="p-6 overflow-y-auto space-y-4 bg-[var(--bg)]/30">
                <h3 className="font-bold text-[var(--text-main)]">Albaranes Asignados ({selectedRoute.deliveryNotes?.length || 0})</h3>
                <div className="rounded-xl border bg-[var(--card)] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRoute.deliveryNotes?.map(note => (
                        <TableRow key={note.id}>
                          <TableCell className="font-bold">DN-{note.id}</TableCell>
                          <TableCell>{note.customer?.name || note.toBranch?.name}</TableCell>
                          <TableCell className="text-xs">{note.deliveryAddress}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${deliveryNoteStatusColor(note.status)}`}>
                              {DELIVERY_NOTE_STATUS_LABELS[note.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="p-6 border-t bg-[var(--card)] flex gap-2 justify-end">
                <Button variant="outline" onClick={() => printRouteSheet(selectedRoute)}>
                  <Printer size={16} className="mr-2" /> Imprimir Hoja
                </Button>
                
                {selectedRoute.status === 'PLANIFICADA' && (
                  <>
                    <Button variant="destructive" onClick={() => handleAction(selectedRoute.id, 'cancel')} disabled={actionLoading}>
                      <XCircle size={16} className="mr-2" /> Cancelar Ruta
                    </Button>
                    <Button onClick={() => handleAction(selectedRoute.id, 'start')} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Play size={16} className="mr-2" /> Iniciar Ruta
                    </Button>
                  </>
                )}

                {selectedRoute.status === 'EN_PROCESO' && (
                  <Button onClick={() => handleAction(selectedRoute.id, 'complete')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 size={16} className="mr-2" /> Marcar como Completada
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
