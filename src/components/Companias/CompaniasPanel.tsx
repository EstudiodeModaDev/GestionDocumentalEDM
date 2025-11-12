// src/components/Companias/CompaniasPanel.tsx
import * as React from "react";
import "./CompaniasPanel.css";
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { CompaniaGD } from "../../Models/CompaniaGD";

/**
 * Componente principal de gestión de Compañías
 * ------------------------------------------------------------
 * ✔ Muestra las compañías registradas desde SharePoint
 * ✔ Permite crear nuevas compañías, registrándolas en la lista "CompaniasGD"
 *   y creando su carpeta en la biblioteca "Gestión Documental"
 * ✔ Será el primer nivel jerárquico del sistema (antes de Áreas y Subáreas)
 */
export default function CompaniasPanel() {
  const { Companias } = useGraphServices(); // ← servicio registrado en el GraphServicesProvider

  // Estado para compañías, carga y errores
  const [companias, setCompanias] = React.useState<CompaniaGD[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* ============================================================
     🔹 Cargar todas las compañías al montar el componente
     ============================================================ */
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await Companias.getAll();
        setCompanias(data);
      } catch (err: any) {
        console.error("Error al obtener las compañías:", err);
        setError("No se pudieron cargar las compañías registradas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [Companias]);

  /* ============================================================
     🔹 Crear nueva compañía (lista + carpeta en biblioteca)
     ============================================================ */
  const handleNuevaCompania = async () => {
    const nombre = prompt("Ingresa el nombre de la compañía:");
    const administrador = prompt("Correo del administrador de la compañía:");

    if (!nombre || !administrador) {
      alert("Debes ingresar el nombre y el administrador de la compañía.");
      return;
    }

    try {
      setLoading(true);
      const nuevaCompania: Omit<CompaniaGD, "Id"> = {
        Title: nombre.trim(),
        AdministradorCom: administrador.trim(),
        FechaCreacion: new Date().toISOString(),
        Activa: true,
      };

      // 📤 Guardar en SharePoint y crear carpeta en biblioteca
      const creada = await Companias.create(nuevaCompania);

      // ✅ Agregar al estado local
      setCompanias((prev) => [...prev, creada]);
      alert(`Compañía "${creada.Title}" creada correctamente.`);
    } catch (err: any) {
      console.error("Error al crear la compañía:", err);
      alert("Ocurrió un error al crear la compañía. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     🔹 Renderizado
     ============================================================ */
  return (
    <div className="companias-container">
      <header className="companias-header">
        <h2>Compañías registradas</h2>
        <button
          className="btn-nueva-compania"
          onClick={handleNuevaCompania}
          disabled={loading}
        >
          {loading ? "Procesando..." : "+ Nueva Compañía"}
        </button>
      </header>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading && companias.length === 0 ? (
        <p>Cargando compañías...</p>
      ) : (
        <table className="companias-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Administrador</th>
              <th>Fecha creación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {companias.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "1rem" }}>
                  No hay compañías registradas.
                </td>
              </tr>
            ) : (
              companias.map((c) => (
                <tr key={c.Id}>
                  <td>{c.Title}</td>
                  <td>{c.AdministradorCom || "—"}</td>
                  <td>
                    {c.FechaCreacion
                      ? new Date(c.FechaCreacion).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span className={`estado ${c.Activa ? "activo" : "inactivo"}`}>
                      {c.Activa ? "Activa" : "Inactiva"}
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
