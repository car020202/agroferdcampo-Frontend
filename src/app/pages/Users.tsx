import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Plus, Phone, Mail, Shield, AlertCircle, Edit, Trash2, X } from 'lucide-react';
import { apiRequest } from '../config/api';

interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  dui: string;
  roleId: number;
  isActive: boolean;
}

const ROLES = [
  { id: 1, name: 'Propietario' },
  { id: 2, name: 'Administrador' },
  { id: 3, name: 'Supervisor' },
  { id: 4, name: 'Cajero' },
  { id: 5, name: 'Bodeguero' }
];

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dui: '',
    password: '',
    roleId: 4,
    isActive: true,
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest<User[]>('/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
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
        password: '',
        roleId: user.roleId,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({ fullName: '', email: '', phone: '', dui: '', password: '', roleId: 4, isActive: true });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password) delete (payload as any).password;
        await apiRequest(`/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/users', { method: 'POST', body: JSON.stringify(formData) });
      }
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      setFormError(error.message || 'Error al procesar la solicitud');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que deseas ${action} a ${user.fullName}?`)) return;

    try {
      if (user.isActive) {
        await apiRequest(`/users/${user.id}`, { method: 'DELETE' });
      } else {
        await apiRequest(`/users/${user.id}/activate`, { method: 'PATCH' });
      }
      fetchUsers();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
          Usuarios
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats - Estilo Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <UsersIcon size={24} style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-sec)' }}>Total Usuarios</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{users.length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <UsersIcon size={24} style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-sec)' }}>Activos</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{users.filter(u => u.isActive).length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <Shield size={24} style={{ color: '#f59e0b' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-sec)' }}>Admins</p>
              <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{users.filter(u => u.roleId < 3).length}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={24} style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm" style={{ color: 'var(--text-sec)' }}>Inactivos</p>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{users.filter(u => !u.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search - Estilo Clientes */}
      <div className="p-4 rounded-xl border mb-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
          <Search size={20} style={{ color: 'var(--text-sec)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuarios..."
            className="flex-1 bg-transparent outline-none"
            style={{ color: 'var(--text-main)' }}
          />
        </div>
      </div>

      {/* Table - Estilo Clientes */}
      <div className="rounded-xl border border-separate overflow-hidden" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-main)' }}>Usuario</th>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-main)' }}>Contacto</th>
                <th className="text-right p-4 font-semibold" style={{ color: 'var(--text-main)' }}>Rol</th>
                <th className="text-right p-4 font-semibold" style={{ color: 'var(--text-main)' }}>DUI / Tel</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-main)' }}>Estado</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-main)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-base" style={{ backgroundColor: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-main)' }}>{u.fullName}</p>
                        <p className="text-sm font-mono" style={{ color: 'var(--text-sec)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-sec)' }}>
                        <Phone size={14} />
                        <span>{u.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                      {ROLES.find(r => r.id === u.roleId)?.name}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-semibold font-mono" style={{ color: 'var(--accent)' }}>
                      {u.dui}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: u.isActive ? '#d1fae5' : '#fee2e2',
                        color: u.isActive ? '#065f46' : '#991b1b'
                      }}
                    >
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => handleOpenModal(u)} className="p-1" style={{ color: 'var(--text-sec)' }}><Edit size={16} /></button>
                       <button onClick={() => handleToggleStatus(u)} className="p-1" style={{ color: u.isActive ? '#ef4444' : 'var(--accent)' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Estilo consistente con el sistema */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border shadow-2xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-sec)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600">{formError}</div>}
              <div>
                <label className="block text-xs font-bold mb-1 uppercase opacity-70" style={{ color: 'var(--text-sec)' }}>Nombre Completo</label>
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2 rounded-lg border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase opacity-70" style={{ color: 'var(--text-sec)' }}>Email</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 rounded-lg border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase opacity-70" style={{ color: 'var(--text-sec)' }}>Teléfono</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 rounded-lg border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase opacity-70" style={{ color: 'var(--text-sec)' }}>DUI</label>
                  <input type="text" value={formData.dui} onChange={(e) => setFormData({...formData, dui: e.target.value})} className="w-full px-4 py-2 rounded-lg border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase opacity-70" style={{ color: 'var(--text-sec)' }}>Rol</label>
                  <select value={formData.roleId} onChange={(e) => setFormData({...formData, roleId: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-lg border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase opacity-70" style={{ color: 'var(--text-sec)' }}>Contraseña</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 rounded-lg border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-main)' }}>Cancelar</button>
                <button type="submit" disabled={formLoading} className="flex-1 py-2 rounded-lg font-bold" style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}>
                  {formLoading ? 'Procesando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
