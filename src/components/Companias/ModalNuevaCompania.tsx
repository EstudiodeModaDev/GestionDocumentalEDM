// ============================================================
// src/components/Companias/ModalNuevaCompania.tsx
// ------------------------------------------------------------
// Modal para CREAR una compañía nueva.
// Ahora incluye:
//   ✔ Input global con reglas (InputReglas + REGLA_SHAREPOINT)
//   ✔ Validación automática en tiempo real
//   ✔ Bloqueo del botón si el nombre es inválido
//   ✔ Sin duplicar lógica ni romper useCompaniasActions
// ============================================================

import "./ModalNuevaCompania.css";
import { useEffect } from "react";
import type { CompaniaGD } from "../../Models/CompaniaGD";

// Servicios
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";

// Autocomplete
import { useUserAutocomplete } from "../../Funcionalidades/Usuarios/useUserAutocomplete";

// Lógica unificada de creación
import { useCompaniasActions } from "../../Funcionalidades/Companias/useCompaniasActions";

// Nuevo sistema de validación global
import { InputReglas } from "../inputs/InputReglas";
import { REGLA_SHAREPOINT } from "../../utils/inputs/ReglasInputs";
// import { REGLA_SHAREPOINT } from "../../utils/ReglasInputs";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onCreada: (c: CompaniaGD) => void;
  CompaniasService: any;
}

export default function ModalNuevaCompania({
  abierto,
  onCerrar,
  onCreada,
  CompaniasService,
}: Props) {

  // ============================================================
  // Servicios (Graph)
  // ============================================================
  const { UsuariosGD, BuscarUsu } = useGraphServices();

  // ============================================================
  // NAV (para refrescar y resaltar nueva compañía)
  // ============================================================
  const { triggerRefresh, highlightNode } = useNav();

  // ============================================================
  // Hook unificado — modo CREAR
  // ============================================================
  const {
    nombre,
    setNombre,
    seleccionado,
    setSeleccionado,
    loading,
    error,
    crearCompania,
    setError,
  } = useCompaniasActions({
    modo: "crear",
    UsuariosGD,
    CompaniasService,
    onCreada,
    onCerrar,
    triggerRefresh,
  });

  // ============================================================
  // Autocomplete para seleccionar Administrador
  // ============================================================
  const {
    query: adminTexto,
    setQuery: setAdminTexto,
    results: resultados,
    loading: loadingBuscador,
    dropdownRef,
    clearResults,
    reset: resetAutocomplete,
  } = useUserAutocomplete({ BuscarUsu });

  // ============================================================
  // Reset al abrir el modal
  // ============================================================
  useEffect(() => {
    if (abierto) {
      setNombre("");             // reset nombre
      setSeleccionado(null);     // reset admin seleccionado
      setError(null);            // reset errores
      resetAutocomplete();       // reset buscador
    }
  }, [abierto]);

  if (!abierto) return null;

  // ============================================================
  // Selección desde autocomplete
  // ============================================================
  function handleSelect(u: { nombre: string; correo: string }) {
    setSeleccionado(u);
    setAdminTexto("");
    clearResults();
  }

  // ============================================================
  // RENDER DEL MODAL
  // ============================================================
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-nueva-compania">

        {/* HEADER */}
        <div className="modal-header">
          <h2>Nueva Compañía</h2>
          <button className="close-btn" onClick={onCerrar}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          {/* NOMBRE CON VALIDACIÓN GLOBAL */}
          <label className="modal-label">Nombre de la compañía:</label>

          {/*  
            InputReglas aplica automáticamente:
            ✔ placeholder global
            ✔ sanitización al escribir
            ✔ validación automática
            ✔ mensaje de error debajo del input
          */}
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
            <input
              className="autocomplete-input"
              value={adminTexto}
              onChange={(e) => {
                setAdminTexto(e.target.value);
                setError(null); // limpia errores lógicos
                setSeleccionado(null);
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
                    <div>{u.nombre}</div>
                    <div className="autocomplete-item-email">{u.correo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHIP DEL ADMIN SELECCIONADO */}
          {seleccionado && (
            <div className="selected-admin-chip">
              <div>
                <div className="selected-admin-name">{seleccionado.nombre}</div>
                <div className="selected-admin-email">{seleccionado.correo}</div>
              </div>

              <button
                className="selected-admin-remove"
                onClick={() => setSeleccionado(null)}
              >
                Quitar
              </button>
            </div>
          )}

          {/* ERRORES (useCompaniasActions) */}
          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>

          <button
            className="btn-primary"
            onClick={async () => {

              // ============================================================
              // Validación antes de CREAR compañía
              // ============================================================
              const errorNombre = REGLA_SHAREPOINT.validar?.(nombre);
              if (errorNombre) {
                setError(errorNombre); // reutiliza el sistema nativo del modal
                return;
              }

              // Ejecutar creación
              const nueva = await crearCompania();

              // Si se creó, refrescar UI y resaltar en el árbol
              if (nueva?.Id) {
                triggerRefresh();

                // Espera a que el árbol sea reconstruido antes de hacer highlight
                setTimeout(() => {
                  highlightNode(`c-${nueva.Id}`);
                }, 300);
              }
            }}
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear Compañía"}
          </button>
        </div>

      </div>
    </div>
  );
}
