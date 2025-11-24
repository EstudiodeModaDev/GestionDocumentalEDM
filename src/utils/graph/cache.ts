/* ============================================================
   🔹 Cache local (siteId / listId / driveId)
   ============================================================ */
export function loadCache(
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

export function saveCache(
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
