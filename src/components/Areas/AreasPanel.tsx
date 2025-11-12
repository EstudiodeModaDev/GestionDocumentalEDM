// src/components/Areas/AreasPanel.tsx
import * as React from "react";
import type { AreaGD } from "../../Models/Area";
import "./AreasPanel.css";
import { useGraphServices } from "../../graph/GrapServicesContext";

/**
 * Componente principal de gestión de Áreas
 * ------------------------------------------------------------
 * - Muestra las áreas registradas desde SharePoint
 * - Permite crear nuevas áreas asociadas a una compañía existente
 * - Crea automáticamente la carpeta dentro de:
 *   "Gestión Documental/{Compañía}/{Área}"
 */
export default function AreasPanel() {
  const { Areas, Companias } = useGraphServices();

  // Estado de datos
  const [areas, setAreas] = React.useState<AreaGD[]>([]);
  const [companias, setCompanias] = React.useState<any[]>([]);

  // Estado de carga y errores
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Estado de selección del usuario
  const [selectedCompania, setSelectedCompania] = React.useState<string>("");

  /* ============================================================
     🔹 Cargar compañías para el selector dinámico
     ============================================================ */
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const listaCompanias = await Companias.getAll();
        setCompanias(listaCompanias);
      } catch (err) {
        console.error("❌ Error al obtener las compañías:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [Companias]);

  /* ============================================================
     🔹 Cargar todas las áreas al montar el componente
     ============================================================ */
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await Areas.getAll();
        setAreas(data);
      } catch (err: any) {
        console.error("Error al obtener las áreas:", err);
        setError("No se pudieron cargar las áreas registradas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [Areas]);

  /* ============================================================
     🔹 Crear nueva área
     ============================================================ */
  const handleNuevaArea = async () => {
    const nombre = prompt("Ingresa el nombre del área nueva:");
    const administrador = prompt("Correo del administrador del área:");

    // Validaciones previas
    if (!nombre || !administrador)
      return alert("Debes ingresar nombre y administrador.");
    if (!selectedCompania)
      return alert("Debes seleccionar una compañía antes de crear el área.");

    try {
      setLoading(true);

      // Armar el objeto del área
      const nuevaArea: Omit<AreaGD, "Id"> = {
        Title: nombre.trim(),
        AdministradorId: administrador.trim(),
        FechaCreacion: new Date().toISOString(),
        Activa: true,
        NombreCompania: selectedCompania.trim(),
      };

      // Guardar en SharePoint y crear carpeta en la compañía
      const creada = await Areas.create(nuevaArea);

      // Agregar al estado local
      setAreas((prev) => [...prev, creada]);
      alert(
        `Área "${creada.Title}" creada correctamente dentro de ${selectedCompania}.`
      );
    } catch (err: any) {
      console.error("Error al crear el área:", err);
      alert("Ocurrió un error al crear el área. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     🔹 Renderizado
     ============================================================ */
  return (
    <div className="areas-container">
      <header className="areas-header">
        <div>
          <h2>Áreas registradas</h2>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Crea áreas dentro de las carpetas de cada compañía.
          </p>
        </div>

        {/* 🔹 Selector de compañía */}
        <div className="compania-selector">
          <label htmlFor="companiaSelect">Compañía:</label>
          <select
            id="companiaSelect"
            value={selectedCompania}
            onChange={(e) => setSelectedCompania(e.target.value)}
          >
            <option value="">-- Selecciona una compañía --</option>
            {companias.map((c) => (
              <option key={c.Id} value={c.Title}>
                {c.Title}
              </option>
            ))}
          </select>

          {/* 🔘 Botón para crear área */}
          <button
            className="btn-nueva-area"
            onClick={handleNuevaArea}
            disabled={loading}
          >
            {loading ? "Procesando..." : "+ Nueva Área"}
          </button>
        </div>
      </header>

      {/* 🔹 Mostrar errores o tabla */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading && areas.length === 0 ? (
        <p>Cargando áreas...</p>
      ) : (
        <table className="areas-table">
          <thead>
            <tr>
              <th>Área</th>
              <th>Compañía</th>
              <th>Administrador</th>
              <th>Fecha creación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>
                  No hay áreas registradas.
                </td>
              </tr>
            ) : (
              areas.map((a) => (
                <tr key={a.Id}>
                  <td>{a.Title}</td>
                  <td>{a.NombreCompania}</td>
                  <td>{a.AdministradorId || "—"}</td>
                  <td>
                    {a.FechaCreacion
                      ? new Date(a.FechaCreacion).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span className={`estado ${a.Activa ? "activo" : "inactivo"}`}>
                      {a.Activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
