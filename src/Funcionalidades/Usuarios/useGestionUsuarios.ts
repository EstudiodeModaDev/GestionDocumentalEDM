// ============================================================
// src/Funcionalidades/Usuarios/useGestionUsuarios.ts
// ------------------------------------------------------------
// Hook de LÓGICA para el modal de gestión de usuarios de área.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";

import type { UsuarioGD } from "../../Models/UsuarioGD";
import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { AreaGD } from "../../Models/Area";
import type { UsuarioBasic } from "../../Models/Commons";

type UsuariosGDService = any;
type CompaniasService = any;
type AreasService = any;

type UseGestionUsuariosParams = {
  isOpen: boolean;
  areaName: string;
  companiaName: string;

  UsuariosGD: UsuariosGDService;
  Companias: CompaniasService;
  Areas: AreasService;

  onSuccess?: () => void;
  onClose: () => void;
};

export function useGestionUsuarios({
  isOpen,
  areaName,
  companiaName,
  UsuariosGD,
  Companias,
  Areas,
  onSuccess,
  onClose,
}: UseGestionUsuariosParams) {
  // ============================================================
  // ESTADOS PRINCIPALES
  // ============================================================

  const [usuariosArea, setUsuariosArea] = useState<UsuarioGD[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);

  const [companias, setCompanias] = useState<CompaniaGD[]>([]);
  const [areas, setAreas] = useState<AreaGD[]>([]);

  const [seleccionados, setSeleccionados] = useState<UsuarioBasic[]>([]);

  const [editingUsuario, setEditingUsuario] = useState<UsuarioGD | null>(null);
  const [editCompania, setEditCompania] = useState("");
  const [editArea, setEditArea] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ============================================================
  // CARGAR USUARIOS + CATÁLOGOS
  // ============================================================

  const loadData = useCallback(async () => {
    try {
      setLoadingLista(true);
      setError(null);

      const [allUsers, allComp, allAreas] = await Promise.all([
        UsuariosGD.getAll(),
        Companias.getAll(),
        Areas.getAll(),
      ]);

      const filtrados = (allUsers as UsuarioGD[]).filter(
        (u) =>
          u.Rol === "UsuarioArea" &&
          (u.CompaniaID ?? "").toLowerCase() === companiaName.toLowerCase() &&
          (u.AreaID ?? "").toLowerCase() === areaName.toLowerCase()
      );

      setUsuariosArea(filtrados);
      setCompanias(allComp as CompaniaGD[]);
      setAreas(allAreas as AreaGD[]);
    } catch (err) {
      console.error("❌ Error cargando usuarios/áreas:", err);
      setError("No se pudo cargar usuarios del área.");
    } finally {
      setLoadingLista(false);
    }
  }, [UsuariosGD, Companias, Areas, areaName, companiaName]);

  // ============================================================
  // RESET AL ABRIR EL MODAL
  // ============================================================

  useEffect(() => {
    if (!isOpen) return;

    setSeleccionados([]);
    setEditingUsuario(null);
    setEditCompania("");
    setEditArea("");
    setError(null);
    setInfo(null);

    void loadData();
  }, [isOpen, loadData]);

  // ============================================================
  // SELECCIÓN MULTI-USUARIO (chips)
  // ============================================================

  function addSeleccionado(usuario: UsuarioBasic) {
    setSeleccionados((prev) => {
      if (prev.some((u) => u.correo === usuario.correo)) return prev;
      return [...prev, usuario];
    });
  }

  function removeSeleccionado(correo: string) {
    setSeleccionados((prev) => prev.filter((u) => u.correo !== correo));
  }

  const agregarLabel = useMemo(() => {
    if (seleccionados.length === 0) return "Agregar usuarios";
    if (seleccionados.length === 1) return "Agregar usuario";
    return `Agregar ${seleccionados.length} usuarios`;
  }, [seleccionados.length]);

  // ============================================================
  // AGREGAR USUARIOS
  // ============================================================

  async function agregarUsuarios(): Promise<void> {
    if (seleccionados.length === 0) return;

    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      for (const s of seleccionados) {
        const correo = s.correo.toLowerCase();
        const existente: UsuarioGD | null = await UsuariosGD.getByCorreo(correo);

        if (existente && existente.Rol !== "UsuarioArea") {
          setError(
            `El usuario ${s.nombre} ya tiene el rol "${existente.Rol}" y no puede agregarse desde este módulo.`
          );
          continue;
        }

        await UsuariosGD.upsertByCorreo({
          Nombre: s.nombre || correo,
          Correo: correo,
          Rol: "UsuarioArea",
          CompaniaID: companiaName,
          AreaID: areaName,
        });
      }

      setSeleccionados([]);
      setInfo("Usuarios agregados correctamente.");

      await loadData();
      onSuccess?.();
    } catch (err) {
      console.error("❌ Error al agregar usuarios:", err);
      setError("Error al agregar usuarios.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // EDICIÓN DE UBICACIÓN
  // ============================================================

  const areasFiltradas = useMemo(() => {
    if (!editCompania) return [];
    return areas.filter(
      (a) => (a.NombreCompania ?? "").toLowerCase() === editCompania.toLowerCase()
    );
  }, [areas, editCompania]);

  function startEditarUsuario(u: UsuarioGD) {
    setEditingUsuario(u);
    setEditCompania(u.CompaniaID ?? "");
    setEditArea(u.AreaID ?? "");
    setError(null);
    setInfo(null);
  }

  async function guardarEdicion(): Promise<void> {
    if (!editingUsuario) return;

    if (!editCompania || !editArea) {
      setError("Debes seleccionar compañía y área.");
      return;
    }

    if (editCompania.toLowerCase() !== companiaName.toLowerCase()) {
      setError(
        "No puedes mover usuarios directamente a otra compañía. Deben quedar SinAcceso y ser asignados por el admin de la nueva compañía."
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      await UsuariosGD.upsertByCorreo({
        Nombre: editingUsuario.Title || editingUsuario.Correo,
        Correo: editingUsuario.Correo,
        Rol: editingUsuario.Rol,
        CompaniaID: editCompania,
        AreaID: editArea,
      });

      setEditingUsuario(null);
      setEditCompania("");
      setEditArea("");

      await loadData();
      onSuccess?.();
    } catch (err) {
      console.error("❌ Error guardando cambios:", err);
      setError("Error al guardar la nueva ubicación del usuario.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // ELIMINAR USUARIO (SIN window.confirm)
  // ============================================================

  async function eliminarUsuario(u: UsuarioGD): Promise<void> {
    try {
      setSaving(true);
      setError(null);
      setInfo(null);

      await UsuariosGD.deleteByCorreo(u.Correo);
      await loadData();
      onSuccess?.();
    } catch (err) {
      console.error("❌ Error eliminando usuario:", err);
      setError("Error al eliminar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // CIERRE DEL MODAL
  // ============================================================

  function handleClose() {
    if (!saving) onClose();
  }

  // ============================================================
  // API
  // ============================================================

  return {
    usuariosArea,
    loadingLista,

    companias,
    areas,
    areasFiltradas,

    editingUsuario,
    startEditarUsuario,
    editCompania,
    setEditCompania,
    editArea,
    setEditArea,
    guardarEdicion,

    seleccionados,
    addSeleccionado,
    removeSeleccionado,
    agregarUsuarios,
    agregarLabel,

    error,
    setError,
    info,
    saving,

    eliminarUsuario,

    handleClose,
  };
}
