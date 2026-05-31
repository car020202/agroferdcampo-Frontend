import { useState, useEffect } from "react";
import { 
  Monitor, 
  Search, 
  Plus, 
  Edit, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { cashRegistersService, CreateCashRegisterDto } from "../services/cash-registers.service";

interface CashRegister {
  id: number;
  branchId: number;
  name: string;
  isActive: boolean;
  branch?: {
    id: number;
    name: string;
  };
}

export function CashRegisters() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);

  const [formData, setFormData] = useState({
    name: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const isAdmin = user?.roleId === 1 || user?.roleId === 2;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const regsRes = await cashRegistersService.findAll();
      setRegisters(regsRes);
    } catch (error) {
      toast.error("Error al cargar cajas físicas");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (reg?: CashRegister) => {
    if (reg) {
      setEditingRegister(reg);
      setFormData({
        name: reg.name,
      });
    } else {
      setEditingRegister(null);
      setFormData({
        name: "",
      });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("No tienes permisos para realizar esta acción");
      return;
    }
    
    setFormLoading(true);
    setFormError("");

    try {
      if (editingRegister) {
        await cashRegistersService.update(editingRegister.id, {
          name: formData.name,
        });
        toast.success("Caja física actualizada");
      } else {
        await cashRegistersService.create({
          name: formData.name
        });
        toast.success("Caja física creada");
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      setFormError(error.message || "Error al procesar la solicitud");
      toast.error(error.message || "Error al guardar");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleClick = async (reg: CashRegister) => {
    if (!isAdmin) {
      toast.error("No tienes permisos para esta acción");
      return;
    }
    try {
      await cashRegistersService.update(reg.id, { isActive: !reg.isActive });
      toast.success(reg.isActive ? "Caja desactivada" : "Caja activada");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado. Verifica que no tenga turnos abiertos.");
    }
  };

  const filteredRegisters = registers.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--primary)] animate-pulse">
        <Monitor size={48} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/settings')}
            className="rounded-full bg-[var(--card)] border-[var(--border)] shadow-sm"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="p-3 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm border border-[var(--primary)]/20">
            <Monitor size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight" style={{ color: "var(--text-main)" }}>
              Cajas Físicas
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-sec)" }}>
              Gestión de terminales de punto de venta
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => handleOpenModal()}
            className="h-12 px-8 rounded-2xl bg-[var(--primary)] text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-[var(--primary)]/20 hover:shadow-2xl hover:shadow-[var(--primary)]/40 hover:-translate-y-1 transition-all active:scale-95 gap-3"
          >
            <Plus size={20} className="stroke-[3]" />
            Nueva Caja
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          {
            label: "Total Cajas",
            value: registers.length,
            icon: Monitor,
            color: "blue",
            bg: "bg-blue-500/10",
            text: "text-blue-500",
          },
          {
            label: "Cajas Activas",
            value: registers.filter((r) => r.isActive).length,
            icon: CheckCircle2,
            color: "emerald",
            bg: "bg-emerald-500/10",
            text: "text-emerald-500",
          },
          {
            label: "Cajas Inactivas",
            value: registers.filter((r) => !r.isActive).length,
            icon: XCircle,
            color: "rose",
            bg: "bg-rose-500/10",
            text: "text-rose-500",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="group p-6 rounded-3xl border bg-[var(--card)] border-[var(--border)] shadow-sm hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-5 transition-transform group-hover:scale-110", stat.bg)} />
            
            <div className="flex items-center gap-5">
              <div className={cn("p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110", stat.bg, stat.text)}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1" style={{ color: "var(--text-sec)" }}>
                  {stat.label}
                </p>
                <p className={cn("text-3xl font-black tracking-tight", stat.text)}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="p-5 rounded-3xl border mb-8 bg-[var(--card)] border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] transition-all focus-within:ring-2 focus-within:ring-[var(--primary)]/20 group">
          <Search size={20} className="text-muted-foreground group-focus-within:text-[var(--primary)] transition-colors" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar caja por nombre o sucursal..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 h-auto p-0 font-bold placeholder:text-muted-foreground/50 text-sm"
          />
        </div>
      </div>

      {/* Registers Table */}
      <div className="rounded-3xl border bg-[var(--card)] border-[var(--border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--bg)]/50 border-b border-[var(--border)] hover:bg-[var(--bg)]/50">
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Caja</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Estado</TableHead>
                {isAdmin && <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegisters.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--primary)]/[0.02] transition-colors group"
                >
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black transition-transform group-hover:scale-110 shadow-sm border border-[var(--primary)]/20">
                        <Monitor size={20} />
                      </div>
                      <p className="font-black text-sm uppercase tracking-tight" style={{ color: "var(--text-main)" }}>
                        {r.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 text-center">
                    <Badge
                      className={cn(
                        "font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm",
                        r.isActive
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      )}
                    >
                      {r.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-5 px-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(r)}
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                          title="Editar Caja"
                        >
                          <Edit size={18} />
                        </Button>
                        <Switch
                          checked={r.isActive}
                          onCheckedChange={() => handleToggleClick(r)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredRegisters.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {searchTerm ? "No hay cajas que coincidan con la búsqueda" : "No hay cajas físicas registradas"}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                <Monitor size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-[var(--text-main)]">
                  {editingRegister ? "Editar Caja" : "Nueva Caja"}
                </DialogTitle>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-sec)" }}>
                  Información de terminal
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {formError && (
              <div className="p-4 rounded-2xl text-sm flex items-center gap-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold animate-in slide-in-from-top-2">
                <AlertCircle size={20} />
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                  Nombre de la Caja
                </Label>
                <Input
                  required
                  placeholder="Ej. Caja 1 - Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[var(--bg)] border-[var(--border)] font-bold h-11 px-4 rounded-xl focus-visible:ring-[var(--primary)]/20"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="flex-1 h-12 rounded-xl bg-[var(--primary)] text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[var(--primary)]/20"
              >
                {formLoading ? "Guardando..." : editingRegister ? "Actualizar" : "Guardar Caja"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
