import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Edit,
  X,
  CheckCircle2,
  XCircle,
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
import { Textarea } from "../components/ui/textarea";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
} from "../components/ui/alert-dialog";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  address?: string;
  taxId?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export function Branches() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    taxId: "",
    phone: "",
    isActive: true,
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [branchToToggle, setBranchToToggle] = useState<Branch | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const isAdmin = user?.roleId === 1 || user?.roleId === 2;

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await apiRequest<Branch[]>("/branches");
      setBranches(data);
    } catch (error) {
      toast.error("Error al cargar sucursales");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address || "",
        taxId: branch.taxId || "",
        phone: branch.phone || "",
        isActive: branch.isActive,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: "",
        address: "",
        taxId: "",
        phone: "",
        isActive: true,
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
      if (editingBranch) {
        await apiRequest(`/branches/${editingBranch.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest("/branches", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      toast.success(editingBranch ? "Sucursal actualizada" : "Sucursal creada");
      setShowModal(false);
      fetchBranches();
    } catch (error: any) {
      setFormError(error.message || "Error al procesar la solicitud");
      toast.error(error.message || "Error al guardar");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleClick = (branch: Branch) => {
    if (!isAdmin) {
      toast.error("No tienes permisos para esta acción");
      return;
    }
    setBranchToToggle(branch);
    setIsConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!branchToToggle) return;

    setToggleLoading(true);
    try {
      await apiRequest(`/branches/${branchToToggle.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !branchToToggle.isActive }),
      });
      toast.success(
        branchToToggle.isActive ? "Sucursal desactivada" : "Sucursal activada",
      );
      fetchBranches();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado");
    } finally {
      setToggleLoading(false);
      setIsConfirmOpen(false);
      setBranchToToggle(null);
    }
  };

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.address?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-accent animate-pulse">
        <Building2 size={48} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm border border-[var(--primary)]/20">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight" style={{ color: "var(--text-main)" }}>
              Sucursales
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-sec)" }}>
              Gestión de locales físicos y datos fiscales
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => handleOpenModal()}
            className="h-12 px-8 rounded-2xl bg-[var(--primary)] text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-[var(--primary)]/20 hover:shadow-2xl hover:shadow-[var(--primary)]/40 hover:-translate-y-1 transition-all active:scale-95 gap-3"
          >
            <Plus size={20} className="stroke-[3]" />
            Nueva Sucursal
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          {
            label: "Total Sucursales",
            value: branches.length,
            icon: Building2,
            color: "blue",
            bg: "bg-blue-500/10",
            text: "text-blue-500",
          },
          {
            label: "Sucursales Activas",
            value: branches.filter((b) => b.isActive).length,
            icon: CheckCircle2,
            color: "emerald",
            bg: "bg-emerald-500/10",
            text: "text-emerald-500",
          },
          {
            label: "Sucursales Inactivas",
            value: branches.filter((b) => !b.isActive).length,
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
      <div
        className="p-5 rounded-3xl border mb-8 bg-[var(--card)] border-[var(--border)] shadow-sm"
      >
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] transition-all focus-within:ring-2 focus-within:ring-[var(--primary)]/20 group"
        >
          <Search size={20} className="text-muted-foreground group-focus-within:text-[var(--primary)] transition-colors" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar sucursal por nombre, dirección o NIT..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 h-auto p-0 font-bold placeholder:text-muted-foreground/50 text-sm"
          />
        </div>
      </div>

      {/* Branches Table */}
      <div
        className="rounded-3xl border bg-[var(--card)] border-[var(--border)] overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--bg)]/50 border-b border-[var(--border)] hover:bg-[var(--bg)]/50">
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sucursal</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ubicación</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">NIT / Registro</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contacto</TableHead>
                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Estado</TableHead>
                {isAdmin && <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.map((b) => (
                <TableRow
                  key={b.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--primary)]/[0.02] transition-colors group"
                >
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black transition-transform group-hover:scale-110 shadow-sm border border-[var(--primary)]/20">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight" style={{ color: "var(--text-main)" }}>
                          {b.name}
                        </p>
                        <p className="text-[10px] font-mono font-bold opacity-40 uppercase tracking-tighter">
                          ID: {String(b.id).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-start gap-2 max-w-[200px]">
                      <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--primary)] opacity-60" />
                      <span className="text-xs font-bold leading-relaxed opacity-70" style={{ color: "var(--text-main)" }}>
                        {b.address || "No especificada"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                        <FileText size={14} className="text-[var(--primary)] opacity-60" />
                      </div>
                      <span className="font-mono text-xs font-black tracking-tighter opacity-80">{b.taxId || "---"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                        <Phone size={14} className="text-[var(--primary)] opacity-60" />
                      </div>
                      <span className="text-xs font-black tracking-tight opacity-70">{b.phone || "---"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 text-center">
                    <Badge
                      className={cn(
                        "font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm",
                        b.isActive
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      )}
                    >
                      {b.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-5 px-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(b)}
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                          title="Editar Sucursal"
                        >
                          <Edit size={18} />
                        </Button>
                        <Switch
                          checked={b.isActive}
                          onCheckedChange={() => handleToggleClick(b)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredBranches.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              {searchTerm ? "No hay sucursales que coincidan con la búsqueda" : "No hay sucursales registradas"}
            </div>
          )}
        </div>
      </div>

      {/* Modal - Estilo consistente con el sistema */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                <Building2 size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-[var(--text-main)]">
                  {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
                </DialogTitle>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-sec)" }}>
                  Información del Establecimiento
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
                  Nombre de la Sucursal
                </Label>
                <Input
                  required
                  placeholder="Ej. Sucursal Santa Tecla"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[var(--bg)] border-[var(--border)] font-bold h-11 px-4 rounded-xl focus-visible:ring-[var(--primary)]/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                  Dirección Completa
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Ej. Final 4a Calle Poniente #23, Santa Tecla..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-[var(--bg)] border-[var(--border)] font-bold px-4 py-3 rounded-xl focus-visible:ring-[var(--primary)]/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                    Teléfono
                  </Label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--primary)] opacity-40" />
                    <Input
                      placeholder="2222-2222"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-[var(--bg)] border-[var(--border)] font-bold h-11 pl-10 rounded-xl focus-visible:ring-[var(--primary)]/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                    NIT / NRC
                  </Label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--primary)] opacity-40" />
                    <Input
                      placeholder="0614-..."
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="bg-[var(--bg)] border-[var(--border)] font-bold h-11 pl-10 rounded-xl focus-visible:ring-[var(--primary)]/20 font-mono"
                    />
                  </div>
                </div>
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
                {formLoading ? "Guardando..." : editingBranch ? "Actualizar" : "Guardar Sucursal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <button className="hidden" /> {/* Fix for AlertDialog needs a trigger or controlled open */}
        <AlertDialogContent className="max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl" style={{ backgroundColor: "var(--card)" }}>
          <div className="flex flex-col items-center p-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300"
              style={{
                backgroundColor: branchToToggle?.isActive ? "var(--error-bg)" : "var(--success-bg)",
                color: branchToToggle?.isActive ? "var(--error-red)" : "var(--accent)",
                border: `4px solid ${branchToToggle?.isActive ? "var(--error-red)" : "var(--accent)"}20`,
              }}
            >
              {branchToToggle?.isActive ? <ShieldAlert size={40} /> : <ShieldCheck size={40} />}
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-main)" }}>
                {branchToToggle?.isActive ? "¿Desactivar sucursal?" : "¿Activar sucursal?"}
              </h2>
              <p style={{ color: "var(--text-sec)" }} className="px-4 text-sm">
                ¿Estás seguro de que deseas {branchToToggle?.isActive ? "desactivar" : "activar"} la sucursal{" "}
                <span className="font-semibold" style={{ color: "var(--text-main)" }}>{branchToToggle?.name}</span>?
              </p>
            </div>

            <div className="flex w-full gap-3 mt-8">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={toggleLoading}
                className="flex-1 py-3 rounded-xl font-bold transition-all border shadow-sm"
                style={{ backgroundColor: "var(--bg)", color: "var(--text-sec)", borderColor: "var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmToggleStatus}
                disabled={toggleLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: branchToToggle?.isActive ? "var(--error-red)" : "var(--accent)" }}
              >
                {toggleLoading ? "Procesando..." : "Sí, continuar"}
              </button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
