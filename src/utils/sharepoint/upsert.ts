import type { GraphRest } from "../../graph/GraphRest";

/**
 * Helper genérico para upsert en listas de SharePoint.
 * Funciona para Usuarios, Áreas, Compañías, etc.
 */
export async function upsertInList(
  graph: GraphRest,
  siteId: string,
  listId: string,
  filter: string,
  fields: any
): Promise<any> {

  // Buscar item existente
  const res = await graph.get<any>(
    `/sites/${siteId}/lists/${listId}/items?$expand=fields&$filter=${filter}`
  );

  const existing = res?.value?.[0];

  if (!existing) {
    // Crear
    return await graph.post<any>(
      `/sites/${siteId}/lists/${listId}/items`,
      { fields }
    );
  }

  // Actualizar
  await graph.patch<any>(
    `/sites/${siteId}/lists/${listId}/items/${existing.id}/fields`,
    fields
  );

  return { ...existing, fields };
}
