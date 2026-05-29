import { useState, useEffect } from "react";
import {
  Users as UsersIcon,
  Search,
  Plus,
  Phone,
  Mail,
  Shield,
  AlertCircle,
  Edit,
  Trash2,
  X,
  MapPin,
  Check,
} from "lucide-react";
import { Label } from "../components/ui/label";
import { apiRequest } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { cn } from "../components/ui/utils";
import { Card } from "../components/ui/card";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { InlinePills } from "../components/ui/inline-pills";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "../components/ui/dialog";

interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dui: string;
  roleId: number;
  isActive: boolean;
  branches?: { branch: { id: number; name: string } }[];
}

interface Branch {
  id: number;
  name: string;
}

const ROLES = [
  { id: 1, name: "Propietario" },
  { id: 2, name: "Administrador" },
  { id: 3, name: "Supervisor" },
  { id: 4, name: "Cajero" },
  { id: 5, name: "Bodeguero" },
  { id: 6, name: "Conductor" },
];

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dui: "",
    password: "",
    roleId: 4,
    isActive: true,
    branchIds: [] as number[],
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await apiRequest<Branch[]>("/branches");
      setAvailableBranches(data);
    } catch (error) {
      console.error("Error al cargar sucursales", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiRequest<User[]>("/users");
      setUsers(data);
    } catch (error) {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dui: user.dui,
        password: "",
        roleId: user.roleId,
        isActive: user.isActive,
        branchIds: user.branches?.map((b) => b.branch.id) || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        dui: "",
        password: "",
        roleId: 4,
        isActive: true,
        branchIds: [],
      });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password) delete (payload as any).password;
        await apiRequest(`/users/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/users", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      toast.success(editingUser ? "Usuario actualizado" : "Usuario creado");
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      setFormError(error.message || "Error al procesar la solicitud");
      toast.error(error.message || "Error al guardar");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleClick = (user: User) => {
    setUserToToggle(user);
    setIsConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!userToToggle) return;

    setToggleLoading(true);
    try {
      if (userToToggle.isActive) {
        await apiRequest(`/users/${userToToggle.id}`, { method: "DELETE" });
      } else {
        await apiRequest(`/users/${userToToggle.id}/activate`, {
          method: "PATCH",
        });
      }
      toast.success(
        userToToggle.isActive ? "Usuario bloqueado" : "Usuario activado",
      );
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado");
    } finally {
      setToggleLoading(false);
      setIsConfirmOpen(false);
      setUserToToggle(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      u.id !== Number(currentUser?.id),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">Usuarios</h1>
          <InlinePills
            metrics={[
              { label: 'Total Usuarios', value: users.length, icon: UsersIcon, color: 'var(--primary)' },
              { label: 'Activos', value: users.filter(u => u.isActive).length, icon: UsersIcon, color: '#10b981' },
              { label: 'Admins', value: users.filter(u => u.roleId === 2).length, icon: Shield, color: '#f59e0b' },
              { label: 'Inactivos', value: users.filter(u => !u.isActive).length, icon: AlertCircle, color: '#ef4444' },
            ]}
          />
        </div>
        <Button
          variant="default"
          onClick={() => handleOpenModal()}
          className="gap-2 font-bold shadow-lg transition-all hover:scale-105"
        >
          <Plus size={20} />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="p-4 mb-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="flex-1 flex items-center gap-3 px-4 py-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] transition-all focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
          <Search size={20} className="text-[var(--text-sec)]" />
          <Input
            type="text"
            placeholder="Buscar por nombre, código o DUI..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-[var(--text-main)] h-9"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--bg)]/50 border-b border-[var(--border)]">
                <TableHead className="font-bold text-[var(--text-main)]">Usuario</TableHead>
                <TableHead className="font-bold text-[var(--text-main)]">Sucursales</TableHead>
                <TableHead className="font-bold text-[var(--text-main)] text-right">Rol</TableHead>
                <TableHead className="font-bold text-[var(--text-main)] text-center">Estado</TableHead>
                <TableHead className="font-bold text-[var(--text-main)] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-[var(--text-sec)] animate-pulse">
                      <UsersIcon className="animate-bounce" />
                      <span className="font-bold">Cargando usuarios...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-[var(--text-sec)] font-medium">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-[var(--bg)]/30 transition-colors border-b border-[var(--border)]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl flex items-center justify-center font-black text-sm bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-sm group-hover:scale-110 transition-transform">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-black text-[var(--text-main)] leading-tight">{u.fullName}</span>
                          <span className="text-xs font-bold text-[var(--text-sec)] opacity-80 italic">{u.email}</span>
                          <span className="text-xs font-mono font-bold opacity-60 uppercase tracking-tight mt-1 text-[var(--text-sec)]">
                            DUI: {u.dui} • TEL: {u.phone}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {u.branches && u.branches.length > 0 ? (
                          u.branches.map((ub) => (
                            <Badge
                              key={ub.branch?.id}
                              variant="outline"
                              className="text-[10px] py-0 px-2 h-5 flex items-center bg-[var(--bg)]/50 border-[var(--border)] text-[var(--text-sec)]"
                            >
                              <MapPin size={10} className="mr-1 opacity-70" />
                              {ub.branch?.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] italic opacity-50">Sin sucursales</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                        <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-tight">
                          {ROLES.find((r) => r.id === u.roleId)?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        onClick={() => handleToggleClick(u)}
                        variant={u.isActive ? "success" : "destructive"}
                        className="cursor-pointer font-bold px-2"
                      >
                        <div className={cn("size-1.5 rounded-full bg-current mr-1.5", !u.isActive && "animate-pulse")} />
                        {u.isActive ? 'Activo' : 'Bloqueado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(u)}
                          className="h-8 w-8 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg"
                        >
                          <Edit size={18} />
                        </Button>
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => handleToggleClick(u)}
                          className="scale-75"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Nuevo/Editar Usuario */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          className="sm:max-w-xl w-full"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--text-main)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Modifica los permisos y accesos del usuario." : "Registra un nuevo usuario en la plataforma."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {formError && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-black uppercase text-[10px]">Error de validación</AlertTitle>
                <AlertDescription className="text-xs">{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase opacity-70">Nombre Completo</Label>
              <Input
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-70">Email</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-70">Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="7777-7777"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-70">DUI</Label>
                <Input
                  value={formData.dui}
                  onChange={(e) => setFormData({ ...formData, dui: e.target.value })}
                  placeholder="00000000-0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-70">Rol</Label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: parseInt(e.target.value) })}
                  className="w-full h-10 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-main)] text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[var(--card)]">{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase opacity-70">Asignar Sucursales</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/30 max-h-40 overflow-y-auto">
                {availableBranches.map((branch) => {
                  const isSelected = formData.branchIds.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        const newIds = isSelected
                          ? formData.branchIds.filter((id) => id !== branch.id)
                          : [...formData.branchIds, branch.id];
                        setFormData({ ...formData, branchIds: newIds });
                      }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all border",
                        isSelected 
                          ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-sm font-bold" 
                          : "bg-[var(--card)] border-[var(--border)] text-[var(--text-sec)] hover:border-[var(--primary)]/50"
                      )}
                    >
                      <span className="truncate">{branch.name}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase opacity-70">Contraseña Temporal</Label>
                <Input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            )}

            <DialogFooter className="pt-6 border-t border-[var(--border)] gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={formLoading}
                className="font-bold shadow-xl px-8 rounded-xl h-11 flex-1"
              >
                {formLoading ? "Guardando..." : (editingUser ? "Actualizar Usuario" : "Crear Usuario")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (SweetAlert2 Style) */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl" style={{ backgroundColor: "var(--card)" }}>
          <div className="flex flex-col items-center p-8">
            {/* Massive Icon Circle Area */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300"
              style={{
                backgroundColor: userToToggle?.isActive
                  ? "var(--error-bg)"
                  : "var(--success-bg)",
                color: userToToggle?.isActive
                  ? "var(--error-red)"
                  : "var(--accent)",
                border: `4px solid ${userToToggle?.isActive ? "var(--error-red)" : "var(--accent)"}20`,
              }}
            >
              {userToToggle?.isActive ? (
                <ShieldAlert size={40} />
              ) : (
                <ShieldCheck size={40} />
              )}
            </div>

            <div className="text-center space-y-2">
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--text-main)" }}
              >
                {userToToggle?.isActive
                  ? "¿Bloquear usuario?"
                  : "¿Activar usuario?"}
              </h2>
              <p style={{ color: "var(--text-sec)" }} className="px-4">
                ¿Estás seguro de que deseas{" "}
                {userToToggle?.isActive ? "desactivar" : "activar"} el acceso
                para{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-main)" }}
                >
                  {userToToggle?.fullName}
                </span>
                ?
              </p>
            </div>

            <div className="flex w-full gap-3 mt-8">
              <Button
                variant="ghost"
                onClick={() => setIsConfirmOpen(false)}
                disabled={toggleLoading}
                className="flex-1 rounded-xl font-bold h-12"
              >
                No, cancelar
              </Button>
              <Button
                onClick={confirmToggleStatus}
                disabled={toggleLoading}
                variant={userToToggle?.isActive ? "destructive" : "default"}
                className="flex-1 rounded-xl font-bold h-12 shadow-lg"
              >
                {toggleLoading ? "Procesando..." : "Sí, continuar"}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
