import { useState, useEffect, useRef } from "react";
import "./ModalNuevaCompania.css";
import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { UsuarioGD } from "../../Models/UsuarioGD";
import { useGraphServices } from "../../graph/GrapServicesContext";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onCreada: (compania: CompaniaGD) => void;
  CompaniasService: any; // servicio que tiene create()
}

type UsuarioBasic = { nombre: string; correo: string };

export default function ModalNuevaCompania({
  abierto,
  onCerrar,
  onCreada,
  CompaniasService,
}: Props) {
  /* ============================================================
     🔗 Servicios (BuscarUsu y UsuariosGD)
  ============================================================ */
  const { BuscarUsu, UsuariosGD } = useGraphServices();

  /* ============================================================
     🧱 Estados del modal (SIEMPRE antes del return condicional)
  ============================================================ */

  // Nombre de la compañía
  const [nombre, setNombre] = useState("");

  // Texto que escribe el usuario en el input del buscador
  const [adminTexto, setAdminTexto] = useState("");

  // Resultados devueltos por BuscarUsu
  const [resultados, setResultados] = useState<UsuarioBasic[]>([]);

  // Usuario seleccionado como administrador
  const [seleccionado, setSeleccionado] = useState<UsuarioBasic | null>(null);

  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [loadingBuscador, setLoadingBuscador] = useState(false);

  // Error general del modal
  const [error, setError] = useState<string | null>(null);

  // Ref para el contenedor del dropdown (por si luego quieres cerrar al hacer clic afuera)
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ============================================================
     🧹 Resetear modal al abrir
  ============================================================ */
  useEffect(() => {
    if (abierto) {
      setNombre("");
      setAdminTexto("");
      setResultados([]);
      setSeleccionado(null);
      setError(null);
      setLoading(false);
    }
  }, [abierto]);

  /* ============================================================
     🔎 AUTOCOMPLETE (con debounce mientras se escribe)
  ============================================================ */
  useEffect(() => {
    // Si el input está vacío, limpiamos resultados
    if (!adminTexto.trim()) {
      setResultados([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoadingBuscador(true);
        const lista = await BuscarUsu.buscar(adminTexto.trim());
        setResultados(lista);
      } catch (err) {
        console.error("❌ Error buscando usuarios:", err);
      } finally {
        setLoadingBuscador(false);
      }
    }, 350); // pequeño debounce

    return () => clearTimeout(delay);
  }, [adminTexto, BuscarUsu]);

  /* ============================================================
     🛑 VALIDACIÓN DE ROL PARA ADMINISTRADOR DE COMPAÑÍA
  ============================================================ */
  function validarRolParaAdminCom(user: UsuarioGD | null): string | null {
    if (!user) return null;

    if (user.Rol === "AdministradorCom") {
      return "Este usuario ya es administrador de otra compañía.";
    }

    if (user.Rol === "AdministradorGeneral") {
      return "Un Administrador General no puede ser Administrador de una compañía.";
    }

    // UsuarioArea o ResponsableArea → SE PUEDE actualizar sin problema
    return null;
  }

  /* ============================================================
     🧩 CREAR COMPAÑÍA (flujo completo)
  ============================================================ */
  const crearCompania = async () => {
    setError(null);

    // Validación simple
    if (!nombre.trim()) {
      setError("Debes ingresar el nombre de la compañía.");
      return;
    }

    if (!seleccionado) {
      setError("Debes seleccionar un administrador.");
      return;
    }

    try {
      setLoading(true);

      const correo = seleccionado.correo.trim().toLowerCase();

      // 1️⃣ Ver si ya existe como usuario en UsuariosGD
      const existente = await UsuariosGD.getByCorreo(correo);

      // 2️⃣ Regla especial según rol
      const motivoError = validarRolParaAdminCom(existente);
      if (motivoError) {
        setError(motivoError);
        setLoading(false);
        return;
      }

      // 3️⃣ Crear/Actualizar usuario → será AdminCom
      //    👇 Aseguramos que Nombre sea SIEMPRE string (sin undefined)
      await UsuariosGD.upsertByCorreo({
        Nombre: seleccionado.nombre || correo,
        Correo: correo,
        Rol: "AdministradorCom",
        CompaniaID: nombre.trim(), // nombre de la nueva compañía
        AreaID: undefined, // los admin NO tienen área
      });

      // 4️⃣ Crear la compañía en SharePoint (tu servicio)
      const nuevaCompania = {
        Title: nombre.trim(),
        AdministradorCom: correo,
        FechaCreacion: new Date().toISOString(),
        Activa: true,
      };

      const creada: CompaniaGD = await CompaniasService.create(nuevaCompania);

      // 5️⃣ Actualizar estado del padre
      onCreada(creada);

      // 6️⃣ Cerrar modal
      onCerrar();
    } catch (err) {
      console.error("❌ Error creando compañía:", err);
      setError("Ocurrió un error al crear la compañía.");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     ⚠️ RETURN CONDICIONAL
  ============================================================ */
  if (!abierto) return null;

  /* ============================================================
     🧩 RENDER DEL MODAL
  ============================================================ */
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-nueva-compania">
        {/* Header */}
        <div className="modal-header">
          <h2>Nueva Compañía</h2>
          <button className="close-btn" onClick={onCerrar}>
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        <div className="modal-body">
          {/* Nombre */}
          <label className="modal-label">Nombre de la compañía:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Estudio de Moda"
            className="modal-input"
          />

          {/* Administrador */}
          <label className="modal-label">Administrador:</label>

          <div className="autocomplete-container" ref={dropdownRef}>
            {/* Input de búsqueda (solo busca, NO refleja el seleccionado) */}
            <input
              type="text"
              value={adminTexto}
              onChange={(e) => {
                setAdminTexto(e.target.value);
                // Si el usuario vuelve a escribir, no borramos la selección previa
                // solo permitimos seguir buscando más opciones si quiere.
              }}
              className="autocomplete-input"
              placeholder="Buscar usuario por nombre o correo..."
            />

            {/* Estado de carga del buscador */}
            {loadingBuscador && (
              <div className="autocomplete-loading">Buscando...</div>
            )}

            {/* Dropdown de resultados */}
            {resultados.length > 0 && (
              <div className="autocomplete-dropdown">
                {resultados.map((u) => {
                  const isSelected = seleccionado?.correo === u.correo;
                  return (
                    <div
                      key={u.correo}
                      className={`autocomplete-item ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => {
                        // ✅ Guardamos el usuario seleccionado
                        setSeleccionado(u);

                        // ✅ Limpiamos el texto de búsqueda
                        setAdminTexto("");

                        // ✅ Cerramos el dropdown
                        setResultados([]);
                      }}
                    >
                      <div className="autocomplete-item-name">{u.nombre}</div>
                      <div className="autocomplete-item-email">{u.correo}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tarjeta del usuario seleccionado */}
          {seleccionado && (
            <div className="selected-admin-chip">
              <div className="selected-admin-texts">
                <div className="selected-admin-name">{seleccionado.nombre}</div>
                <div className="selected-admin-email">
                  {seleccionado.correo}
                </div>
              </div>
              <button
                type="button"
                className="selected-admin-remove"
                onClick={() => setSeleccionado(null)}
              >
                Quitar
              </button>
            </div>
          )}

          {/* Errores */}
          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCerrar} disabled={loading}>
            Cancelar
          </button>

          <button
            className="btn-primary"
            onClick={crearCompania}
            disabled={loading}
          >
            {loading ? "Creando..." : "Crear Compañía"}
          </button>
        </div>
      </div>
    </div>
  );
}
