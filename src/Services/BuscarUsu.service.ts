// ============================================================
// Servicio: BuscarUsu.service.ts
// ------------------------------------------------------------
// Búsqueda de usuarios en Azure AD mediante Microsoft Graph.
// Devuelve solo: nombre + correo
// ============================================================

import type { GraphRest } from "../graph/GraphRest";

export interface UsuarioBasic {
  nombre: string;
  correo: string;
}

export class BuscarUsuService {
  private graph: GraphRest;

  constructor(graph: GraphRest) {
    this.graph = graph;
  }

  /* ============================================================
     🛡 Escapar texto de búsqueda
     Evita errores con comillas, backslashes, etc.
  ============================================================ */
  private escapeSearch(text: string) {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'");
  }

  /* ============================================================
     🔎 Buscar usuarios por Azure AD
     Estrategia:
       1) Intentar /users?$search=   (requiere permiso + ConsistencyLevel)
       2) Si falla → usar /me/people (más flexible pero menos completo)
  ============================================================ */
  async buscar(texto: string): Promise<UsuarioBasic[]> {
    if (!texto.trim()) return [];

    const q = this.escapeSearch(texto.trim());

    // ============================================================
    // 1️⃣ Intento principal → /users?$search=
    // ============================================================
    try {
      const res = await this.graph.get<any>(
        `/users?$search="${q}"&$select=displayName,mail`,
        {
          headers: {
            "ConsistencyLevel": "eventual"
          }
        }
      );

      const lista = res?.value ?? [];

      const mapped = lista
        .filter((u: any) => u.mail)
        .map((u: any) => ({
          nombre: u.displayName ?? "",
          correo: u.mail ?? ""
        }));

      if (mapped.length > 0) return mapped;

      // Si no se encontraron coincidencias → continuar al plan B
    } catch (err) {
      console.warn("⚠️ /users?$search falló, intentando /me/people…", err);
    }

    // ============================================================
    // 2️⃣ Fallback → /me/people
    //     (Muy buen autocompletado, ideal para buscar nombres)
    // ============================================================
    try {
      const res = await this.graph.get<any>(
        `/me/people?$search="${q}"&$select=displayName,mail`,
        {
          headers: {
            "ConsistencyLevel": "eventual"
          }
        }
      );

      const lista = res?.value ?? [];

      return lista
        .filter((u: any) => u.mail)
        .map((u: any) => ({
          nombre: u.displayName ?? "",
          correo: u.mail ?? ""
        }));

    } catch (err) {
      console.error("❌ Error en /me/people:", err);
      return [];
    }
  }
}
