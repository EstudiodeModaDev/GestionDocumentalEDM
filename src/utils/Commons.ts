// src/utils/Commons.ts
import type { GraphRest } from "../graph/GraphRest";

/* ============================================================
   🔹 Tipos comunes reutilizables
   ============================================================ */
export type EnsureIdsResult = { siteId: string; listId: string };
export type EnsureDriveResult = { siteId: string; driveId: string };

/* ============================================================
   🔹 Utilidad para escapar nombres en consultas OData
   ============================================================ */
export const esc = (s: string) => String(s).replace(/'/g, "''");

/* ============================================================
   🔹 Cache local (siteId / listId / driveId)
   ============================================================ */
function loadCache(
  hostname: string,
  sitePath: string,
  listOrDriveName: string
): Partial<{ siteId: string; listId?: string; driveId?: string }> {
  try {
    const key = `sp:${hostname}${sitePath}:${listOrDriveName}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveCache(
  hostname: string,
  sitePath: string,
  name: string,
  siteId?: string,
  listId?: string,
  driveId?: string
) {
  try {
    const key = `sp:${hostname}${sitePath}:${name}`;
    localStorage.setItem(key, JSON.stringify({ siteId, listId, driveId }));
  } catch {}
}

/* ============================================================
   🔹 Resolver IDs de sitio y lista
   ============================================================ */
export async function ensureIds(
  siteId: string | undefined,
  listId: string | undefined,
  graph: GraphRest,
  hostname: string,
  sitePath: string,
  listName: string
): Promise<EnsureIdsResult> {
  const sp = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;

  // 1) Cache
  if (!siteId || !listId) {
    const cached = loadCache(hostname, sp, listName);
    siteId = cached.siteId ?? siteId;
    listId = cached.listId ?? listId;
  }

  // 2) siteId
  if (!siteId) {
    const site = await graph.get<any>(`/sites/${hostname}:${sp}`);
    siteId = site?.id;
    if (!siteId) throw new Error("❌ No se pudo resolver siteId");
    saveCache(hostname, sp, listName, siteId, listId);
  }

  // 3) listId
  if (!listId) {
    const lists = await graph.get<any>(
      `/sites/${siteId}/lists?$filter=displayName eq '${esc(listName)}'`
    );
    const list = lists?.value?.[0];
    if (!list?.id) throw new Error(`❌ Lista no encontrada: ${listName}`);
    listId = list.id;
    saveCache(hostname, sp, listName, siteId, listId);
  }

  return { siteId: siteId as string, listId: listId as string };
}

/* ============================================================
   🔹 Resolver IDs de sitio y biblioteca (Drive)
   ============================================================ */
export async function ensureDriveId(
  siteId: string | undefined,
  driveId: string | undefined,
  graph: GraphRest,
  hostname: string,
  sitePath: string,
  driveName: string
): Promise<EnsureDriveResult> {
  const sp = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;

  // 1) Cache
  if (!siteId || !driveId) {
    const cached = loadCache(hostname, sp, driveName);
    siteId = cached.siteId ?? siteId;
    driveId = cached.driveId ?? driveId;
  }

  // 2) siteId
  if (!siteId) {
    const site = await graph.get<any>(`/sites/${hostname}:${sp}`);
    siteId = site?.id;
    if (!siteId) throw new Error("❌ No se pudo resolver siteId");
    saveCache(hostname, sp, driveName, siteId, undefined, driveId);
  }

  // 3) driveId (match por nombre *no* URL-encoded)
  if (!driveId) {
    const drives = await graph.get<any>(`/sites/${siteId}/drives`);

    // normalizamos ambos lados: quitamos %20 -> ' ', lower/trim
    const normalize = (x: string) =>
      x.replace(/%20/g, " ").toLowerCase().trim();

    const wanted = normalize(driveName);

    const drive = drives.value?.find(
      (d: any) => normalize(d.name ?? "") === wanted
    );

    if (!drive?.id) {
      console.error("❌ Biblioteca no encontrada entre los drives:", drives.value);
      throw new Error(`Biblioteca no encontrada: ${driveName}`);
    }

    driveId = drive.id;
    saveCache(hostname, sp, driveName, siteId, undefined, driveId);
  }

  return { siteId: siteId as string, driveId: driveId as string };
}
