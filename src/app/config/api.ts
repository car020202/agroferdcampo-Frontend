// src/app/config/api.ts

// URL Madre para la comunicación con el backend de NestJS
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Utility para realizar peticiones fetch de forma simplificada
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = localStorage.getItem('agro-token');
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || 'Respuesta vacía del servidor' };
    }

    if (!response.ok) {
      // NestJS suele enviar el error en data.message
      const errorMsg = data.message || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    // Si la respuesta está envuelta en { success: true, data: ... }
    if (data && typeof data === 'object' && data.success === true && 'data' in data) {
      return data.data;
    }

    return data;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté encendido y que CORS esté habilitado.');
    }
    throw error;
  }
}
