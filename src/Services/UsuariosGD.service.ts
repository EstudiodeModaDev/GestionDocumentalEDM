// ================================================
// src/Services/UsuariosGD.service.ts
// Gestión de usuarios en la lista UsuariosGD
// ================================================

import { GraphRest } from "../graph/GraphRest";
import type { UsuarioGD, RolUsuario } from "../Models/UsuarioGD";

/** ▶ Modelo de entrada para crear/actualizar usuarios */
export interface UsuarioGDInput {
  Nombre: string;
  Correo: string;
  Rol: RolUsuario;
  CompaniaID?: string; // ← será el NOMBRE de la compañía
  AreaID?: string;     // ← será el NOMBRE del área
}

/**
 * Servicio para trabajar con la lista "UsuariosGD"
 * ------------------------------------------------
 * ✔ Obtener todos los usuarios
 * ✔ Obtener por correo
 * ✔ Crear/actualizar usuario (upsert)
 * ✔ Eliminar usuario por correo
 */
export class UsuariosGDService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;

  constructor(
    graph: GraphRest,
    hostname = "estudiodemoda.sharepoint.com",
    sitePath = "/sites/TransformacionDigital/IN/GD",
    listName = "UsuariosGD"
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  /* ============================================================
     🔹 Utilidad OData
  ============================================================ */
  private esc(s: string) {
    return String(s).replace(/'/g, "''");
  }

  /* ============================================================
     🔹 Cache de siteId / listId
  ============================================================ */
  private loadCache() {
    try {
      const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
      const raw = localStorage.getItem(k);
      if (raw) {
        const { siteId, listId } = JSON.parse(raw);
        if (siteId) this.siteId = siteId;
        if (listId) this.listId = listId;
      }
    } catch {}
  }

  private saveCache() {
    try {
      const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
      localStorage.setItem(
        k,
        JSON.stringify({ siteId: this.siteId, listId: this.listId })
      );
    } catch {}
  }

  /* ============================================================
     🔹 Resolver IDs de la lista
  ============================================================ */
  private async ensureIds() {
    if (!this.siteId || !this.listId) this.loadCache();

    if (!this.siteId) {
      const site = await this.graph.get<any>(
        `/sites/${this.hostname}:${this.sitePath}`
      );
      this.siteId = site?.id;
      if (!this.siteId) throw new Error("No se pudo resolver siteId");
      this.saveCache();
    }

    if (!this.listId) {
      const lists = await this.graph.get<any>(
        `/sites/${this.siteId}/lists?$filter=displayName eq '${this.esc(
          this.listName
        )}'`
      );

      const list = lists?.value?.[0];
      if (!list?.id) throw new Error(`Lista no encontrada: ${this.listName}`);

      this.listId = list.id;
      this.saveCache();
    }
  }

  /* ============================================================
     🔹 Normalizar rol recibido desde SP
  ============================================================ */
  private normalizeRol(raw: any): RolUsuario {
    const value = String(raw ?? "").trim() as RolUsuario;

    const allowed: RolUsuario[] = [
      "AdministradorGeneral",
      "AdministradorCom",
      "ResponsableArea",
      "UsuarioArea",
      "SinAcceso",
    ];

    if (!allowed.includes(value)) return "SinAcceso";
    return value;
  }

  /* ============================================================
     🔹 Convertir item del SP → UsuarioGD
  ============================================================ */
  private toModel(item: any): UsuarioGD {
    const f = item?.fields ?? {};

    return {
      ID: String(item?.ID ?? item.id ?? ""),
      Title: f.Nombre ?? f.Title ?? "",
      Correo: f.Correo ?? "",
      Rol: this.normalizeRol(f.Rol),
      CompaniaID: f.CompaniaID ? String(f.CompaniaID) : undefined,
      AreaID: f.AreaID ? String(f.AreaID) : undefined,
    };
  }

  /* ============================================================
     🔹 Obtener TODOS los usuarios
  ============================================================ */
  async getAll(): Promise<UsuarioGD[]> {
    await this.ensureIds();

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields`
    );

    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  /* ============================================================
     🔹 Obtener por correo (null si no existe)
  ============================================================ */
  async getByCorreo(correo: string): Promise<UsuarioGD | null> {
    await this.ensureIds();

    const filter = `fields/Correo eq '${this.esc(correo)}'`;

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields&$filter=${filter}`
    );

    const items = res?.value ?? [];
    if (items.length === 0) return null;

    return this.toModel(items[0]);
  }

  /* ============================================================
     🔹 UPSERT de usuario por correo
     ------------------------------------------------------------
     Si existe → lo actualiza
     Si NO existe → lo crea
  ============================================================ */
  async upsertByCorreo(input: UsuarioGDInput): Promise<UsuarioGD> {
    await this.ensureIds();

    const existing = await this.getByCorreo(input.Correo);

    const payload = {
      Title: input.Nombre,
      Nombre: input.Nombre,
      Correo: input.Correo,
      Rol: input.Rol,
      CompaniaID: input.CompaniaID ?? undefined,
      AreaID: input.AreaID ?? undefined,
    };

    if (!existing) {
      // ➕ Crear
      const created = await this.graph.post<any>(
        `/sites/${this.siteId}/lists/${this.listId}/items`,
        { fields: payload }
      );
      return this.toModel(created);
    }

    // 🔁 Actualizar
    await this.graph.patch<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${existing.ID}/fields`,
      payload
    );

    return { ...existing, ...payload };
  }

  /* ============================================================
     🔹 ELIMINAR usuario por correo
  ============================================================ */
  async deleteByCorreo(correo: string): Promise<void> {
    await this.ensureIds();

    const existing = await this.getByCorreo(correo);
    if (!existing) return;

    await this.graph.delete(
      `/sites/${this.siteId}/lists/${this.listId}/items/${existing.ID}`
    );
  }
}
