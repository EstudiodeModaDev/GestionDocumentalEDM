// ============================================================
// Funcionalidades/Areas/useNuevaArea.ts
// Lógica separada para ModalNuevaArea
// ============================================================

import { useEffect, useRef, useState } from "react";
import type { UsuarioBasic } from "../../Models/Commons";
import { obtenerAdminDeCompania, validarResponsable } from "../../utils/Commons";

export function useNuevaArea({
  isOpen,
  companiaName,
  areaToEdit,
  onSuccess,
  onClose,
  Areas,
  UsuariosGD,
  Companias,
  BuscarUsu,
  highlightNode,
  triggerRefresh,
}: any) {

  // ------------------------------------------------------------
  // Estados
  // ------------------------------------------------------------
  const [nombre, setNombre] = useState("");
  const [adminCorreo, setAdminCorreo] = useState("");

  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<UsuarioBasic[]>([]);
  const [seleccionado, setSeleccionado] = useState<UsuarioBasic | null>(null);

  const [loadingBuscador, setLoadingBuscador] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------
  // Cerrar dropdown al click fuera
  // ------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setResultados([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------------------------------------------------
  // Cargar admin compañía
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const correo = await obtenerAdminDeCompania(Companias, companiaName);
      setAdminCorreo(correo);
    })();
  }, [isOpen, companiaName, Companias]);

  // ------------------------------------------------------------
  // Cargar datos si es edición
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    if (areaToEdit) {
      setNombre(areaToEdit.Title);

      if (areaToEdit.ResponsableId) {
        setSeleccionado({
          nombre: areaToEdit.ResponsableId,
          correo: areaToEdit.ResponsableId,
        });
      }
    } else {
      setNombre("");
      setSeleccionado(null);
    }

    setTexto("");
    setResultados([]);
    setError(null);
  }, [isOpen, areaToEdit]);

  // ------------------------------------------------------------
  // Autocomplete
  // ------------------------------------------------------------
  useEffect(() => {
    if (!texto.trim()) {
      setResultados([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoadingBuscador(true);
        const lista = await BuscarUsu.buscar(BuscarUsu, texto);
        setResultados(lista);
      } catch (err) {
        console.error("Error buscando usuarios:", err);
      } finally {
        setLoadingBuscador(false);
      }
    }, 350);

    return () => clearTimeout(delay);
  }, [texto, BuscarUsu]);

  // ------------------------------------------------------------
  // Crear área
  // ------------------------------------------------------------
  async function crearArea() {
    if (!nombre.trim()) {
      setError("Debes ingresar un nombre.");
      return;
    }

    try {
      setLoading(true);

      const correo = seleccionado?.correo.trim().toLowerCase() || "";
      const existente = correo ? await UsuariosGD.getByCorreo(correo) : null;

      const motivo = existente ? validarResponsable(existente, companiaName, nombre) : null;
      if (motivo) {
        setError(motivo);
        return;
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
          Nombre: seleccionado?.nombre || correo,
          Correo: correo,
          Rol: "ResponsableArea",
          CompaniaID: companiaName,
          AreaID: nueva.Title,
        });
      }

      highlightNode(`a-${nueva.Id}`);
      triggerRefresh();

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creando área:", err);
      setError("Error al crear el área.");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Actualizar área
  // ------------------------------------------------------------
  async function actualizarArea() {
    try {
      setLoading(true);

      const correo = seleccionado?.correo.trim().toLowerCase() || "";

      await Areas.update(areaToEdit.Id, {
        Title: nombre.trim(),
        ResponsableId: correo,
      });

      if (correo) {
        await UsuariosGD.upsertByCorreo({
          Nombre: seleccionado?.nombre || correo,
          Correo: correo,
          Rol: "ResponsableArea",
          CompaniaID: companiaName,
          AreaID: nombre.trim(),
        });
      }

      highlightNode(`a-${areaToEdit.Id}`);
      triggerRefresh();

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error:", err);
      setError("Error al actualizar el área.");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Eliminar área
  // ------------------------------------------------------------
  async function eliminarArea() {
    if (!window.confirm("¿Seguro que deseas eliminar esta área?")) return;

    try {
      setLoading(true);

      await Areas.deleteFolder(areaToEdit);
      await Areas.delete(areaToEdit.Id);

      triggerRefresh();
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error eliminando:", err);
      setError("Error al eliminar el área.");
    } finally {
      setLoading(false);
    }
  }

  return {
    nombre, setNombre,
    texto, setTexto,
    resultados,
    seleccionado, setSeleccionado,
    loadingBuscador,
    error,
    loading,
    dropdownRef,
    crearArea,
    actualizarArea,
    eliminarArea,
  };
}
