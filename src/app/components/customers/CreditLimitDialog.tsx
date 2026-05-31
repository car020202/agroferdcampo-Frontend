import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { apiRequest } from '../../config/api';
import { toast } from 'sonner';
import { CreditCard, FileText, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { creditService, CreditDocument, CreditDocumentStatus, CreateCreditDocumentDto } from '../../services/credit.service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CreditLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  onSuccess: () => void;
}

export function CreditLimitDialog({ open, onOpenChange, customer, onSuccess }: CreditLimitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [creditLimit, setCreditLimit] = useState<number | string>('');

  // Documents State
  const [docs, setDocs] = useState<CreditDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [newDoc, setNewDoc] = useState<CreateCreditDocumentDto>({
    documentType: 'DUI',
    documentName: '',
    status: 'SOLICITADO',
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setCreditLimit(Number(customer.creditLimit) || 0);
      if (open) fetchDocs(customer.id);
    }
  }, [customer, open]);

  const fetchDocs = async (customerId: number) => {
    setLoadingDocs(true);
    try {
      const data = await creditService.getDocuments(customerId);
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSubmitLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setLoading(true);

    try {
      await apiRequest(`/customers/${customer.id}/credit-limit`, {
        method: 'PATCH',
        body: JSON.stringify({ creditLimit: Number(creditLimit) }),
      });

      toast.success('Límite de crédito actualizado exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar límite de crédito');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDocStatus = async (doc: CreditDocument, nextStatus: CreditDocumentStatus) => {
    if (doc.status === nextStatus) return;
    try {
      await creditService.updateDocument(doc.id, {
        status: nextStatus,
        receivedAt: nextStatus === 'RECIBIDO' ? new Date().toISOString() : undefined,
      });
      toast.success(`Documento marcado como ${nextStatus}`);
      fetchDocs(customer.id);
    } catch {
      toast.error('Error al actualizar documento');
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await creditService.deleteDocument(docId);
      toast.success('Documento eliminado');
      fetchDocs(customer.id);
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const handleSaveDoc = async () => {
    if (!customer) return;
    if (!newDoc.documentName.trim()) {
      toast.error('El nombre del documento es obligatorio');
      return;
    }
    setSavingDoc(true);
    try {
      await creditService.createDocument(customer.id, newDoc);
      toast.success('Documento agregado');
      setShowAddForm(false);
      setNewDoc({ documentType: 'DUI', documentName: '', status: 'SOLICITADO', notes: '' });
      fetchDocs(customer.id);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar documento');
    } finally {
      setSavingDoc(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <CreditCard className="text-[var(--primary)]" />
            Crédito para: {customer?.name}
          </DialogTitle>
          <DialogDescription>
            Gestiona el límite de crédito y los documentos formales requeridos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* LEFT: Límite de Crédito */}
          <div className="border-r border-[var(--border)] pr-0 md:pr-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-[var(--primary)]" />
              Límite de Crédito
            </h3>
            <form onSubmit={handleSubmitLimit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Límite Autorizado ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--text-sec)]">
                    $
                  </span>
                  <Input 
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={creditLimit} 
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="pl-8 text-lg font-black"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-[var(--text-sec)]">
                  Si el límite es $0.00, las ventas al crédito serán bloqueadas para este cliente.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl flex-1"
                >
                  Cerrar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  variant="default"
                  className="font-bold shadow-xl rounded-xl flex-1 h-11"
                >
                  {loading ? 'Guardando...' : 'Asignar Límite'}
                </Button>
              </div>
            </form>
          </div>

          {/* RIGHT: Documentos Formales */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText size={18} className="text-[var(--primary)]" />
                Documentos Formales
              </h3>
              {!showAddForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="gap-1 font-bold"
                >
                  <Plus size={14} /> Solicitar
                </Button>
              )}
            </div>

            {showAddForm ? (
              <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg)]/50 space-y-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de Documento</Label>
                  <Select value={newDoc.documentType} onValueChange={(v: any) => setNewDoc({...newDoc, documentType: v})}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DUI">DUI</SelectItem>
                      <SelectItem value="NIT">NIT</SelectItem>
                      <SelectItem value="COMPROBANTE_INGRESOS">Ingresos</SelectItem>
                      <SelectItem value="RECIBO_SERVICIOS">Servicios</SelectItem>
                      <SelectItem value="FIADOR">Fiador</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Nombre o Descripción</Label>
                  <Input className="h-8 text-sm" value={newDoc.documentName} onChange={e => setNewDoc({...newDoc, documentName: e.target.value})} placeholder="Ej. DUI titular" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Estado</Label>
                  <Select value={newDoc.status} onValueChange={(v: any) => setNewDoc({...newDoc, status: v})}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLICITADO">Solicitado</SelectItem>
                      <SelectItem value="RECIBIDO">Recibido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveDoc} disabled={savingDoc}>
                    {savingDoc ? 'Guardando...' : 'Guardar Documento'}
                  </Button>
                </div>
              </div>
            ) : null}

            {loadingDocs ? (
              <p className="text-sm text-[var(--text-sec)] animate-pulse">Cargando...</p>
            ) : docs.length === 0 && !showAddForm ? (
              <div className="border rounded-xl p-6 text-center text-[var(--text-sec)] bg-[var(--bg)]/30">
                <FileText size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No hay documentos registrados para este cliente.</p>
              </div>
            ) : docs.length > 0 ? (
              <div className="border rounded-xl overflow-hidden shadow-sm bg-[var(--card)]">
                <Table>
                  <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Documento</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <p className="font-bold text-xs">{doc.documentName}</p>
                          <span className="text-[10px] text-[var(--text-sec)] uppercase tracking-wider">{doc.documentType}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={doc.status} 
                              onValueChange={(val: any) => handleSetDocStatus(doc, val)}
                            >
                              <SelectTrigger className={`h-7 text-[10px] font-bold w-[110px] ${
                                  doc.status === 'RECIBIDO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                  doc.status === 'SOLICITADO' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                  'bg-rose-50 text-rose-600 border-rose-200'
                                }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SOLICITADO" className="text-[10px] font-bold text-amber-600">SOLICITADO</SelectItem>
                                <SelectItem value="RECIBIDO" className="text-[10px] font-bold text-emerald-600">RECIBIDO</SelectItem>
                                <SelectItem value="RECHAZADO" className="text-[10px] font-bold text-rose-600">RECHAZADO</SelectItem>
                              </SelectContent>
                            </Select>
                            {doc.status === 'SOLICITADO' && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-500/10" onClick={() => handleDeleteDoc(doc.id)} title="Eliminar">
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
