// src/Models/UsuarioGD.ts
export type RolUsuario = "AdministradorGeneral" | "AdministradorCom" | "ResponsableArea" | "UsuarioArea"| "SinAcceso";   // 👈 NUEVO ROL

export interface UsuarioGD {
  ID?: string;
  Title: string;
  Correo: string;
  Rol: RolUsuario;
  CompaniaID?: string;
  AreaID?: string;
}
