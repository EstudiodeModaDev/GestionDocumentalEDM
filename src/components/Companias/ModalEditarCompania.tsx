// ============================================================
// ModalEditarCompania.tsx
// - Incluye autocomplete con chip visual (como ModalNuevaCompania)
// - Compatible con roles, validaciones y actualización de compañía
// - Código limpio, ordenado y totalmente comentado
// ============================================================

import { useEffect, useState, useRef } from "react";
import "./ModalEditarCompania.css"; 
import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { UsuarioGD } from "../../Models/UsuarioGD";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";

type UsuarioBasic = { nombre: string; correo: string };

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

  const { BuscarUsu, UsuariosGD, Areas } = useGraphServices();
  const { triggerRefresh } = useNav();

  /* ============================================================
     ESTADOS DEL MODAL
  ============================================================ */
  const [nombre, setNombre] = useState(compania.Title ?? "");

  const [texto, setTexto] = useState(compania.AdministradorCom ?? "");
  const [resultados, setResultados] = useState<UsuarioBasic[]>([]);
  const [seleccionado, setSeleccionado] = useState<UsuarioBasic | null>(null);

  const [loadingBuscador, setLoadingBuscador] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const correoAdminOriginal = compania.AdministradorCom ?? "";

  // para cerrar dropdown cuando se clickea afuera
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ============================================================
     RESET MODAL AL ABRIR
  ============================================================ */
  useEffect(() => {
  if (abierto) {
    setNombre(compania.Title ?? "");

    // 🟦 Muestra el chip con el administrador actual
    if (compania.AdministradorCom) {
      setSeleccionado({
        nombre: compania.AdministradorCom,
        correo: compania.AdministradorCom,
      });
    } else {
      setSeleccionado(null);
    }

    // 🟥 Dejar input vacío para NO disparar el autocomplete
    setTexto("");

    setResultados([]);
    setError(null);
    setLoading(false);
  }
}, [abierto, compania]);



  /* ============================================================
     AUTOCOMPLETE (con debounce)
  ============================================================ */
  useEffect(() => {
    if (!abierto) return;
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
  }, [texto, BuscarUsu, abierto]);

  /* ============================================================
     VALIDAR ROL DEL NUEVO ADMIN
  ============================================================ */
  function validarRolAdmin(user: UsuarioGD | null): string | null {
    if (!user) return null;

    if (user.Rol === "AdministradorCom") {
      if (user.CompaniaID === compania.Title) return null;
      return "Este usuario ya es administrador de otra compañía.";
    }

    if (user.Rol === "AdministradorGeneral") {
      return "Un Administrador General no puede ser administrador de una compañía.";
    }

    return null;
  }

  /* ============================================================
     GUARDAR CAMBIOS
  ============================================================ */
  const handleGuardar = async () => {
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre de la compañía es obligatorio.");
      return;
    }

    const correoFinal = (seleccionado?.correo || texto).trim().toLowerCase();
    if (!correoFinal) {
      setError("Debes definir un administrador.");
      return;
    }

    try {
      setLoading(true);

      // validar rol del admin nuevo
      const usuarioNuevo = await UsuariosGD.getByCorreo(correoFinal);
      const motivo = validarRolAdmin(usuarioNuevo);
      if (motivo) {
        setError(motivo);
        setLoading(false);
        return;
      }

      // si cambió el admin → resetear al antiguo
      if (correoAdminOriginal && correoAdminOriginal !== correoFinal) {
        const anterior = await UsuariosGD.getByCorreo(correoAdminOriginal);
        if (anterior) {
          await UsuariosGD.upsertByCorreo({
            Nombre: anterior.Title || anterior.Correo,
            Correo: anterior.Correo,
            Rol: "SinAcceso",
            CompaniaID: undefined,
            AreaID: undefined,
          });
        }
      }

      // actualizar nuevo admin
      const nombreAdmin = seleccionado?.nombre || usuarioNuevo?.Title || correoFinal;
      await UsuariosGD.upsertByCorreo({
        Nombre: nombreAdmin,
        Correo: correoFinal,
        Rol: "AdministradorCom",
        CompaniaID: nombre.trim(),
        AreaID: undefined,
      });

      // actualizar compañía
      const oldTitle = compania.Title ?? "";
      const newTitle = nombre.trim();

      const actualizada: CompaniaGD =
        await CompaniasService.updateNombreYAdmin(
          compania.Id,
          oldTitle,
          newTitle,
          correoFinal
        );

      // si cambió nombre → actualizar usuarios y áreas
      if (oldTitle !== newTitle) {
        const users = await UsuariosGD.getAll();
        for (const u of users.filter((u) => u.CompaniaID === oldTitle)) {
          await UsuariosGD.upsertByCorreo({
            Nombre: u.Title || u.Correo,
            Correo: u.Correo,
            Rol: u.Rol,
            CompaniaID: newTitle,
            AreaID: u.AreaID,
          });
        }

        const areas = await Areas.getAll();
        for (const area of areas ?? []) {
  if (area.NombreCompania === oldTitle) {

    // 🔥 EVITAR ERROR — aseguramos que tenga ID
    if (!area.Id) continue;

    await Areas.update(area.Id, { NombreCompania: newTitle });
  }
}

      }

      onActualizada(actualizada);
      triggerRefresh();
      onCerrar();

    } catch (err) {
      console.error("❌ Error actualizando compañía:", err);
      setError("Ocurrió un error al actualizar la compañía.");
    } finally {
      setLoading(false);
    }
  };


  if (!abierto) return null;

  /* ============================================================
     RENDER DEL MODAL
  ============================================================ */
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

          {/* NOMBRE */}
          <label className="modal-label">Nombre de la compañía:</label>
          <input
            type="text"
            className="modal-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          {/* AUTOCOMPLETE */}
          <label className="modal-label">Administrador:</label>

          <div className="autocomplete-container" ref={dropdownRef}>
            <input
              type="text"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccionado(null);
              }}
              className="autocomplete-input"
              placeholder="Buscar usuario por nombre o correo..."
            />

            {loadingBuscador && (
              <div className="autocomplete-loading">Buscando...</div>
            )}

         {/* CHIP DEL ADMIN, IGUAL AL DE NUEVA COMPAÑÍA */}
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
          <button className="btn-secondary" onClick={onCerrar} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleGuardar} disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}
