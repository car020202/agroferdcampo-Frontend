import { apiRequest } from '../config/api';
import { ColorPalette } from '../utils/colorUtils';

const API_BASE = '/theme';

export interface ThemeConfig {
  id: number;
  themeMode: 'light' | 'dark';
  customActive: boolean;
  lightColors: ColorPalette | null;
  darkColors: ColorPalette | null;
  updatedAt: string;
}

export interface SavedTheme {
  id: string;
  name: string;
  lightColors: ColorPalette;
  darkColors: ColorPalette;
  baseColor?: string;
  isGlobal: boolean;
  createdBy: { id: number; fullName: string };
  createdAt: string;
}

export const themeApiService = {
  // Obtener configuración global
  getConfig: async (): Promise<ThemeConfig> => {
    return apiRequest<ThemeConfig>(`${API_BASE}/config`);
  },

  // Actualizar configuración global (Solo Admin)
  updateConfig: async (data: Partial<ThemeConfig>): Promise<ThemeConfig> => {
    return apiRequest<ThemeConfig>(`${API_BASE}/config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Resetear configuración a default (Solo Admin)
  resetConfig: async (): Promise<ThemeConfig> => {
    return apiRequest<ThemeConfig>(`${API_BASE}/config`, {
      method: 'DELETE',
    });
  },

  // Listar temas guardados
  getSavedThemes: async (): Promise<SavedTheme[]> => {
    return apiRequest<SavedTheme[]>(`${API_BASE}/saved`);
  },

  // Guardar un nuevo tema (Solo Admin)
  saveTheme: async (data: {
    name: string;
    lightColors: ColorPalette;
    darkColors: ColorPalette;
    baseColor?: string;
  }): Promise<SavedTheme> => {
    return apiRequest<SavedTheme>(`${API_BASE}/saved`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Eliminar un tema (Solo Admin)
  deleteTheme: async (id: string): Promise<void> => {
    return apiRequest<void>(`${API_BASE}/saved/${id}`, {
      method: 'DELETE',
    });
  },
};
