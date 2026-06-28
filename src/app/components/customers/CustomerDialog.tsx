import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { apiRequest } from '../../config/api';
import { toast } from 'sonner';
import { User, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { cn } from '../ui/utils';
import { useAuth } from '../../context/AuthContext';
import { departments, zones as municipalities, districts, economicActivities } from '../../types/catalogs';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any; // If provided, we are in edit mode
  onSuccess: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const [loading, setLoading] = useState(false);
  const isEdit = !!customer;

  // Form State
  const [formData, setFormData] = useState({
    customerType: 'CONSUMIDOR_FINAL',
    name: '',
    comercialName: '',
    nit: '',
    nrc: '',
    documentType: '13', // Default DUI
    documentNumber: '',
    phone: '',
    email: '',
    department: '',
    municipality: '',
    district: '',
    addressComplement: '',
    activityCode: '',
    activityDescription: '',
    creditLimit: 0,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        customerType: customer.customerType || 'CONSUMIDOR_FINAL',
        name: customer.name || '',
        comercialName: customer.comercialName || '',
        nit: customer.nit || '',
        nrc: customer.nrc || '',
        documentType: customer.documentType || '13',
        documentNumber: customer.documentNumber || '',
        phone: customer.phone || '',
        email: customer.email || '',
        department: customer.department || '',
        municipality: customer.municipality || '',
        district: customer.district || '',
        addressComplement: customer.addressComplement || '',
        activityCode: customer.activityCode || '',
        activityDescription: customer.activityDescription || '',
        creditLimit: Number(customer.creditLimit) || 0,
      });
    } else {
      // Reset form
      setFormData({
        customerType: 'CONSUMIDOR_FINAL',
        name: '',
        comercialName: '',
        nit: '',
        nrc: '',
        documentType: '13',
        documentNumber: '',
        phone: '',
        email: '',
        department: '',
        municipality: '',
        district: '',
        addressComplement: '',
        activityCode: '',
        activityDescription: '',
        creditLimit: 0,
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/customers/${customer.id}` : '/customers';
      const method = isEdit ? 'PATCH' : 'POST';

      await apiRequest(url, {
        method,
        body: JSON.stringify(formData),
      });

      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del cliente seleccionado.' : 'Completa la información para registrar un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Tipo de Cliente Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase opacity-70">Tipo de Cliente (Importante para DTE)</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'CONSUMIDOR_FINAL', label: 'Consumidor Final', icon: User, desc: 'DTE01 - Factura' },
                { id: 'CONTRIBUYENTE', label: 'Contribuyente', icon: Building2, desc: 'DTE03 - Crédito Fiscal' },
                { id: 'SUJETO_EXCLUIDO', label: 'Sujeto Excluido', icon: ShieldCheck, desc: 'DTE14 - ONG/Gob' },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleChange('customerType', type.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1 text-center",
                    formData.customerType === type.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--bg)]/50 hover:border-[var(--primary)]/50 text-[var(--text-sec)]"
                  )}
                >
                  <type.icon size={20} className={cn(formData.customerType === type.id ? "text-[var(--primary)]" : "text-[var(--text-sec)]")} />
                  <span className="text-xs font-bold">{type.label}</span>
                  <span className="text-[9px] font-bold uppercase opacity-40">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campos Comunes */}
            <div className="space-y-2">
              <Label>Nombre Completo / Razón Social</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej. Juan Pérez o Empresa S.A."
              />
            </div>

            {formData.customerType === 'CONTRIBUYENTE' && (
              <div className="space-y-2">
                <Label>Nombre Comercial</Label>
                <Input 
                  value={formData.comercialName} 
                  onChange={(e) => handleChange('comercialName', e.target.value)}
                  placeholder="Ej. Tienda El Sol"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="2222-2222"
              />
            </div>

            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
          </div>

          {/* Campos Fiscales — solo CONTRIBUYENTE y SUJETO_EXCLUIDO */}
          {(formData.customerType === 'CONTRIBUYENTE' || formData.customerType === 'SUJETO_EXCLUIDO') && (
            <div className="space-y-4 pt-4 border-t border-dashed border-[var(--border)]">
              <h3 className="text-sm font-black flex items-center gap-2 text-[var(--primary)] uppercase tracking-tight">
                <Building2 size={16} />
                Información Fiscal Obligatoria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NIT</Label>
                  <Input
                    required
                    value={formData.nit}
                    onChange={(e) => handleChange('nit', e.target.value)}
                    placeholder="0614-..."
                  />
                </div>
                {formData.customerType === 'CONTRIBUYENTE' && (
                  <div className="space-y-2">
                    <Label>NRC</Label>
                    <Input
                      required
                      value={formData.nrc}
                      onChange={(e) => handleChange('nrc', e.target.value)}
                      placeholder="123456-7"
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Actividad Económica (MH)</Label>
                  <Select
                    value={formData.activityCode}
                    onValueChange={(v) => {
                      const activity = economicActivities.find(a => a.value === v);
                      handleChange('activityCode', v);
                      handleChange('activityDescription', activity ? activity.label : '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la actividad económica" />
                    </SelectTrigger>
                    <SelectContent>
                      {economicActivities.map((act) => (
                        <SelectItem key={act.value} value={act.value}>
                          {act.value} - {act.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Documento de Identidad — solo CONSUMIDOR_FINAL */}
          {formData.customerType === 'CONSUMIDOR_FINAL' && (
            <div className="space-y-4 pt-4 border-t border-dashed">
              <h3 className="text-sm font-bold flex items-center gap-2 opacity-70">
                <UserCheck size={16} />
                Documento de Identidad (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(v) => handleChange('documentType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="DUI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="13">DUI</SelectItem>
                      <SelectItem value="36">NIT</SelectItem>
                      <SelectItem value="03">Pasaporte</SelectItem>
                      <SelectItem value="37">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número Documento</Label>
                  <Input
                    value={formData.documentNumber}
                    onChange={(e) => handleChange('documentNumber', e.target.value)}
                    placeholder="00000000-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dirección — todos los tipos (requerida para DTE) */}
          <div className="space-y-4 pt-4 border-t border-dashed border-[var(--border)]">
            <h3 className="text-sm font-bold flex items-center gap-2 opacity-70">
              <Building2 size={16} />
              Dirección{formData.customerType === 'CONSUMIDOR_FINAL' ? ' (Opcional para DTE)' : ' (Requerida para DTE)'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select
                  key={`dept-${open}`}
                  value={formData.department}
                  onValueChange={(v) => {
                    handleChange('department', v);
                    handleChange('municipality', '');
                    handleChange('district', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.filter(d => d.value !== "00").map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.value} - {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Municipio</Label>
                <Select
                  key={`mun-${formData.department}-${open}`}
                  value={formData.municipality}
                  onValueChange={(v) => handleChange('municipality', v)}
                  disabled={!formData.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipalities.filter(m => m.departmentId === formData.department).map((mun) => (
                      <SelectItem key={`mun-${mun.departmentId}-${mun.value}`} value={mun.value}>
                        {mun.value} - {mun.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Distrito</Label>
                <Select
                  key={`dist-${formData.department}-${open}`}
                  value={formData.district}
                  onValueChange={(v) => handleChange('district', v)}
                  disabled={!formData.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.filter(d => d.departmentId === formData.department).map((dist) => (
                      <SelectItem key={`dist-${dist.departmentId}-${dist.value}`} value={dist.value}>
                        {dist.value} - {dist.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección Completa / Complemento</Label>
              <Textarea
                required={formData.customerType !== 'CONSUMIDOR_FINAL'}
                value={formData.addressComplement}
                onChange={(e) => handleChange('addressComplement', e.target.value)}
                placeholder="Calle, Colonia, Casa #..."
                rows={2}
              />
            </div>
          </div>

          {/* Límite de Crédito — solo CONTRIBUYENTE + admin */}
          {formData.customerType === 'CONTRIBUYENTE' && isAdmin && (
            <div className="space-y-2 pt-2">
              <Label>Límite Crédito ($)</Label>
              <Input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="pt-6 border-t border-[var(--border)] gap-3">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              variant="default"
              className="font-bold shadow-xl px-8 rounded-xl h-11 flex-1"
            >
              {loading ? 'Guardando...' : (isEdit ? 'Actualizar Cliente' : 'Crear Cliente')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
