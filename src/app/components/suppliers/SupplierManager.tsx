import React, { useState, useEffect } from 'react';
import { TruckIcon, Phone, Mail, MapPin, Plus, Edit2, Search } from 'lucide-react';
import { getSuppliers, createSupplier, updateSupplier } from '../../services/purchases.service';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { NumberInput } from '../ui/number-input';

export function SupplierManager() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal de Crear/Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ 
    name: '', taxId: '', nrc: '', email: '', phone: '', address: '', contactName: '', creditDays: 0, creditLimit: 0 
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res: any = await getSuppliers();
      setSuppliers(res.data || res || []);
    } catch (e) {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.contactName && s.contactName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ name: '', taxId: '', nrc: '', email: '', phone: '', address: '', contactName: '', creditDays: 0, creditLimit: 0 });
    setModalOpen(true);
  };

  const handleOpenEdit = (supplier: any) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      taxId: supplier.taxId || '',
      nrc: supplier.nrc || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      contactName: supplier.contactName || '',
      creditDays: supplier.creditDays || 0,
      creditLimit: supplier.creditLimit || 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('El nombre es obligatorio');
    
    const payload = {
      ...form,
      creditDays: Number(form.creditDays) || 0,
      creditLimit: Number(form.creditLimit) || 0
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateSupplier(editingId, payload);
        toast.success('Proveedor actualizado');
      } else {
        await createSupplier(payload);
        toast.success('Proveedor creado');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar proveedor por nombre o contacto..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus size={18} /> Nuevo Proveedor
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground animate-pulse">Cargando directorio...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground font-medium">No se encontraron proveedores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id}
              className="p-6 rounded-2xl border transition-all hover:shadow-md bg-[var(--card)] border-[var(--border)] relative group"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(supplier)}>
                  <Edit2 size={16} className="text-[var(--text-sec)] hover:text-[var(--primary)]" />
                </Button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-[var(--bg)] shrink-0">
                  <TruckIcon size={24} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[var(--text-main)] truncate" title={supplier.name}>
                    {supplier.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={supplier.isActive ? 'success' : 'destructive'} className="text-[10px] py-0">
                      {supplier.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {supplier.taxId && <span className="text-xs text-[var(--text-sec)]">NIT: {supplier.taxId}</span>}
                    {supplier.nrc && <span className="text-xs text-[var(--text-sec)]">NRC: {supplier.nrc}</span>}
                  </div>
                </div>
              </div>
              
              {Number(supplier.creditLimit) > 0 && (
                <div className="mb-4 text-xs bg-[var(--accent)]/10 text-[var(--accent)] p-2 rounded-md font-medium border border-[var(--accent)]/20 text-center">
                  Límite de Crédito: ${Number(supplier.creditLimit || 0).toFixed(2)} / Plazo: {supplier.creditDays} días
                </div>
              )}
              
              <div className="space-y-2.5 mt-5">
                {supplier.contactName && (
                  <div className="flex items-center gap-3 text-sm text-[var(--text-sec)]">
                    <div className="w-5 flex justify-center"><div className="size-2 rounded-full bg-[var(--primary)]/50" /></div>
                    <span className="truncate">Contacto: <span className="font-medium text-[var(--text-main)]">{supplier.contactName}</span></span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-3 text-sm text-[var(--text-sec)]">
                    <Phone size={16} className="shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-3 text-sm text-[var(--text-sec)]">
                    <Mail size={16} className="shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-3 text-sm text-[var(--text-sec)] mt-2 pt-2 border-t border-[var(--border)]">
                    <MapPin size={16} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-tight">{supplier.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL CREAR/EDITAR --- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TruckIcon className="text-[var(--primary)]" />
              {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Razón Social / Nombre *</Label>
              <Input 
                required 
                placeholder="Ej. Agroquímicos S.A."
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>NIT / Doc Fiscal</Label>
                <Input 
                  placeholder="0000-000000-000-0"
                  value={form.taxId}
                  onChange={e => setForm({...form, taxId: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>NRC</Label>
                <Input 
                  placeholder="123456-7"
                  value={form.nrc}
                  onChange={e => setForm({...form, nrc: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Persona de Contacto</Label>
                <Input 
                  placeholder="Ej. Juan Pérez"
                  value={form.contactName}
                  onChange={e => setForm({...form, contactName: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Días de Crédito</Label>
                <NumberInput 
                  value={form.creditDays}
                  onValueChange={v => setForm({...form, creditDays: v || 0})}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Límite de Crédito ($)</Label>
                <NumberInput 
                  value={form.creditLimit}
                  onValueChange={v => setForm({...form, creditLimit: v || 0})}
                  min={0}
                  step={100}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input 
                  placeholder="2222-0000"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input 
                  type="email"
                  placeholder="ventas@ejemplo.com"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección Física</Label>
              <Input 
                placeholder="Dirección completa..."
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
