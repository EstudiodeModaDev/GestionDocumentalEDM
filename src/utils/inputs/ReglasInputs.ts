// ============================================================
// ReglasInputs.ts
// ------------------------------------------------------------
// Colección de reglas reutilizables para inputs.
// Agrega las reglas que necesites dependiendo del proyecto.
// ============================================================

import type { Regla } from "../../Funcionalidades/useValidador";

// -----------------------------------------
// Regla 1: Carpetas para SharePoint
// -----------------------------------------
export const REGLA_SHAREPOINT: Regla = {
  placeholder:
    "Sin caracteres (# % * < > ? /) • Máx. 128 caracteres",
  sanitizar: (s) =>
    s
      .trim()
      .replace(/["#%*:<>?\/\\{|}~]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\.+$/, ""),
  validar: (s) => {
    if (/["#%*:<>?\/\\{|}~]/.test(s))
      return "No se permiten caracteres especiales (# % * < > ? /)";
    if (s.length > 128) return "Máximo 128 caracteres permitidos.";
    if (s.trim().length === 0) return "El nombre no puede estar vacío.";
    return null;
  },
};

// -----------------------------------------
// Regla 2: Solo letras (nombres, responsables)
// -----------------------------------------
export const REGLA_SOLO_LETRAS: Regla = {
  placeholder: "Solo letras, sin números ni símbolos",
  sanitizar: (s) => s.replace(/[^a-zA-Z áéíóúÁÉÍÓÚñÑ]/g, ""),
  validar: (s) =>
    /\d/.test(s) ? "No se permiten números." : null,
};

// -----------------------------------------
// Regla 3: Códigos internos (alfanumérico)
// -----------------------------------------
export const REGLA_CODIGO: Regla = {
  placeholder: "Código interno (solo letras y números)",
  sanitizar: (s) => s.replace(/[^a-zA-Z0-9]/g, ""),
  validar: () => null,
};

// -----------------------------------------
// Plantilla para crear nuevas reglas fácilmente
// -----------------------------------------
export const crearRegla = (
  placeholder: string,
  sanitizar?: (s: string) => string,
  validar?: (s: string) => string | null
): Regla => ({
  placeholder,
  sanitizar,
  validar,
});
