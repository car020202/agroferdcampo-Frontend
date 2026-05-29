import { useState, useEffect } from "react";
import {
  Users2,
  UserPlus,
  Calendar as CalendarIcon,
  Clock,
  Briefcase,
  Building2,
  FileText,
  Search,
  Plus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  User,
  History,
  Settings as SettingsIcon,
  X,
  ChevronDown,
  Trash2,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { apiRequest } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import { Switch } from "../components/ui/switch";
import { InlinePills } from "../components/ui/inline-pills";
import { cn } from "../components/ui/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Edit } from "lucide-react";

// --- Interfaces ---

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface Position {
  id: number;
  title: string;
  description?: string;
  departmentId?: number;
}

interface WorkSchedule {
  id: number;
  name: string;
  entryTime: string;
  exitTime: string;
  breakMinutes: number;
}

interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  dui?: string;
  nit?: string;
  birthDate?: string;
  gender: "MASCULINO" | "FEMENINO" | "OTRO";
  email?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  status: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | "BAJA" | "PERMISO";
  employmentType: string;
  hireDate: string;
  branchId: number;
  departmentId?: number;
  positionId?: number;
  workScheduleId?: number;
  branch?: { id: number; name: string };
  department?: Department;
  position?: Position;
  workSchedule?: WorkSchedule;
  notes?: string;
}

