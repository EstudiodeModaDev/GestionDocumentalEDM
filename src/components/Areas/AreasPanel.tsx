// ============================================================
// src/components/Areas/AreasPanel.tsx
// Panel de Área — alineado al estilo corporativo (CompaniasPanel)
// ============================================================

import "./AreasPanel.css";
import "./ModalGestionResponsable.css";

import type { RolUsuario } from "../../Models/UsuarioGD";

import { useGraphServices } from "../../graph/GrapServicesContext";
import { useAuth } from "../../auth/authContext";

import { useUserRoleFromSP } from "../../Funcionalidades/Usuarios/useUserRoleFromSP";
// Modales
import ModalGestionResponsable from "./ModalGestionResponsable";
import ModalGestionUsuarios from "./ModalGestionUsuarios";

// Hooks de lógica
import { useAreasPanel } from "../../Funcionalidades/Areas/useAreasPanel";
import { useAreaDocuments } from "../../Funcionalidades/Areas/useAreaDocuments";

// Helpers de formato
import { formatDate } from "../../utils/formatting/dates";
import {
  formatFileSize,
  isPdf,
  isImage,
  isOfficeDocument,
} from "../../utils/formatting/files";

type AreasPanelProps = {
  areaId: string;
  areaName: string;
  companiaName: string;
};

