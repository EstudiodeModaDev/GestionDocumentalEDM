// src/Models/Subarea.ts
export interface Subarea {
  Id?: string;
  Title: string;                  // Nombre de la subárea (Contabilidad, Tesorería, etc.)
  AreaId: string;                 // Relación con el área principal
  ResponsableId?: string;         // Usuario encargado
  FechaCreacion?: string;
  Activa?: boolean;
}
