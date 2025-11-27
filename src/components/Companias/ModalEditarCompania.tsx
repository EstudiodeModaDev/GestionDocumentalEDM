// ============================================================
// src/components/Companias/ModalEditarCompania.tsx
// ------------------------------------------------------------
// Modal para EDITAR una compañía existente.
// Ahora incluye:
//   ✔ Validación global del nombre (InputReglas + REGLA_SHAREPOINT)
//   ✔ Placeholder contextualizado
//   ✔ Sanitización automática al escribir
//   ✔ Validación antes de guardar cambios
// ============================================================

import "./ModalEditarCompania.css";
import { useEffect, useRef } from "react";
import type { CompaniaGD } from "../../Models/CompaniaGD";

import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";

import { useUserAutocomplete } from "../../Funcionalidades/Usuarios/useUserAutocomplete";
import { useCompaniasActions } from "../../Funcionalidades/Companias/useCompaniasActions";
import type { UsuarioBasic } from "../../Models/Commons";

// 🔥 Nuevo sistema de reglas globales
import { InputReglas } from "../inputs/InputReglas";
import { REGLA_SHAREPOINT } from "../../utils/inputs/ReglasInputs";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  compania: CompaniaGD;
  onActualizada: (compania: CompaniaGD) => void;
  CompaniasService: any;
}

export default function ModalEditarCompania({
  abierto,
  onCerrar,
  compania,
  onActualizada,
  CompaniasService,
}: Props) {
  // ============================================================
  // Servicios globales
  // ============================================================
  const { BuscarUsu, UsuariosGD, Areas } = useGraphServices();
  const { triggerRefresh } = useNav();

  // ============================================================
  // Hook unificado – edición de compañía
  // ============================================================
  const {
    nombre,
    setNombre,
    seleccionado,
    setSeleccionado,
    loading,
    error,
    setError,
    guardarCambios,
  } = useCompaniasActions({
    modo: "editar",
    compania,
    UsuariosGD,
    Areas,
    CompaniasService,
    onActualizada,
    onCerrar,
    triggerRefresh,
  });

  // ============================================================
  // Autocomplete
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
  // Reset cuando se abre el modal por primera vez
  // ============================================================
  const wasOpen = useRef(false);

  useEffect(() => {
    if (abierto && !wasOpen.current) {
      resetAutocomplete();
    }
    wasOpen.current = abierto;
  }, [abierto]);

  if (!abierto) return null;

  // ============================================================
  // Seleccionar usuario del autocomplete
  // ============================================================
  function handleSelectUsuario(u: UsuarioBasic) {
    setSeleccionado(u);
    setTexto("");
    clearResults();
  }

  // ============================================================
  // Guardar cambios → aplicamos validación del nombre
  // ============================================================
  async function handleGuardarClick() {
    // Validar nombre con la regla global
    const errorNombre = REGLA_SHAREPOINT.validar?.(nombre);
    if (errorNombre) {
      setError(errorNombre);
      return;
    }

    const correoFinal = (seleccionado?.correo || texto || "")
      .trim()
      .toLowerCase();

    await guardarCambios(correoFinal);
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-editar-compania">

        {/* HEADER */}
        <div className="modal-header">
          <h2>Editar Compañía</h2>
          <button className="close-btn" onClick={onCerrar}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          {/* NOMBRE DE LA COMPAÑÍA — ahora con InputReglas */}
          <label className="modal-label">Nombre de la compañía:</label>

          <InputReglas
            value={nombre}
            onChange={setNombre}
            regla={{
              ...REGLA_SHAREPOINT,
              placeholder: `Ej: Estudio de Moda • ${REGLA_SHAREPOINT.placeholder}`
            }}
          />

          {/* ADMINISTRADOR */}
          <label className="modal-label">Administrador:</label>

          <div className="autocomplete-container" ref={dropdownRef}>
            
            {/* Input del buscador */}
            <input
              type="text"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccionado(null);
                setError(null);
              }}
              className="autocomplete-input"
              placeholder="Buscar usuario..."
            />

            {loadingBuscador && (
              <div className="autocomplete-loading">Buscando...</div>
            )}

            {seleccionado && (
              <div className="selected-admin-chip">
                <div className="selected-admin-texts">
                  <div className="selected-admin-name">{seleccionado.nombre}</div>
                  <div className="selected-admin-email">{seleccionado.correo}</div>
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

          {/* ERROR GLOBAL */}
          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onCerrar}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className="btn-primary"
            onClick={handleGuardarClick}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}
