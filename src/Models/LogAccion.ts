// src/Models/LogAccion.ts
export interface LogAccion {
  Id?: string;
  DocumentoId?: string;
  UsuarioId: string;
  TipoAccion: "Creación" | "Edición" | "Aprobación" | "Rechazo" | "Eliminación";
  FechaAccion: string;
  Detalles?: string;
}
