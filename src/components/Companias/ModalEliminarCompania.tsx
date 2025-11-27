// ============================================================
// src/components/Companias/ModalEliminarCompania.tsx
// ------------------------------------------------------------
// Modal para ELIMINAR una compañía.
//
// Este componente NO contiene lógica de negocio.
//   Toda la lógica está en:
//     👉 useCompaniasActions({ modo: "eliminar", ... })
//
// El modal solo:
//   - muestra los datos (usuarios/áreas asociadas)
//   - confirma el borrado
//   - renderiza la UI con el estado que le entrega el hook
// ============================================================

import "./ModalEliminarCompania.css";
import type { CompaniaGD } from "../../Models/CompaniaGD";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";

import { useCompaniasActions } from "../../Funcionalidades/Companias/useCompaniasActions";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  compania: CompaniaGD;
  onEliminada: (id: string) => void;
  CompaniasService: any;
}

export default function ModalEliminarCompania({
  abierto,
  onCerrar,
  compania,
  onEliminada,
  CompaniasService,
}: Props) {
  
  // ============================================================
  // 🔗 Servicios (Graph) y trigger del NAV
  // ============================================================
  const { UsuariosGD, Areas } = useGraphServices();
  const { triggerRefresh } = useNav();

  // ============================================================
  // 🧩 Hook UNIFICADO para manejar la eliminación
  //   - carga usuarios asociados
  //   - carga áreas asociadas
  //   - maneja doble confirmación
  //   - resetea roles de usuarios
  //   - elimina carpeta + registro en SharePoint
  //   - invoca onEliminada
  // ============================================================
  const {
    loading,              // estado de carga mientras elimina
    usuariosAsociados,    // usuarios vinculados a la compañía
    areasAsociadas,       // áreas vinculadas
    error,                // mensajes de error o advertencia
    segundaConfirmacion,  // indica si es un segundo intento
    eliminarCompania,     // acción principal de eliminación
  } = useCompaniasActions({
    modo: "eliminar",
    compania,
    UsuariosGD,
    Areas,
    CompaniasService,
    onEliminada,
    onCerrar,
    triggerRefresh,
  });

  // Si el modal está cerrado no se renderiza nada
  if (!abierto) return null;

  // ============================================================
  // 🖼️ Render del modal
  // ============================================================
  return (
    <div className="modal-backdrop">
      <div className="modal-card">

        {/* HEADER */}
        <div className="modal-header">
          <h2>Eliminar Compañía</h2>
          <button className="close-btn" onClick={onCerrar}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <p>
            ¿Deseas eliminar la compañía{" "}
            <strong>{compania.Title}</strong>?
          </p>

          {/* Información asociada */}
          <ul style={{ marginTop: ".5rem" }}>
            <li>
              Usuarios asociados:{" "}
              <strong>{usuariosAsociados?.length}</strong>
            </li>
            <li>
              Áreas asociadas:{" "}
              <strong>{areasAsociadas?.length}</strong>
            </li>
          </ul>

          {/* Mensajes de error o advertencia */}
          {error && <p className="modal-error">{error}</p>}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            className="btn-cancelar"
            onClick={onCerrar}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className="btn-accion-eliminar"
            onClick={eliminarCompania}
            disabled={loading}
          >
            {loading
              ? "Eliminando..."               // 1️⃣ Eliminación en proceso
              : segundaConfirmacion
              ? "Eliminar definitivamente"    // 2️⃣ Segundo clic: confirmación final
              : "Eliminar"}                
          </button>
        </div>

      </div>
    </div>
  );
}
