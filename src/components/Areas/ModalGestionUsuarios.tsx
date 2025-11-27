// ============================================================
// ModalGestionUsuarios.tsx — versión final, completa y funcional
// ------------------------------------------------------------
// ✔ Lógica de negocio completamente en useGestionUsuarios()
// ✔ Autocomplete con chips para agregar múltiples usuarios
// ✔ Botón “Gestionar” por usuario → despliega bloque inline
// ✔ Cambiar de área dentro de la compañía
// ✔ Eliminar usuario (ModalConfirmacion)
// ✔ Mantiene UX idéntico al ModalGestionResponsable
// ✔ Completamente comentado para fácil mantenimiento
// ============================================================

import * as React from "react";
import "./ModalGestionUsuarios.css";

import { useGraphServices } from "../../graph/GrapServicesContext";

// Hooks
import { useGestionUsuarios } from "../../Funcionalidades/Usuarios/useGestionUsuarios";
import { useUserAutocomplete } from "../../Funcionalidades/Usuarios/useUserAutocomplete";

// Modelos
import type { UsuarioBasic } from "../../Models/Commons";
import type { UsuarioGD } from "../../Models/UsuarioGD";

// Modal de confirmación
import ModalConfirmacion from "../shared/ModalConfirmacion";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  companiaName: string;
  onSuccess?: () => void;
};

