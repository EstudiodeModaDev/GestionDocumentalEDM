// ============================================================
// ModalNuevaArea.tsx — Versión COMPLETA con buscador mejorado
// ============================================================

import { useState, useEffect, useRef } from "react";
import "./ModalNuevaArea.css";
import { useGraphServices } from "../../graph/GrapServicesContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  companiaName: string;
  areaToEdit?: any | null;
  onSuccess: () => void;
};

type UsuarioBasic = { nombre: string; correo: string };

export default function ModalNuevaArea({
  isOpen,
  onClose,
  companiaName,
  areaToEdit,
  onSuccess,
}: Props) {
  const { Areas, UsuariosGD, Companias, BuscarUsu } = useGraphServices();

  // ============================================================
  // ESTADOS PRINCIPALES
  // ============================================================
  const [nombre, setNombre] = useState("");

  // Autocomplete mejorado
  const [texto, setTexto] = useState(""); // input de búsqueda
  const [resultados, setResultados] = useState<UsuarioBasic[]>([]);
  const [seleccionado, setSeleccionado] = useState<UsuarioBasic | null>(null);
  const [loadingBuscador, setLoadingBuscador] = useState(false);

  // Auxiliares
  const [adminCorreo, setAdminCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // CARGAR ADMIN DE LA COMPAÑÍA
  // ============================================================
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const comps = await Companias.getAll();
        const comp = comps.find(
          (c) =>
            c.Title.trim().toLowerCase() ===
            companiaName.trim().toLowerCase()
        );
        setAdminCorreo(comp?.AdministradorCom ?? "");
      } catch (e) {
        console.error("❌ Error obteniendo Administrador de Compañía:", e);
      }
    })();
  }, [isOpen, companiaName]);

  // ============================================================
  // CARGAR DATOS SI ES EDITAR
  // ============================================================
  useEffect(() => {
    if (!isOpen) return;

    if (areaToEdit) {
  setNombre(areaToEdit.Title);

  if (areaToEdit.ResponsableId) {
    setSeleccionado({
      nombre: areaToEdit.ResponsableId,
      correo: areaToEdit.ResponsableId,
    });

    setTexto("");  // ✔️ limpiar input
  }
}
 else {
      setNombre("");
      setSeleccionado(null);
      setTexto("");
    }

    setResultados([]);
    setError(null);
  }, [isOpen, areaToEdit]);

  // ============================================================
  // AUTOCOMPLETE con debounce
  // ============================================================
  useEffect(() => {
    if (!texto.trim()) {
      setResultados([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoadingBuscador(true);
        const lista = await BuscarUsu.buscar(texto.trim());
        setResultados(lista);
      } catch (err) {
        console.error("❌ Error buscando usuarios:", err);
      } finally {
        setLoadingBuscador(false);
      }
    }, 350);

    return () => clearTimeout(delay);
  }, [texto, BuscarUsu]);

  // ============================================================
  // VALIDAR RESPONSABLE
  // ============================================================
  function validarResponsable(usuario: any): string | null {
    if (!usuario) return null;

    if (usuario.Rol === "AdministradorGeneral")
      return "Un Administrador General no puede ser responsable de un área.";

    if (usuario.Rol === "AdministradorCom")
      return "Un Administrador de Compañía no puede ser responsable de un área.";

    if (usuario.Rol === "ResponsableArea") {
      if (
        usuario.CompaniaID !== companiaName ||
        usuario.AreaID !== nombre
      ) {
        return `Este usuario ya es responsable del área "${usuario.AreaID}" en la compañía "${usuario.CompaniaID}".`;
      }
    }

    return null;
  }

  // ============================================================
  // CREAR ÁREA
  // ============================================================
  async function crearArea() {
    if (!nombre.trim()) {
      setError("Debes ingresar un nombre.");
      return;
    }

    try {
      setLoading(true);
      const correo = seleccionado?.correo.trim().toLowerCase() || "";

      if (correo) {
        const existente = await UsuariosGD.getByCorreo(correo);
        const motivo = validarResponsable(existente);

        if (motivo) {
          setError(motivo);
          setLoading(false);
          return;
        }
      }

      const nueva = await Areas.create({
        Title: nombre.trim(),
        NombreCompania: companiaName,
        AdministradorId: adminCorreo,
        ResponsableId: correo,
        FechaCreacion: new Date().toISOString(),
        Activa: true,
      });

      if (correo) {
        await UsuariosGD.upsertByCorreo({
          Nombre: seleccionado?.nombre || seleccionado?.correo || "",
          Correo: correo,
          Rol: "ResponsableArea",
          CompaniaID: companiaName,
          AreaID: nueva.Title,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Error creando área:", err);
      setError("Error al crear el área.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // ACTUALIZAR ÁREA
  // ============================================================
  async function actualizarArea() {
    try {
      setLoading(true);

      const correo = seleccionado?.correo.trim().toLowerCase() || "";
      const existente = correo ? await UsuariosGD.getByCorreo(correo) : null;

      const motivo = existente ? validarResponsable(existente) : null;
      if (motivo) {
        setError(motivo);
        setLoading(false);
        return;
      }

      await Areas.update(areaToEdit.Id, {
        Title: nombre.trim(),
        ResponsableId: correo,
      });

      if (correo) {
        await UsuariosGD.upsertByCorreo({
          Nombre: seleccionado?.nombre || seleccionado?.correo || "",
          Correo: correo,
          Rol: "ResponsableArea",
          CompaniaID: companiaName,
          AreaID: nombre.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Error actualizando área:", err);
      setError("Error al actualizar el área.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // ELIMINAR ÁREA
  // ============================================================
  async function eliminarArea() {
    if (!window.confirm("¿Seguro que deseas eliminar esta área?")) return;

    try {
      setLoading(true);

      await Areas.deleteFolder(areaToEdit);
      await Areas.delete(areaToEdit.Id);

      onSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Error eliminando área:", err);
      setError("Error al eliminar el área.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // ============================================================
  // UI DEL MODAL
  // ============================================================
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-nueva-area">

        {/* HEADER */}
        <div className="modal-header">
          <h3>{areaToEdit ? "Editar Área" : "Nueva Área"}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          {/* NOMBRE */}
          <label className="modal-label">Nombre del área</label>
          <input
            className="modal-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          {/* ADMIN */}
          <p className="modal-info-small">
            Administrador asignado: <strong>{adminCorreo}</strong>
          </p>

          {/* AUTOCOMPLETE RESPONSABLE */}
          <label className="modal-label">Responsable (opcional)</label>

          <div className="autocomplete-container" ref={dropdownRef}>
            {/* INPUT */}
            <input
              type="text"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccionado(null);
              }}
              className="autocomplete-input"
              placeholder="Buscar usuario..."
            />

            {loadingBuscador && (
              <div className="autocomplete-loading">Buscando...</div>
            )}

            {/* DROPDOWN */}
            {resultados.length > 0 && (
              <div className="autocomplete-dropdown">
                {resultados.map((u) => (
                  <div
                    key={u.correo}
                    className="autocomplete-item"
                    onClick={() => {
                      setSeleccionado(u);
                      setTexto(""); // limpiamos input
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

          {/* CHIP DEL RESPONSABLE SELECCIONADO */}
          {seleccionado && (
            <div className="selected-admin-chip">
              <div className="selected-admin-texts">
                <span className="selected-admin-name">{seleccionado.nombre}</span>
                <span className="selected-admin-email">{seleccionado.correo}</span>
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

          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">

          {areaToEdit && (
            <button className="btn-danger" onClick={eliminarArea} disabled={loading}>
              Eliminar
            </button>
          )}

          <button
            className="btn-primary"
            onClick={areaToEdit ? actualizarArea : crearArea}
            disabled={loading}
          >
            {areaToEdit ? "Guardar cambios" : "Crear Área"}
          </button>

          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>

        </div>
      </div>
    </div>
  );
}
