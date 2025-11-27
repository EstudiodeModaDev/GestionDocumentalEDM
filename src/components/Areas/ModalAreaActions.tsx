// ============================================================
// ModalAreaActions.tsx — UI con validación global del nombre
// ============================================================

import "./ModalAreaActions.css";
import { useState } from "react";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";
import { useNuevaArea } from "../../Funcionalidades/Areas/useAreasActions";

// 🔥 Validación global
import { InputReglas } from "../inputs/InputReglas";
import { REGLA_SHAREPOINT } from "../../utils/inputs/ReglasInputs";

export default function ModalNuevaArea(props: any) {
  const { Areas, UsuariosGD, Companias, BuscarUsu } = useGraphServices();
  const { highlightNode, triggerRefresh } = useNav();

  const hook = useNuevaArea({
    ...props,
    Areas,
    UsuariosGD,
    Companias,
    BuscarUsu,
    highlightNode,
    triggerRefresh,
  });

  // ============================================================
  // ❗ El orden de hooks debe ser SIEMPRE fijo
  //    Este useState NO puede ir después de un return condicional
  // ============================================================
  const [localError, setLocalError] = useState<string | null>(null);

  // ❗ El return condicional SIEMPRE debe estar DESPUÉS de todos los hooks
  if (!props.isOpen) return null;

  const {
    nombre, setNombre,
    texto, setTexto,
    resultados,
    seleccionado, setSeleccionado,
    loadingBuscador,
    error,          // error del hook
    loading,
    dropdownRef,
    crearArea,
    actualizarArea,
    eliminarArea,
  } = hook;

  // ============================================================
  // Validar antes de crear/actualizar
  // ============================================================
  async function handleGuardar() {
    // Validar nombre según reglas globales
    const errorNombre = REGLA_SHAREPOINT.validar?.(nombre);
    if (errorNombre) {
      setLocalError(errorNombre);
      return;
    }

    setLocalError(null); // limpiar error local

    if (props.areaToEdit) {
      await actualizarArea();
    } else {
      await crearArea();
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-nueva-area">

        <div className="modal-header">
          <h3>{props.areaToEdit ? "Editar Área" : "Nueva Área"}</h3>
          <button className="modal-close" onClick={props.onClose}>×</button>
        </div>

        <div className="modal-body">

          {/* NOMBRE DEL ÁREA — con reglas globales */}
          <label className="modal-label">Nombre del área</label>

          <InputReglas
            value={nombre}
            onChange={setNombre}
            regla={{
              ...REGLA_SHAREPOINT,
              placeholder: `Ej: Área Financiera • ${REGLA_SHAREPOINT.placeholder}`
            }}
          />

          {/* RESPONSABLE */}
          <label className="modal-label">Responsable (opcional)</label>

          <div className="autocomplete-container" ref={dropdownRef}>
            <input
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccionado(null); // quitar seleccionado
                setLocalError(null);   // limpiar error local
              }}
              className="autocomplete-input"
              placeholder="Buscar usuario..."
            />

            {loadingBuscador && (
              <div className="autocomplete-loading">Buscando...</div>
            )}

            {resultados.length > 0 && (
              <div className="autocomplete-dropdown">
                {resultados.map((u: any) => (
                  <div
                    key={u.correo}
                    className="autocomplete-item"
                    onClick={() => {
                      setSeleccionado(u);
                      setTexto("");
                    }}
                  >
                    <div className="autocomplete-item-name">{u.nombre}</div>
                    <div className="autocomplete-item-email">{u.correo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {seleccionado && (
            <div className="selected-admin-chip">
              <div className="selected-admin-texts">
                <span className="selected-admin-name">{seleccionado.nombre}</span>
                <span className="selected-admin-email">{seleccionado.correo}</span>
              </div>

              <button
                className="selected-admin-remove"
                onClick={() => setSeleccionado(null)}
              >
                Quitar
              </button>
            </div>
          )}

          {/* 🔥 Error del hook o error local de validación */}
          {(error || localError) && (
            <p className="modal-error">{error || localError}</p>
          )}
        </div>

        <div className="modal-footer">
          {props.areaToEdit && (
            <button
              className="btn-danger"
              onClick={eliminarArea}
              disabled={loading}
            >
              Eliminar
            </button>
          )}

          <button
            className="btn-primary"
            onClick={handleGuardar}
            disabled={loading}
          >
            {props.areaToEdit ? "Guardar cambios" : "Crear Área"}
          </button>

          <button className="btn-secondary" onClick={props.onClose}>
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}
