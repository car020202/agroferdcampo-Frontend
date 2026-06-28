import React, { useState, useEffect } from 'react';
import { 
  MapPin, Plus, Search, Filter, Truck, User, Play, CheckCircle2, XCircle, Printer, Eye, Trash2, PackageCheck, CalendarIcon
} from 'lucide-react';
import { useSearchParams } from 'react-router';
import { format } from 'date-fns';
import logoUrl from '../../assets/logo.png';

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
import { Checkbox } from '../components/ui/checkbox';
import { SmartFilter, FilterConfig } from '../components/ui/smart-filter';

const deliveryRoutesFilters: FilterConfig[] = [
  { id: 'search', label: 'Buscar ruta...', type: 'text', placeholder: 'Nombre o placa...' },
  { id: 'status', label: 'Estado de Ruta', type: 'category', options: Object.entries(ROUTE_STATUS_LABELS).map(([k, v]) => ({ label: v, value: k })) },
  { id: 'date', label: 'Fecha Específica', type: 'date_range' }
];

export default function DeliveryRoutes({ hideTitle }: { hideTitle?: boolean } = {}) {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'plan'>('list');
  
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
  const { vehicles } = useVehicles({ status: 'ALL' });
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
      const res = await apiRequest<any>('/delivery-notes?status=EMITIDO&type=CLIENTE&limit=100');
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
      const res = await apiRequest<any>(`/delivery-routes/${route.id}`);
      setSelectedRoute(res.data || res);
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
    // Usar un iframe oculto para no abrir ventanas nuevas
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error('Error al iniciar la impresión');
      document.body.removeChild(iframe);
      return;
    }

    const formatDate = (dateString?: Date | string) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('es-SV', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    };
    
    const formatMoney = (amount?: string | number) => {
      if (amount === undefined || amount === null) return '$0.00';
      return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(amount));
    };

    let pagesHtml = '';

    // --- PÁGINA 1: HOJA DE RUTA PRINCIPAL ---
    pagesHtml += `
      <div class="header">
        <div class="logo-container">
          <img src="${logoUrl}" class="header-logo" alt="Logo" />
          <div class="logo-text">
            <h2>Agroferr D'Campo</h2>
            <p>Sistema de Logística y Reparto</p>
          </div>
        </div>
        <div class="header-title">
          <h1 class="text-xl font-black uppercase" style="color: var(--accent);">Hoja de Ruta</h1>
          <p class="text-sm text-gray mt-1 font-bold">Generada el ${new Date().toLocaleDateString('es-SV')} a las ${new Date().toLocaleTimeString('es-SV')}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Identificador de Ruta</span>
          <span class="info-value text-lg font-bold">${route.name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fecha Programada</span>
          <span class="info-value">${formatDate(route.scheduledAt) || 'Sin fecha'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Vehículo</span>
          <span class="info-value">${route.vehicle?.plate || 'N/A'} - ${route.vehicle?.brand || ''}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Conductor</span>
          <span class="info-value">${route.user?.fullName || 'N/A'}</span>
        </div>
      </div>

      <h2 class="text-lg font-bold mb-4 uppercase">Entregas Programadas (${(route.deliveryNotes || []).length})</h2>
      <table>
        <thead>
          <tr>
            <th>N° Doc.</th>
            <th>Tipo</th>
            <th>Cliente / Destino</th>
            <th>Dirección</th>
            <th class="center">Firma Recibido</th>
          </tr>
        </thead>
        <tbody>
          ${(route.deliveryNotes || []).map((note: any) => `
            <tr>
              <td class="font-bold">DN-${note.id}</td>
              <td>
                ${note.sale ? `<span class="font-bold">Venta #${note.sale.id}</span>` : 'Albarán/Traslado'}
              </td>
              <td class="font-bold">${note.customer?.name || note.toBranch?.name || 'S/N'}</td>
              <td class="text-sm">${note.deliveryAddress || 'Sin dirección registrada'}</td>
              <td style="width: 150px; height: 50px;"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="signatures">
        <div class="signature-line">Firma de Despacho<br><span style="font-weight:400; font-size:10px; color:#666;">(Autorización de salida)</span></div>
        <div class="signature-line">Firma de Conductor<br><span style="font-weight:400; font-size:10px; color:#666;">(Aceptación de carga)</span></div>
      </div>
    `;

    // --- PÁGINAS SIGUIENTES: DETALLES DE CADA FACTURA/ALBARÁN ---
    if (route.deliveryNotes && route.deliveryNotes.length > 0) {
      route.deliveryNotes.forEach((note: any) => {
        const isSale = !!note.sale;
        const items = isSale ? note.sale.items : note.items;
        const totalAmount = isSale ? note.sale.totalAmount : null;
        
        pagesHtml += `
          <div class="page-break"></div>
          
          <div class="header">
            <div class="logo-container">
              <img src="${logoUrl}" class="header-logo" alt="Logo" />
              <div class="logo-text">
                <h2>Agroferr D'Campo</h2>
                <p>Sistema de Facturación y Despacho</p>
              </div>
            </div>
            <div class="header-title">
              <h1 class="text-xl font-black uppercase" style="color: var(--accent);">${isSale ? 'Factura de Venta' : 'Albarán de Despacho'}</h1>
              <p class="text-sm text-gray mt-1 font-bold">Ruta: ${route.name} | Doc: DN-${note.id}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">${isSale ? 'Número de Venta' : 'Número de Documento'}</span>
              <span class="info-value text-lg font-bold">${isSale ? `Venta #${note.sale.id}` : `DN-${note.id}`}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha de Emisión</span>
              <span class="info-value">${formatDate(note.issuedAt)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${isSale ? 'Cliente' : 'Destinatario'}</span>
              <span class="info-value font-bold">${note.customer?.name || note.toBranch?.name || 'Consumidor Final'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Dirección de Entrega</span>
              <span class="info-value">${note.deliveryAddress || 'Retiro en tienda'}</span>
            </div>
          </div>

          <h2 class="text-lg font-bold mb-4 uppercase">Detalle de Productos</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Cód.</th>
                <th>Descripción del Producto</th>
                <th class="center" style="width: 80px;">Cant.</th>
                ${isSale ? '<th class="right" style="width: 100px;">Precio U.</th>' : ''}
                ${isSale ? '<th class="right" style="width: 100px;">Subtotal</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${(items || []).map((item: any) => `
                <tr>
                  <td class="text-sm text-gray">${item.product?.id || '-'}</td>
                  <td class="font-bold">${item.product?.name || 'Producto Desconocido'}</td>
                  <td class="center font-black text-lg">${Number(item.quantity)}</td>
                  ${isSale ? `<td class="right">${formatMoney(item.unitPrice)}</td>` : ''}
                  ${isSale ? `<td class="right font-bold">${formatMoney(item.totalPrice)}</td>` : ''}
                </tr>
              `).join('')}
              ${(!items || items.length === 0) ? `<tr><td colspan="5" class="center">Sin productos detallados</td></tr>` : ''}
            </tbody>
          </table>
          
          <div class="clearfix">
            ${isSale ? `
              <div class="totals-box">
                <div class="totals-row">
                  <span>Subtotal:</span>
                  <span>${formatMoney(Number(totalAmount) - Number(note.sale.taxAmount || 0))}</span>
                </div>
                <div class="totals-row">
                  <span>Impuestos:</span>
                  <span>${formatMoney(note.sale.taxAmount || 0)}</span>
                </div>
                <div class="totals-row grand-total">
                  <span>TOTAL:</span>
                  <span>${formatMoney(totalAmount)}</span>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="signatures" style="margin-top: ${isSale ? '20px' : '60px'};">
            <div class="signature-line">Entregado por<br><span style="font-weight:400; font-size:10px; color:#666;">(Firma del Conductor)</span></div>
            <div class="signature-line">Recibido por<br><span style="font-weight:400; font-size:10px; color:#666;">(Nombre y Firma del Cliente)</span></div>
          </div>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impresión de Ruta - ${route.name}</title>
        <style>
          :root {
            --primary: #111827;
            --secondary: #6b7280;
            --accent: #d97706; /* Amber 600 */
            --border: #e5e7eb;
            --bg-light: #fffbeb; /* Amber 50 */
          }
          body { 
            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 15mm 20mm; 
            color: var(--primary);
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { 
            size: letter; 
            margin: 0; 
          }
          .page-break { page-break-before: always; }
          
          /* Typography & Utilities */
          h1, h2, h3, p { margin: 0; }
          .text-sm { font-size: 12px; }
          .text-base { font-size: 14px; }
          .text-lg { font-size: 16px; }
          .text-xl { font-size: 24px; }
          .font-bold { font-weight: 700; }
          .font-black { font-weight: 900; }
          .text-gray { color: var(--secondary); }
          .text-right { text-align: right; }
          .uppercase { text-transform: uppercase; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-1 { margin-top: 4px; }

          /* Layout Components */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid var(--accent);
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .header-logo { height: 70px; object-fit: contain; }
          .logo-text h2 { font-size: 18px; font-weight: 900; color: var(--primary); margin: 0; }
          .logo-text p { font-size: 11px; color: var(--secondary); margin: 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
          .header-title { text-align: right; }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 32px;
            padding: 16px;
            background: #fafafa;
            border-radius: 8px;
            border: 1px solid var(--border);
            border-left: 4px solid var(--accent);
          }
          .info-item { display: flex; flex-direction: column; gap: 4px; }
          .info-label { font-size: 10px; font-weight: 800; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px; }
          .info-value { font-size: 14px; font-weight: 700; color: var(--primary); }

          /* Tables */
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; font-size: 13px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
          th { 
            background: #fef3c7; 
            color: #b45309; 
            font-weight: 900; 
            text-transform: uppercase; 
            font-size: 10px;
            letter-spacing: 1px;
            padding: 12px 14px; 
            text-align: left; 
            border-bottom: 2px solid #fcd34d;
          }
          th.right { text-align: right; }
          th.center { text-align: center; }
          td { 
            padding: 12px 14px; 
            border-bottom: 1px solid var(--border); 
            vertical-align: middle;
          }
          tr:last-child td { border-bottom: none; }
          td.right { text-align: right; }
          td.center { text-align: center; }
          tr:nth-child(even) td { background: #fafaf9; }
          
          /* Totals */
          .totals-box {
            width: 300px;
            float: right;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 40px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
            font-weight: 600;
          }
          .totals-row:last-child { border-bottom: none; }
          .totals-row.grand-total {
            background: #fef3c7;
            color: #b45309;
            font-size: 16px;
            font-weight: 900;
          }
          .clearfix::after { content: ""; clear: both; display: table; }

          /* Signatures */
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 60px;
            page-break-inside: avoid;
          }
          .signature-line {
            width: 250px;
            border-top: 2px solid var(--primary);
            text-align: center;
            padding-top: 8px;
            font-weight: 700;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Removemos el iframe después de un tiempo prudencial
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {!hideTitle && (
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Rutas de Reparto</h1>
          <p className="text-[var(--text-sec)]">Planifica, asigna y controla los despachos diarios.</p>
        </div>
      )}

      <div className="flex border-b border-[var(--border)] mb-4">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === 'list' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          Listado de Rutas
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === 'plan' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-sec)]'
          }`}
        >
          Planificar Nueva Ruta
        </button>
      </div>

      {activeTab === 'list' && (
        <div className="flex-1 flex flex-col min-h-0">
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
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="flex-1 flex flex-col min-h-0">
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
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.plate} - {v.capacityKg ? `${v.capacityKg}kg` : ''} {v.status !== 'DISPONIBLE' ? `(${v.status})` : ''}
                      </SelectItem>
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
        </div>
      )}

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
                <h3 className="font-bold text-[var(--text-main)]">Facturas / Albaranes Asignados ({selectedRoute.deliveryNotes?.length || 0})</h3>
                <div className="space-y-4">
                  {selectedRoute.deliveryNotes?.map((note: any) => {
                    const isSale = !!note.sale;
                    const itemsToShow = isSale ? note.sale.items : note.items;
                    const totalAmount = isSale ? note.sale.totalAmount : null;
                    
                    return (
                      <Card key={note.id} className="border border-[var(--border)] overflow-hidden">
                        {/* Cabecera del Albarán */}
                        <div className="bg-[var(--bg)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)]">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-lg text-[var(--primary)]">DN-{note.id}</span>
                              <Badge variant="outline" className={`text-[10px] ${deliveryNoteStatusColor(note.status)}`}>
                                {DELIVERY_NOTE_STATUS_LABELS[note.status as keyof typeof DELIVERY_NOTE_STATUS_LABELS]}
                              </Badge>
                              {isSale && (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                  Venta #{note.sale.id}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-1">
                              <User size={14} className="text-[var(--text-sec)]" /> 
                              {note.customer?.name || note.toBranch?.name || 'Cliente sin nombre'}
                            </p>
                            <p className="text-xs text-[var(--text-sec)] flex items-center gap-1 mt-1">
                              <MapPin size={12} /> {note.deliveryAddress || 'Retiro en tienda / Sin dirección'}
                            </p>
                          </div>
                          
                          {isSale && (
                            <div className="text-right">
                              <p className="text-xs text-[var(--text-sec)] uppercase tracking-wide font-bold">Total Factura</p>
                              <p className="text-xl font-black text-emerald-600">
                                {new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(totalAmount))}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Detalle de Productos */}
                        <div className="p-0">
                          <Table>
                            <TableHeader className="bg-[var(--bg)]/50">
                              <TableRow>
                                <TableHead className="text-xs py-2 h-auto">Cód.</TableHead>
                                <TableHead className="text-xs py-2 h-auto">Producto</TableHead>
                                <TableHead className="text-xs py-2 h-auto text-center">Cant.</TableHead>
                                {isSale && <TableHead className="text-xs py-2 h-auto text-right">Precio U.</TableHead>}
                                {isSale && <TableHead className="text-xs py-2 h-auto text-right">Subtotal</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {itemsToShow?.map((item: any, idx: number) => (
                                <TableRow key={idx} className="hover:bg-transparent">
                                  <TableCell className="py-2 text-xs text-[var(--text-sec)]">{item.product?.id}</TableCell>
                                  <TableCell className="py-2 text-sm font-medium">{item.product?.name}</TableCell>
                                  <TableCell className="py-2 text-sm text-center font-bold">{Number(item.quantity)}</TableCell>
                                  {isSale && (
                                    <TableCell className="py-2 text-sm text-right text-[var(--text-sec)]">
                                      ${Number(item.unitPrice).toFixed(4)}
                                    </TableCell>
                                  )}
                                  {isSale && (
                                    <TableCell className="py-2 text-sm text-right font-bold text-[var(--text-main)]">
                                      ${Number(item.totalPrice).toFixed(4)}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                              {!itemsToShow?.length && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-xs text-[var(--text-sec)] py-4">
                                    No hay productos detallados
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    );
                  })}
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
