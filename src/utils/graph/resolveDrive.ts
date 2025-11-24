// ============================================================
// src/utils/graph/resolveDrive.ts
// ------------------------------------------------------------
// Resolver el ID de una biblioteca (Drive) de SharePoint usando
// Microsoft Graph, con normalización avanzada para evitar errores
// por mayúsculas/minúsculas, tildes o espacios inconsistentes.
// ============================================================

import type { GraphRest } from "../../graph/GraphRest";
import { normalizeStringStrict } from "../Commons";

/**
 * 🔍 Resolver Drive por nombre (ejemplo: "Gestión Documental")
 * ------------------------------------------------------------
 * Este método:
 * - obtiene todas las bibliotecas del sitio
 * - compara nombres con normalización estricta
 * - imprime log de debug para ayudarte a identificar discrepancias
 *
 * @param graph     Cliente GraphRest
 * @param siteId    ID del sitio de SharePoint
 * @param driveName Nombre visible de la biblioteca (lo que ve el usuario)
 * @returns string  ID del drive encontrado
 */
export async function resolveDriveByName(
  graph: GraphRest,
  siteId: string,
  driveName: string
): Promise<string> {

  if (!siteId) {
    throw new Error("❌ resolveDriveByName(): siteId no definido.");
  }

  // 1️⃣ Obtener todos los drives del sitio
  const drives = await graph.get<any>(`/sites/${siteId}/drives`);

  if (!Array.isArray(drives.value)) {
    console.error("❌ Respuesta inesperada desde /drives:", drives);
    throw new Error("❌ No se pudieron obtener las bibliotecas del sitio.");
  }

//   console.log("📁 [resolveDrive] Drives encontrados:", drives.value);      ver drives que se traen desde el sitio

  // 2️⃣ Normalizar el nombre que buscamos
  const wanted = normalizeStringStrict(driveName);

  // 3️⃣ Buscar coincidencia robusta
  const found = drives.value.find((d: any) => {
    const normalizedDrive = normalizeStringStrict(d.name);
    return normalizedDrive === wanted;
  });

  // 4️⃣ Si no se encuentra → error detallado
  if (!found?.id) {
    console.error("❌ Lista completa de drives recibidos:");
    drives.value.forEach((d: any) => {
      console.error("   •", d.name, "→ normalizado:", normalizeStringStrict(d.name));
    });

    throw new Error(
      `❌ No se encontró la biblioteca '${driveName}' (normalizado: '${wanted}').`
    );
  }

  // 5️⃣ Devuelve ID del drive
  return found.id;
}
