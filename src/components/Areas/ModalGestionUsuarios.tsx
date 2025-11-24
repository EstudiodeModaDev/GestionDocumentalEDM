// ============================================================
// ModalGestionUsuarios.tsx — versión MULTI-USUARIOS con AUTOCOMPLETE
// ------------------------------------------------------------
// ✔ Agregar múltiples usuarios (chips)
// ✔ Chips SIEMPRE abajo del input
// ✔ Dropdown SIEMPRE arriba del input (absolute)
// ✔ Input nunca se mueve
// ✔ Validación de roles
// ✔ Edición de compañía/área
// ✔ Eliminación de usuarios
// ✔ Botón “Agregar usuarios” movido al FOOTER
// ✔ Texto dinámico según cantidad seleccionada
// ============================================================

import * as React from "react";
import "./ModalGestionUsuarios.css";
import { useGraphServices } from "../../graph/GrapServicesContext";

import type { UsuarioGD } from "../../Models/UsuarioGD";
import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { AreaGD } from "../../Models/Area";

type UsuarioBasic = { nombre: string; correo: string };

type ModalGestionUsuariosProps = {
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
}: ModalGestionUsuariosProps) {

  const { BuscarUsu, UsuariosGD, Companias, Areas } = useGraphServices();

  // ============================================================
  // ESTADOS PRINCIPALES
  // ============================================================

  // Usuarios existentes en el área actual
  const [usuariosArea, setUsuariosArea] = React.useState<UsuarioGD[]>([]);
  const [loadingLista, setLoadingLista] = React.useState(false);

  // Catálogos (Compañías y Áreas)
  const [companias, setCompanias] = React.useState<CompaniaGD[]>([]);
  const [areas, setAreas] = React.useState<AreaGD[]>([]);

  // Autocomplete
  const [texto, setTexto] = React.useState("");
  const [resultados, setResultados] = React.useState<UsuarioBasic[]>([]);
  const [seleccionados, setSeleccionados] = React.useState<UsuarioBasic[]>([]);
  const [loadingBuscador, setLoadingBuscador] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Edición de ubicación del usuario
  const [editingUsuario, setEditingUsuario] = React.useState<UsuarioGD | null>(null);
  const [editCompania, setEditCompania] = React.useState("");
  const [editArea, setEditArea] = React.useState("");

  // Mensajes y estado de guardado
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);


  // ============================================================
  // CARGAR USUARIOS + CATÁLOGOS AL ABRIR EL MODAL
  // ============================================================

  const loadData = React.useCallback(async () => {
    try {
      setLoadingLista(true);

      const [allUsers, allComp, allAreas] = await Promise.all([
        UsuariosGD.getAll(),
        Companias.getAll(),
        Areas.getAll(),
      ]);

      // Filtrar solo los usuarios pertenecientes a esta compañía/área
      const filtrados = allUsers.filter((u) =>
        u.Rol === "UsuarioArea" &&
        (u.CompaniaID ?? "").toLowerCase() === companiaName.toLowerCase() &&
        (u.AreaID ?? "").toLowerCase() === areaName.toLowerCase()
      );

      setUsuariosArea(filtrados);
      setCompanias(allComp);
      setAreas(allAreas);

    } catch (err) {
      setError("No se pudo cargar usuarios del área.");
    } finally {
      setLoadingLista(false);
    }

  }, [UsuariosGD, Companias, Areas, areaName, companiaName]);


  // Reset al abrir el modal
  React.useEffect(() => {
    if (!isOpen) return;

    setTexto("");
    setResultados([]);
    setSeleccionados([]);
    setEditingUsuario(null);
    setError(null);
    setInfo(null);

    void loadData();
  }, [isOpen, loadData]);


  // ============================================================
  // AUTOCOMPLETE (con debounce)
  // ============================================================

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


  // ============================================================
  // AGREGAR MULTI-USUARIOS
  // ============================================================

  const handleAgregar = async () => {
    if (seleccionados.length === 0) return; // Nunca debería pasar

    try {
      setSaving(true);

      for (const s of seleccionados) {
        const correo = s.correo.toLowerCase();
        const existente = await UsuariosGD.getByCorreo(correo);

        // Validar roles prohibidos
        if (existente && existente.Rol !== "UsuarioArea") {
          setError(`El usuario ${s.nombre} ya tiene rol "${existente.Rol}".`);
          continue;
        }

        // Upsert
        await UsuariosGD.upsertByCorreo({
          Nombre: s.nombre,
          Correo: correo,
          Rol: "UsuarioArea",
          CompaniaID: companiaName,
          AreaID: areaName,
        });
      }

      setSeleccionados([]);
      setInfo("Usuarios agregados correctamente.");

      await loadData();
      if (onSuccess) onSuccess();

    } catch {
      setError("Error al agregar usuarios.");
    } finally {
      setSaving(false);
    }
  };


  // Texto dinámico para el botón del footer
  const agregarLabel =
    seleccionados.length === 0
      ? "Agregar usuarios"
      : seleccionados.length === 1
      ? "Agregar usuario"
      : `Agregar ${seleccionados.length} usuarios`;


  // ============================================================
  // EDICIÓN DE UBICACIÓN
  // ============================================================

  const areasFiltradas = React.useMemo(() => {
    if (!editCompania) return areas;
    return areas.filter(
      (a) => (a.NombreCompania ?? "").toLowerCase() === editCompania.toLowerCase()
    );
  }, [areas, editCompania]);

  const handleGuardarEdicion = async () => {
    if (!editingUsuario) return;

    if (!editCompania || !editArea) {
      setError("Debes seleccionar compañía y área.");
      return;
    }

    try {
      setSaving(true);

      await UsuariosGD.upsertByCorreo({
        Nombre: editingUsuario.Title,
        Correo: editingUsuario.Correo,
        Rol: editingUsuario.Rol,
        CompaniaID: editCompania,
        AreaID: editArea,
      });

      setEditingUsuario(null);
      await loadData();
      if (onSuccess) onSuccess();

    } finally {
      setSaving(false);
    }
  };


  // ============================================================
  // ELIMINAR USUARIO
  // ============================================================

  const handleEliminar = async (u: UsuarioGD) => {
    if (!window.confirm(`¿Eliminar usuario ${u.Title}?`)) return;

    try {
      setSaving(true);
      await UsuariosGD.deleteByCorreo(u.Correo);
      await loadData();
    } finally {
      setSaving(false);
    }
  };


  // ============================================================
  // CERRAR MODAL
  // ============================================================

  const handleClose = () => {
    if (!saving) onClose();
  };

  if (!isOpen) return null;


  // ============================================================
  // ========================= UI DEL MODAL ======================
  // ============================================================

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* ===================================================== */}
        {/* HEADER */}
        {/* ===================================================== */}
        <div className="modal-header">
          <h3>Gestionar Usuarios</h3>
          <button className="modal-close" onClick={handleClose}>✕</button>
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
                      <span>{u.CompaniaID} / {u.AreaID}</span>
                    </div>

                    <div className="usuariosArea-actions">
                      <button
                        onClick={() => {
                          setEditingUsuario(u);
                          setEditCompania(u.CompaniaID ?? "");
                          setEditArea(u.AreaID ?? "");
                        }}
                      >
                        Editar
                      </button>

                      <button className="btn-danger" onClick={() => handleEliminar(u)}>
                        Eliminar
                      </button>
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </section>


          {/* ===================================================== */}
          {/* EDICIÓN DE UBICACIÓN */}
          {/* ===================================================== */}
          {editingUsuario && (
            <section className="modal-section">
              <h4>Editar ubicación</h4>

              <p>{editingUsuario.Title} ({editingUsuario.Correo})</p>

              <select
                value={editCompania}
                onChange={(e) => {
                  setEditCompania(e.target.value);
                  setEditArea("");
                }}
              >
                <option value="">Selecciona compañía</option>
                {companias.map((c) => (
                  <option key={c.Id} value={c.Title}>{c.Title}</option>
                ))}
              </select>

              <select
                value={editArea}
                onChange={(e) => setEditArea(e.target.value)}
              >
                <option value="">Selecciona área</option>
                {areasFiltradas.map((a) => (
                  <option key={a.Id} value={a.Title}>{a.Title}</option>
                ))}
              </select>

              <button onClick={handleGuardarEdicion} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </section>
          )}


          {/* ===================================================== */}
          {/* AUTOCOMPLETE + CHIPS */}
          {/* ===================================================== */}
          <section className="modal-section">
            <h4>Agregar usuarios</h4>

            <div className="autocomplete-container" ref={dropdownRef}>
              <input
                className="autocomplete-input"
                type="text"
                placeholder="Buscar usuario..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />

              {loadingBuscador && <div className="autocomplete-loading">Buscando...</div>}

              {resultados.length > 0 && (
                <div className="autocomplete-dropdown">
                  {resultados.map((u) => (
                    <div
                      key={u.correo}
                      className="autocomplete-item"
                      onClick={() => {
                        if (!seleccionados.some((s) => s.correo === u.correo)) {
                          setSeleccionados([...seleccionados, u]);
                        }
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
                      onClick={() =>
                        setSeleccionados(seleccionados.filter((x) => x.correo !== s.correo))
                      }
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

          {/* Botón Cerrar */}
          <button className="btn-secundario" onClick={handleClose}>
            Cerrar
          </button>

          {/* Botón Agregar usuarios (dinámico) */}
          <button
            className="btn-primario"
            disabled={seleccionados.length === 0 || saving}
            onClick={handleAgregar}
          >
            {saving ? "Guardando..." : agregarLabel}
          </button>

        </div>

      </div>
    </div>
  );
}
