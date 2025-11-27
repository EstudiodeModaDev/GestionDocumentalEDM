// ============================================================
// utils/validation/validateNuevaArea.ts
// Validaciones de responsable para creación/edición de áreas
// ============================================================

export function validarResponsable(usuario: any, companiaName: string, areaName: string) {
  if (!usuario) return null;

  if (usuario.Rol === "AdministradorGeneral")
    return "Un Administrador General no puede ser responsable.";

  if (usuario.Rol === "AdministradorCom")
    return "Un Administrador de Compañía no puede ser responsable.";

  if (usuario.Rol === "ResponsableArea") {
    if (usuario.CompaniaID !== companiaName || usuario.AreaID !== areaName) {
      return `Este usuario ya es responsable del área "${usuario.AreaID}".`;
    }
  }

  return null;
}
