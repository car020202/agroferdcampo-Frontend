import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, FileText, CheckCircle2, AlertCircle, Eye, Plus, 
  Trash2, RefreshCcw, Filter, Calendar as CalendarIcon, Store, Package, Download, X,
  ArrowDownToLine, DollarSign, Printer
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
import { Switch } from '../components/ui/switch';

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
        applyrent: newPurchase.applyrent,
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
          unitCost: product.price, // Defaulting to price, user should adjust to cost
          unitType: product.unit,
          unitFactor: 1,
          baseUnit: product.unit,
          productUnits: product.units || []
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
      case 'RECIBIDA_TOTAL': return <Badge variant="success">Recibida Total</Badge>;
      case 'RECIBIDA_PARCIAL': return <Badge variant="warning">Recibida Parcial</Badge>;
      case 'CANCELADA': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  const printPurchaseOrder = async (purchaseItem: PurchaseResponse) => {
    try {
      const fullPurchase = await purchasesService.getPurchaseDetail(purchaseItem.id);
      
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

      const logoUrl = '/icon.png';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Orden de Abastecimiento OC-${fullPurchase.id}</title>
          <style>
            :root {
              --primary: #111827;
              --secondary: #6b7280;
              --accent: #d97706; /* Amber 600 */
              --border: #e5e7eb;
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
            @page { size: letter; margin: 0; }
            h1, h2, h3, p { margin: 0; }
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
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="${logoUrl}" class="header-logo" alt="Logo" onerror="this.style.display='none'" />
              <div class="logo-text">
                <h2>Agroferr D'Campo</h2>
                <p>Orden de Abastecimiento</p>
              </div>
            </div>
            <div class="header-title">
              <h1 style="color: var(--accent); font-size: 24px; font-weight: 900; text-transform: uppercase;">Orden de Compra</h1>
              <p style="font-size: 14px; font-weight: 700; color: var(--secondary); margin-top: 4px;">OC-${fullPurchase.id.toString().padStart(6, '0')}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Proveedor</span>
              <span class="info-value" style="font-size: 18px;">${fullPurchase.supplier?.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha de Emisión</span>
              <span class="info-value">${formatDate(fullPurchase.createdAt)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span class="info-value">${fullPurchase.status}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Notas</span>
              <span class="info-value" style="font-weight: normal; font-size: 12px;">${fullPurchase.notes || 'N/A'}</span>
            </div>
          </div>

          <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase;">Detalle de Productos</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Cód.</th>
                <th>Descripción del Producto</th>
                <th class="center" style="width: 80px;">Cant.</th>
                <th class="right" style="width: 100px;">Costo U.</th>
                <th class="right" style="width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(fullPurchase.items || []).map((item: any) => `
                <tr>
                  <td style="font-size: 12px; color: var(--secondary);">${item.product?.id || '-'}</td>
                  <td style="font-weight: 700;">${item.product?.name || 'Producto Desconocido'}</td>
                  <td class="center" style="font-weight: 900; font-size: 16px;">${item.quantity}</td>
                  <td class="right">${formatMoney(item.unitCost)}</td>
                  <td class="right" style="font-weight: 700;">${formatMoney(item.totalCost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="clearfix">
            <div class="totals-box">
              <div class="totals-row grand-total">
                <span>TOTAL:</span>
                <span>${formatMoney(fullPurchase.totalAmount)}</span>
              </div>
            </div>
          </div>
          
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

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    } catch (error: any) {
      toast.error('Error al generar la impresión');
    }
  };

  const printPaymentReceipt = async (purchaseItem: PurchaseResponse) => {
    try {
      const fullPurchase = await purchasesService.getPurchaseDetail(purchaseItem.id);
      
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

      const logoUrl = '/icon.png';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recibo de Pago Proveedor - OC-${fullPurchase.id}</title>
          <style>
            :root {
              --primary: #111827;
              --secondary: #6b7280;
              --accent: #059669; /* Emerald 600 */
              --border: #e5e7eb;
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
            @page { size: letter; margin: 0; }
            h1, h2, h3, p { margin: 0; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid var(--accent);
              padding-bottom: 16px;
              margin-bottom: 30px;
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
            .receipt-amount {
              text-align: center;
              padding: 30px;
              background: #ecfdf5;
              border: 2px dashed #34d399;
              border-radius: 16px;
              margin-bottom: 40px;
            }
            .receipt-amount p {
              font-size: 14px;
              color: #065f46;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .receipt-amount h2 {
              font-size: 48px;
              font-weight: 900;
              color: #047857;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 60px;
            }
            .info-item { display: flex; flex-direction: column; gap: 4px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
            .info-label { font-size: 12px; font-weight: 700; color: var(--secondary); text-transform: uppercase; }
            .info-value { font-size: 16px; font-weight: 700; color: var(--primary); }
            
            .signatures {
              display: flex;
              justify-content: space-around;
              margin-top: 100px;
            }
            .signature-line {
              width: 250px;
              border-top: 2px solid var(--primary);
              text-align: center;
              padding-top: 8px;
              font-weight: 700;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="${logoUrl}" class="header-logo" alt="Logo" onerror="this.style.display='none'" />
              <div class="logo-text">
                <h2>Agroferr D'Campo</h2>
                <p>Comprobante de Pago a Proveedor</p>
              </div>
            </div>
            <div class="header-title">
              <h1 style="color: var(--accent); font-size: 24px; font-weight: 900; text-transform: uppercase;">Recibo de Pago</h1>
              <p style="font-size: 14px; font-weight: 700; color: var(--secondary); margin-top: 4px;">Generado el ${new Date().toLocaleDateString('es-SV')}</p>
            </div>
          </div>

          <div class="receipt-amount">
            <p>Monto Pagado</p>
            <h2>${formatMoney(fullPurchase.totalAmount)}</h2>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Proveedor</span>
              <span class="info-value">${fullPurchase.supplier?.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha de Orden</span>
              <span class="info-value">${formatDate(fullPurchase.createdAt)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Orden Relacionada</span>
              <span class="info-value">OC-${fullPurchase.id.toString().padStart(6, '0')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Documento Referencia</span>
              <span class="info-value">${fullPurchase.referenceDoc || 'N/A'}</span>
            </div>
          </div>

          <div class="signatures">
            <div class="signature-line">Entregado por<br><span style="font-weight:400; font-size:12px; color:#666;">(Agroferr D'Campo)</span></div>
            <div class="signature-line">Recibido por<br><span style="font-weight:400; font-size:12px; color:#666;">(Nombre y Firma del Proveedor)</span></div>
          </div>
          
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

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    } catch (error: any) {
      toast.error('Error al generar la impresión');
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
                      ${Number(purchase.totalAmount).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(purchase.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={purchase.isPaid ? 'success' : 'warning'}>
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

                          <DropdownMenuItem onClick={() => printPurchaseOrder(purchase)} className="font-bold cursor-pointer text-[var(--primary)]">
                            <Printer size={14} className="mr-2" /> Imprimir Orden
                          </DropdownMenuItem>
                          
                          {purchase.isPaid && (
                            <DropdownMenuItem onClick={() => printPaymentReceipt(purchase)} className="font-bold cursor-pointer text-emerald-600">
                              <DollarSign size={14} className="mr-2" /> Imprimir Recibo Pago
                            </DropdownMenuItem>
                          )}
                          
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
              <div className="space-y-2 flex flex-col justify-center">
                <div className="flex items-center gap-3 mt-4">
                  <Switch 
                    checked={newPurchase.applyrent || false} 
                    onCheckedChange={checked => setNewPurchase({...newPurchase, applyrent: checked})}
                    id="applyrent"
                  />
                  <Label htmlFor="applyrent" className="font-bold cursor-pointer">
                    Retener 10% de Renta (Sujeto Excluido)
                  </Label>
                </div>
                <p className="text-[10px] text-[var(--text-sec)]">
                  Marque esta opción si la compra es a un Sujeto Excluido y se trata de servicios u honorarios.
                </p>
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
                        <TableCell className="font-bold text-sm">
                          <p>{item.productName}</p>
                          {item.productUnits && item.productUnits.length > 0 ? (
                            <Select 
                              value={item.unitType} 
                              onValueChange={(val) => {
                                const selectedUnit = item.productUnits.find((u: any) => u.unit === val);
                                const factor = selectedUnit ? selectedUnit.factor : 1;
                                const newItems = [...newPurchase.items!];
                                newItems[idx].unitType = val;
                                newItems[idx].unitFactor = factor;
                                setNewPurchase({...newPurchase, items: newItems});
                              }}
                            >
                              <SelectTrigger className="h-6 w-fit text-[10px] p-1 mt-1 bg-[var(--bg)] border-[var(--border)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={item.baseUnit}>{item.baseUnit}</SelectItem>
                                {item.productUnits.map((u: any) => (
                                  <SelectItem key={u.id} value={u.unit}>{u.unit}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="mt-1 text-[9px] w-fit font-black h-4 px-1 leading-none">
                              {item.unitType}
                            </Badge>
                          )}
                        </TableCell>
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
                          ${(Number(item.quantity) * Number(item.unitCost)).toFixed(4)}
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
                      ${newPurchase.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.unitCost)), 0).toFixed(4)}
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
                        <TableCell className="text-right">${Number(item.unitCost).toFixed(4)}</TableCell>
                        <TableCell className="text-right font-black">${Number(item.totalCost).toFixed(4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end p-4 border-t">
                  <p className="text-xl font-black">Total: <span className="text-[var(--primary)]">${Number(selectedPurchase.totalAmount).toFixed(4)}</span></p>
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
                          ${Number(p.amount).toFixed(4)} — {p.description} ({new Date(p.date).toLocaleDateString()})
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
