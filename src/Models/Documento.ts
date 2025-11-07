// src/Models/Documento.ts
export interface Documento {
  Id?: string;
  Title: string;                   // Nombre o título del documento
  Descripcion?: string;
  AreaId: string;
  SubareaId: string;
  UsuarioCreadorId: string;
  FechaRegistro: string;
  Estado: "Pendiente" | "Aprobado" | "Rechazado" | "Archivado";
  VersionActual?: string;          // control de versiones
  FechaVencimiento?: string;
  NumeroNotificaciones?: number;   // veces que ha sido notificado como vencido
  UltimaNotificacion?: string;
  UrlArchivo: string;              // enlace directo al archivo en biblioteca
}
