import { Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

export function Dashboard() {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="p-8 bg-[var(--card)] rounded-full border border-[var(--border)] shadow-sm">
        <Wrench size={64} className="text-[var(--primary)] opacity-80" />
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-3 text-[var(--text-main)]">
          Bienvenido, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-[var(--text-sec)] max-w-md mx-auto leading-relaxed">
          El panel de control interactivo (Dashboard) se encuentra actualmente en desarrollo. 
          Por favor, utiliza el menú lateral para acceder a los módulos operativos de <span className="font-semibold text-[var(--text-main)]">{selectedBranch?.name || 'tu sucursal'}</span>.
        </p>
      </div>
    </div>
  );
}
