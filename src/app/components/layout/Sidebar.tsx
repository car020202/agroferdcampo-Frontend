import { Link, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import logo from "../../../assets/logo.png";

import {
  Sprout,
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  TruckIcon,
  Wallet,
  X,
} from "lucide-react";

const navLinks = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/pos", icon: ShoppingCart, label: "Punto de Venta" },
  { path: "/inventory", icon: Package, label: "Inventario" },
  { path: "/customers", icon: Users, label: "Clientes" },
  { path: "/users", icon: Users, label: "Usuarios", roles: [1, 2] },
  { path: "/suppliers", icon: TruckIcon, label: "Proveedores" },
  { path: "/finance", icon: Wallet, label: "Finanzas" },
  { path: "/reports", icon: FileText, label: "Reportes" },
  { path: "/settings", icon: Settings, label: "Configuración" },
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
          w-64 min-h-screen border-r flex flex-col px-6 pt-0 pb-6
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
          className="md:hidden absolute right-4 top-4 p-2 rounded-lg"
          style={{ color: "var(--text-sec)" }}
        >
          <X size={24} />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center gap-0 mb-10 text-center -mt-4">
          <img src={logo} alt="Logo" className="w-44 h-auto" />
          <span
            className="text-xl font-bold leading-tight -mt-6"
            style={{ color: "var(--accent)" }}
          >
            Agroferr D'Campo
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navLinks
            .filter(link => !link.roles || (user && link.roles.includes(user.roleId)))
            .map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;

            return (
              <Link
                key={path}
                to={path}
                onClick={() => {
                  if (window.innerWidth < 768) onClose();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium"
                style={{
                  backgroundColor: isActive ? "var(--bg)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-sec)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "var(--bg)";
                    e.currentTarget.style.color = "var(--accent)";
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
          className="mt-auto pt-6 border-t text-sm"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-sec)",
          }}
        >
          <p className="font-semibold" style={{ color: "var(--text-main)" }}>
            Agroferr D'Campo
          </p>

          <p className="text-xs mt-1">Sistema Multi-Sucursal v1.0</p>
        </div>
      </aside>
    </>
  );
}
