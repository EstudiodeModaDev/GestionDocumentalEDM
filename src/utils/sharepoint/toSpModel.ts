/**
 * Convierte un ítem recibido desde Graph:
 *  { id, fields: { ... } }
 * a un objeto javascript plano.
 */
export function toSPModel<T>(item: any, mapFn: (fields: any, item: any) => T): T {
  const fields = item?.fields ?? {};
  return mapFn(fields, item);
}
