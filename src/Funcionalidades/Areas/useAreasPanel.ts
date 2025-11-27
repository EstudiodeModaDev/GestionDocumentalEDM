// ============================================================
// useAreasPanel.ts — versión corregida y funcional
// ------------------------------------------------------------
// ✔ Carga de área
// ✔ Carga de usuarios del área
// ✔ Recarga completa después de modales (responsable / usuarios)
// ✔ Permisos según rol
// ✔ Totalmente comentado
// ============================================================

import { useEffect, useState, useCallback } from "react";

import type { AreaGD } from "../../Models/Area";
import type { UsuarioGD, RolUsuario } from "../../Models/UsuarioGD";
import type { AreasService } from "../../Services/Areas.service";
import type { UsuariosGDService } from "../../Services/UsuariosGD.service";

type UseAreasPanelArgs = {
  Areas: AreasService;
  UsuariosGD: UsuariosGDService;
  areaId: string;
  areaName: string;
  companiaName: string;
  role: RolUsuario;
  loadingRole: boolean;
};

export function useAreasPanel({
  Areas,
  UsuariosGD,
  areaId,
  areaName,
  companiaName,
  role,
  loadingRole,
}: UseAreasPanelArgs) {
  // ============================================================
  // ESTADOS
  // ============================================================
  const [area, setArea] = useState<AreaGD | null>(null);
  const [usuariosArea, setUsuariosArea] = useState<UsuarioGD[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalRespOpen, setModalRespOpen] = useState(false);
  const [isModalUsuariosOpen, setModalUsuariosOpen] = useState(false);

  // ============================================================
  // PERMISOS SEGÚN ROL
  // ============================================================
  const canManageResponsable =
    role === "AdministradorGeneral" || role === "AdministradorCom";

  const canManageUsuarios =
    canManageResponsable || role === "ResponsableArea";

  // ============================================================
  // FUNCIÓN CENTRAL DE CARGA (área + usuarios)
  // ============================================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Cargar todas las áreas
      const allAreas = await Areas.getAll();

      // Buscar el área actual por ID o por nombre + compañía
      const currentArea =
        allAreas.find((a) => String(a.Id) === String(areaId)) ??
        allAreas.find(
          (a) =>
            a.Title === areaName &&
            a.NombreCompania === companiaName
        );

      setArea(currentArea ?? null);

      // 2️⃣ Cargar todos los usuarios y filtrar los de este área
      const allUsers: UsuarioGD[] = await UsuariosGD.getAll();

      const usersOfArea = allUsers.filter(
        (u) =>
          u.Rol === "UsuarioArea" &&
          (u.CompaniaID ?? "").toLowerCase() ===
            companiaName.toLowerCase() &&
          (u.AreaID ?? "").toLowerCase() ===
            areaName.toLowerCase()
      );

      setUsuariosArea(usersOfArea);
    } catch (err) {
      console.error("❌ Error cargando datos de área:", err);
      setError("No se pudo cargar la información del área.");
    } finally {
      setLoading(false);
    }
  }, [Areas, UsuariosGD, areaId, areaName, companiaName]);

  // ============================================================
  // CARGA INICIAL
  // ============================================================
  useEffect(() => {
    if (loadingRole) return;
    loadData();
  }, [loadingRole, loadData]);

  // ============================================================
  // RECARGA INVOCADA DESDE LOS MODALES
  // ============================================================
  const reloadData = () => {
    loadData(); // Recarga área + usuarios
  };

  // ============================================================
  // HANDLERS PARA ABRIR MODALES
  // ============================================================
  const handleGestionarResponsable = () => {
    if (!canManageResponsable) {
      alert("No tienes permisos.");
      return;
    }
    setModalRespOpen(true);
  };

  const handleGestionarUsuarios = () => {
    if (!canManageUsuarios) {
      alert("No tienes permisos.");
      return;
    }
    setModalUsuariosOpen(true);
  };

  // ============================================================
  // API QUE SE EXPONE AL COMPONENTE
  // ============================================================
  return {
    // Datos principales
    area,
    usuariosArea,

    // Estado
    loading,
    error,

    // Modales
    isModalRespOpen,
    isModalUsuariosOpen,
    setModalRespOpen,
    setModalUsuariosOpen,

    // Permisos
    canManageResponsable,
    canManageUsuarios,

    // Acciones
    reloadData,
    handleGestionarResponsable,
    handleGestionarUsuarios,
  };
}
