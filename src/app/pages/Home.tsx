import React from 'react';
import { 
  ShoppingCart, FileText, TruckIcon, Users, Package, 
  Landmark, Route, Wallet, Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

export function Home() {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
          Inicio Rapido
        </h1>
        <p className="text-[var(--text-sec)]">
          Hola, {user?.name}. Sucursal: <span className="font-semibold text-[var(--text-main)]">{selectedBranch?.name || user?.branch || 'Principal'}</span>.
        </p>
      </div>

      <div className="flex flex-col gap-6 my-2">
        {/* Acciones Frecuentes */}
        <div>
          <h2 className="text-[11px] font-black text-[var(--text-sec)] uppercase tracking-widest mb-3">Acciones Frecuentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAccessCard 
              icon={ShoppingCart} title="Nueva venta" subtitle="Ir directo al punto de venta" 
              badge="Punto de Venta" onClick={() => navigate('/pos')} badgeColor="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            />
            <QuickAccessCard 
              icon={FileText} title="Nueva cotización" subtitle="Crear cotización para cliente" 
              badge="Cotizaciones" onClick={() => navigate('/quotes')} badgeColor="bg-blue-500/10 text-blue-600 border-blue-500/20"
            />
            <QuickAccessCard 
              icon={TruckIcon} title="Compra a proveedor" subtitle="Registrar nueva compra" 
              badge="Compras" onClick={() => navigate('/purchases')} badgeColor="bg-orange-500/10 text-orange-600 border-orange-500/20"
            />
            <QuickAccessCard 
              icon={Users} title="Nuevo cliente" subtitle="Registrar un cliente nuevo" 
              badge="Clientes" onClick={() => navigate('/customers')} badgeColor="bg-teal-500/10 text-teal-600 border-teal-500/20"
            />
          </div>
        </div>

        {/* Alertas y Pendientes */}
        <div>
          <h2 className="text-[11px] font-black text-[var(--text-sec)] uppercase tracking-widest mb-3">Alertas y Pendientes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAccessCard 
              icon={Package} title="Inventario general" subtitle="Gestión de inventario"
              badge="Ver inventario" onClick={() => navigate('/inventory')} badgeColor="bg-amber-500/10 text-amber-600 border-amber-500/20"
            />
            <QuickAccessCard 
              icon={TruckIcon} title="Albaranes PTS" subtitle="Pendientes de entrega"
              badge="Ver albaranes" onClick={() => navigate('/delivery-notes')} badgeColor="bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
            />
            <QuickAccessCard 
              icon={Landmark} title="Cuentas por cobrar" subtitle="Saldos pendientes de clientes" 
              badge="Finanzas" onClick={() => navigate('/finance')} badgeColor="bg-rose-500/10 text-rose-600 border-rose-500/20"
            />
            <QuickAccessCard 
              icon={FileText} title="Reporte de ventas" subtitle="Resumen del período actual" 
              badge="Reportes" onClick={() => navigate('/reports')} badgeColor="bg-green-500/10 text-green-600 border-green-500/20"
            />
          </div>
        </div>

        {/* Operaciones del Día */}
        <div>
          <h2 className="text-[11px] font-black text-[var(--text-sec)] uppercase tracking-widest mb-3">Operaciones del Día</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAccessCard 
              icon={Route} title="Rutas de reparto" subtitle="Ver entregas del día" 
              badge="Reparto" onClick={() => navigate('/delivery-routes')} badgeColor="bg-sky-500/10 text-sky-600 border-sky-500/20"
            />
            <QuickAccessCard 
              icon={Wallet} title="Apertura de caja" subtitle="Registrar monto inicial" 
              badge="Finanzas y Caja" onClick={() => navigate('/finance')} badgeColor="bg-blue-500/10 text-blue-600 border-blue-500/20"
            />
            <QuickAccessCard 
              icon={Package} title="Traslado de inventario" subtitle="Mover stock entre sucursales" 
              badge="Inventario" onClick={() => navigate('/inventory')} badgeColor="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            />
            <QuickAccessCard 
              icon={Briefcase} title="Recursos Humanos" subtitle="Asistencia y planilla" 
              badge="RRHH" onClick={() => navigate('/rrhh')} badgeColor="bg-pink-500/10 text-pink-600 border-pink-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAccessCard({ icon: Icon, title, subtitle, badge, onClick, badgeColor = "bg-green-500/10 text-green-500 border-green-500/20" }: any) {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:bg-[var(--bg)] hover:border-[var(--primary)]/50 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg)] text-[var(--text-sec)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div>
        <h3 className="font-bold text-[var(--text-main)] text-sm mb-1 group-hover:text-[var(--primary)] transition-colors">{title}</h3>
        <p className="text-[11px] text-[var(--text-sec)] leading-tight">{subtitle}</p>
      </div>
      <div className="mt-auto pt-1">
        <Badge variant="outline" className={`border text-[10px] font-bold px-2 py-0.5 shadow-none ${badgeColor}`}>
          {badge}
        </Badge>
      </div>
    </div>
  );
}
