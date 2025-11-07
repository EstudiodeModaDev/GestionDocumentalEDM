// src/Models/UsuarioGD.ts
export type RolUsuario = "AdministradorGeneral" | "AdministradorArea" | "ResponsableSubarea" | "UsuarioSubarea";

export interface UsuarioGD {
  Id?: string;
  Nombre: string;
  Correo: string;
  Rol: RolUsuario;
  AreaId?: string;
  SubareaId?: string;
  Activo: boolean;
}
