import { useState, useEffect } from "react";
import type { CompaniasService } from "../../Services/Companias.service";
import type { CompaniaGD } from "../../Models/CompaniaGD";

/**
 * Hook de gestión de estado para CompaniasPanel
 * Separa la lógica del componente.
 */
export function useCompaniasPanel(Companias: CompaniasService) {
  const [companias, setCompanias] = useState<CompaniaGD[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalNueva, setModalNueva] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  const [seleccionada, setSeleccionada] = useState<CompaniaGD | null>(null);

  // ==========================
  //   Cargar compañías
  // ==========================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await Companias.getAll();
        setCompanias(data);
      } catch (err) {
        console.error("Error cargando compañías:", err);
        setError("No se pudieron cargar las compañías.");
      } finally {
        setLoading(false);
      }
    })();
  }, [Companias]);

  // ==========================
  //   Callbacks CRUD
  // ==========================
  function agregar(c: CompaniaGD) {
    setCompanias(prev => [...prev, c]);
  }

  function actualizar(c: CompaniaGD) {
    setCompanias(prev => prev.map(x => (x.Id === c.Id ? c : x)));
  }

  function eliminar(id: string) {
    setCompanias(prev => prev.filter(c => c.Id !== id));
  }

  // ==========================
  //   Acciones UI
  // ==========================
  function abrirEditar(c: CompaniaGD) {
    setSeleccionada(c);
    setModalEditar(true);
  }

  function abrirEliminar(c: CompaniaGD) {
    setSeleccionada(c);
    setModalEliminar(true);
  }

  return {
    companias,
    loading,
    error,

    seleccionada,
    setSeleccionada,

    modalNueva,
    setModalNueva,

    modalEditar,
    setModalEditar,

    modalEliminar,
    setModalEliminar,

    agregar,
    actualizar,
    eliminar,

    abrirEditar,
    abrirEliminar,
  };
}
