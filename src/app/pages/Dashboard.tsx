import { 
  ShoppingCart, 
  Clock, 
  AlertTriangle, 
  UserPlus, 
  TrendingUp, 
  Package,
  DollarSign,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  alert?: boolean;
}

function StatCard({ title, value, icon, trend, alert }: StatCardProps) {
  return (
    <div 
      className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
      style={{ 
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        boxShadow: '0 4px 6px var(--shadow)'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--text-sec)' }}>
          {title}
        </span>
        <div style={{ color: alert ? '#f59e0b' : 'var(--text-sec)' }}>
          {icon}
        </div>
      </div>
      
      <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
        {value}
      </div>

      {trend && (
        <div 
          className="flex items-center gap-1 text-sm"
          style={{ color: trend.isPositive ? 'var(--accent)' : '#ef4444' }}
        >
          <TrendingUp size={14} />
          <span>{trend.value}</span>
        </div>
      )}

      {alert && (
        <div className="text-sm" style={{ color: '#f59e0b' }}>
          Requiere atención
        </div>
      )}
    </div>
  );
}

interface RecentActivity {
  id: string;
  type: 'sale' | 'purchase' | 'transfer';
  description: string;
  amount?: string;
  time: string;
}

const recentActivities: RecentActivity[] = [
  { id: '1', type: 'sale', description: 'Venta - Factura #00123', amount: '$245.00', time: 'Hace 5 min' },
  { id: '2', type: 'sale', description: 'Venta - Factura #00122', amount: '$89.50', time: 'Hace 12 min' },
  { id: '3', type: 'purchase', description: 'Compra - Orden #PO-045', amount: '$1,250.00', time: 'Hace 1 hora' },
  { id: '4', type: 'transfer', description: 'Traslado entre sucursales', amount: '25 productos', time: 'Hace 2 horas' },
  { id: '5', type: 'sale', description: 'Venta - Factura #00121', amount: '$156.75', time: 'Hace 3 horas' }
];

export function Dashboard() {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
          Bienvenido de nuevo, {user?.name.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-sec)' }}>
          {(user?.roleId === 1 || user?.roleId === 2) 
            ? `Vista consolidada - ${selectedBranch.name}` 
            : `${selectedBranch.name}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Ventas Hoy"
          value="$1,240.50"
          icon={<ShoppingCart size={20} />}
          trend={{ value: '+12% vs ayer', isPositive: true }}
        />
        <StatCard
          title="Pedidos Pendientes"
          value={24}
          icon={<Clock size={20} />}
          trend={{ value: 'Listos para despacho', isPositive: true }}
        />
        <StatCard
          title="Stock Crítico"
          value={5}
          icon={<AlertTriangle size={20} />}
          alert
        />
        <StatCard
          title="Nuevos Clientes"
          value={12}
          icon={<UserPlus size={20} />}
          trend={{ value: '+4 esta semana', isPositive: true }}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div 
          className="lg:col-span-2 p-6 rounded-2xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-main)' }}>
            Actividad Reciente
          </h2>
          
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'var(--bg)' }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: 
                        activity.type === 'sale' ? 'var(--accent)' :
                        activity.type === 'purchase' ? 'var(--primary)' :
                        'var(--text-sec)',
                      opacity: 0.2
                    }}
                  >
                    {activity.type === 'sale' && <DollarSign size={20} style={{ color: 'var(--accent)' }} />}
                    {activity.type === 'purchase' && <Package size={20} style={{ color: 'var(--primary)' }} />}
                    {activity.type === 'transfer' && <TrendingUp size={20} style={{ color: 'var(--text-sec)' }} />}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-main)' }}>
                      {activity.description}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
                {activity.amount && (
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                    {activity.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Products Low Stock */}
          <div 
            className="p-6 rounded-2xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
              Productos con Stock Bajo
            </h3>
            <div className="space-y-3">
              {['Fertilizante 20-20-20', 'Semilla de Maíz', 'Herbicida Glifosato'].map((product, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-main)' }}>{product}</span>
                  <span 
                    className="text-sm font-semibold px-2 py-1 rounded"
                    style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                  >
                    {Math.floor(Math.random() * 10) + 1} unid.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div 
            className="p-6 rounded-2xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-main)' }}>
              Clientes Frecuentes
            </h3>
            <div className="space-y-3">
              {['Hacienda El Progreso', 'Agropecuaria San José', 'Finca La Esperanza'].map((customer, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg)' }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                  >
                    {customer.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                      {customer}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                      ${(Math.random() * 5000 + 1000).toFixed(2)} en compras
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
