import { Link, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import logo from "../../../assets/logo.png";

import {
  Sprout,
  LayoutDashboard,
  Package,
  Store,
  Users,
  UserCog,
  Briefcase,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Settings,
  TruckIcon,
  X,
  RotateCcw,
  Wallet,
  Landmark,
  Route,
  History,
  ShieldAlert,
  Banknote,
} from "lucide-react";

// roleId: 1=PROPIETARIO, 2=ADMINISTRADOR, 3=SUPERVISOR, 4=CAJERO, 5=BODEGUERO, 6=VENDEDOR
const navLinks = [
  { path: "/home", icon: Sprout, label: "Inicio" },
  { path: "/pos", icon: ShoppingCart, label: "Punto de Venta", roles: [1, 2, 3, 4, 6] },
  { path: "/caja", icon: Banknote, label: "Caja (Cobros)", roles: [1, 2, 3, 4] },
  { path: "/sales", icon: History, label: "Historial de Ventas", roles: [1, 2, 3, 4] },
  { path: "/quotes", icon: FileText, label: "Cotizaciones", roles: [1, 2, 3, 4, 6] },
  { path: "/inventory", icon: Package, label: "Inventario", roles: [1, 2, 3, 5] },
  { path: "/purchases", icon: ShoppingBag, label: "Compras a Prov.", roles: [1, 2, 5] },
  { path: "/delivery-notes", icon: TruckIcon, label: "Albaranes", roles: [1, 2, 3, 5] },
  { path: "/customers", icon: Users, label: "Clientes", roles: [1, 2, 3, 4, 6] },
  { path: "/credit", icon: Landmark, label: "Cuentas por Cobrar", roles: [1, 2, 3, 4] },
  { path: "/finance", icon: Wallet, label: "Finanzas y Caja", roles: [1, 2, 3, 4] },
  { path: "/rrhh", icon: Briefcase, label: "Recursos Humanos", roles: [1, 2, 3] },
  { path: "/reports", icon: FileText, label: "Reportes", roles: [1, 2] },
  { path: "/audit", icon: ShieldAlert, label: "Auditoría", roles: [1, 2] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-50 md:z-auto
          w-64 h-full border-r flex flex-col px-6 pt-0 pb-6
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          backgroundColor: "var(--sidebar)",
          borderColor: "var(--border)",
        }}
      >
        {/* Close button - Mobile only */}
        <button
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 p-2 rounded-lg text-[var(--text-sec)]"
        >
          <X size={24} />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center gap-0 mb-10 text-center -mt-4">
          <img src={logo} alt="Logo" className="w-44 h-auto" />
          <span
            className="text-xl font-bold leading-tight -mt-6 text-primary"
          >
            Agroferr D'Campo
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navLinks
            .filter(
              (link) =>
                !link.roles ||
                (user?.roleId !== undefined &&
                  link.roles.includes(user.roleId)),
            )
            .map(({ path, icon: Icon, label }) => {
              const isActive = (() => {
                const [basePath, searchStr] = path.split("?");
                if (location.pathname !== basePath) return false;
                if (!searchStr) {
                  const currentTab = new URLSearchParams(location.search).get("tab");
                  return !currentTab || currentTab === "history";
                }
                const targetParams = new URLSearchParams(searchStr);
                const currentParams = new URLSearchParams(location.search);
                return targetParams.get("tab") === currentParams.get("tab");
              })();

              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => {
                    if (window.innerWidth < 768) onClose();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "var(--primary)" : "var(--text-sec)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "var(--accent)";
                      e.currentTarget.style.color = "var(--primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--text-sec)";
                    }
                  }}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Footer Info */}
        <div
          className="mt-auto pt-6 border-t text-sm border-[var(--border)] flex justify-between items-center"
        >
          <div>
            <p className="font-semibold text-[var(--text-main)]">
              Agroferr D'Campo
            </p>
            <p className="text-xs mt-1 text-[var(--text-sec)]">Sistema Multi-Sucursal v1.0</p>
          </div>
          {(!user?.roleId || user.roleId === 1 || user.roleId === 2) && (
            <Link
              to="/settings"
              onClick={() => {
                if (window.innerWidth < 768) onClose();
              }}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--accent)] hover:text-[var(--primary)] text-[var(--text-sec)]"
              title="Configuración"
            >
              <Settings size={20} />
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
