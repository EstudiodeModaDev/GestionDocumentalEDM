// ============================================================
// src/components/Companias/VerAreas.tsx
// Vista de una Compañía → Lista de Áreas + Crear/Editar/Eliminar
// Con navegación automática conectada al Sidebar (NavContext)
// ============================================================

import * as React from "react";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";

import "./VerAreas.css";
import ModalNuevaArea from "../Areas/ModalAreaActions";

export default function VerAreas({ companiaName }: { companiaName: string }) {
  const { Areas, Companias } = useGraphServices();
  const { setSelected, expandNode } = useNav();


  const [areas, setAreas] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // ⭐ Estado del modal Nueva/Editar Área
  const [modalOpen, setModalOpen] = React.useState(false);
  const [areaToEdit, setAreaToEdit] = React.useState<any | null>(null);

  // ID interno de la compañía (para manejar expand/collapse)
  const [companiaId, setCompaniaId] = React.useState<string>("");

  // refresh auto
  const { refreshFlag } = useNav();


  /* ============================================================
     🔹 Obtener ID real de la compañía (c-XX)
  ============================================================ */
  React.useEffect(() => {
    (async () => {
      const all = await Companias.getAll();
      const comp = all.find(
        (c) =>
          c.Title.trim().toLowerCase() ===
          companiaName.trim().toLowerCase()
      );

      if (comp) setCompaniaId(`c-${comp.Id}`);
    })();
  }, [companiaName]);

  /* ============================================================
     🔹 Cargar áreas de la compañía
  ============================================================ */
  /* ============================================================
   🔹 Cargar áreas de la compañía
============================================================ */
const loadAreas = React.useCallback(async () => {
  setLoading(true);

  const all = await Areas.getAll();
  const filtered = all.filter(
    (a) =>
      a.NombreCompania?.trim().toLowerCase() ===
      companiaName.trim().toLowerCase()
  );

  setAreas(filtered);
  setLoading(false);
}, [Areas, companiaName]);

// 🔥 Recargar lista cuando:
// - se crea un área
// - se elimina un área
// - se edita un área
// - cualquier componente llama triggerRefresh()
React.useEffect(() => {
  loadAreas();
}, [loadAreas, refreshFlag]);

  /* ============================================================
     🔹 Al seleccionar un área → navegar usando NavContext
  ============================================================ */
 const goToArea = (area: any) => {
  if (!companiaId) return;

  const areaNodeId = `a-${area.Id}`;

  // 1️⃣ Expandir raíz de compañías
  expandNode("companias");

  // 2️⃣ Expandir la compañía seleccionada
  expandNode(companiaId);

  // 3️⃣ Seleccionar el área en el sidebar
  setSelected(areaNodeId);
};


  /* ============================================================
     🔹 Abrir modal para crear un área nueva
  ============================================================ */
  const abrirModalCrear = () => {
    setAreaToEdit(null);
    setModalOpen(true);
  };

  /* ============================================================
     🔹 Abrir modal para editar área existente
  ============================================================ */
  const abrirModalEditar = (area: any) => {
    setAreaToEdit(area);
    setModalOpen(true);
  };

  /* ============================================================
     🔹 Render principal: Lista de áreas
  ============================================================ */
  return (
    <div className="ver-areas-container">
      <header className="ver-areas-header">
        <div>
          <h2>Compañía: {companiaName}</h2>
          <p className="ver-areas-subtitle">
            Áreas registradas en esta compañía
          </p>
        </div>

        {/* Botón para nueva área */}
        <button className="btn-nueva-area" onClick={abrirModalCrear}>
          + Nueva Área
        </button>
      </header>

      <hr />

      {/* Loader */}
      {loading ? (
        <p>Cargando áreas...</p>
      ) : areas.length === 0 ? (
        <p className="ver-areas-empty">
          <em>Esta compañía aún no tiene áreas registradas.</em>
        </p>
      ) : (
        <ul className="ver-areas-lista">
          {areas.map((a) => (
            <li key={a.Id} className="ver-areas-item">
                <button
                    className="ver-area-item"
                    onClick={() => goToArea(a)}
                >
                    📁 {a.Title}
                </button>

                <div className="ver-area-actions">
                    <button
                    className="btn-edit"
                    onClick={() => abrirModalEditar(a)}
                    >
                    Editar ✏️
                    </button>
                </div>
            </li>      
          ))}
        </ul>
      )}

      {/* ============================================================
          Modal Crear / Editar Área
      ============================================================ */}
      <ModalNuevaArea
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        companiaName={companiaName}
        areaToEdit={areaToEdit}
        onSuccess={loadAreas} // ← refresca la lista automáticamente
      />
    </div>
  );
}
