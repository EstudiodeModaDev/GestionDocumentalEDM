import { normalizeStringStrict } from "../Commons";
import type { RolUsuario } from "../../Models/UsuarioGD";

const map: Record<string, RolUsuario> = {
  administradorgeneral: "AdministradorGeneral",
  administradorcom: "AdministradorCom",
  responsablearea: "ResponsableArea",
  usuarioarea: "UsuarioArea",
  sinacceso: "SinAcceso"
};

/**
 * Normaliza un rol recibido desde SharePoint o entrada de usuario.
 */
export function normalizeRolStrict(raw: any): RolUsuario {
  const key = normalizeStringStrict(raw);
  return map[key] || "SinAcceso";
}
