import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiRequest } from '../config/api';

interface User {
  id: string;
  name: string; // Cambiado de fullName para compatibilidad
  email: string;
  role: string;
  roleId: number;
  phone?: string;
  dui?: string;
  branch?: string; // Restaurado
}

interface BackendUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  phone?: string;
  dui?: string;
}

interface LoginResponse {
  accessToken?: string;
  status?: 'PASSWORD_CHANGE_REQUIRED' | 'MFA_REQUIRED';
  message?: string;
  token?: string; // Token temporal para cambio de password
  deviceId?: string;
  trustedUntil?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('agro-token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem('agro-token');
    const savedUser = localStorage.getItem('agro-user');
    if (!savedToken || !savedUser) return null;
    return JSON.parse(savedUser);
  });

  // Verificar sesión al montar la app
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem('agro-token');
      if (!savedToken) return;

      try {
        const backendUser = await apiRequest<BackendUser>('/auth/me');
        const mappedUser: User = {
          id: backendUser.id.toString(),
          name: backendUser.fullName,
          email: backendUser.email,
          role: backendUser.role,
          roleId: backendUser.roleId,
          phone: backendUser.phone,
          dui: backendUser.dui,
          branch: 'Todas'
        };
        setUser(mappedUser);
        localStorage.setItem('agro-user', JSON.stringify(mappedUser));
      } catch (error) {
        console.error('Sesión inválida o expirada:', error);
        logout(); // Limpiar todo si el token ya no sirve
      }
    };

    verifySession();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const deviceId = localStorage.getItem('agro-device-id');
      console.log('Intentando login para:', email, deviceId ? '(con dispositivo recordado)' : '');
      
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: deviceId ? { 'X-Device-Id': deviceId } : {},
        body: JSON.stringify({ email, password }),
      });

      console.log('Respuesta del servidor:', data);

      if (data.accessToken) {
        setToken(data.accessToken);
        localStorage.setItem('agro-token', data.accessToken);
        
        // Obtener datos del usuario desde /auth/me
        const backendUser = await apiRequest<BackendUser>('/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` }
        });
        
        const mappedUser: User = {
          id: backendUser.id.toString(),
          name: backendUser.fullName,
          email: backendUser.email,
          role: backendUser.role,
          roleId: backendUser.roleId,
          phone: backendUser.phone,
          dui: backendUser.dui,
          branch: 'Todas'
        };
        
        setUser(mappedUser);
        localStorage.setItem('agro-user', JSON.stringify(mappedUser));
      }

      return data;
    } catch (error: any) {
      console.error('Error detallado de login:', error.message);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agro-user');
    localStorage.removeItem('agro-token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
