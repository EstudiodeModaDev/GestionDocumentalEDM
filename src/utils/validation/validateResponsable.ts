// ============================================================
// src/utils/validation/validateResponsable.ts
// ------------------------------------------------------------
// Reglas para validar si un usuario puede ser RESPONSABLE de un área.
// Se usa en el hook useAreaResponsable.
// ============================================================

import type { RolUsuario } from "../../Models/UsuarioGD";

/**
 * Valida si un usuario puede ser responsable de un área específica.
 *
 * @param rol              Rol actual del usuario en UsuariosGD
 * @param usuarioAreaId    AreaID actual del usuario (si tiene)
 * @param usuarioCompId    CompaniaID actual del usuario (si tiene)
 * @param targetAreaName   Nombre del área destino
 * @param targetCompName   Nombre de la compañía destino
 * @returns string con el motivo de error o null si es válido
 */
export function validateResponsableRole(
  rol: RolUsuario | undefined,
  usuarioAreaId: string | undefined,
  usuarioCompId: string | undefined,
  targetAreaName: string,
  targetCompName: string
): string | null {
  if (!rol) return null;

  if (rol === "AdministradorCom") {
    return "Este usuario es Administrador de una compañía. No puede ser responsable de un área.";
  }

  if (rol === "AdministradorGeneral") {
    return "Un Administrador General no puede ser responsable de un área.";
  }

  if (rol === "ResponsableArea") {
    // Solo es válido si ya es responsable EXACTAMENTE de esta misma área/compañía
    if (usuarioAreaId !== targetAreaName || usuarioCompId !== targetCompName) {
      return `Este usuario ya es responsable del área "${usuarioAreaId}" en la compañía "${usuarioCompId}".`;
    }
  }

  return null;
}