export default function ModalGestionUsuarios({
  isOpen,
  onClose,
  areaName,
  companiaName,
  onSuccess,
}: Props) {
  const { BuscarUsu, UsuariosGD, Companias, Areas } = useGraphServices();

  // ============================================================
  // Estado del modal de confirmación ELIMINAR
  // ============================================================
  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    user?: UsuarioGD;
  }>({ open: false });

  // ============================================================
  // Hook principal de lógica (super limpio)
  // ============================================================
  const {
    usuariosArea,
    loadingLista,

    // (solo usamos areasFiltradas)
    areasFiltradas,

    // edición
    editingUsuario,
    startEditarUsuario,
    setEditCompania,
    editArea,
    setEditArea,
    guardarEdicion,

    // agregar usuarios
    seleccionados,
    addSeleccionado,
    removeSeleccionado,
    agregarUsuarios,
    agregarLabel,

    // estado global
    error,
    setError,
    info,
    saving,

    // acciones
    eliminarUsuario,

    // cerrar modal respetando saving
    handleClose,
  } = useGestionUsuarios({
    isOpen,
    areaName,
    companiaName,
    UsuariosGD,
    Companias,
    Areas,
    onSuccess,
    onClose,
  });

  // ============================================================
  // AUTOCOMPLETE — agregar usuarios
  // ============================================================
  const {
    query: texto,
    setQuery: setTexto,
    results: resultados,
    loading: loadingBuscador,
    dropdownRef,
    clearResults,
    reset: resetAutocomplete,
  } = useUserAutocomplete({ BuscarUsu });

  // Reset del autocomplete al abrir modal
  React.useEffect(() => {
    if (isOpen) resetAutocomplete();
  }, [isOpen]);

  // Maneja selección desde autocompletado
  function handleSelect(u: UsuarioBasic) {
    addSeleccionado(u);
    setTexto("");
    clearResults();
  }

  // ============================================================
  // Si el modal está cerrado → no se renderiza
  // ============================================================
  if (!isOpen) return null;

  // ============================================================
  // RENDER DEL MODAL
  // ============================================================
  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ===================================================== */}
        {/* HEADER */}
        {/* ===================================================== */}
        <div className="modal-header">
          <h3>Gestionar Usuarios</h3>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* ===================================================== */}
        {/* BODY */}
        {/* ===================================================== */}
        <div className="modal-body">
          {error && <p className="modal-error">{error}</p>}
          {info && <p className="modal-info">{info}</p>}

          {/* ===================================================== */}
          {/* LISTA DE USUARIOS DEL ÁREA */}
          {/* ===================================================== */}
          <section className="modal-section">
            <h4>Usuarios del área</h4>

            {loadingLista ? (
              <p>Cargando...</p>
            ) : usuariosArea.length === 0 ? (
              <p>No hay usuarios registrados.</p>
            ) : (
              <ul className="usuariosArea-lista">
                {usuariosArea.map((u) => (
                  <li key={u.ID} className="usuariosArea-item">
                    <div className="usuariosArea-main">
                      <span>{u.Title}</span>
                      <span>{u.Correo}</span>
                      <span>
                        {u.CompaniaID} / {u.AreaID}
                      </span>
                    </div>

                    {/* ===================================================== */}
                    {/* BOTÓN GESTIONAR */}
                    {/* ===================================================== */}
                    <div className="usuariosArea-actions">
                      <button
                        className="btn-gestionar"
                        onClick={() => {
                          startEditarUsuario(u);
                          setEditCompania(companiaName); // regla: no cambiar compañía
                          setError(null);
                        }}
                      >
                        Gestionar
                      </button>
                    </div>

                    {/* ===================================================== */}
                    {/* BLOQUE INLINE DE GESTIÓN */}
                    {/* ===================================================== */}
                    {editingUsuario && editingUsuario.ID === u.ID && (
                      <div className="gestionar-inline-panel">
                        <p className="gestionar-title">
                          Gestionar usuario:{" "}
                          <strong>{editingUsuario.Title}</strong>
                        </p>
                        <p className="gestionar-subtitle">
                          Compañía: <strong>{companiaName}</strong>
                        </p>

                        {/* Select de área */}
                        <label className="modal-label">
                          Cambiar a área:
                          <select
                            className="modal-select"
                            value={editArea}
                            onChange={(e) => setEditArea(e.target.value)}
                          >
                            <option value="">Selecciona área</option>
                            {areasFiltradas.map((a) => (
                              <option key={a.Id} value={a.Title}>
                                {a.Title}
                              </option>
                            ))}
                          </select>
                        </label>

                        {/* Botones */}
                        <div className="gestionar-inline-actions">
                          <button
                            className="btn-primario"
                            onClick={guardarEdicion}
                            disabled={saving}
                          >
                            {saving ? "Guardando..." : "Guardar cambios"}
                          </button>

                          <button
                            className="btn-danger"
                            onClick={() =>
                              setConfirm({ open: true, user: editingUsuario })
                            }
                            disabled={saving}
                          >
                            Eliminar usuario
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ===================================================== */}
          {/* AUTOCOMPLETE + CHIPS PARA AGREGAR */}
          {/* ===================================================== */}
          <section className="modal-section">
            <h4>Agregar usuarios</h4>

            <div className="autocomplete-container" ref={dropdownRef}>
              <input
                className="autocomplete-input"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setError(null);
                }}
                placeholder="Buscar usuario..."
              />

              {loadingBuscador && (
                <div className="autocomplete-loading">Buscando...</div>
              )}

              {resultados.length > 0 && (
                <div className="autocomplete-dropdown">
                  {resultados.map((u) => (
                    <div
                      key={u.correo}
                      className="autocomplete-item"
                      onClick={() => handleSelect(u)}
                    >
                      <div className="autocomplete-item-name">{u.nombre}</div>
                      <div className="autocomplete-item-email">{u.correo}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chips resultados */}
            {seleccionados.length > 0 && (
              <div className="chips-wrapper">
                {seleccionados.map((s) => (
                  <div key={s.correo} className="selected-admin-chip">
                    <div className="selected-admin-texts">
                      <div className="selected-admin-name">{s.nombre}</div>
                      <div className="selected-admin-email">{s.correo}</div>
                    </div>

                    <button
                      className="selected-admin-remove"
                      onClick={() => removeSeleccionado(s.correo)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===================================================== */}
        {/* FOOTER */}
        {/* ===================================================== */}
        <div className="modal-footer">
          <button className="btn-secundario" onClick={handleClose}>
            Cerrar
          </button>

          <button
            className="btn-primario"
            disabled={seleccionados.length === 0 || saving}
            onClick={agregarUsuarios}
          >
            {saving ? "Guardando..." : agregarLabel}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL CONFIRMACIÓN ELIMINAR */}
      {/* ======================================================== */}
      <ModalConfirmacion
        open={confirm.open}
        title="Eliminar usuario"
        message={
          confirm.user
            ? `¿Deseas eliminar el usuario "${confirm.user.Title}"? Esta acción no se puede deshacer.`
            : "¿Eliminar usuario?"
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => {
          if (confirm.user) {
            await eliminarUsuario(confirm.user);
            onSuccess?.();
          }
          setConfirm({ open: false });
        }}
      />
    </div>
  );
}
