// src/Models/FlujoAprobacion.ts
export interface FlujoAprobacion {
  Id?: string;
  DocumentoId: string;
  UsuarioSolicitanteId: string;
  UsuarioAprobadorId: string;
  Estado: "En revisión" | "Aprobado" | "Rechazado";
  Comentarios?: string;
  FechaAccion: string;
}
