
import type { UsuarioBasic } from "../types/usersBasic";

export function toBasicUser(u: any): UsuarioBasic | null {
  if (!u?.mail) return null;
  return {
    nombre: u.displayName ?? "",
    correo: u.mail.toLowerCase(),
  };
}