interface HRStats {
  totalActive: number;
  totalInactive: number;
  byEmploymentType: { type: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  absentToday: number;
}

interface AttendanceRecord {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  department: string;
  position: string;
  attendance: {
    checkIn: string;
    checkOut: string | null;
    workedMinutes: number | null;
    status: string;
  } | null;
}

interface LeaveType {
  id: number;
  name: string;
  isPaid: boolean;
  isActive: boolean;
}

interface LeaveRequest {
  id: number;
  employee: Employee;
  leaveType: { name: string; isPaid: boolean };
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "CANCELADO";
  requestedAt?: string;
}

// --- Components ---

interface DatePickerProps {
  date?: Date;
  setDate: (date?: Date) => void;
  placeholder?: string;
}

function DatePicker({ date, setDate, placeholder }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-[var(--bg)] border-[var(--border)] h-10 px-3 hover:bg-[var(--primary)]/5 transition-all",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50 text-[var(--primary)]" />
          {date ? (
            <span className="font-bold text-[var(--text-main)]">
              {format(date, "dd/MM/yyyy")}
            </span>
          ) : (
            <span className="opacity-40">{placeholder || "dd/mm/aaaa"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-[var(--border)] shadow-2xl rounded-2xl overflow-hidden" align="start">
        <div className="bg-[var(--card)] p-1">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            locale={es}
            className="p-3"
            captionLayout="dropdown-buttons"
            fromYear={1950}
            toYear={2050}
          />
          <div className="flex items-center justify-between p-3 border-t border-[var(--border)] bg-[var(--bg)]/50">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDate(undefined)} 
              className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
            >
              Borrar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDate(new Date())} 
              className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
            >
              Hoy
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HumanResources() {
  const { user } = useAuth();
  const { selectedBranch, branches } = useBranch();
  const [activeTab, setActiveTab] = useState("overview");

  // State
  const [stats, setStats] = useState<HRStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Config Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]); // Para el selector del modal de permiso

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<{
    type: "dept" | "pos" | "sch" | "lvType";
    open: boolean;
  }>({ type: "dept", open: false });
  const [formLoading, setFormLoading] = useState(false);

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    reason: "",
  });
  const [leaveStartDate, setLeaveStartDate] = useState<Date | undefined>(undefined);
  const [leaveEndDate, setLeaveEndDate] = useState<Date | undefined>(undefined);

  // Selected Department for Filtering Positions
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");

  // Edit / View Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [detailsTab, setDetailsTab] = useState<"datos" | "expediente">("datos");

  // Status Change Modal
  const [statusChangeModal, setStatusChangeModal] = useState<{
    employee: Employee | null;
    newStatus: string | null;
  }>({ employee: null, newStatus: null });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para el formulario de registro (DatePicker)
  const [regBirthDate, setRegBirthDate] = useState<Date | undefined>(undefined);
  const [regHireDate, setRegHireDate] = useState<Date | undefined>(new Date());

  // Estados para el formulario de edición (DatePicker)
  const [editBirthDate, setEditBirthDate] = useState<Date | undefined>(undefined);
  const [editHireDate, setEditHireDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (selectedBranch) {
      loadData();
      loadConfigData();
    }
  }, [selectedBranch, activeTab]);

  useEffect(() => {
    if (selectedEmployee) {
      setEditBirthDate(selectedEmployee.birthDate ? new Date(selectedEmployee.birthDate) : undefined);
      setEditHireDate(selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate) : undefined);
    } else {
      setEditBirthDate(undefined);
      setEditHireDate(undefined);
    }
  }, [selectedEmployee]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const data = await apiRequest<HRStats>(
          `/employees/stats?branchId=${selectedBranch?.id}`,
        );
        setStats(data);
      } else if (activeTab === "employees") {
        const response = await apiRequest<{ data: Employee[] }>(
          `/employees?branchId=${selectedBranch?.id}`,
        );
        setEmployees(response.data);
      } else if (activeTab === "attendance") {
        const data = await apiRequest<AttendanceRecord[]>(
          `/attendance/today/${selectedBranch?.id}`,
        );
        setAttendance(data);
      } else if (activeTab === "leaves") {
        const [leavesData, onLeaveEmployees] = await Promise.all([
          apiRequest<LeaveRequest[]>(
            `/leave-requests/pending?branchId=${selectedBranch?.id}`,
          ),
          apiRequest<{ data: Employee[] }>(
            `/employees?branchId=${selectedBranch?.id}&status=PERMISO`,
          ),
        ]);
        setPendingLeaves(leavesData);
        setEmployees(onLeaveEmployees.data);
      }
    } catch (error) {
      console.error("Error loading HR data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigData = async () => {
    // Usamos allSettled para que un fallo en una llamada no afecte a las demás
    const [deptsRes, posRes, schRes, lvTypesRes, empListRes] = await Promise.allSettled([
      apiRequest<Department[]>("/departments"),
      apiRequest<Position[]>("/positions"),
      apiRequest<WorkSchedule[]>("/work-schedules"),
      apiRequest<LeaveType[]>("/leave-types"),
      apiRequest<{ data: Employee[] }>(`/employees?branchId=${selectedBranch?.id}&status=ACTIVO&limit=100`),
    ]);

    if (deptsRes.status === "fulfilled") setDepartments(deptsRes.value);
    else console.warn("No se pudieron cargar departamentos:", deptsRes.reason);

    if (posRes.status === "fulfilled") setPositions(posRes.value);
    else console.warn("No se pudieron cargar cargos:", posRes.reason);

    if (schRes.status === "fulfilled") setSchedules(schRes.value);
    else console.warn("No se pudieron cargar horarios:", schRes.reason);

    if (lvTypesRes.status === "fulfilled") setLeaveTypes(lvTypesRes.value);
    else console.warn("No se pudieron cargar tipos de permiso:", lvTypesRes.reason);

    if (empListRes.status === "fulfilled") setAllEmployees(empListRes.value?.data || []);
    else console.warn("No se pudieron cargar empleados para modal:", empListRes.reason);
  };


  const handleCheckIn = async (employeeId: number) => {
    try {
      await apiRequest("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
      toast.success("Entrada registrada");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar entrada");
    }
  };

  const handleCheckOut = async (employeeId: number) => {
    try {
      await apiRequest("/attendance/check-out", {
        method: "POST",
        body: JSON.stringify({ employeeId }),
      });
      toast.success("Salida registrada");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al registrar salida");
    }
  };

  const handleLeaveAction = async (id: number, status: string, notes?: string) => {
    try {
      await apiRequest(`/leave-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewNotes: notes || "Procesado desde panel RRHH",
        }),
      });
      toast.success(
        status === "APROBADO" ? "✅ Solicitud aprobada" :
        status === "RECHAZADO" ? "❌ Solicitud rechazada" : `Solicitud ${status.toLowerCase()}`
      );
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al procesar solicitud");
    }
  };

  const handleCreateLeaveRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!leaveForm.employeeId || !leaveForm.leaveTypeId || !leaveStartDate || !leaveEndDate) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    if (leaveEndDate < leaveStartDate) {
      toast.error("La fecha de fin debe ser igual o posterior a la fecha de inicio");
      return;
    }
    setFormLoading(true);
    try {
      await apiRequest("/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          employeeId: Number(leaveForm.employeeId),
          leaveTypeId: Number(leaveForm.leaveTypeId),
          startDate: format(leaveStartDate, "yyyy-MM-dd"),
          endDate: format(leaveEndDate, "yyyy-MM-dd"),
          reason: leaveForm.reason || undefined,
        }),
      });
      toast.success("Solicitud de permiso creada exitosamente");
      setIsLeaveModalOpen(false);
      setLeaveForm({ employeeId: "", leaveTypeId: "", reason: "" });
      setLeaveStartDate(undefined);
      setLeaveEndDate(undefined);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al crear la solicitud de permiso");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName"),
      dui: formData.get("dui") || undefined,
      nit: formData.get("nit") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      gender: formData.get("gender"),
      birthDate: formData.get("birthDate") || undefined,
      hireDate: formData.get("hireDate"),
      employmentType: formData.get("employmentType"),
      branchId: formData.get("branchId")
        ? Number(formData.get("branchId"))
        : selectedBranch?.id,
      departmentId:
        formData.get("departmentId") && formData.get("departmentId") !== "none"
          ? Number(formData.get("departmentId"))
          : undefined,
      positionId:
        formData.get("positionId") && formData.get("positionId") !== "none"
          ? Number(formData.get("positionId"))
          : undefined,
      workScheduleId:
        formData.get("workScheduleId") &&
        formData.get("workScheduleId") !== "none"
          ? Number(formData.get("workScheduleId"))
          : undefined,
      emergencyContactName: formData.get("emergencyContactName") || undefined,
      emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
      emergencyContactRelation:
        formData.get("emergencyContactRelation") || undefined,
      notes: formData.get("notes") || undefined,
    };

    try {
      await apiRequest("/employees", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Empleado creado exitosamente");
      setIsEmployeeModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al crear empleado");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!statusChangeModal.employee || !statusChangeModal.newStatus) return;

    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      status: statusChangeModal.newStatus,
      notes: formData.get("notes") || undefined,
    };

    try {
      await apiRequest(`/employees/${statusChangeModal.employee.id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      toast.success("Estado actualizado exitosamente");
      setStatusChangeModal({ employee: null, newStatus: null });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar estado");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName"),
      dui: formData.get("dui") || undefined,
      nit: formData.get("nit") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      gender: formData.get("gender"),
      birthDate: formData.get("birthDate") || undefined,
      hireDate: formData.get("hireDate"),
      employmentType: formData.get("employmentType"),
      branchId: formData.get("branchId")
        ? Number(formData.get("branchId"))
        : undefined,
      departmentId:
        formData.get("departmentId") && formData.get("departmentId") !== "none"
          ? Number(formData.get("departmentId"))
          : undefined,
      positionId:
        formData.get("positionId") && formData.get("positionId") !== "none"
          ? Number(formData.get("positionId"))
          : undefined,
      workScheduleId:
        formData.get("workScheduleId") &&
        formData.get("workScheduleId") !== "none"
          ? Number(formData.get("workScheduleId"))
          : undefined,
      emergencyContactName: formData.get("emergencyContactName") || undefined,
      emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
      emergencyContactRelation:
        formData.get("emergencyContactRelation") || undefined,
      notes: formData.get("notes") || undefined,
    };

    try {
      await apiRequest(`/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      toast.success("Información actualizada exitosamente");
      setSelectedEmployee(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar empleado");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const type = isConfigModalOpen.type;

    let endpoint = "";
    let body = {};

    if (type === "dept") {
      endpoint = "/departments";
      body = {
        name: formData.get("name"),
        description: formData.get("description"),
      };
    } else if (type === "pos") {
      endpoint = "/positions";
      body = {
        title: formData.get("title"),
        description: formData.get("description"),
        departmentId: formData.get("departmentId")
          ? Number(formData.get("departmentId"))
          : undefined,
      };
    } else if (type === "sch") {
      endpoint = "/work-schedules";
      body = {
        name: formData.get("name"),
        entryTime: formData.get("entryTime"),
        exitTime: formData.get("exitTime"),
        breakMinutes: Number(formData.get("breakMinutes")),
        workDays: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"],
      };
    } else if (type === "lvType") {
      endpoint = "/leave-types";
      body = {
        name: formData.get("name"),
        isPaid: formData.get("isPaid") === "true",
      };
    }

    try {
      await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Creado exitosamente");
      setIsConfigModalOpen({ ...isConfigModalOpen, open: false });
      loadConfigData();
    } catch (error: any) {
      toast.error(error.message || "Error al crear");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfig = async (
    type: "dept" | "pos" | "sch" | "lvType",
    id: number,
  ) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      const endpoint =
        type === "dept"
          ? `/departments/${id}`
          : type === "pos"
            ? `/positions/${id}`
            : type === "sch"
              ? `/work-schedules/${id}`
              : `/leave-types/${id}`;
      // In leave-types we should probably just deactivate them, but if there's a DELETE endpoint let's use it, 
      // or we use PATCH to deactivate if DELETE doesn't exist. Let's do DELETE and if it fails, maybe manual db deletion.
      // Actually leave-types API only has PATCH for update. Let's use PATCH to set isActive: false
      if (type === "lvType") {
        await apiRequest(`/leave-types/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) });
      } else {
        await apiRequest(endpoint, { method: "DELETE" });
      }
      toast.success("Eliminado exitosamente");
      loadConfigData();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  // Cargos disponibles (sin filtro por ahora ya que no dependen del departamento en la DB)
  const availablePositions = positions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
            Recursos Humanos
          </h1>
          <p className="text-[var(--text-sec)]">
            Gestión de empleados, asistencia y permisos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "employees" && (
            <Button
              variant="default"
              onClick={() => {
                setSelectedDeptId("");
                setIsEmployeeModalOpen(true);
              }}
              className="gap-2 font-bold shadow-lg transition-all hover:scale-105"
            >
              <UserPlus size={18} />
              Nuevo Empleado
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-8 h-auto p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm">
          {[
            { value: "overview", label: "Resumen", icon: Briefcase },
            { value: "employees", label: "Empleados", icon: Users2 },
            { value: "attendance", label: "Asistencia", icon: Clock },
            { value: "leaves", label: "Permisos", icon: CalendarIcon },
            {
              value: "config",
              label: "Config",
              icon: SettingsIcon,
              adminOnly: true,
            },
          ]
            .filter((t) => !t.adminOnly || user?.roleId === 2)
            .map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white transition-all rounded-lg font-bold text-xs uppercase tracking-wider"
              >
                <tab.icon size={16} /> {tab.label}
              </TabsTrigger>
            ))}
        </TabsList>

        {/* --- TAB: RESUMEN --- */}
        <TabsContent value="overview" className="space-y-6">
          <InlinePills
            metrics={[
              {
                label: "Total Activos",
                value: stats?.totalActive || 0,
                icon: Users2,
                color: "var(--primary)",
              },
              {
                label: "Bajas/Inactivos",
                value: stats?.totalInactive || 0,
                icon: XCircle,
                color: "#ef4444",
              },
              {
                label: "Ausentes Hoy",
                value: stats?.absentToday || 0,
                icon: AlertCircle,
                color: "#f59e0b",
              },
              {
                label: "En Planilla",
                value: "100%",
                icon: CalendarIcon,
                color: "#10b981",
              },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-[var(--text-main)] uppercase tracking-tight">
                <Building2 size={20} className="text-[var(--primary)]" />
                Por Departamento
              </h3>
              <div className="space-y-3">
                {stats?.byDepartment.map((dept, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all"
                  >
                    <span className="font-bold text-sm text-[var(--text-main)]">
                      {dept.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--card)] border-[var(--border)] font-black text-[10px] uppercase"
                    >
                      {dept.count} empleados
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-[var(--text-main)] uppercase tracking-tight">
                <FileText size={20} className="text-[var(--primary)]" />
                Tipo de Contrato
              </h3>
              <div className="space-y-3">
                {stats?.byEmploymentType.map((type, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all"
                  >
                    <span className="font-bold text-sm text-[var(--text-main)]">
                      {type.type.replace("_", " ")}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-[var(--card)] border-[var(--border)] font-black text-[10px] uppercase"
                    >
                      {type.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB: EMPLEADOS --- */}
        <TabsContent value="employees" className="space-y-6">
          <Card className="p-4 border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex-1 flex items-center gap-3 px-4 py-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] transition-all focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
              <Search size={20} className="text-[var(--text-sec)]" />
              <Input
                type="text"
                placeholder="Buscar por nombre, código o DUI..."
                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-[var(--text-main)] h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card>

          <Card className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg)]/50 border-b border-[var(--border)]">
                    <TableHead className="font-bold text-[var(--text-main)]">
                      Empleado
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)]">
                      Depto / Cargo
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)]">
                      Contacto
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)] text-center">
                      Estado
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)] text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees
                    .filter(
                      (e) =>
                        e.fullName
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        e.employeeCode
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        (e.dui && e.dui.includes(searchTerm)),
                    )
                    .map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="group hover:bg-[var(--bg)]/30 transition-colors border-b border-[var(--border)]"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl flex items-center justify-center font-black text-sm bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-sm group-hover:scale-110 transition-transform uppercase">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-black text-[var(--text-main)] leading-tight">
                                {emp.fullName}
                              </span>
                              <span className="text-xs font-bold text-[var(--text-sec)] opacity-60 italic">
                                {emp.employeeCode}
                              </span>
                              <span className="text-xs font-mono font-bold opacity-40 uppercase tracking-tight mt-1">
                                DUI: {emp.dui || "N/A"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-[var(--text-main)]">
                              {emp.department?.name || "Sin Depto"}
                            </span>
                            <Badge
                              variant="outline"
                              className="w-fit text-[10px] font-black uppercase py-0 h-5 bg-[var(--bg)]/50 border-[var(--border)]"
                            >
                              {emp.position?.title || "Sin Cargo"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-sec)]">
                              <Phone
                                size={12}
                                className="text-[var(--primary)]"
                              />{" "}
                              {emp.phone || "N/A"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-sec)]">
                              <Mail
                                size={12}
                                className="text-[var(--primary)]"
                              />{" "}
                              {emp.email || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "h-7 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105",
                                  emp.status === "ACTIVO"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : emp.status === "PERMISO"
                                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                )}
                              >
                                <div
                                  className={cn(
                                    "size-1.5 rounded-full bg-current mr-1.5",
                                    emp.status !== "ACTIVO" && "animate-pulse",
                                  )}
                                />
                                {emp.status}
                                <ChevronDown
                                  size={12}
                                  className="ml-1 opacity-50"
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="center"
                              className="bg-[var(--card)] border-[var(--border)]"
                            >
                              {[
                                "ACTIVO",
                                "INACTIVO",
                                "SUSPENDIDO",
                                "BAJA",
                                "PERMISO",
                              ].map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  className="text-xs font-bold uppercase tracking-tight focus:bg-[var(--primary)]/10 focus:text-[var(--primary)]"
                                  onClick={() =>
                                    setStatusChangeModal({
                                      employee: emp,
                                      newStatus: s,
                                    })
                                  }
                                >
                                  {s}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedEmployee(emp)}
                              className="h-8 w-8 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg"
                            >
                              <Edit size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* --- TAB: ASISTENCIA --- */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="flex items-center justify-between p-6 rounded-2xl border bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500 text-white shadow-lg">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-emerald-800">
                  Control de Asistencia del Día
                </h3>
                <p className="text-sm text-emerald-600">
                  Fecha: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-50 shadow-sm transition-all">
              <History size={18} />
              Ver Historial
            </button>
          </div>

          <Card className="rounded-xl border overflow-hidden shadow-sm bg-[var(--card)] border-[var(--border)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg)]/50 border-b border-[var(--border)]">
                    <TableHead className="font-bold text-[var(--text-main)]">
                      Empleado
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)] text-center">
                      Entrada
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)] text-center">
                      Salida
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)] text-center">
                      Estado
                    </TableHead>
                    <TableHead className="font-bold text-[var(--text-main)] text-right">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((rec) => (
                    <TableRow
                      key={rec.employeeId}
                      className="group hover:bg-[var(--bg)]/30 transition-colors border-b border-[var(--border)]"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black text-xs border border-[var(--primary)]/20 shadow-sm uppercase">
                            {rec.fullName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-[var(--text-main)]">
                              {rec.fullName}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-sec)] opacity-60 uppercase tracking-tight">
                              {rec.position}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-[var(--text-main)]">
                        {rec.attendance?.checkIn
                          ? new Date(rec.attendance.checkIn).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "--:--"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-[var(--text-main)]">
                        {rec.attendance?.checkOut
                          ? new Date(
                              rec.attendance.checkOut,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </TableCell>
                      <TableCell className="text-center">
                        {!rec.attendance ? (
                          <Badge
                            variant="destructive"
                            className="font-bold px-2 py-0.5 text-[10px] uppercase"
                          >
                            FALTA
                          </Badge>
                        ) : rec.attendance.checkOut ? (
                          <Badge
                            variant="success"
                            className="font-bold px-2 py-0.5 text-[10px] uppercase"
                          >
                            COMPLETO
                          </Badge>
                        ) : (
                          <Badge
                            variant="warning"
                            className="font-bold px-2 py-0.5 text-[10px] uppercase"
                          >
                            PRESENTE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!rec.attendance ? (
                          <Button
                            size="sm"
                            onClick={() => handleCheckIn(rec.employeeId)}
                            className="h-8 font-black text-[10px] uppercase shadow-lg bg-emerald-500 hover:bg-emerald-600 rounded-lg px-4"
                          >
                            Entrada
                          </Button>
                        ) : !rec.attendance.checkOut ? (
                          <Button
                            size="sm"
                            onClick={() => handleCheckOut(rec.employeeId)}
                            className="h-8 font-black text-[10px] uppercase shadow-lg bg-amber-500 hover:bg-amber-600 rounded-lg px-4"
                          >
                            Salida
                          </Button>
                        ) : (
                          <Button
                            disabled
                            variant="outline"
                            size="sm"
                            className="h-8 font-black text-[10px] uppercase opacity-50 rounded-lg"
                          >
                            Finalizado
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* --- TAB: PERMISOS --- */}
        <TabsContent value="leaves" className="space-y-6">
          <Card className="rounded-2xl border overflow-hidden shadow-xl bg-[var(--card)] border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-lg text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <CalendarIcon size={22} className="text-[var(--primary)]" />
                  Solicitudes de Permiso
                </h3>
                <p className="text-xs font-bold text-[var(--text-sec)] opacity-60 uppercase tracking-widest mt-1">
                  Gestiona las solicitudes de ausencia y permisos del personal
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="h-7 px-4 font-black text-[10px] uppercase border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5"
                >
                  {pendingLeaves.length} Pendientes
                </Badge>
                <Button
                  size="sm"
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="h-8 gap-1.5 font-black text-[10px] uppercase tracking-widest shadow-lg rounded-lg"
                >
                  <Plus size={14} /> Nueva Solicitud
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg)]/50">
                  <TableRow className="border-[var(--border)] hover:bg-transparent">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">
                      Empleado
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">
                      Tipo / Razón
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">
                      Período
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">
                      Días
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-4 text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center opacity-20">
                          <CheckCircle2 size={48} className="mb-4" />
                          <p className="font-black uppercase tracking-widest text-sm">
                            No hay solicitudes pendientes
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingLeaves.map((leave) => (
                      <TableRow
                        key={leave.id}
                        className="border-[var(--border)] hover:bg-[var(--bg)]/30 transition-colors group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black text-sm">
                              {leave.employee.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-tight">
                                {leave.employee.fullName}
                              </p>
                              <p className="text-[10px] font-mono font-bold opacity-50">
                                {leave.employee.employeeCode}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="font-black text-[9px] uppercase bg-[var(--bg)] border-[var(--border)] mb-1"
                          >
                            {leave.leaveType.name}
                          </Badge>
                          <p className="text-xs font-bold text-[var(--text-sec)] italic max-w-[200px] truncate">
                            "{leave.reason}"
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 text-emerald-500">
                              <ArrowRight
                                size={10}
                                className="rotate-[-135deg]"
                              />{" "}
                              {new Date(leave.startDate).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 text-rose-500">
                              <ArrowRight
                                size={10}
                                className="rotate-[45deg]"
                              />{" "}
                              {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-black text-sm">
                            {leave.totalDays}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleLeaveAction(leave.id, "RECHAZADO")
                              }
                              className="h-8 font-black text-[10px] uppercase border-rose-500/30 text-rose-500 hover:bg-rose-500/5 rounded-lg"
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleLeaveAction(leave.id, "APROBADO")
                              }
                              className="h-8 font-black text-[10px] uppercase shadow-lg bg-emerald-500 hover:bg-emerald-600 rounded-lg"
                            >
                              Aprobar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Personal en Permiso Actual */}
          <Card className="rounded-2xl border overflow-hidden shadow-xl bg-[var(--card)] border-[var(--border)] mt-8">
            <div className="p-6 border-b border-[var(--border)] bg-amber-500/5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <Users2 size={22} className="text-amber-500" />
                  Personal actualmente en Permiso
                </h3>
                <p className="text-xs font-bold text-[var(--text-sec)] opacity-60 uppercase tracking-widest mt-1">
                  Empleados con estado "PERMISO" en el sistema
                </p>
              </div>
              <Badge variant="warning" className="h-7 px-4">
                {employees.length} En Permiso
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell className="h-32 text-center text-xs font-bold opacity-30 uppercase tracking-widest">
                        No hay personal con estado de permiso actualmente
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.id} className="border-[var(--border)] hover:bg-amber-500/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-tight">
                                {emp.fullName}
                              </p>
                              <p className="text-[10px] font-mono font-bold opacity-50">
                                {emp.employeeCode}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold text-[var(--text-sec)] uppercase">
                            {emp.department?.name || "Sin Depto"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatusChangeModal({ employee: emp, newStatus: "ACTIVO" })}
                            className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10"
                          >
                            Reinstalar / Activar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* --- TAB: CONFIGURACIÓN --- */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Departamentos */}
            <Card className="p-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <Building2 size={20} className="text-[var(--primary)]" />{" "}
                  Departamentos
                </h3>
                <Button
                  size="icon"
                  onClick={() =>
                    setIsConfigModalOpen({ type: "dept", open: true })
                  }
                  className="h-8 w-8 rounded-lg shadow-lg"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {departments.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all shadow-sm"
                  >
                    <span className="text-sm font-bold text-[var(--text-main)]">
                      {d.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConfig("dept", d.id)}
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {departments.length === 0 && (
                  <div className="text-center py-8 opacity-40">
                    <AlertCircle className="mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase">
                      Sin departamentos
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Cargos */}
            <Card className="p-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <Briefcase size={20} className="text-[var(--primary)]" />{" "}
                  Cargos / Puestos
                </h3>
                <Button
                  size="icon"
                  onClick={() =>
                    setIsConfigModalOpen({ type: "pos", open: true })
                  }
                  className="h-8 w-8 rounded-lg shadow-lg"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {positions.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all shadow-sm"
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {p.title}
                      </p>
                      <p className="text-[10px] font-black text-[var(--text-sec)] opacity-60 uppercase tracking-tight">
                        {departments.find((d) => d.id === p.departmentId)
                          ?.name || "General"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConfig("pos", p.id)}
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {positions.length === 0 && (
                  <div className="text-center py-8 opacity-40">
                    <AlertCircle className="mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase">
                      Sin cargos
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Horarios */}
            <Card className="p-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <Clock size={20} className="text-[var(--primary)]" /> Horarios
                </h3>
                <Button
                  size="icon"
                  onClick={() =>
                    setIsConfigModalOpen({ type: "sch", open: true })
                  }
                  className="h-8 w-8 rounded-lg shadow-lg"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all shadow-sm"
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {s.name}
                      </p>
                      <p className="text-[10px] font-mono font-black text-[var(--text-sec)] opacity-60 uppercase">
                        {s.entryTime} - {s.exitTime}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConfig("sch", s.id)}
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {schedules.length === 0 && (
                  <div className="text-center py-8 opacity-40">
                    <AlertCircle className="mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase">
                      Sin horarios
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Tipos de Permiso */}
            <Card className="p-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                  <CalendarIcon size={20} className="text-[var(--primary)]" /> Permisos
                </h3>
                <Button
                  size="icon"
                  onClick={() => setIsConfigModalOpen({ type: "lvType", open: true })}
                  className="h-8 w-8 rounded-lg shadow-lg"
                >
                  <Plus size={16} />
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {leaveTypes.map((lt) => (
                  <div
                    key={lt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all shadow-sm"
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {lt.name}
                      </p>
                      <p className="text-[10px] font-black text-[var(--text-sec)] opacity-60 uppercase">
                        {lt.isPaid ? "Pagado" : "No Pagado"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConfig("lvType", lt.id)}
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                {leaveTypes.length === 0 && (
                  <div className="text-center py-8 opacity-40">
                    <AlertCircle className="mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase">
                      Sin Tipos
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- MODAL: NUEVA SOLICITUD DE PERMISO --- */}
      <Dialog open={isLeaveModalOpen} onOpenChange={(open) => {
        setIsLeaveModalOpen(open);
        if (!open) {
          setLeaveForm({ employeeId: "", leaveTypeId: "", reason: "" });
          setLeaveStartDate(undefined);
          setLeaveEndDate(undefined);
        }
      }}>
        <DialogContent className="sm:max-w-lg w-[95vw] p-0 overflow-hidden border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20">
                <CalendarIcon size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">
                  Nueva Solicitud de Permiso
                </DialogTitle>
                <p className="text-xs text-[var(--text-sec)] mt-0.5 font-bold uppercase tracking-widest opacity-60">
                  Registra un permiso, vacación o incapacidad
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateLeaveRequest}>
            <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">

              {/* Empleado */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                  Empleado <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={leaveForm.employeeId}
                  onValueChange={(v) => setLeaveForm({ ...leaveForm, employeeId: v })}
                >
                  <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] h-10">
                    <SelectValue placeholder="Seleccionar empleado..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allEmployees.length === 0 ? (
                      <SelectItem value="-" disabled>No hay empleados activos</SelectItem>
                    ) : (
                      allEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          <span className="font-bold">{emp.fullName}</span>
                          <span className="text-[10px] opacity-50 ml-2">{emp.employeeCode}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Permiso */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                  Tipo de Permiso <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={leaveForm.leaveTypeId}
                  onValueChange={(v) => setLeaveForm({ ...leaveForm, leaveTypeId: v })}
                >
                  <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] h-10">
                    <SelectValue placeholder="Seleccionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.length === 0 ? (
                      <SelectItem value="-" disabled>No hay tipos de permiso configurados</SelectItem>
                    ) : (
                      leaveTypes.map((lt) => (
                        <SelectItem key={lt.id} value={String(lt.id)}>
                          <span className="font-bold">{lt.name}</span>
                          {lt.isPaid && (
                            <span className="ml-2 text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">Pagado</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {leaveTypes.length === 0 && (
                  <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <Info size={11} /> Ve a Configuración para crear tipos de permiso primero.
                  </p>
                )}
              </div>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                    Fecha Inicio <span className="text-rose-500">*</span>
                  </Label>
                  <DatePicker
                    date={leaveStartDate}
                    setDate={setLeaveStartDate}
                    placeholder="Inicio del permiso"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                    Fecha Fin <span className="text-rose-500">*</span>
                  </Label>
                  <DatePicker
                    date={leaveEndDate}
                    setDate={setLeaveEndDate}
                    placeholder="Fin del permiso"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-sec)]">
                  Motivo / Razón (Opcional)
                </Label>
                <Textarea
                  placeholder="Ej: Cita médica programada, reunión familiar..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="bg-[var(--bg)] border-[var(--border)] resize-none h-20 text-sm"
                  maxLength={500}
                />
                <p className="text-[10px] text-[var(--text-sec)] text-right opacity-50">
                  {leaveForm.reason.length}/500
                </p>
              </div>

            </div>

            <div className="p-6 border-t border-[var(--border)] bg-[var(--bg)]/50 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading || !leaveForm.employeeId || !leaveForm.leaveTypeId || !leaveStartDate || !leaveEndDate}
                className="gap-2 shadow-lg"
              >
                {formLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <CalendarIcon size={16} />
                )}
                {formLoading ? "Registrando..." : "Crear Solicitud"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: NUEVO EMPLEADO (ALINEADO CON LA GUÍA) --- */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>

        <DialogContent className="sm:max-w-[1000px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20">
                <UserPlus size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-[var(--text-main)] text-left uppercase tracking-tight">
                  Registro de Personal
                </DialogTitle>
                <p className="text-sm text-[var(--text-sec)] flex items-center gap-1.5 mt-1 font-bold">
                  <Info size={14} className="text-[var(--primary)]" />
                  Complete la información laboral y personal del nuevo
                  integrante
                </p>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={handleCreateEmployee}
            className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-[var(--card)]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
              <div className="space-y-6">
                <h3 className="text-xs font-black text-[var(--primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2 uppercase tracking-widest">
                  <User size={18} /> Datos del Empleado
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Nombre Completo *
                    </Label>
                    <Input
                      name="fullName"
                      required
                      placeholder="Nombre y apellidos"
                      className="bg-[var(--bg)] border-[var(--border)] font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        DUI
                      </Label>
                      <Input
                        name="dui"
                        placeholder="00000000-0"
                        pattern="^\d{8}-\d$"
                        className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        NIT
                      </Label>
                      <Input
                        name="nit"
                        placeholder="Opcional"
                        className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Género *
                      </Label>
                      <Select name="gender" required defaultValue="MASCULINO">
                        <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                          <SelectItem value="MASCULINO" className="font-bold">
                            Masculino
                          </SelectItem>
                          <SelectItem value="FEMENINO" className="font-bold">
                            Femenino
                          </SelectItem>
                          <SelectItem value="OTRO" className="font-bold">
                            Otro
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Nacimiento
                      </Label>
                      <DatePicker 
                        date={regBirthDate} 
                        setDate={setRegBirthDate} 
                        placeholder="dd/mm/aaaa" 
                      />
                      <input 
                        type="hidden" 
                        name="birthDate" 
                        value={regBirthDate ? format(regBirthDate, 'yyyy-MM-dd') : ''} 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Dirección Residencial
                    </Label>
                    <Textarea
                      name="address"
                      rows={3}
                      placeholder="Ciudad, Colonia, Casa..."
                      className="resize-none bg-[var(--bg)] border-[var(--border)] font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Teléfono Personal
                      </Label>
                      <Input
                        name="phone"
                        placeholder="7777-7777"
                        className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Email
                      </Label>
                      <Input
                        name="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="bg-[var(--bg)] border-[var(--border)] font-bold"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-black text-[var(--primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2 pt-4 uppercase tracking-widest">
                  <AlertCircle size={18} /> Contacto de Emergencia
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Nombre Completo
                    </Label>
                    <Input
                      name="emergencyContactName"
                      placeholder="Ej. Carlos Pérez (Padre)"
                      className="bg-[var(--bg)] border-[var(--border)] font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Parentesco
                      </Label>
                      <Input
                        name="emergencyContactRelation"
                        placeholder="Ej. Padre, Esposa"
                        className="bg-[var(--bg)] border-[var(--border)] font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Teléfono
                      </Label>
                      <Input
                        name="emergencyContactPhone"
                        placeholder="7999-1111"
                        className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black text-[var(--primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2 uppercase tracking-widest">
                  <Briefcase size={18} /> Asignación Laboral
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Sucursal *
                    </Label>
                    <Select
                      name="branchId"
                      required
                      defaultValue={
                        selectedBranch ? String(selectedBranch.id) : undefined
                      }
                    >
                      <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                        <SelectValue placeholder="Seleccionar sucursal..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        {branches.map((b) => (
                          <SelectItem
                            key={b.id}
                            value={String(b.id)}
                            className="font-bold"
                          >
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Fecha Ingreso *
                      </Label>
                      <DatePicker 
                        date={regHireDate} 
                        setDate={setRegHireDate} 
                        placeholder="dd/mm/aaaa" 
                      />
                      <input 
                        type="hidden" 
                        name="hireDate" 
                        value={regHireDate ? format(regHireDate, 'yyyy-MM-dd') : ''} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                        Tipo Contrato *
                      </Label>
                      <Select
                        name="employmentType"
                        required
                        defaultValue="TIEMPO_COMPLETO"
                      >
                        <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                          <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                          <SelectItem
                            value="TIEMPO_COMPLETO"
                            className="font-bold"
                          >
                            Tiempo Completo
                          </SelectItem>
                          <SelectItem
                            value="MEDIO_TIEMPO"
                            className="font-bold"
                          >
                            Medio Tiempo
                          </SelectItem>
                          <SelectItem value="TEMPORAL" className="font-bold">
                            Temporal
                          </SelectItem>
                          <SelectItem value="POR_HORA" className="font-bold">
                            Por Hora
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Departamento
                    </Label>
                    <Select
                      name="departmentId"
                      value={selectedDeptId}
                      onValueChange={setSelectedDeptId}
                    >
                      <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                        <SelectValue placeholder="Seleccionar departamento..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        <SelectItem
                          value="none"
                          className="font-bold opacity-50 italic"
                        >
                          Ninguno
                        </SelectItem>
                        {departments.map((d) => (
                          <SelectItem
                            key={d.id}
                            value={String(d.id)}
                            className="font-bold"
                          >
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Cargo / Puesto
                    </Label>
                    <Select name="positionId">
                      <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                        <SelectValue placeholder="Seleccionar cargo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        <SelectItem
                          value="none"
                          className="font-bold opacity-50 italic"
                        >
                          Ninguno
                        </SelectItem>
                        {availablePositions.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={String(p.id)}
                            className="font-bold"
                          >
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Horario Asignado
                    </Label>
                    <Select name="workScheduleId">
                      <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                        <SelectValue placeholder="Seleccionar horario..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        <SelectItem
                          value="none"
                          className="font-bold opacity-50 italic"
                        >
                          Ninguno
                        </SelectItem>
                        {schedules.map((s) => (
                          <SelectItem
                            key={s.id}
                            value={String(s.id)}
                            className="font-bold"
                          >
                            {s.name} ({s.entryTime} - {s.exitTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[var(--primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2 pt-4 uppercase tracking-widest">
                    <FileText size={18} /> Observaciones
                  </h3>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                      Notas Adicionales
                    </Label>
                    <Textarea
                      name="notes"
                      rows={3}
                      placeholder="Cualquier información relevante..."
                      className="resize-none bg-[var(--bg)] border-[var(--border)] font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-8 mt-6 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="px-6 font-bold border-[var(--border)] hover:bg-[var(--bg)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="px-8 flex items-center gap-2 font-black uppercase tracking-wider shadow-lg shadow-[var(--primary)]/20"
              >
                {formLoading ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {formLoading ? "Procesando..." : "Guardar Empleado"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: NUEVA CONFIGURACIÓN --- */}
      <Dialog
        open={isConfigModalOpen.open}
        onOpenChange={(open) =>
          setIsConfigModalOpen({ ...isConfigModalOpen, open })
        }
      >
        <DialogContent className="max-w-md border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-[var(--text-main)]">
              {isConfigModalOpen.type === "dept"
                ? "Nuevo Departamento"
                : isConfigModalOpen.type === "pos"
                  ? "Nuevo Cargo / Puesto"
                  : isConfigModalOpen.type === "sch"
                    ? "Nuevo Horario Laboral"
                    : "Nuevo Tipo de Permiso"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateConfig} className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Nombre / Título
              </Label>
              <Input
                name={isConfigModalOpen.type === "pos" ? "title" : "name"}
                required
                placeholder={isConfigModalOpen.type === "lvType" ? "Ej: Vacaciones, Enfermedad..." : ""}
                className="bg-[var(--bg)] border-[var(--border)] font-bold"
              />
            </div>

            {isConfigModalOpen.type === "sch" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                    Entrada
                  </Label>
                  <Input
                    name="entryTime"
                    type="time"
                    required
                    className="bg-[var(--bg)] border-[var(--border)] font-bold font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                    Salida
                  </Label>
                  <Input
                    name="exitTime"
                    type="time"
                    required
                    className="bg-[var(--bg)] border-[var(--border)] font-bold font-mono"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                    Minutos Descanso
                  </Label>
                  <Input
                    name="breakMinutes"
                    type="number"
                    defaultValue="60"
                    required
                    className="bg-[var(--bg)] border-[var(--border)] font-bold"
                  />
                </div>
              </div>
            ) : isConfigModalOpen.type === "lvType" ? (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                  ¿Es Permiso Remunerado? (Pagado)
                </Label>
                <Select name="isPaid" defaultValue="false">
                  <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                    <SelectItem value="false" className="font-bold">No Pagado</SelectItem>
                    <SelectItem value="true" className="font-bold">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                  Descripción
                </Label>
                <Textarea
                  name="description"
                  rows={3}
                  placeholder="Detalles opcionales..."
                  className="resize-none bg-[var(--bg)] border-[var(--border)] font-bold"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setIsConfigModalOpen({ ...isConfigModalOpen, open: false })
                }
                className="font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="font-black uppercase tracking-widest flex-1 shadow-lg shadow-[var(--primary)]/20"
              >
                {formLoading ? "Guardando..." : "Guardar Registro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* --- MODAL: DETALLES / EDICIÓN DE EMPLEADO --- */}
      <Dialog
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <DialogContent className="sm:max-w-[1000px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-[var(--primary)]/20 uppercase">
                {selectedEmployee?.fullName?.charAt(0) || "U"}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-[var(--text-main)] text-left uppercase tracking-tight">
                  {selectedEmployee?.fullName}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] font-bold border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 uppercase"
                  >
                    {selectedEmployee?.employeeCode || "EMP-XXXX"}
                  </Badge>
                  <p className="text-xs font-bold text-[var(--text-sec)] opacity-70 uppercase tracking-widest">
                    {selectedEmployee?.position?.title || "Sin Cargo Asignado"}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-[var(--card)]">
            {selectedEmployee && (
              <Tabs
                value={detailsTab}
                onValueChange={(val: any) => setDetailsTab(val)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 mb-8 p-1 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                  <TabsTrigger
                    value="datos"
                    className="py-2.5 font-black uppercase text-[10px] tracking-widest"
                  >
                    Perfil Profesional
                  </TabsTrigger>
                  <TabsTrigger
                    value="expediente"
                    className="py-2.5 font-black uppercase text-[10px] tracking-widest"
                  >
                    Expediente Digital
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="datos"
                  className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <form onSubmit={handleEditEmployee} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-4">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Nombre Completo *
                          </Label>
                          <Input
                            name="fullName"
                            required
                            defaultValue={selectedEmployee.fullName}
                            className="bg-[var(--bg)] border-[var(--border)] font-bold h-11"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                              DUI
                            </Label>
                            <Input
                              name="dui"
                              defaultValue={selectedEmployee.dui || ""}
                              className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                              NIT
                            </Label>
                            <Input
                              name="nit"
                              defaultValue={selectedEmployee.nit || ""}
                              className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                              Género
                            </Label>
                            <Select
                              name="gender"
                              defaultValue={selectedEmployee.gender || "OTRO"}
                            >
                              <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                                <SelectValue placeholder="Seleccione..." />
                              </SelectTrigger>
                              <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                                <SelectItem
                                  value="MASCULINO"
                                  className="font-bold"
                                >
                                  Masculino
                                </SelectItem>
                                <SelectItem
                                  value="FEMENINO"
                                  className="font-bold"
                                >
                                  Femenino
                                </SelectItem>
                                <SelectItem value="OTRO" className="font-bold">
                                  Otro
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                              Nacimiento
                            </Label>
                            <DatePicker 
                              date={editBirthDate} 
                              setDate={setEditBirthDate} 
                              placeholder="dd/mm/aaaa" 
                            />
                            <input 
                              type="hidden" 
                              name="birthDate" 
                              value={editBirthDate ? format(editBirthDate, 'yyyy-MM-dd') : ''} 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Dirección Residencial
                          </Label>
                          <Textarea
                            name="address"
                            rows={2}
                            defaultValue={selectedEmployee.address || ""}
                            className="resize-none bg-[var(--bg)] border-[var(--border)] font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                              Teléfono
                            </Label>
                            <Input
                              name="phone"
                              defaultValue={selectedEmployee.phone || ""}
                              className="bg-[var(--bg)] border-[var(--border)] font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                              Email
                            </Label>
                            <Input
                              name="email"
                              type="email"
                              defaultValue={selectedEmployee.email || ""}
                              className="bg-[var(--bg)] border-[var(--border)] font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Sucursal *
                          </Label>
                          <Select
                            name="branchId"
                            defaultValue={String(
                              selectedEmployee.branchId || "",
                            )}
                            required
                          >
                            <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold h-11">
                              <SelectValue placeholder="Seleccione sucursal" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                              {branches.map((b) => (
                                <SelectItem
                                  key={b.id}
                                  value={String(b.id)}
                                  className="font-bold"
                                >
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Departamento
                          </Label>
                          <Select
                            name="departmentId"
                            defaultValue={
                              selectedEmployee.departmentId
                                ? String(selectedEmployee.departmentId)
                                : "none"
                            }
                          >
                            <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                              <SelectValue placeholder="Seleccione departamento" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                              <SelectItem
                                value="none"
                                className="font-bold opacity-50 italic"
                              >
                                Ninguno
                              </SelectItem>
                              {departments.map((d) => (
                                <SelectItem
                                  key={d.id}
                                  value={String(d.id)}
                                  className="font-bold"
                                >
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Cargo / Puesto
                          </Label>
                          <Select
                            name="positionId"
                            defaultValue={
                              selectedEmployee.positionId
                                ? String(selectedEmployee.positionId)
                                : "none"
                            }
                          >
                            <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                              <SelectValue placeholder="Seleccione cargo" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                              <SelectItem
                                value="none"
                                className="font-bold opacity-50 italic"
                              >
                                Ninguno
                              </SelectItem>
                              {positions.map((p) => (
                                <SelectItem
                                  key={p.id}
                                  value={String(p.id)}
                                  className="font-bold"
                                >
                                  {p.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Tipo de Contrato
                          </Label>
                          <Select
                            name="employmentType"
                            defaultValue={
                              selectedEmployee.employmentType ||
                              "TIEMPO_COMPLETO"
                            }
                          >
                            <SelectTrigger className="bg-[var(--bg)] border-[var(--border)] font-bold">
                              <SelectValue placeholder="Seleccione tipo" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                              <SelectItem
                                value="TIEMPO_COMPLETO"
                                className="font-bold"
                              >
                                Tiempo Completo
                              </SelectItem>
                              <SelectItem
                                value="MEDIO_TIEMPO"
                                className="font-bold"
                              >
                                Medio Tiempo
                              </SelectItem>
                              <SelectItem
                                value="TEMPORAL"
                                className="font-bold"
                              >
                                Temporal
                              </SelectItem>
                              <SelectItem
                                value="POR_HORA"
                                className="font-bold"
                              >
                                Por Hora
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                            Fecha de Contratación *
                          </Label>
                          <DatePicker 
                            date={editHireDate} 
                            setDate={setEditHireDate} 
                            placeholder="dd/mm/aaaa" 
                          />
                          <input 
                            type="hidden" 
                            name="hireDate" 
                            value={editHireDate ? format(editHireDate, 'yyyy-MM-dd') : ''} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border)]">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedEmployee(null)}
                        className="font-bold"
                      >
                        Cerrar
                      </Button>
                      <Button
                        type="submit"
                        disabled={formLoading}
                        className="px-8 font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20"
                      >
                        {formLoading ? "Guardando..." : "Actualizar Perfil"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent
                  value="expediente"
                  className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="p-10 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)]/30 text-center space-y-4 group hover:border-[var(--primary)]/30 transition-all">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Download size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-[var(--text-main)] uppercase tracking-tight">
                        Cargar Nuevo Documento
                      </h3>
                      <p className="text-xs font-bold text-[var(--text-sec)] opacity-60 max-w-xs mx-auto mt-1">
                        Soporta archivos PDF, JPG o PNG de hasta 5MB para el
                        expediente del empleado
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 text-left">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                          Tipo Documento
                        </Label>
                        <Select disabled defaultValue="CONTRATO">
                          <SelectTrigger className="bg-[var(--card)] border-[var(--border)] font-bold opacity-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONTRATO">CONTRATO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                          Nombre Descriptivo
                        </Label>
                        <Input
                          disabled
                          placeholder="Ej. Contrato 2024"
                          className="bg-[var(--card)] border-[var(--border)] font-bold opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                          Fecha Expiración
                        </Label>
                        <Input
                          disabled
                          type="date"
                          className="bg-[var(--card)] border-[var(--border)] font-bold opacity-50"
                        />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      disabled
                      className="mt-6 border-[var(--primary)]/50 text-[var(--primary)] font-black uppercase tracking-widest h-11 px-8 rounded-xl hover:bg-[var(--primary)]/5"
                    >
                      Seleccionar Archivo (Próximamente)
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="font-black text-sm uppercase tracking-widest text-[var(--text-main)]">
                        Documentos en Expediente
                      </h3>
                      <Badge
                        variant="outline"
                        className="font-bold border-[var(--border)] text-[var(--text-sec)]"
                      >
                        0 Archivos
                      </Badge>
                    </div>
                    <div className="text-center py-16 bg-[var(--bg)]/50 rounded-3xl border border-[var(--border)] shadow-inner">
                      <FileText size={48} className="mx-auto opacity-10 mb-4" />
                      <p className="text-xs font-bold text-[var(--text-sec)] opacity-40 uppercase tracking-widest">
                        El historial de documentos está vacío
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: CAMBIO DE ESTADO --- */}
      <Dialog
        open={!!(statusChangeModal.employee && statusChangeModal.newStatus)}
        onOpenChange={(open) =>
          !open && setStatusChangeModal({ employee: null, newStatus: null })
        }
      >
        <DialogContent className="max-w-md border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-[var(--text-main)]">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                <AlertCircle size={24} />
              </div>
              Actualizar Estado
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-6 pt-4">
            <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
              <p className="text-xs font-bold text-[var(--text-sec)] opacity-60 uppercase tracking-widest">
                Nuevo Estado solicitado:
              </p>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-[var(--primary)] animate-pulse" />
                <span className="text-lg font-black text-[var(--primary)] uppercase">
                  {statusChangeModal.newStatus}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black opacity-60 tracking-widest">
                Notas / Motivo del Cambio
              </Label>
              <Textarea
                name="notes"
                rows={4}
                placeholder="Indique la razón del cambio de estado para el historial..."
                className="resize-none bg-[var(--bg)] border-[var(--border)] font-bold"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setStatusChangeModal({ employee: null, newStatus: null })
                }
                className="font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="font-black uppercase tracking-widest flex-1 shadow-lg shadow-[var(--primary)]/20"
              >
                {formLoading ? "Procesando..." : "Confirmar Cambio de Estado"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
