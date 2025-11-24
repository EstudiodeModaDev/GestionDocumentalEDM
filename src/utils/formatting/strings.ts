/* ============================================================
   🔹 Utilidad para escapar nombres en consultas OData
   ============================================================ */
export const esc = (s: string) => String(s).replace(/'/g, "''");


/**
 * 🧹 Normaliza un string para comparación MUY robusta:
 * - convierte a minúsculas
 * - hace trim()
 * - elimina tildes (á→a, é→e, ó→o…)
 * - compacta múltiples espacios
 */

// Normaliza completamente texto para comparación segura
export function normalizeStringStrict(s: string = "") {
  return s
    .normalize("NFD")              // separar caracteres con tildes
    .replace(/[\u0300-\u036f]/g, "")  // remover tildes
    .toLowerCase()
    .trim();
}
