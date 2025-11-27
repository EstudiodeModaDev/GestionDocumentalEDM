// ============================================================
// src/components/Companias/CompaniasPanel.tsx
// ------------------------------------------------------------
// Panel principal de gestión de Compañías
// • Lista compañías desde SharePoint
// • Abre modales para crear, editar y eliminar
// • Usa el hook especializado useCompaniasPanel()
// ============================================================

import "./CompaniasPanel.css";

// Servicios de Graph
import { useGraphServices } from "../../graph/GrapServicesContext";

// Modales
import ModalNuevaCompania from "./ModalNuevaCompania";
import ModalEditarCompania from "./ModalEditarCompania";
import ModalEliminarCompania from "./ModalEliminarCompania";

// UI Helpers reutilizables (estadochip es un componente pero es reutilizable)
import EstadoChip from "../shared/EstadoChip";
import { formatDate } from "../../utils/Commons";


// Hook que contiene toda la lógica del panel
import { useCompaniasPanel } from "../../Funcionalidades/Companias/useCompaniasPanel";


export default function CompaniasPanel() {

  // ------------------------------------------------------------
  // Servicios disponibles desde el contexto
  // ------------------------------------------------------------
  const { Companias } = useGraphServices();

  // ------------------------------------------------------------
  // Toda la lógica está encapsulada en el hook personalizado
  // Esto mantiene el componente limpio y solo concentrado en UI
  // ------------------------------------------------------------
  const {
    // Datos
    companias,
    loading,
    error,

    // Estado de modales y selección
    seleccionada,
    modalNueva,
    modalEditar,
    modalEliminar,

    // Setters directos
    setModalNueva,
    setModalEditar,
    setModalEliminar,

    // Callbacks de actualización de lista
    agregar,
    actualizar,
    eliminar,

    // Acciones de fila (para abrir modales)
    abrirEditar,
    abrirEliminar,
  } = useCompaniasPanel(Companias);

  // ============================================================
  // 🔹 Render principal
  // ============================================================
  return (
    <div className="companias-container">

      {/* --------------------------------------------------------
          HEADER DEL PANEL
          -------------------------------------------------------- */}
      <header className="companias-header">
        <h2>Compañías registradas</h2>

        {/* Botón para abrir modal de creación */}
        <button
          className="btn-nueva-compania"
          onClick={() => setModalNueva(true)}
          disabled={loading}
        >
          {loading ? "Procesando..." : "+ Nueva Compañía"}
        </button>
      </header>

      {/* --------------------------------------------------------
          MENSAJE DE ERROR
          -------------------------------------------------------- */}
      {error && <p className="error-msg">{error}</p>}

      {/* --------------------------------------------------------
          ESTADO DE CARGA INICIAL
          -------------------------------------------------------- */}
      {loading && companias.length === 0 ? (
        <p>Cargando compañías...</p>
      ) : (

        /* --------------------------------------------------------
            TABLA DE COMPAÑÍAS
            -------------------------------------------------------- */
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
            {/* Si no hay compañías */}
            {companias.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  No hay compañías registradas.
                </td>
              </tr>
            ) : (
              /* Render de filas */
              companias.map((c) => (
                <tr key={c.Id}>
                  {/* Nombre */}
                  <td>{c.Title}</td>

                  {/* Administrador */}
                  <td>{c.AdministradorCom || "—"}</td>

                  {/* Fecha creación formateada */}
                  <td>{formatDate(c.FechaCreacion)}</td>

                  {/* Estado visual con helper */}
                  <td>
                    <EstadoChip activo={!!c.Activa} />
                  </td>

                  {/* Acciones por fila */}
                  <td>
                    <button className="btn-accion" onClick={() => abrirEditar(c)}>
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

      {/* ============================================================
          MODALES
          ============================================================ */}

      {/* ➕ NUEVA COMPAÑÍA */}
      <ModalNuevaCompania
        abierto={modalNueva}
        onCerrar={() => setModalNueva(false)}
        onCreada={agregar}
        CompaniasService={Companias}
      />

      {/* ✏ EDITAR */}
      {seleccionada && (
        <ModalEditarCompania
          abierto={modalEditar}
          onCerrar={() => setModalEditar(false)}
          compania={seleccionada}
          onActualizada={actualizar}
          CompaniasService={Companias}
        />
      )}

      {/* 🗑 ELIMINAR */}
      {seleccionada && (
        <ModalEliminarCompania
          abierto={modalEliminar}
          onCerrar={() => setModalEliminar(false)}
          compania={seleccionada}
          onEliminada={eliminar}
          CompaniasService={Companias}
        />
      )}
    </div>
  );
}
