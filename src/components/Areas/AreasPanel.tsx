// src/components/Areas/AreasPanel.tsx
import * as React from "react";
import type { Area } from "../../Models/Area";
import "./AreasPanel.css";

/**
 * Componente principal de gestión de áreas
 * (por ahora solo muestra listado simulado y botón "Nueva Área")
 */
export default function AreasPanel() {
  // 🔹 Estado simulado por ahora
  const [areas, setAreas] = React.useState<Area[]>([
    { Id: "1", Title: "Financiera", AdministradorId: "juan@empresa.com", FechaCreacion: "2025-11-07", Activa: true },
    { Id: "2", Title: "Recursos Humanos", AdministradorId: "maria@empresa.com", FechaCreacion: "2025-11-06", Activa: true },
  ]);


  
  // handle nueva area provicional ya que es para que no saque el warning a la hota de compilar


 const handleNuevaArea = () => {
  setAreas((prev) => [
    ...prev,
    {
      Id: String(prev.length + 1),
      Title: "Nueva Área",
      AdministradorId: "admin@empresa.com",
      FechaCreacion: new Date().toISOString().split("T")[0],
      Activa: true,
    },
  ]);
};


  return (
    <div className="areas-container">
      <header className="areas-header">
        <h2>Áreas registradas</h2>
        <button className="btn-nueva-area" onClick={handleNuevaArea}>
          + Nueva Área
        </button>
      </header>

      <table className="areas-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Administrador</th>
            <th>Fecha creación</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a.Id}>
              <td>{a.Title}</td>
              <td>{a.AdministradorId || "—"}</td>
              <td>{a.FechaCreacion}</td>
              <td>
                <span className={`estado ${a.Activa ? "activo" : "inactivo"}`}>
                  {a.Activa ? "Activa" : "Inactiva"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
