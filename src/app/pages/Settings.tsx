import { Settings as SettingsIcon, Building2, Users, Receipt, Bell, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router';
import { ColorSwatches } from '../components/ui/ThemePreview';

const SETTINGS_SECTIONS = [
  {
    id: '1',
    title: 'Configuración de Sucursales',
    description: 'Gestionar sucursales, direcciones y datos fiscales',
    icon: Building2,
    adminOnly: false,
  },
  {
    id: '2',
    title: 'Gestión de Usuarios',
    description: 'Administrar usuarios, roles y permisos',
    icon: Users,
    adminOnly: false,
  },
  {
    id: '3',
    title: 'Facturación Electrónica',
    description: 'Configurar integración DTE y certificados',
    icon: Receipt,
    adminOnly: false,
  },
  {
    id: '4',
    title: 'Notificaciones',
    description: 'Configurar alertas de stock, pagos y sistema',
    icon: Bell,
    adminOnly: false,
  },
];

export function Settings() {
  const { user } = useAuth();
  const { currentColors, isCustomThemeActive } = useTheme();
  const navigate = useNavigate();

  const isAdmin = user?.roleId === 1 || user?.roleId === 2;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-main)' }}>
        Configuración
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personalización de Colores — Solo Admin */}
        {isAdmin && (
          <div
            onClick={() => navigate('/settings/theme')}
            className="p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--accent)',
              boxShadow: '0 4px 6px var(--shadow)',
              borderWidth: '2px',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                }}
              >
                <Palette size={28} style={{ color: '#ffffff' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>
                    Personalización de Colores
                  </h3>
                  {isCustomThemeActive && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 600,
                      }}
                    >
                      Personalizado
                    </span>
                  )}
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-sec)' }}>
                  Modificar colores del sistema, generar paletas y guardar combinaciones
                </p>
                <ColorSwatches colors={currentColors} size={18} />
              </div>
            </div>
          </div>
        )}

        {/* Secciones estándar */}
        {SETTINGS_SECTIONS.map((section) => (
          <div
            key={section.id}
            className="p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              boxShadow: '0 4px 6px var(--shadow)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--accent)', opacity: 0.9 }}
              >
                <section.icon size={28} style={{ color: '#ffffff' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                  {section.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
                  {section.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div
        className="mt-8 p-6 rounded-2xl border"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <SettingsIcon size={24} style={{ color: 'var(--accent)' }} />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
            Información del Sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Versión</p>
            <p className="font-semibold" style={{ color: 'var(--text-main)' }}>1.0.0</p>
          </div>
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Sistema</p>
            <p className="font-semibold" style={{ color: 'var(--text-main)' }}>Agroferr D'Campo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
