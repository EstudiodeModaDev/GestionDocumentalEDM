// ============================================================
// src/utils/validation/validateCompania.ts
// ------------------------------------------------------------
// Reglas de validación relacionadas con compañías
// (roles de administrador, etc.)
// ============================================================

import type { UsuarioGD } from "../../Models/UsuarioGD";

/**
 * Valida si un usuario puede ser Administrador de una compañía.
 *
 * @param user          UsuarioGD obtenido desde UsuariosGD.getByCorreo
 * @param companiaTitle Nombre actual de la compañía (Title)
 * @returns             Mensaje de error o null si es válido
 */
export function validarRolAdminCompania(
  user: UsuarioGD | null,
  companiaTitle: string
): string | null {
  if (!user) return null;

  // Ya es Administrador de compañía
  if (user.Rol === "AdministradorCom") {
    if (user.CompaniaID === companiaTitle) return null;
    return "Este usuario ya es administrador de otra compañía.";
  }

  // No se permite que el Administrador General sea admin de compañía
  if (user.Rol === "AdministradorGeneral") {
    return "Un Administrador General no puede ser administrador de una compañía.";
  }

  return null;
}
