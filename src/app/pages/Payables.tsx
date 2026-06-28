import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, AlertCircle, Plus, Eye, History, CreditCard, DollarSign, Upload, X as XIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { purchasesService, PurchaseResponse, PayPurchaseDto } from '../services/purchases.service';
import { uploadsService } from '../services/uploads.service';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { NumberInput } from '../components/ui/number-input';

export function Payables() {
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  
  // Modals
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseResponse | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Payment Form
  const [paymentForm, setPaymentForm] = useState<PayPurchaseDto>({
    paymentMethod: 'EFECTIVO',
    cashSource: 'CAJA_GENERAL',
    paymentRef: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [transferReceiptFile, setTransferReceiptFile] = useState<File | null>(null);
  const [transferReceiptPreview, setTransferReceiptPreview] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, [pagination.page]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      // Filtrar compras no pagadas y que no estén canceladas ni en borrador
      const res = await purchasesService.getPurchases({ 
        page: pagination.page, 
        limit: pagination.limit,
        isPaid: 'false'
      });
      
      // Filtrar borrador y cancelada
      const items = Array.isArray(res) ? res : res.data || [];
      const validPurchases = items.filter(
        (p: PurchaseResponse) => p.status !== 'BORRADOR' && p.status !== 'CANCELADA'
      );

      setPurchases(validPurchases);
      setPagination({
        page: (res as any).page || 1,
        limit: (res as any).limit || 20,
        total: (res as any).total || validPurchases.length,
        totalPages: (res as any).totalPages || 1
      });
    } catch (e) {
      toast.error('Error al cargar cuentas por pagar');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (purchase: PurchaseResponse) => {
    const total = Number(purchase.totalAmount) || 0;
    setSelectedPurchase(purchase);
    setPaymentForm({
      paymentMethod: 'EFECTIVO',
      cashSource: 'CAJA_GENERAL',
      paymentRef: ''
    });
    setTransferReceiptFile(null);
    setTransferReceiptPreview('');
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPurchase) return;
    setSavingPayment(true);
    try {
      let transferReceiptUrl: string | undefined;

      if (transferReceiptFile && paymentForm.paymentMethod === 'TRANSFERENCIA') {
        setUploadingReceipt(true);
        try {
          const uploaded = await uploadsService.uploadReceipt(transferReceiptFile);
          transferReceiptUrl = uploaded.url;
        } finally {
          setUploadingReceipt(false);
        }
      }

      await purchasesService.payPurchase(selectedPurchase.id, {
        ...paymentForm,
        ...(transferReceiptUrl ? { transferReceiptUrl } : {}),
      });
      toast.success('Pago a proveedor registrado correctamente');
      setPaymentModalOpen(false);
      setTransferReceiptFile(null);
      setTransferReceiptPreview('');
      fetchPurchases();
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar pago');
    } finally {
      setSavingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'CONFIRMADA': return <Badge variant="warning">Confirmada</Badge>;
      case 'RECIBIDA_PARCIAL': return <Badge variant="warning">Recibida Parcial</Badge>;
      case 'RECIBIDA_TOTAL': return <Badge variant="success">Recibida Total</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateTotalDebt = () => {
    return purchases.reduce((acc, p) => acc + Number(p.totalAmount), 0);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title removed for unified view */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="px-5 py-4 flex items-center justify-between border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <DollarSign size={18} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-sec)]">Deuda Mostrada</p>
          </div>
          <p className="text-xl font-black text-[var(--text-main)]">
            ${calculateTotalDebt().toFixed(4)}
          </p>
        </Card>
        
        <Card className="px-5 py-4 flex items-center justify-between border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <FileText size={18} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-sec)]">Facturas Pendientes</p>
          </div>
          <p className="text-xl font-black text-[var(--text-main)]">
            {purchases.length}
          </p>
        </Card>
      </div>

      <div className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)] flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Orden Ref.</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Total a Pagar</TableHead>
                <TableHead className="text-center">Estado OC</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[var(--text-sec)] animate-pulse">
                    Cargando cuentas por pagar...
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron cuentas pendientes
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map(purchase => (
                  <TableRow key={purchase.id} className="group hover:bg-[var(--bg)]/30">
                    <TableCell>
                      <span className="font-bold text-[var(--text-main)] block">
                        {purchase.supplier?.name ?? `Proveedor #${purchase.supplierId}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      OC-{purchase.id.toString().padStart(6, '0')}
                      <br/>
                      <span className="text-xs text-[var(--text-sec)]">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        if (!purchase.dueDate) return '-';
                        const dateToUse = new Date(purchase.dueDate);
                        const isOverdue = dateToUse < new Date();
                        return (
                          <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>
                            {dateToUse.toLocaleDateString()}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-black text-[var(--primary)]">
                      ${Number(purchase.totalAmount).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(purchase.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenPayment(purchase)} className="text-emerald-600 hover:bg-emerald-600/10" title="Registrar Pago">
                          <DollarSign size={18} />
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

      {/* REGISTRAR PAGO */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
            <DialogDescription>
              {selectedPurchase?.supplier?.name ?? `Proveedor #${selectedPurchase?.supplierId}`} — Total: ${Number(selectedPurchase?.totalAmount || 0).toFixed(4)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Origen de Fondos</Label>
              <Select 
                value={paymentForm.cashSource} 
                onValueChange={(val) => setPaymentForm({...paymentForm, cashSource: val as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAJA_GENERAL">Caja General</SelectItem>
                  <SelectItem value="CAJA_CHICA">Caja Chica</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Selecciona de dónde se descontará el dinero.</p>
            </div>
            
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(val) => setPaymentForm({...paymentForm, paymentMethod: val as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Referencia (Opcional)</Label>
              <Input 
                placeholder="N° Transacción, Cheque..." 
                value={paymentForm.paymentRef || ''}
                onChange={e => setPaymentForm({...paymentForm, paymentRef: e.target.value})}
              />
            </div>

            {paymentForm.paymentMethod === 'TRANSFERENCIA' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Captura de Pantalla de Transferencia
                  <span className="text-[var(--text-sec)] font-normal text-xs">(Opcional)</span>
                </Label>

                {transferReceiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-[var(--border)] group">
                    <img
                      src={transferReceiptPreview}
                      alt="Comprobante de transferencia"
                      className="w-full max-h-48 object-contain bg-[var(--bg)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setTransferReceiptFile(null);
                        setTransferReceiptPreview('');
                      }}
                      className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border)] rounded-xl p-6 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors">
                    <Upload size={22} className="text-[var(--text-sec)]" />
                    <span className="text-sm text-[var(--text-sec)] font-medium">
                      Haz clic para adjuntar la captura
                    </span>
                    <span className="text-xs text-[var(--text-sec)]">JPG, PNG o WEBP — máx. 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('La imagen no puede superar 5MB');
                          return;
                        }
                        setTransferReceiptFile(file);
                        const reader = new FileReader();
                        reader.onload = ev => setTransferReceiptPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={savingPayment || uploadingReceipt}
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              {uploadingReceipt ? 'Subiendo imagen...' : savingPayment ? 'Registrando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
