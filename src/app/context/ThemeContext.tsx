import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  ColorPalette,
  DEFAULT_LIGHT_COLORS,
  DEFAULT_DARK_COLORS,
  applyColorsToDOM,
  clearCustomColorsFromDOM,
} from '../utils/colorUtils';
import { themeApiService } from '../services/theme.service';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

export interface SavedTheme {
  id: string;
  name: string;
  baseColor: string;
  lightColors: ColorPalette;
  darkColors: ColorPalette;
  createdAt: string;
}

interface ThemeContextType {
  // Modo claro/oscuro
  theme: Theme;
  toggleTheme: () => void;
  // Colores actuales
  currentColors: ColorPalette;
  defaultLightColors: ColorPalette;
  defaultDarkColors: ColorPalette;
  // Personalización
  customLightColors: ColorPalette | null;
  customDarkColors: ColorPalette | null;
  applyCustomColors: (light: ColorPalette, dark: ColorPalette) => void;
  resetToDefault: () => void;
  isCustomThemeActive: boolean;
  // Temas guardados
  savedThemes: SavedTheme[];
  saveTheme: (name: string, light: ColorPalette, dark: ColorPalette, baseColor: string) => void;
  deleteTheme: (id: string) => void;
  loadTheme: (id: string) => void;
  // Vista previa temporal
  previewColors: (colors: ColorPalette) => void;
  cancelPreview: () => void;
  isPreviewActive: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ---- LocalStorage helpers ----
const LS_THEME = 'agro-theme';
const LS_CUSTOM_LIGHT = 'agro-custom-light';
const LS_CUSTOM_DARK = 'agro-custom-dark';
const LS_SAVED_THEMES = 'agro-saved-themes';
const LS_CUSTOM_ACTIVE = 'agro-custom-active';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

const LS_MIGRATED = 'agro-theme-migrated';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // --- Estado base ---
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(LS_THEME);
    return (saved as Theme) || 'light';
  });

  const [customLightColors, setCustomLightColors] = useState<ColorPalette | null>(
    () => loadJSON<ColorPalette | null>(LS_CUSTOM_LIGHT, null)
  );
  const [customDarkColors, setCustomDarkColors] = useState<ColorPalette | null>(
    () => loadJSON<ColorPalette | null>(LS_CUSTOM_DARK, null)
  );
  const [isCustomThemeActive, setIsCustomThemeActive] = useState<boolean>(
    () => loadJSON<boolean>(LS_CUSTOM_ACTIVE, false)
  );
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(
    () => loadJSON<SavedTheme[]>(LS_SAVED_THEMES, [])
  );

  const { user } = useAuth();
  const isAdmin = user?.roleId === 1 || user?.roleId === 2;

  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewBackup, setPreviewBackup] = useState<ColorPalette | null>(null);

  // --- Colores actuales según estado ---
  const getActiveColors = useCallback(
    (currentTheme: Theme): ColorPalette => {
      if (isCustomThemeActive) {
        if (currentTheme === 'light' && customLightColors) return customLightColors;
        if (currentTheme === 'dark' && customDarkColors) return customDarkColors;
      }
      return currentTheme === 'light' ? DEFAULT_LIGHT_COLORS : DEFAULT_DARK_COLORS;
    },
    [isCustomThemeActive, customLightColors, customDarkColors]
  );

  const currentColors = getActiveColors(theme);

  // --- Efectos ---

  // 1. Aplicar cambios al DOM y guardar en localStorage (Caché)
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(LS_THEME, theme);

    if (isCustomThemeActive) {
      const colors = getActiveColors(theme);
      applyColorsToDOM(colors);
    } else {
      clearCustomColorsFromDOM();
    }
  }, [theme, isCustomThemeActive, getActiveColors]);

  // 2. Sincronizar con el Servidor al iniciar
  useEffect(() => {
    const syncWithServer = async () => {
      if (!user) return; // Guard: No sincronizar si no hay sesión

      try {
        const config = await themeApiService.getConfig();
        
        // Actualizar modo
        if (config.themeMode && config.themeMode !== theme) {
          setTheme(config.themeMode as Theme);
        }

        // Actualizar colores personalizados
        if (config.customActive) {
          if (config.lightColors) {
            setCustomLightColors(config.lightColors);
            localStorage.setItem(LS_CUSTOM_LIGHT, JSON.stringify(config.lightColors));
          }
          if (config.darkColors) {
            setCustomDarkColors(config.darkColors);
            localStorage.setItem(LS_CUSTOM_DARK, JSON.stringify(config.darkColors));
          }
          setIsCustomThemeActive(true);
          localStorage.setItem(LS_CUSTOM_ACTIVE, 'true');
        } else if (isCustomThemeActive) {
          // Si en el servidor está desactivado pero aquí activo, resetear
          setIsCustomThemeActive(false);
          localStorage.setItem(LS_CUSTOM_ACTIVE, 'false');
          clearCustomColorsFromDOM();
        }

        // Cargar temas guardados de la API
        const savedFromApi = await themeApiService.getSavedThemes();
        const mappedSaved: SavedTheme[] = savedFromApi.map(t => ({
          id: t.id,
          name: t.name,
          baseColor: t.baseColor || '#000000',
          lightColors: t.lightColors,
          darkColors: t.darkColors,
          createdAt: t.createdAt
        }));
        setSavedThemes(mappedSaved);
      } catch (error: any) {
        // No mostrar error ruidoso si es un 401 (ya lo manejará AuthContext)
        if (error.message !== 'Unauthorized') {
          console.error('Error sincronizando temas con el servidor:', error);
        }
      }
    };

    syncWithServer();
  }, [user]);

  // 3. Script de Migración One-Time (localStorage -> Server)
  useEffect(() => {
    if (!user || !isAdmin || localStorage.getItem(LS_MIGRATED)) return;

    const migrate = async () => {
      try {
        const localSaved = loadJSON<SavedTheme[]>(LS_SAVED_THEMES, []);
        if (localSaved.length > 0) {
          console.log('Migrando temas locales al servidor...');
          for (const t of localSaved) {
            await themeApiService.saveTheme({
              name: t.name,
              lightColors: t.lightColors,
              darkColors: t.darkColors,
              baseColor: t.baseColor
            });
          }
        }
        
        // Si hay un tema activo localmente, subirlo como config global
        if (isCustomThemeActive && customLightColors && customDarkColors) {
          await themeApiService.updateConfig({
            themeMode: theme,
            customActive: true,
            lightColors: customLightColors,
            darkColors: customDarkColors
          });
        }

        localStorage.setItem(LS_MIGRATED, 'true');
        console.log('Migración de temas completada.');
      } catch (error) {
        console.error('Error durante la migración de temas:', error);
      }
    };

    migrate();
  }, [user, isAdmin]);

  // --- Acciones ---
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const applyCustomColors = async (light: ColorPalette, dark: ColorPalette) => {
    // 1. Actualizar estado local y caché (Instantáneo)
    setCustomLightColors(light);
    setCustomDarkColors(dark);
    setIsCustomThemeActive(true);
    localStorage.setItem(LS_CUSTOM_LIGHT, JSON.stringify(light));
    localStorage.setItem(LS_CUSTOM_DARK, JSON.stringify(dark));
    localStorage.setItem(LS_CUSTOM_ACTIVE, JSON.stringify(true));
    
    // Aplicar inmediatamente al DOM
    const active = theme === 'light' ? light : dark;
    applyColorsToDOM(active);

    // 2. Sincronizar con el servidor si es admin
    if (isAdmin) {
      try {
        await themeApiService.updateConfig({
          themeMode: theme,
          customActive: true,
          lightColors: light,
          darkColors: dark
        });
      } catch (error) {
        console.error('Error al persistir tema en el servidor:', error);
      }
    }
  };

  const resetToDefault = async () => {
    setCustomLightColors(null);
    setCustomDarkColors(null);
    setIsCustomThemeActive(false);
    localStorage.removeItem(LS_CUSTOM_LIGHT);
    localStorage.removeItem(LS_CUSTOM_DARK);
    localStorage.setItem(LS_CUSTOM_ACTIVE, JSON.stringify(false));
    clearCustomColorsFromDOM();

    if (isAdmin) {
      try {
        await themeApiService.resetConfig();
      } catch (error) {
        console.error('Error al resetear tema en el servidor:', error);
      }
    }
  };

  const saveTheme = async (name: string, light: ColorPalette, dark: ColorPalette, baseColor: string) => {
    if (!isAdmin) return;

    try {
      const saved = await themeApiService.saveTheme({
        name,
        lightColors: light,
        darkColors: dark,
        baseColor
      });

      const newTheme: SavedTheme = {
        id: saved.id,
        name: saved.name,
        baseColor: saved.baseColor || baseColor,
        lightColors: saved.lightColors,
        darkColors: saved.darkColors,
        createdAt: saved.createdAt,
      };

      const updated = [...savedThemes, newTheme];
      setSavedThemes(updated);
      localStorage.setItem(LS_SAVED_THEMES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error al guardar tema en el servidor:', error);
    }
  };

  const deleteTheme = async (id: string) => {
    if (!isAdmin) return;

    try {
      await themeApiService.deleteTheme(id);
      const updated = savedThemes.filter(t => t.id !== id);
      setSavedThemes(updated);
      localStorage.setItem(LS_SAVED_THEMES, JSON.stringify(updated));
    } catch (error) {
      console.error('Error al eliminar tema del servidor:', error);
    }
  };

  const loadTheme = (id: string) => {
    const found = savedThemes.find(t => t.id === id);
    if (found) {
      applyCustomColors(found.lightColors, found.darkColors);
    }
  };

  const previewColorsAction = (colors: ColorPalette) => {
    if (!isPreviewActive) {
      setPreviewBackup(currentColors);
    }
    setIsPreviewActive(true);
    applyColorsToDOM(colors);
  };

  const cancelPreview = () => {
    setIsPreviewActive(false);
    if (previewBackup) {
      if (isCustomThemeActive) {
        applyColorsToDOM(previewBackup);
      } else {
        clearCustomColorsFromDOM();
      }
      setPreviewBackup(null);
    } else {
      clearCustomColorsFromDOM();
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        currentColors,
        defaultLightColors: DEFAULT_LIGHT_COLORS,
        defaultDarkColors: DEFAULT_DARK_COLORS,
        customLightColors,
        customDarkColors,
        applyCustomColors,
        resetToDefault,
        isCustomThemeActive,
        savedThemes,
        saveTheme,
        deleteTheme,
        loadTheme,
        previewColors: previewColorsAction,
        cancelPreview,
        isPreviewActive,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
