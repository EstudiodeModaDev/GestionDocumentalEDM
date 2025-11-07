// src/Models/ReporteVencimiento.ts
export interface ReporteVencimiento {
  Id?: string;
  DocumentoId: string;
  ResponsableId: string;
  FechaGeneracion: string;
  FechaVencimiento: string;
  DiasSobretiempo?: number;
  ReconteoNotificaciones: number;
}
