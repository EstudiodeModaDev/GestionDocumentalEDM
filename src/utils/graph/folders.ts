// src/utils/graph/folders.ts
import type { GraphRest } from "../../graph/GraphRest";
import { normalizeStringStrict } from "../formatting/strings";

/* ============================================================
   📁 Asegurar carpeta en el root del Drive
   ============================================================ */
export async function ensureFolderInDrive(
  graph: GraphRest,
  driveId: string,
  folderName: string
): Promise<string> {
  if (!driveId) {
    throw new Error("❌ driveId no definido antes de llamar ensureFolderInDrive().");
  }

  // 1. Obtener carpetas del root del drive
  const children = await graph.get<any>(
    `/drives/${driveId}/root/children?$filter=folder ne null`
  );

  const wanted = normalizeStringStrict(folderName);

  const existing = children.value?.find(
    (c: any) => normalizeStringStrict(c.name) === wanted
  );

  // 2. Si existe, retornar su ID
  if (existing) return existing.id;

  // 3. Crear carpeta si no existe
  const created = await graph.post<any>(
    `/drives/${driveId}/root/children`,
    {
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }
  );

  return created.id;
}

/* ============================================================
   📂 Crear carpeta dentro de otra carpeta
   ============================================================ */
/**
 * Crea una nueva carpeta dentro de un parent (otra carpeta).
 * No valida existencia previa → se usa cuando estamos seguros
 * de que la carpeta NO existe, o cuando queremos manejar collisions.
 */
export async function createFolder(
  graph: GraphRest,
  driveId: string,
  parentId: string,
  folderName: string
): Promise<string> {
  if (!driveId || !parentId) {
    throw new Error("❌ driveId y parentId son obligatorios en createFolder().");
  }

  const created = await graph.post<any>(
    `/drives/${driveId}/items/${parentId}/children`,
    {
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }
  );

  return created.id;
}

/* ============================================================
   🔍 Buscar carpeta dentro de otra carpeta
   ============================================================ */
/**
 * Busca una carpeta específica dentro de otra carpeta.
 * Si la encuentra → devuelve el item completo.
 * Si no → retorna null.
 */
export async function findFolder(
  graph: GraphRest,
  driveId: string,
  parentId: string,
  folderName: string
): Promise<any | null> {
  if (!driveId || !parentId) {
    throw new Error("❌ driveId y parentId son obligatorios en findFolder().");
  }

  // 1. Obtener hijos del parent
  const children = await graph.get<any>(
    `/drives/${driveId}/items/${parentId}/children?$filter=folder ne null`
  );

  const wanted = normalizeStringStrict(folderName);

  // 2. Encontrar la carpeta buscada
  const found = children.value?.find(
    (c: any) =>
      c.folder &&
      normalizeStringStrict(c.name) === wanted
  );

  return found ?? null;
}
