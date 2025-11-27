// ============================================================
// src/utils/validation/validateUsuariosArea.ts
// ------------------------------------------------------------
// Validaciones relacionadas con usuarios del área
// (Agregar usuario, mover entre áreas, restringir compañías).
// ============================================================

import type { UsuarioGD } from "../../Models/UsuarioGD";

/**
 * Valida si un usuario puede ser agregado como UsuarioArea.
 * Retorna `string` con el motivo del error, o `null` si todo OK.
 */
export function validateAgregarUsuarioArea(existente: UsuarioGD | null): string | null {
  if (!existente) return null; // Usuario nuevo en el sistema

  // Usuarios que NO pueden ser agregados desde este módulo
  if (existente.Rol === "AdministradorGeneral")
    return "Este usuario es Administrador General. No puede agregarse desde este módulo.";

  if (existente.Rol === "AdministradorCom")
    return "Este usuario ya es Administrador de una Compañía. No puede agregarse como Usuario de Área.";

  if (existente.Rol === "ResponsableArea")
    return "Este usuario ya es Responsable de un Área. Debe reasignarse desde la gestión de responsables.";

  // Usuarios que sí pueden agregarse:
  //   UsuarioArea → se permite
  //   SinAcceso → se permite
  return null;
}

/**
 * Valida si un usuario puede moverse a una compañía diferente.
 */
export function validateCambioCompania(
  companiaActual: string,
  nuevaCompania: string
): string | null {
  if (companiaActual.toLowerCase() !== nuevaCompania.toLowerCase()) {
    return (
      "No puedes mover un usuario directamente a otra compañía desde este módulo.\n" +
      "Debe quedar primero con rol \"SinAcceso\" y luego el administrador de la nueva compañía lo asignará."
    );
  }
  return null;
}
