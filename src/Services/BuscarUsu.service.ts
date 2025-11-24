// ============================================================
// Servicio: BuscarUsu.service.ts
// ------------------------------------------------------------
// Búsqueda de usuarios en Azure AD mediante Microsoft Graph.
//
// NOTA IMPORTANTE:
//  ✔ NO usamos $search → requiere permisos que NO tienes
//  ✔ Usamos startswith(displayName/mail) → funciona con:
//      - User.Read
//      - User.ReadBasic.All
//
// Integración con helpers globales:
//  - esc()                      → limpiar texto OData
//  - buildStartsWithQuery()     → construir URL de búsqueda
//  - toBasicUser()              → convertir usuario Graph → UsuarioBasic
// ============================================================

import type { GraphRest } from "../graph/GraphRest";
import { buildStartsWithQuery, esc, toBasicUser, type UsuarioBasic } from "../utils/Commons";

export class BuscarUsuService {
  private graph: GraphRest;

  constructor(graph: GraphRest) {
    this.graph = graph;
  }

  /* ============================================================
     🔎 Buscar usuarios por nombre o correo
  ============================================================ */
  async buscar(texto: string): Promise<UsuarioBasic[]> {
    if (!texto.trim()) return [];

    const q = esc(texto.trim());

    try {
      // ============================================================
      // 🏗 Construir URL usando helper → limpio y reutilizable
      // ============================================================
      const url = buildStartsWithQuery(
        "/users",
        "displayName",
        "mail",
        q,
        "displayName,mail"
      );

      // ============================================================
      // 📡 Petición a Microsoft Graph
      // ============================================================
      const res = await this.graph.get<any>(url);
      const lista = res?.value ?? [];

      // ============================================================
      // 🔄 Convertir usando helper común
      // ============================================================
     return lista
      .map((u: any) => toBasicUser(u))
      .filter((u: UsuarioBasic | null): u is UsuarioBasic => u !== null);


    } catch (err) {
      console.error("❌ Error al buscar usuarios en Azure AD:", err);
      return [];
    }
  }
}
