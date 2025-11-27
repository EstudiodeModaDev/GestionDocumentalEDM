// ============================================================
// utils/sharepoint/companias.ts — helpers relacionados con compañías
// ============================================================

export async function obtenerAdminDeCompania(Companias: any, companiaName: string): Promise<string> {
  const comps = await Companias.getAll();

  const comp = comps.find(
    (c: any) =>
      c.Title.trim().toLowerCase() === companiaName.trim().toLowerCase()
  );

  return comp?.AdministradorCom ?? "";
}
