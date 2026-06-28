import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { apiRequest } from "../config/api";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export interface SystemConfigData {
  id: number;
  companyName?: string;
  companyNit?: string;
  companyNrc?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyActivity?: string;
  currency: string;
  vatRate: number;
  vatIncluded: boolean;
  defaultCreditLimit: string | number;
  allowCreditSales: boolean;
  blockOnOverdueDays: number;
  blockOnOverLimit: boolean;
  updatedAt: string;
}

export function SystemConfig() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfigData | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await apiRequest<SystemConfigData>("/system-config");
      setConfig(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar configuración global");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      currency: formData.get("currency") as string,
      vatRate: parseFloat(formData.get("vatRate") as string),
      vatIncluded: formData.get("vatIncluded") === "true",
      defaultCreditLimit: parseFloat(formData.get("defaultCreditLimit") as string),
      allowCreditSales: formData.get("allowCreditSales") === "true",
      blockOnOverdueDays: parseInt(formData.get("blockOnOverdueDays") as string, 10),
    };

    try {
      const data = await apiRequest<SystemConfigData>("/system-config", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setConfig(data);
      toast.success("Configuración guardada exitosamente");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/settings')}
          className="rounded-full bg-[var(--card)] border-[var(--border)] shadow-sm"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <SettingsIcon className="text-[var(--primary)]" size={32} />
            Configuración Global
          </h1>
          <p className="text-sm font-bold opacity-60 text-[var(--text-sec)] tracking-widest uppercase">
            Parámetros maestros del sistema para todas las sucursales
          </p>
        </div>
      </div>

      <Card className="p-8 border-[var(--border)] bg-[var(--card)] shadow-xl rounded-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Moneda
              </Label>
              <Input
                name="currency"
                defaultValue={config?.currency}
                required
                className="bg-[var(--bg)] border-[var(--border)] font-bold font-mono"
              />
              <p className="text-[10px] opacity-50 font-bold">Ejemplo: USD, MXN, EUR</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Tasa de IVA (vatRate)
              </Label>
              <Input
                name="vatRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                defaultValue={config?.vatRate}
                required
                className="bg-[var(--bg)] border-[var(--border)] font-bold font-mono"
              />
              <p className="text-[10px] opacity-50 font-bold">En formato decimal (Ej. 0.13 = 13%)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                ¿El precio ya incluye IVA?
              </Label>
              <Select name="vatIncluded" defaultValue={config?.vatIncluded ? "true" : "false"}>
                <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                  <SelectItem value="true" className="font-bold">Sí, precios con IVA</SelectItem>
                  <SelectItem value="false" className="font-bold">No, IVA se suma al final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Límite de Crédito por Defecto ($)
              </Label>
              <Input
                name="defaultCreditLimit"
                type="number"
                step="0.01"
                defaultValue={config?.defaultCreditLimit}
                required
                className="bg-[var(--bg)] border-[var(--border)] font-bold font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Permitir Ventas a Crédito
              </Label>
              <Select name="allowCreditSales" defaultValue={config?.allowCreditSales ? "true" : "false"}>
                <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                  <SelectItem value="true" className="font-bold">Habilitado Globalmente</SelectItem>
                  <SelectItem value="false" className="font-bold text-red-500">Deshabilitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Días para Bloqueo por Mora
              </Label>
              <Input
                name="blockOnOverdueDays"
                type="number"
                min="0"
                defaultValue={config?.blockOnOverdueDays}
                required
                className="bg-[var(--bg)] border-[var(--border)] font-bold font-mono"
              />
              <p className="text-[10px] opacity-50 font-bold">Días después del vencimiento para bloquear créditos</p>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-[var(--border)]">
            <Button
              type="submit"
              disabled={saving}
              className="px-8 font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
              {!saving && <Save size={18} className="ml-2" />}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
