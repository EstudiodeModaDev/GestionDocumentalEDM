import type { UsuarioBasic } from "../../Models/Commons";

/* ============================================================
   Convertir respuesta de Graph → UsuarioBasic
   ============================================================ */
export function toBasicUser(raw: any): UsuarioBasic | null {
  if (!raw?.mail) return null;

  return {
    nombre: raw.displayName ?? "",
    correo: raw.mail.toLowerCase(),
  };
}
