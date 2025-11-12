// src/Models/Area.ts
export interface AreaGD {
  Id?: string;
  Title: string;                  // Nombre del área (Financiera, Compras, etc.)
  AdministradorId?: string;       // ID del usuario asignado como Gerente/Administrador de Área
  FechaCreacion?: string;         // Fecha de creación
  Activa?: boolean;
  NombreCompania?: string;
}
