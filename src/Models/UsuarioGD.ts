// src/Models/UsuarioGD.ts
export type RolUsuario = "AdministradorGeneral" | "AdministradorArea" | "ResponsableSubarea" | "UsuarioSubarea";

export interface UsuarioGD {
  ID?: string;
  Title: string;
  Correo: string;
  Rol: RolUsuario;
  AreaId?: string;
  SubareaId?: string;
}
