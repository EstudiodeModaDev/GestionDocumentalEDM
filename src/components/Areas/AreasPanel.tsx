// ============================================================
// src/components/Areas/AreasPanel.tsx
// Panel de Área — versión alineada al estilo corporativo (CompaniasPanel)
// ============================================================

import * as React from "react";
import "./AreasPanel.css";
import "./ModalGestionResponsable.css";

import type { AreaGD } from "../../Models/Area";
import type { UsuarioGD, RolUsuario } from "../../Models/UsuarioGD";

import { useGraphServices } from "../../graph/GrapServicesContext";
import { useAuth } from "../../auth/authContext";
import { useUserRoleFromSP } from "../../Funcionalidades/useUserRoleFromSP";

// Modales
import ModalGestionResponsable from "./ModalGestionResponsable";
import ModalGestionUsuarios from "./ModalGestionUsuarios";




type AreasPanelProps = {
  areaId: string;
  areaName: string;
  companiaName: string;
};

export default function AreasPanel({ areaId, areaName, companiaName }: AreasPanelProps) {
  const { Areas, UsuariosGD, graph } = useGraphServices();
  const { account } = useAuth();

  const userMail = account?.username ?? "";
  const { role, loading: loadingRole, error: roleError } = useUserRoleFromSP(userMail);

  const [area, setArea] = React.useState<AreaGD | null>(null);
  const [usuariosArea, setUsuariosArea] = React.useState<UsuarioGD[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Modales
  const [isModalRespOpen, setModalRespOpen] = React.useState(false);
  const [isModalUsuariosOpen, setModalUsuariosOpen] = React.useState(false);

 // ============================================================
// 📂 DOCUMENTOS DEL ÁREA (usando GraphRest y Gestion Documental)
// ============================================================


const [documents, setDocuments] = React.useState<any[]>([]);
const [selectedDoc, setSelectedDoc] = React.useState<any | null>(null);
const [loadingDocs, setLoadingDocs] = React.useState(false);
const [docsError, setDocsError] = React.useState<string | null>(null);



React.useEffect(() => {
  const loadDocs = async () => {
    try {
      setLoadingDocs(true);
      setDocsError(null);

      // === 1) Obtener el siteId del sitio Test ===
      const siteInfo = await graph.get(
        `/sites/estudiodemoda.sharepoint.com:/sites/TransformacionDigital/IN/Test`
      );

      const siteId = siteInfo.id;

      // === 2) Obtener la biblioteca "Gestion Documental" ===
      const drives = await graph.get(`/sites/${siteId}/drives`);
      const drive = drives.value.find(
        (d: any) => d.name === "Gestion Documental"
      );

      if (!drive) {
        throw new Error("No se encontró la biblioteca 'Gestion Documental'");
      }

      const driveId = drive.id;

     // === 3) Ruta final correcta basada en tu SharePoint REAL ===
const folderPath = `${companiaName}/${areaName}`;

// === 4) Listar los archivos ===
const result = await graph.get(
  `/drives/${driveId}/root:/${folderPath}:/children?$expand=thumbnails`
);


      const items = result.value.map((f: any) => ({
  id: f.id,                                 // ID del item
  driveId: driveId,                         // ⭐ Guardamos el drive ID
  itemId: f.id,                             // ⭐ ID del archivo dentro del drive
  name: f.name,
  size: f.size ?? 0,
  mimeType: f.file?.mimeType ?? "folder",
  lastModified: f.lastModifiedDateTime,
  thumbnail: f.thumbnails?.[0]?.small?.url ?? null,
  downloadUrl: f["@microsoft.graph.downloadUrl"] ?? null, // sigue sirviendo para descargar imágenes y office
}));


      setDocuments(items);
    } catch (err: any) {
      console.error("Error cargando documentos:", err);
      setDocsError(err.message || "No se pudieron cargar los documentos del área.");
    } finally {
      setLoadingDocs(false);
    }
  };

  loadDocs();
}, [areaName, companiaName, graph]);


  // Recargar datos del área
  const reloadData = async () => {
    try {
      const allAreas = await Areas.getAll();
      const updated = allAreas.find((a) => String(a.Id) === String(areaId));
      if (updated) setArea(updated);
    } catch (err) {
      console.error("❌ Error recargando área:", err);
    }
  };

  // Carga inicial
  React.useEffect(() => {
    if (loadingRole) return;

    let cancel = false;

    (async () => {
      try {
        setLoading(true);

        const allAreas = await Areas.getAll();
        const currentArea =
          allAreas.find((a) => String(a.Id) === String(areaId)) ??
          allAreas.find(
            (a) =>
              a.Title === areaName && a.NombreCompania === companiaName
          );

        if (!cancel) setArea(currentArea ?? null);

        const allUsers = await UsuariosGD.getAll();
        const usersOfArea = allUsers.filter(
          (u) =>
            u.Rol === "UsuarioArea" &&
            u.CompaniaID === companiaName &&
            u.AreaID === areaName
        );

        if (!cancel) setUsuariosArea(usersOfArea);
      } catch (err) {
        console.error("❌ Error cargando datos de área:", err);
        if (!cancel) setError("No se pudo cargar la información del área.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [Areas, UsuariosGD, areaId, areaName, companiaName, loadingRole]);


React.useEffect(() => {
  // Cada vez que cambies de área o compañía:
  // - se limpia el documento seleccionado
  // - se limpia la vista previa
  setSelectedDoc(null);
}, [areaName, companiaName]);



  // Permisos

// ============================================================
// 📄 Al seleccionar un documento
//  - Siempre marca el documento seleccionado
//  - Si es PDF, lo descarga desde Graph y genera una URL interna
//    para que PdfViewer lo muestre sin abrir nueva pestaña
// ============================================================

  const canManageResponsable =
    role === "AdministradorGeneral" || role === "AdministradorCom";

  const canManageUsuarios =
    role === "AdministradorGeneral" ||
    role === "AdministradorCom" ||
    role === "ResponsableArea";

  // Handlers de botones
  const handleGestionarResponsable = () => {
    if (!canManageResponsable) return alert("No tienes permisos.");
    setModalRespOpen(true);
  };

  const handleGestionarUsuarios = () => {
    if (!canManageUsuarios) return alert("No tienes permisos.");
    setModalUsuariosOpen(true);
  };

  // Casos especiales
  if (loadingRole || (loading && !area)) {
    return (
      <div className="areas-container">
        <h2>Área: {areaName}</h2>
        <p>Cargando información del área...</p>
      </div>
    );
  }

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

  if (!area) {
    return (
      <div className="areas-container">
        <h2>Área seleccionada</h2>
        <p>No se encontró información para esta área.</p>
      </div>
    );
  }

  const fechaCreacionLegible = area.FechaCreacion
    ? new Date(area.FechaCreacion).toLocaleDateString()
    : "—";

  const estadoTexto = area.Activa ? "Activa" : "Inactiva";

  // ============================================================  
  // 🔥 UI CORPORATIVA COMPLETAMENTE AJUSTADA  
  // ============================================================  
  return (
    <div className="areas-container">

      {/* ============================================================
          HEADER PRINCIPAL (igual estilo a CompaniasPanel / VerAreas)
      ============================================================ */}
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

      {/* ============================================================
          RESUMEN (Card moderna tipo dashboard)
      ============================================================ */}
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
            <span className="summary-value">
              {area.AdministradorId || "—"}
            </span>
          </div>

          <div className="area-summary-item">
            <span className="summary-label">Usuarios del área:</span>
            <span className="summary-value">
              {usuariosArea.length} usuario{usuariosArea.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="area-summary-item">
            <span className="summary-label">Fecha creación:</span>
            <span className="summary-value">{fechaCreacionLegible}</span>
          </div>

          <div className="area-summary-item">
            <span className="summary-label">Estado:</span>
            <span
              className={`summary-badge ${area.Activa ? "estado-activo" : "estado-inactivo"}`}
            >
              {estadoTexto}
            </span>
          </div>

        </div>
      </section>

{/* ============================================================
    📄 DOCUMENTOS DEL ÁREA (lista + preview)
============================================================ */}
<section className="area-card">
  <h3>Documentos del área</h3>

  {loadingDocs && <p>Cargando documentos...</p>}
  {docsError && <p className="error-msg">{docsError}</p>}

  {!loadingDocs && !docsError && (
    <>
      <p className="docs-count">
        {documents.length} documento{documents.length !== 1 ? "s" : ""} encontrado{documents.length !== 1 ? "s" : ""}
      </p>

      <div className="docs-grid">
        
        {/* LISTA */}
        <ul className="docs-list">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={`doc-item ${selectedDoc?.id === doc.id ? "doc-selected" : ""}`}
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
                  {(doc.size / 1024).toFixed(1)} KB •{" "}
                  {new Date(doc.lastModified).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* PREVIEW */}
        {/* PREVIEW */}
<div className="doc-preview">
  {!selectedDoc && <p>Selecciona un documento para previsualizarlo.</p>}

  {selectedDoc && (
    <>
      <h4>{selectedDoc.name}</h4>

    
{/* ================================
    📄 PREVIEW PDF con PDF.js
   ================================= */}
{selectedDoc.mimeType.includes("pdf") && (
  <button
    className="btn-primary"
    style={{ marginBottom: "12px" }}
    onClick={() => window.open(selectedDoc.downloadUrl, "_blank")}
  >
    Abrir PDF en nueva pestaña
  </button>
)}





      {/* ================================
          🖼️ PREVIEW IMAGEN
      ================================= */}
      {selectedDoc.mimeType.includes("image") && (
        <img
          src={selectedDoc.downloadUrl}
          className="doc-preview-image"
          alt="Vista previa"
        />
      )}

      {/* ================================
          📝 PREVIEW WORD/EXCEL/PPT
          via Office Web Viewer
      ================================= */}
      {(selectedDoc.mimeType.includes("officedocument") ||
        selectedDoc.mimeType.includes("word") ||
        selectedDoc.mimeType.includes("excel") ||
        selectedDoc.mimeType.includes("presentation") ||
        selectedDoc.name.endsWith(".doc") ||
        selectedDoc.name.endsWith(".docx") ||
        selectedDoc.name.endsWith(".xlsx") ||
        selectedDoc.name.endsWith(".xls") ||
        selectedDoc.name.endsWith(".ppt") ||
        selectedDoc.name.endsWith(".pptx")) && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              selectedDoc.downloadUrl
            )}`}
            className="doc-preview-frame"
            title="Vista previa Office"
          ></iframe>
      )}

      {/* ================================
          ❌ SIN PREVIEW
      ================================= */}
      {!selectedDoc.mimeType.includes("pdf") &&
        !selectedDoc.mimeType.includes("image") &&
        !selectedDoc.mimeType.includes("officedocument") &&
        !(
          selectedDoc.name.endsWith(".doc") ||
          selectedDoc.name.endsWith(".docx") ||
          selectedDoc.name.endsWith(".xlsx") ||
          selectedDoc.name.endsWith(".xls") ||
          selectedDoc.name.endsWith(".ppt") ||
          selectedDoc.name.endsWith(".pptx")
        ) && (
          <p>No hay vista previa disponible. Puedes descargarlo.</p>
      )}
    </>
  )}
</div>

      </div>
    </>
  )}
</section>



      {/* Modales */}
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
