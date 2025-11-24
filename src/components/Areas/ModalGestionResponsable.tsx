// ============================================================
// ModalGestionResponsable.tsx — versión con AUTOCOMPLETE nuevo
// ============================================================

import * as React from "react";
import "./ModalGestionResponsable.css";
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { RolUsuario } from "../../Models/UsuarioGD";

type ModalGestionResponsableProps = {
  isOpen: boolean;
  onClose: () => void;

  areaId: string;
  areaName: string;
  companiaName: string;
  responsableActual?: string;

  onSuccess?: () => void;
};

type UsuarioBasic = { nombre: string; correo: string };

export default function ModalGestionResponsable({
  isOpen,
  onClose,
  areaId,
  areaName,
  companiaName,
  responsableActual,
  onSuccess,
}: ModalGestionResponsableProps) {
  
  const { BuscarUsu, UsuariosGD, Areas } = useGraphServices();

  // --- Estados del nuevo buscador ---
  const [texto, setTexto] = React.useState("");
  const [resultados, setResultados] = React.useState<UsuarioBasic[]>([]);
  const [seleccionado, setSeleccionado] = React.useState<UsuarioBasic | null>(null);
  const [loadingBuscador, setLoadingBuscador] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // cerrar dropdown si clickea afuera
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  /* ============================================================
     RESET AL ABRIR EL MODAL
  ============================================================ */
  React.useEffect(() => {
    if (isOpen) {
      setTexto("");
      setResultados([]);
      setSeleccionado(null);
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  /* ============================================================
     AUTOCOMPLETE con debounce
  ============================================================ */
  React.useEffect(() => {
    if (!texto.trim()) {
      setResultados([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoadingBuscador(true);
        const lista = await BuscarUsu.buscar(texto.trim());
        setResultados(lista);
      } finally {
        setLoadingBuscador(false);
      }
    }, 350);

    return () => clearTimeout(delay);
  }, [texto, BuscarUsu]);

  /* ============================================================
     VALIDACIÓN
  ============================================================ */
  function validarRol(rol: RolUsuario, areaID?: string, compID?: string) {
    if (rol === "AdministradorCom")
      return "Este usuario es Administrador de una Compañía. No puede ser responsable de un área.";

    if (rol === "AdministradorGeneral")
      return "Un Administrador General no puede ser responsable de un área.";

    if (rol === "ResponsableArea") {
      if (areaID !== areaName || compID !== companiaName) {
        return `Este usuario ya es responsable del área "${areaID}" en la compañía "${compID}".`;
      }
    }

    return null;
  }

  /* ============================================================
     GUARDAR RESPONSABLE
  ============================================================ */
  const handleGuardar = async () => {
    setError(null);

    if (!seleccionado) {
      setError("Debes seleccionar un usuario.");
      return;
    }

    try {
      setSaving(true);

      const correo = seleccionado.correo.toLowerCase();
      const existente = await UsuariosGD.getByCorreo(correo);

      if (existente) {
        const motivo = validarRol(existente.Rol, existente.AreaID, existente.CompaniaID);
        if (motivo) {
          setError(motivo);
          setSaving(false);
          return;
        }
      }

      // UPSERT del usuario responsable
      await UsuariosGD.upsertByCorreo({
        Nombre: seleccionado.nombre,
        Correo: correo,
        Rol: "ResponsableArea",
        CompaniaID: companiaName,
        AreaID: areaName,
      });

      // Actualizar en AreasGD
      await Areas.setResponsable(areaId, correo);

      if (onSuccess) onSuccess();
      onClose();

    } catch (err) {
      console.error("❌ Error:", err);
      setError("Ocurrió un error al asignar el responsable.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="modal-header">
          <h3>Gestionar Responsable</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          <h4>Responsable actual</h4>
          <p>{responsableActual || "— No hay responsable asignado —"}</p>

          <h4 style={{ marginTop: "1rem" }}>Asignar nuevo responsable</h4>

          <div className="autocomplete-container" ref={dropdownRef}>

            {/* INPUT */}
            <input
              className="autocomplete-input"
              type="text"
              value={texto}
              placeholder="Buscar usuario..."
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccionado(null);
              }}
            />

            {loadingBuscador && <div className="autocomplete-loading">Buscando...</div>}

            {/* CHIP */}
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

            {/* DROPDOWN */}
            {resultados.length > 0 && !seleccionado && (
              <div className="autocomplete-dropdown">
                {resultados.map((u) => (
                  <div
                    key={u.correo}
                    className="autocomplete-item"
                    onClick={() => {
                      setSeleccionado(u);
                      setTexto("");
                      setResultados([]);
                    }}
                  >
                    <div className="autocomplete-item-name">{u.nombre}</div>
                    <div className="autocomplete-item-email">{u.correo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secundario" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primario"
            disabled={!seleccionado || saving}
            onClick={handleGuardar}
          >
            {saving ? "Guardando..." : "Guardar responsable"}
          </button>
        </div>

      </div>
    </div>
  );
}
