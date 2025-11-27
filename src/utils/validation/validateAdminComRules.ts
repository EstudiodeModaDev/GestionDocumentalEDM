// ============================================================
// src/utils/validation/validateAdminComRules.ts
// ------------------------------------------------------------
// Validaciones de rol para asignar un ADMINISTRADOR DE COMPAÑÍA
// Se usa en:
//   - ModalNuevaCompania
//   - ModalEditarCompania
//   - ModalGestionResponsable (cuando cambia a AdminCom)
//   - Cualquier flujo que suba un usuario a AdministradorCom
// ============================================================

import type { UsuarioGD } from "../../Models/UsuarioGD";

/**
 * Valida si un usuario actual (existente en UsuariosGD)
 * tiene permitido convertirse en Administrador de Compañía.
 *
 * Devuelve:
 *  ✔ null → todo OK
 *  ❌ string → mensaje de error para mostrar al usuario
 */
export function validateAdminComRole(user: UsuarioGD | null): string | null {
  if (!user) return null; // No existe → se puede asignar sin problema

  // Reglas definidas contigo:
  // ------------------------------------------------------------

  if (user.Rol === "AdministradorCom") {
    return "Este usuario ya es administrador de otra compañía.";
  }

  if (user.Rol === "AdministradorGeneral") {
    return "Un Administrador General no puede ser Administrador de una compañía.";
  }

  // Un ResponsableArea sí puede ascender
  // Un UsuarioArea también puede
  return null;
}
