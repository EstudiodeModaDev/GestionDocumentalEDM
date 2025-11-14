// src/components/Areas/AreasPanel.tsx
import * as React from "react";
import "./AreasPanel.css";

import type { AreaGD } from "../../Models/Area";
// import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { UsuarioGD, RolUsuario } from "../../Models/UsuarioGD";

import { useGraphServices } from "../../graph/GrapServicesContext";
import { useAuth } from "../../auth/authContext";
import { useUserRoleFromSP } from "../../Funcionalidades/useUserRoleFromSP";

/**
 * 🧩 AreasPanel (versión por ÁREA seleccionada)
 * ------------------------------------------------------------
 * Esta vista ya NO es un listado general de áreas.
 * Ahora representa **una sola área** seleccionada desde el menú lateral:
 *
 *   Compañía → Área
 *
 * Recibe por props:
 *   - areaId:      Id interno del área en la lista AreasGD
 *   - areaName:    Nombre del área (Title)
 *   - companiaName: Nombre de la compañía a la que pertenece
 *
 * Muestra:
 *   - Datos básicos del área
 *   - Responsable actual (correo almacenado en AreasGD.ResponsableId)
 *   - Administrador de compañía (AreasGD.AdministradorId)
 *   - Cantidad de usuarios de área (desde UsuariosGD)
 *
 * Y deja listos dos botones para:
 *   - Gestionar Responsable del área
 *   - Gestionar Usuarios del área
 *
 * Más adelante, en esta misma pantalla se montará:
 *   - Listado de documentos del área
 *   - Carga/edición/eliminación de documentos
 *   - Flujos de aprobación, trazabilidad, búsquedas full-text, etc.
 */

type AreasPanelProps = {
  areaId: string;
  areaName: string;
  companiaName: string;
};