export default function AreasPanel({
  areaId,
  areaName,
  companiaName,
}: AreasPanelProps) {
  // ============================================================
  // 📡 Servicios globales (Graph + SP)
  // ============================================================
  const { Areas, UsuariosGD, graph } = useGraphServices();
  const { account } = useAuth();

  const userMail = account?.username ?? "";

  // Rol del usuario desde la lista UsuariosGD
  const {
    role,
    loading: loadingRole,
    error: roleError,
  } = useUserRoleFromSP(userMail);

  // ============================================================
  // 🧠 Hook principal de lógica del panel de Área
  // ============================================================
  const {
    area,
    usuariosArea,
    loading,
    error,

    isModalRespOpen,
    isModalUsuariosOpen,
    setModalRespOpen,
    setModalUsuariosOpen,

    canManageResponsable,
    canManageUsuarios,

    reloadData,
    handleGestionarResponsable,
    handleGestionarUsuarios,
  } = useAreasPanel({
    Areas,
    UsuariosGD,
    areaId,
    areaName,
    companiaName,
    role,
    loadingRole,
  });

  // ============================================================
  // 📂 Hook de documentos del área (Drive "Gestión Documental")
  // ============================================================
  const {
    documents,
    selectedDoc,
    setSelectedDoc,
    loadingDocs,
    docsError,
  } = useAreaDocuments(graph, companiaName, areaName);

  // ============================================================
  // ⏳ Casos de carga y permisos
  // ============================================================
  if (loadingRole || (loading && !area)) {
    return (
      <div className="areas-container">
        <h2>Área: {areaName}</h2>
        <p>Cargando información del área...</p>
      </div>
    );
  }

  // Validar que el rol tenga acceso a la vista de área
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

  // Si por alguna razón no se encontró el área
  if (!area) {
    return (
      <div className="areas-container">
        <h2>Área seleccionada</h2>
        <p>No se encontró información para esta área.</p>
      </div>
    );
  }

  const fechaCreacionLegible = formatDate(area.FechaCreacion);
  const estadoTexto = area.Activa ? "Activa" : "Inactiva";

  // ============================================================
  // 🔥 UI PRINCIPAL DEL PANEL DE ÁREA
  // ============================================================
  return (
    <div className="areas-container">
      {/* ========================================================
          HEADER PRINCIPAL
      ======================================================== */}
      <header className="areas-header">
        <div>
          <h2>Área: {areaName}</h2>
          <p className="areas-subtitle">
            Compañía: <strong>{companiaName}</strong>
          </p>

          {roleError && <p className="error-msg">{roleError}</p>}
          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="areas-actions">
          <button
            className="btn-primary"
            onClick={handleGestionarResponsable}
            disabled={!canManageResponsable}
          >
            Gestionar Responsable
          </button>

          <button
            className="btn-secondary"
            onClick={handleGestionarUsuarios}
            disabled={!canManageUsuarios}
          >
            Gestionar Usuarios
          </button>
        </div>
      </header>

      {/* ========================================================
          RESUMEN DEL ÁREA (card tipo dashboard)
      ======================================================== */}
      <section className="area-card">
        <h3>Resumen del área</h3>

        <div className="area-summary-grid">
          <div className="area-summary-item">
            <span className="summary-label">Responsable:</span>
            <span className="summary-value">
              {area.ResponsableId || "— No asignado"}
            </span>
          </div>

          <div className="area-summary-item">
            <span className="summary-label">Administrador de compañía:</span>
            <span className="summary-value">{area.AdministradorId || "—"}</span>
          </div>

          <div className="area-summary-item">
            <span className="summary-label">Usuarios del área:</span>
            <span className="summary-value">
              {usuariosArea.length} usuario
              {usuariosArea.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="area-summary-item">
            <span className="summary-label">Fecha creación:</span>
            <span className="summary-value">{fechaCreacionLegible}</span>
          </div>

          <div className="area-summary-item">
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

      {/* ========================================================
          DOCUMENTOS DEL ÁREA (lista + vista previa)
      ======================================================== */}
      <section className="area-card">
        <h3>Documentos del área</h3>

        {loadingDocs && <p>Cargando documentos...</p>}
        {docsError && <p className="error-msg">{docsError}</p>}

        {!loadingDocs && !docsError && (
          <>
            <p className="docs-count">
              {documents.length} documento
              {documents.length !== 1 ? "s" : ""} encontrado
              {documents.length !== 1 ? "s" : ""}.
            </p>

            <div className="docs-grid">
              {/* LISTA DE DOCUMENTOS */}
              <ul className="docs-list">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className={`doc-item ${
                      selectedDoc?.id === doc.id ? "doc-selected" : ""
                    }`}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    {doc.thumbnail ? (
                      <img src={doc.thumbnail} className="doc-thumb" alt="" />
                    ) : (
                      <div className="doc-thumb-placeholder">📄</div>
                    )}

                    <div className="doc-info">
                      <strong>{doc.name}</strong>
                      <span className="doc-meta">
                        {formatFileSize(doc.size)} •{" "}
                        {formatDate(doc.lastModified)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* PREVIEW DEL DOCUMENTO SELECCIONADO */}
              <div className="doc-preview">
                {!selectedDoc && (
                  <p>Selecciona un documento para previsualizarlo.</p>
                )}

                {selectedDoc && (
                  <>
                    <h4>{selectedDoc.name}</h4>

                    {/* 📄 PDF → se abre en nueva pestaña */}
                    {isPdf(selectedDoc) && selectedDoc.downloadUrl && (
                      <button
                        className="btn-primary"
                        style={{ marginBottom: "12px" }}
                        onClick={() =>
                          window.open(selectedDoc.downloadUrl!, "_blank")
                        }
                      >
                        Abrir PDF en nueva pestaña
                      </button>
                    )}

                    {/* 🖼 Imagen */}
                    {isImage(selectedDoc) && selectedDoc.downloadUrl && (
                      <img
                        src={selectedDoc.downloadUrl}
                        className="doc-preview-image"
                        alt="Vista previa"
                      />
                    )}

                    {/* 📝 Office (Word/Excel/PPT) vía Office Web Viewer */}
                    {isOfficeDocument(selectedDoc) &&
                      selectedDoc.downloadUrl && (
                        <iframe
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                            selectedDoc.downloadUrl
                          )}`}
                          className="doc-preview-frame"
                          title="Vista previa Office"
                        ></iframe>
                      )}

                    {/* ❌ Sin vista previa disponible */}
                    {!isPdf(selectedDoc) &&
                      !isImage(selectedDoc) &&
                      !isOfficeDocument(selectedDoc) && (
                        <p>No hay vista previa disponible. Puedes descargarlo.</p>
                      )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ========================================================
          MODALES
      ======================================================== */}

      {/* Gestión de Responsable */}
      <ModalGestionResponsable
        isOpen={isModalRespOpen}
        onClose={() => setModalRespOpen(false)}
        areaId={String(area.Id)}
        areaName={area.Title}
        companiaName={companiaName}
        responsableActual={area.ResponsableId ?? ""}
        onSuccess={() => {
          setModalRespOpen(false);
          reloadData();
        }}
      />

      {/* Gestión de Usuarios del área */}
      <ModalGestionUsuarios
        isOpen={isModalUsuariosOpen}
        onClose={() => setModalUsuariosOpen(false)}
        areaName={area.Title}
        companiaName={companiaName}
        onSuccess={() => {
          setModalUsuariosOpen(false);
          reloadData();
        }}
      />
    </div>
  );
}
