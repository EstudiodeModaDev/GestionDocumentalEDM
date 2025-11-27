import { useEffect, useState } from "react";
import type { GraphRest } from "../../graph/GraphRest";
import { resolveDriveByName } from "../../utils/Commons";

/** Modelo interno para documentos del área */
export interface AreaDocument {
  id: string;
  driveId: string;
  itemId: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: string;
  thumbnail: string | null;
  downloadUrl: string | null;
}

/**
 * Hook responsable de:
 * - Resolver la biblioteca "Gestión Documental"
 * - Cargar documentos de la carpeta Compañía/Área
 * - Gestionar estados de carga, error y selección
 */
export function useAreaDocuments(
  graph: GraphRest,
  companiaName: string,
  areaName: string
) {
  const [documents, setDocuments] = useState<AreaDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<AreaDocument | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    const loadDocs = async () => {
      try {
        setLoadingDocs(true);
        setDocsError(null);

        // 1️⃣ Resolver sitio de TEST (mismo que venías usando)
        const siteInfo = await graph.get<any>(
          `/sites/estudiodemoda.sharepoint.com:/sites/TransformacionDigital/IN/Test`
        );

        const siteId = siteInfo?.id;
        if (!siteId) throw new Error("No se pudo resolver el siteId de Test.");

        // 2️⃣ Resolver biblioteca "Gestión Documental" usando helper global
        const driveId = await resolveDriveByName(
          graph,
          siteId,
          "Gestión Documental"
        );

        // 3️⃣ Carpeta base: Compañía/Área
        const folderPath = `${companiaName}/${areaName}`;

        // 4️⃣ Listar archivos dentro de esa carpeta
        const result = await graph.get<any>(
          `/drives/${driveId}/root:/${folderPath}:/children?$expand=thumbnails`
        );

        if (cancel) return;

        const items: AreaDocument[] = (result.value ?? []).map((f: any) => ({
          id: f.id,
          driveId,
          itemId: f.id,
          name: f.name,
          size: f.size ?? 0,
          mimeType: f.file?.mimeType ?? "folder",
          lastModified: f.lastModifiedDateTime,
          thumbnail: f.thumbnails?.[0]?.small?.url ?? null,
          downloadUrl: f["@microsoft.graph.downloadUrl"] ?? null,
        }));

        setDocuments(items);
      } catch (err: any) {
        console.error("Error cargando documentos del área:", err);
        if (!cancel) {
          setDocsError(
            err?.message || "No se pudieron cargar los documentos del área."
          );
        }
      } finally {
        if (!cancel) setLoadingDocs(false);
      }
    };

    loadDocs();

    return () => {
      cancel = true;
    };
  }, [graph, companiaName, areaName]);

  // Cada vez que cambia área o compañía, limpiamos la selección
  useEffect(() => {
    setSelectedDoc(null);
  }, [areaName, companiaName]);

  return {
    documents,
    selectedDoc,
    setSelectedDoc,
    loadingDocs,
    docsError,
  };
}