export default function AreasPanel({ areaId, areaName, companiaName }: AreasPanelProps) {
  const { Areas, UsuariosGD } = useGraphServices();
  const { account } = useAuth();

  // 📧 Correo del usuario autenticado (para saber su rol)
  const userMail = account?.username ?? "";

  // 🔐 Rol del usuario (AdministradorGeneral, AdminCom, ResponsableArea, UsuarioArea, SinAcceso)
  const {
    role,
    loading: loadingRole,
    error: roleError,
  } = useUserRoleFromSP(userMail);

  // 📂 Área actual (detalle desde AreasGD)
  const [area, setArea] = React.useState<AreaGD | null>(null);

  // 👥 Usuarios registrados como "UsuarioArea" para esta compañía + área
  const [usuariosArea, setUsuariosArea] = React.useState<UsuarioGD[]>([]);

  // Estados generales de carga / error
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* ============================================================
     🔹 Cargar datos del área + usuarios del área
     ------------------------------------------------------------
     - Busca el área en AreasGD por Id (y como backup, por nombre)
     - Carga todos los usuarios desde UsuariosGD y filtra:
          Rol === "UsuarioArea"
          CompaniaID === companiaName
          AreaID === areaName
  ============================================================ */
  React.useEffect(() => {
    if (loadingRole) return; // Esperamos a conocer el rol del usuario

    let cancel = false;

    (async () => {
      try {
        setLoading(true);

        // 1️⃣ Cargar todas las áreas y localizar la actual
        const allAreas = await Areas.getAll();
        let currentArea =
          allAreas.find((a) => String(a.Id) === String(areaId)) ??
          allAreas.find(
            (a) =>
              a.Title === areaName &&
              a.NombreCompania === companiaName
          );

        if (!cancel) {
          setArea(currentArea ?? null);
        }

        // 2️⃣ Cargar todos los usuarios y filtrar los de esta área
        const allUsers = await UsuariosGD.getAll();
        const usersOfArea = allUsers.filter(
          (u) =>
            u.Rol === "UsuarioArea" &&
            u.CompaniaID === companiaName &&
            u.AreaID === areaName
        );

        if (!cancel) {
          setUsuariosArea(usersOfArea);
        }
      } catch (err) {
        console.error("❌ Error al cargar datos del área:", err);
        if (!cancel) setError("No se pudo cargar la información del área.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [Areas, UsuariosGD, areaId, areaName, companiaName, loadingRole]);

  /* ============================================================
     🔹 Lógica de permisos para acciones
     ------------------------------------------------------------
     - canManageResponsable:
         • AdminGeneral
         • AdministradorCom
     - canManageUsuarios:
         • AdminGeneral
         • AdministradorCom
         • ResponsableArea
  ============================================================ */
  const canManageResponsable: boolean =
    role === "AdministradorGeneral" || role === "AdministradorCom";

  const canManageUsuarios: boolean =
    role === "AdministradorGeneral" ||
    role === "AdministradorCom" ||
    role === "ResponsableArea";

  /* ============================================================
     🔹 Handlers de botones (por ahora solo placeholders)
     ------------------------------------------------------------
     Más adelante aquí:
       - Abriremos modales para buscar usuarios en M365
       - Actualizaremos AreasGD.ResponsableId
       - Crearemos / eliminaremos usuarios en UsuariosGD
  ============================================================ */

  const handleGestionarResponsable = () => {
    if (!canManageResponsable) {
      alert("No tienes permisos para gestionar el responsable del área.");
      return;
    }

    // TODO: reemplazar por apertura de modal "Gestionar Responsable"
    alert(
      "Aquí se abrirá el modal para gestionar el Responsable del área (WIP)."
    );
  };

  const handleGestionarUsuarios = () => {
    if (!canManageUsuarios) {
      alert("No tienes permisos para gestionar los usuarios del área.");
      return;
    }

    // TODO: reemplazar por apertura de modal "Gestionar Usuarios del Área"
    alert(
      "Aquí se abrirá el modal para gestionar los Usuarios de esta área (WIP)."
    );
  };

  /* ============================================================
     🔹 Casos de carga / sin acceso / sin datos
  ============================================================ */

  if (loadingRole || (loading && !area)) {
    return (
      <div className="areas-container">
        <h2>Área: {areaName}</h2>
        <p>Cargando información del área...</p>
      </div>
    );
  }

  // Si el usuario no tiene ningún rol que haga sentido (SinAcceso)
  if (!loadingRole) {
    const rolesPermitidos: RolUsuario[] = [
      "AdministradorGeneral",
      "AdministradorCom",
      "ResponsableArea",
      "UsuarioArea",
    ];

    if (!rolesPermitidos.includes(role)) {
      return (
        <div className="areas-container">
          <h2>Área: {areaName}</h2>
          <p>No tienes permisos para acceder a esta área.</p>
        </div>
      );
    }
  }

  // Si no se encontró el área en la lista
  if (!area) {
    return (
      <div className="areas-container">
        <h2>Área seleccionada</h2>
        <p>
          No se encontró información para el área{" "}
          <strong>{areaName}</strong> en la compañía{" "}
          <strong>{companiaName}</strong>.
        </p>
      </div>
    );
  }

  /* ============================================================
     🔹 Render principal (vista por área)
  ============================================================ */

  const fechaCreacionLegible = area.FechaCreacion
    ? new Date(area.FechaCreacion).toLocaleDateString()
    : "—";

  const estadoTexto = area.Activa ? "Activa" : "Inactiva";

  return (
    <div className="areas-container">
      {/* Encabezado principal del área */}
      <header className="area-header">
        <div>
          <h2>Área: {areaName}</h2>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>
            Compañía: <strong>{companiaName}</strong>
          </p>

          {roleError && (
            <p style={{ color: "red", fontSize: "0.85rem" }}>{roleError}</p>
          )}
          {error && (
            <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>
          )}
        </div>

        {/* Botones de acción sobre esta área */}
        <div className="area-actions">
          <button
            className="btn-gestion-responsable"
            onClick={handleGestionarResponsable}
            disabled={!canManageResponsable}
            title={
              canManageResponsable
                ? "Gestionar responsable del área"
                : "No tienes permisos para gestionar el responsable"
            }
          >
            Gestionar Responsable
          </button>

          <button
            className="btn-gestion-usuarios"
            onClick={handleGestionarUsuarios}
            disabled={!canManageUsuarios}
            title={
              canManageUsuarios
                ? "Gestionar usuarios del área"
                : "No tienes permisos para gestionar usuarios del área"
            }
          >
            Gestionar Usuarios
          </button>
        </div>
      </header>

      {/* Resumen de la configuración del área */}
      <section className="area-summary">
        <h3>Resumen del área</h3>

        <div className="area-summary-grid">
          <div>
            <span className="summary-label">Responsable actual:</span>
            <span className="summary-value">
              {area.ResponsableId || "— (sin responsable asignado)"}
            </span>
          </div>

          <div>
            <span className="summary-label">Administrador de compañía:</span>
            <span className="summary-value">
              {area.AdministradorId || "—"}
            </span>
          </div>

          <div>
            <span className="summary-label">Usuarios del área:</span>
            <span className="summary-value">
              {usuariosArea.length} usuario
              {usuariosArea.length === 1 ? "" : "s"}
            </span>
          </div>

          <div>
            <span className="summary-label">Fecha de creación:</span>
            <span className="summary-value">{fechaCreacionLegible}</span>
          </div>

          <div>
            <span className="summary-label">Estado:</span>
            <span
              className={`summary-badge ${
                area.Activa ? "estado-activo" : "estado-inactivo"
              }`}
            >
              {estadoTexto}
            </span>
          </div>
        </div>
      </section>

      {/* Placeholder para documentos del área (futuro) */}
      <section className="area-docs-placeholder">
        <h3>Documentos del área</h3>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Aquí, más adelante, se listarán los documentos de esta área
          (subcarpetas, versiones, flujos de aprobación, búsquedas, etc.).
        </p>
      </section>
    </div>
  );
}
