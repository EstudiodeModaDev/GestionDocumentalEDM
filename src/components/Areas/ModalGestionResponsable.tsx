// ============================================================
// src/components/Areas/ModalGestionResponsable.tsx
// ------------------------------------------------------------
// Modal refactorizado con:
//   ✔ Autocomplete centralizado (useUserAutocomplete)
//   ✔ Lógica completa en useAreaResponsable
//   ✔ Acciones sobre responsable anterior
//        - Dejarlo SinAcceso
//        - Reasignarlo a un área de la compañía
//   ✔ Componente limpio: solo UI + binding
// ============================================================

import * as React from "react";
import "./ModalGestionResponsable.css";

import { useGraphServices } from "../../graph/GrapServicesContext";

// Hooks refactorizados
import { useAreaResponsable } from "../../Funcionalidades/Usuarios/useAreaResponsable";
import { useUserAutocomplete } from "../../Funcionalidades/Usuarios/useUserAutocomplete";

import type { UsuarioBasic } from "../../Models/Commons";

type ModalGestionResponsableProps = {
  isOpen: boolean;
  onClose: () => void;

  areaId: string;
  areaName: string;
  companiaName: string;
  responsableActual?: string;

  onSuccess?: () => void;
};

export default function ModalGestionResponsable({
  isOpen,
  onClose,
  areaId,
  areaName,
  companiaName,
  responsableActual,
  onSuccess,
}: ModalGestionResponsableProps) {
  // ============================================================
  // Servicios Graph (Usuarios, Áreas, Buscador Azure AD)
  // ============================================================
  const { BuscarUsu, UsuariosGD, Areas } = useGraphServices();

  // ============================================================
  // Hook principal: lógica completa de asignación de responsable
  // ============================================================
  const {
    // selección nuevo responsable
    seleccionado,
    setSeleccionado,

    // estado global
    loading: saving,
    error,
    setError,

    // acciones sobre responsable anterior
    accionAnterior,
    setAccionAnterior,

    areasDisponibles,
    areaReasignada,
    setAreaReasignada,

    guardarResponsable,
    reset,
  } = useAreaResponsable({
    areaId,
    areaName,
    companiaName,
    UsuariosGD,
    Areas,
    responsableActual,
    onSuccess,
    onClose,
  });

  // ============================================================
  // Hook de autocompletado (Azure AD)
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

  // ============================================================
  // Reset al abrir modal
  // ============================================================
  React.useEffect(() => {
    if (isOpen) {
      reset();
      resetAutocomplete();
    }
  }, [isOpen]);

  // Si está cerrado, no renderiza
  if (!isOpen) return null;

  // ============================================================
  // Seleccionar usuario del autocomplete
  // ============================================================
  function handleSelectUsuario(u: UsuarioBasic) {
    setSeleccionado(u);
    setTexto("");
    clearResults();
  }

  // ============================================================
  // Guardar responsable
  // ============================================================
  async function handleGuardarClick() {
    await guardarResponsable();
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <h3>Gestionar Responsable</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {/* RESPONSABLE ACTUAL */}
          <h4>Responsable actual</h4>
          <p>{responsableActual || "— No hay responsable asignado —"}</p>

          {/* NUEVO RESPONSABLE */}
          <h4 style={{ marginTop: "1rem" }}>Asignar nuevo responsable</h4>

          {/* AUTOCOMPLETE */}
          <div className="autocomplete-container" ref={dropdownRef}>
            <input
              className="autocomplete-input"
              type="text"
              value={texto}
              placeholder="Buscar usuario..."
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccionado(null);
                setError(null);
              }}
            />

            {loadingBuscador && (
              <div className="autocomplete-loading">Buscando...</div>
            )}

            {/* CHIP del usuario seleccionado */}
            {seleccionado && (
              <div className="selected-admin-chip">
                <div className="selected-admin-texts">
                  <div className="selected-admin-name">
                    {seleccionado.nombre}
                  </div>
                  <div className="selected-admin-email">
                    {seleccionado.correo}
                  </div>
                </div>

                <button
                  className="selected-admin-remove"
                  onClick={() => {
                    setSeleccionado(null);
                    setTexto("");
                  }}
                >
                  Quitar
                </button>
              </div>
            )}

            {/* DROPDOWN DE RESULTADOS */}
            {resultados.length > 0 && !seleccionado && (
              <div className="autocomplete-dropdown">
                {resultados.map((u) => (
                  <div
                    key={u.correo}
                    className="autocomplete-item"
                    onClick={() => handleSelectUsuario(u)}
                  >
                    <div className="autocomplete-item-name">{u.nombre}</div>
                    <div className="autocomplete-item-email">{u.correo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================
   OPCIONES SOBRE RESPONSABLE ANTERIOR
====================================================== */}
{responsableActual && seleccionado && (
  <div className="responsable-acciones-block">
    <h5>¿Qué hacer con el responsable anterior?</h5>

    {/* Dropdown principal */}
    <select
      className="modal-select"
      value={accionAnterior}
      onChange={(e) =>
        setAccionAnterior(e.target.value as "sinAcceso" | "reasignar")
      }
    >
      <option value="sinAcceso">Dejarlo sin acceso</option>
      <option value="reasignar">Asignarlo como Usuario de Área</option>
    </select>

    {/* ======================================================
       SI VA A REASIGNAR → MOSTRAR SEGUNDO DROPDOWN
    ====================================================== */}
    {accionAnterior === "reasignar" && (
      <>
        <label className="modal-label-inline">Seleccionar área</label>

        <select
          className="modal-select"
          value={areaReasignada}
          onChange={(e) => setAreaReasignada(e.target.value)}
        >
          <option value="">— Seleccionar área —</option>

          {areasDisponibles.map((a) => (
            <option key={a.Id} value={a.Title}>
              {a.Title}
            </option>
          ))}
        </select>
      </>
    )}
  </div>
)}

            

          {/* ERROR */}
          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secundario" onClick={onClose} disabled={saving}>
            Cancelar
          </button>

          <button
            className="btn-primario"
            disabled={!seleccionado || saving}
            onClick={handleGuardarClick}
          >
            {saving ? "Guardando..." : "Guardar responsable"}
          </button>
        </div>
      </div>
    </div>
  );
}
