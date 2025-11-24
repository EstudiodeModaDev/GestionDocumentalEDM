// ============================================================
// src/Services/UsuariosGD.service.ts
// Gestión de usuarios en la lista UsuariosGD — versión REFACTORIZADA
// ------------------------------------------------------------
// Incluye:
//   ✔ ensureIds global
//   ✔ esc global
//   ✔ normalizeRolStrict
//   ✔ toSPModel
//   ✔ upsertInList
//   ✔ Código más limpio, robusto y mantenible
// ============================================================

import type { GraphRest } from "../graph/GraphRest";
import type { UsuarioGD, RolUsuario } from "../Models/UsuarioGD";
import { ensureIds, esc, normalizeRolStrict, toSPModel, upsertInList } from "../utils/Commons";

// ------------------------------------------------------------
// Modelo utilizado al crear/actualizar un usuario
// ------------------------------------------------------------
export interface UsuarioGDInput {
  Nombre: string;
  Correo: string;
  Rol: RolUsuario;
  CompaniaID?: string; // ← nombre de la compañía
  AreaID?: string;     // ← nombre del área
}

// ------------------------------------------------------------
// SERVICIO PRINCIPAL
// ------------------------------------------------------------
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

  // ============================================================
  // 🔹 Resolver SiteId y ListId usando helper global (Commons)
  // ============================================================
  private async ensureBase() {
    const ids = await ensureIds(
      this.siteId,
      this.listId,
      this.graph,
      this.hostname,
      this.sitePath,
      this.listName
    );

    this.siteId = ids.siteId;
    this.listId = ids.listId;
  }

  // ============================================================
  // 🔹 Convertir item recibido de SharePoint → UsuarioGD
  //    Usamos helper toSPModel para estandarizar esta parte
  // ============================================================
  private toModel(item: any): UsuarioGD {
    return toSPModel<UsuarioGD>(item, (f) => ({
      ID: String(item?.ID ?? item.id ?? ""),
      Title: f.Title ?? "",
      Correo: f.Correo ?? "",
      Rol: normalizeRolStrict(f.Rol),           // <-- nuevo helper global
      CompaniaID: f.CompaniaID || undefined,
      AreaID: f.AreaID || undefined
    }));
  }

  // ============================================================
  // 🔹 Obtener TODOS los usuarios
  // ============================================================
  async getAll(): Promise<UsuarioGD[]> {
    await this.ensureBase();

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields`
    );

    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  // ============================================================
  // 🔹 Obtener usuario por correo
  // ============================================================
  async getByCorreo(correo: string): Promise<UsuarioGD | null> {
    await this.ensureBase();

    const filter = `fields/Correo eq '${esc(correo)}'`;

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields&$filter=${filter}`
    );

    const items = res?.value ?? [];
    if (items.length === 0) return null;

    return this.toModel(items[0]);
  }

  // ============================================================
  // 🔹 UPSERT por correo  
  //    ✔ si existe → UPDATE  
  //    ✔ si no existe → CREATE  
  //    Implementado usando helper genérico upsertInList()
  // ============================================================
  async upsertByCorreo(input: UsuarioGDInput): Promise<UsuarioGD> {
    await this.ensureBase();

    const filter = `fields/Correo eq '${esc(input.Correo)}'`;

    const fields = {
      Title: input.Nombre,
      Correo: input.Correo,
      Rol: input.Rol,
      CompaniaID: input.CompaniaID ?? "",
      AreaID: input.AreaID ?? ""
    };

    // Helper genérico hace crear/actualizar automáticamente
    const raw = await upsertInList(
      this.graph,
      this.siteId!,
      this.listId!,
      filter,
      fields
    );

    return this.toModel(raw);
  }

  // ============================================================
  // 🔹 Eliminar usuario por correo
  // ============================================================
  async deleteByCorreo(correo: string): Promise<void> {
    await this.ensureBase();

    const existing = await this.getByCorreo(correo);
    if (!existing) return;

    await this.graph.delete(
      `/sites/${this.siteId}/lists/${this.listId}/items/${existing.ID}`
    );
  }
}
