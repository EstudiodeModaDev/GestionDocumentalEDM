// src/components/Companias/CompaniasPanel.tsx
import { useState, useEffect } from "react";
import "./CompaniasPanel.css";
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { CompaniaGD } from "../../Models/CompaniaGD";

import ModalNuevaCompania from "./ModalNuevaCompania";
import ModalEditarCompania from "./ModalEditarCompania";
import ModalEliminarCompania from "./ModalEliminarCompania";

/**
 * Componente principal de gestión de Compañías
 * ------------------------------------------------------------
 * ✔ Lista compañías desde SharePoint
 * ✔ Crear nueva compañía (lista + carpeta + usuario admin)
 * ✔ Editar nombre/admin de compañía (renombra carpeta + actualiza refs)
 * ✔ Eliminar compañía (con validaciones de usuarios y áreas asociadas)
 */
export default function CompaniasPanel() {
  const { Companias } = useGraphServices(); // servicio de compañías

  const [companias, setCompanias] = useState<CompaniaGD[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);

  const [companiaSeleccionada, setCompaniaSeleccionada] = useState<CompaniaGD | null>(null);

  /* ============================================================
     🔹 Cargar compañías al montar
  ============================================================ */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await Companias.getAll();
        setCompanias(data);
      } catch (err) {
        console.error("Error al obtener las compañías:", err);
        setError("No se pudieron cargar las compañías registradas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [Companias]);

  /* ============================================================
     🔹 Callbacks desde modales
  ============================================================ */
  const handleCompaniaCreada = (c: CompaniaGD) => {
    setCompanias(prev => [...prev, c]);
  };

  const handleCompaniaActualizada = (c: CompaniaGD) => {
    setCompanias(prev =>
      prev.map((x) => (x.Id === c.Id ? c : x))
    );
  };

  const handleCompaniaEliminada = (id: string) => {
    setCompanias(prev => prev.filter(c => c.Id !== id));
  };

  /* ============================================================
     🔹 Acciones de fila (editar / eliminar)
  ============================================================ */
  const abrirEditar = (c: CompaniaGD) => {
    setCompaniaSeleccionada(c);
    setModalEditarAbierto(true);
  };

  const abrirEliminar = (c: CompaniaGD) => {
    setCompaniaSeleccionada(c);
    setModalEliminarAbierto(true);
  };

  /* ============================================================
     🔹 Render
  ============================================================ */
  return (
    <div className="companias-container">
      {/* Header */}
      <header className="companias-header">
        <h2>Compañías registradas</h2>

        <button
          className="btn-nueva-compania"
          onClick={() => setModalNuevaAbierto(true)}
          disabled={loading}
        >
          {loading ? "Procesando..." : "+ Nueva Compañía"}
        </button>
      </header>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Tabla */}
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {companias.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>
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
                  <td>
                    <button
                      className="btn-accion"
                      onClick={() => abrirEditar(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-accion btn-accion-eliminar"
                      onClick={() => abrirEliminar(c)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Modal Nueva */}
      <ModalNuevaCompania
        abierto={modalNuevaAbierto}
        onCerrar={() => setModalNuevaAbierto(false)}
        onCreada={handleCompaniaCreada}
        CompaniasService={Companias}
      />

      {/* Modal Editar */}
      {companiaSeleccionada && (
        <ModalEditarCompania
          abierto={modalEditarAbierto}
          onCerrar={() => setModalEditarAbierto(false)}
          compania={companiaSeleccionada}
          onActualizada={handleCompaniaActualizada}
          CompaniasService={Companias}
        />
      )}

      {/* Modal Eliminar */}
      {companiaSeleccionada && (
        <ModalEliminarCompania
          abierto={modalEliminarAbierto}
          onCerrar={() => setModalEliminarAbierto(false)}
          compania={companiaSeleccionada}
          onEliminada={handleCompaniaEliminada}
          CompaniasService={Companias}
        />
      )}
    </div>
  );
}
