# 🔐 Arquitectura del Sistema: Autenticación y Temas

Este documento detalla el funcionamiento final de la integración entre el Frontend (React) y el Backend (NestJS) para el manejo de sesiones y la personalización dinámica de temas.

---

## 🏗️ 1. Jerarquía de Componentes (Providers)

Para que el sistema funcione correctamente, los proveedores de contexto deben seguir un orden específico en `App.tsx`. Esto permite que los temas consuman información del usuario autenticado.

```tsx
<AuthProvider>         {/* 1. Maneja el token y datos del usuario */}
  <ThemeProvider>      {/* 2. Consume useAuth para sincronizar colores */}
    <BranchProvider>   {/* 3. Datos de sucursales */}
      <RouterProvider />
    </BranchProvider>
  </ThemeProvider>
</AuthProvider>
```

---

## 🔑 2. Ciclo de Vida de la Sesión

La autenticación es el pilar de la seguridad. El sistema utiliza **JWT (JSON Web Tokens)** persistidos en `localStorage`.

### Almacenamiento Local
- **`agro-token`**: El JWT Bearer para todas las peticiones a la API.
- **`agro-user`**: Caché de los datos del usuario (Nombre, Rol, Email).

### Verificación al Iniciar (Startup)
Al montar la aplicación, el `AuthContext` realiza una validación proactiva:
1. Lee `agro-token` de `localStorage`.
2. Si existe, llama a `GET /auth/me`.
3. **Manejo de Errores (401)**: Si el token ha expirado o es inválido, el sistema ejecuta `logout()`, limpiando el almacenamiento y forzando un estado de sesión cerrada. Esto previene que la aplicación intente usar datos caducados.

---

## 🎨 3. Sistema de Temas Sincronizado

El sistema de temas utiliza una estrategia de **"Caché Primero" (Cache-First)** para garantizar una carga instantánea sin "flashes" blancos, sincronizando posteriormente con la base de datos.

### Estrategia de Sincronización
1. **Carga Instantánea**: El `ThemeProvider` inicializa sus estados desde `localStorage` (si existen).
2. **Validación con Servidor**: Una vez que el `AuthContext` confirma que hay un usuario válido, se dispara un efecto en `ThemeContext` que llama a `GET /theme/config`.
3. **Actualización Dinámica**: Si la configuración del servidor difiere de la local, el frontend se actualiza automáticamente y guarda los nuevos valores en la caché local.

### Endpoints Utilizados
| Método | Ruta | Descripción | Requiere Auth |
|--------|------|-------------|---------------|
| `GET` | `/theme/config` | Obtiene el modo y colores activos globales | Sí |
| `PUT` | `/theme/config` | Actualiza la configuración global (Solo Admin) | Sí |
| `GET` | `/theme/saved` | Lista todos los temas guardados | Sí |
| `POST` | `/theme/saved` | Guarda una nueva paleta personalizada | Sí |
| `DELETE` | `/theme/saved/:id` | Elimina un tema guardado | Sí |

---

## 🛠️ 4. Manejo de Errores y Robustez

### Fallos de Autorización (401)
Si cualquier llamada de temas devuelve un error `401 Unauthorized`:
- El `ThemeContext` detiene silenciosamente la sincronización.
- El `AuthContext` (en su verificación de fondo) detectará la invalidez del token y disparará el cierre de sesión, protegiendo la integridad de los datos.

### Guardas de Ejecución
Toda la lógica de comunicación con el backend en los contextos está protegida por guardas:
```typescript
if (!user) return; // No se realizan llamadas a la API de temas sin un usuario confirmado
```

---

## 📦 5. Estructuras de Datos Técnicas

### ColorPalette (JSON)
Es el objeto central que define todos los colores CSS variables del sistema:
```json
{
  "primary": "#1e293b",
  "accent": "#10b981",
  "sidebar": "#ffffff",
  "textMain": "#1e293b",
  ...
}
```

### Script de Migración Automática
El sistema incluye una lógica de **Migración Única (One-Time Migration)**:
Cuando un Administrador con temas guardados localmente inicia sesión por primera vez tras la actualización del backend, el `ThemeContext` detecta los temas locales y los **sube automáticamente** al servidor, marcando la migración como completada en `localStorage` (`agro-theme-migrated: true`).

---
**Última actualización**: Abril 2026 (Sistema Final Implementado)
