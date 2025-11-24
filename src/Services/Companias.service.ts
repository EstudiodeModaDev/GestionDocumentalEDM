// src/Services/Companias.service.ts
import { GraphRest } from "../graph/GraphRest";
import type { CompaniaGD } from "../Models/CompaniaGD";

import {
  ensureIds,
  resolveDriveByName,
  ensureFolderInDrive,
  findFolder,
} from "../utils/Commons";

/**
 * Servicio de gestión de Compañías
 * ------------------------------------------------------------
 * ✔ Registra compañías en la lista "CompaniasGD"
 * ✔ Crea carpeta raíz en "Gestión Documental"
 * ✔ Actualiza o elimina carpeta
 * ✔ Limpio, modular y basado en helpers reutilizables
 */
export class CompaniasService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;
  private driveId: string = "";

  constructor(
    graph: GraphRest,
    hostname = "estudiodemoda.sharepoint.com",
    sitePath = "/sites/TransformacionDigital/IN/Test",
    listName = "CompaniasGD"  
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  /* ============================================================
      🔹 Conversión a modelo local
  ============================================================ */
  private toModel(item: any): CompaniaGD {
    const f = item?.fields ?? {};
    return {
      Id: String(item?.ID ?? item.id ?? ""),
      Title: f.Title ?? "",
      FechaCreacion: f.FechaCreacion ?? "",
      AdministradorCom: f.AdministradorCom ?? "",
      Activa: f.Activa ?? false,
    };
  }

  /* ============================================================
      🔹 Resolver IDs: sitio, lista, drive
  ============================================================ */
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

    this.driveId = await resolveDriveByName(
      this.graph,
      this.siteId!,
      "Gestión Documental"
    );
  }

  /* ============================================================
      🔹 Crear Compañía
  ============================================================ */
  async create(compania: Omit<CompaniaGD, "Id">): Promise<CompaniaGD> {
    if (!compania.Title?.trim()) {
      throw new Error("El nombre de la compañía (Title) es obligatorio.");
    }

    await this.ensureBase();

    // Registrar en lista
    const payload = {
      fields: {
        Title: compania.Title,
        AdministradorCom: compania.AdministradorCom ?? "",
        FechaCreacion: compania.FechaCreacion ?? new Date().toISOString(),
        Activa: compania.Activa ?? true,
      },
    };

    const createdItem = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      payload
    );

    // Crear carpeta raíz de compañía
    await ensureFolderInDrive(this.graph, this.driveId, compania.Title);

    return this.toModel(createdItem);
  }

  /* ============================================================
      🔹 Listar
  ============================================================ */
  async getAll(): Promise<CompaniaGD[]> {
    await this.ensureBase();

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields`
    );

    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  /* ============================================================
      🔹 Renombrar carpeta
  ============================================================ */
  private async renameFolder(oldName: string, newName: string): Promise<void> {
    await this.ensureBase();

    const folder = await findFolder(this.graph, this.driveId, "root", oldName);
    if (!folder) {
      console.warn(`⚠️ Carpeta no encontrada: '${oldName}'`);
      return;
    }

    await this.graph.patch(
      `/drives/${this.driveId}/items/${folder.id}`,
      { name: newName }
    );

    console.log(`🔄 Carpeta renombrada: ${oldName} → ${newName}`);
  }

  /* ============================================================
      🔹 Eliminar carpeta
  ============================================================ */
  private async deleteFolder(name: string): Promise<void> {
    await this.ensureBase();

    const folder = await findFolder(this.graph, this.driveId, "root", name);
    if (!folder) {
      console.warn(`⚠️ Carpeta no encontrada: '${name}'`);
      return;
    }

    await this.graph.delete(
      `/drives/${this.driveId}/items/${folder.id}`
    );
  }

  /* ============================================================
      🔹 Actualizar Compañía
  ============================================================ */
  async updateNombreYAdmin(
    companiaId: string,
    oldTitle: string,
    newTitle: string,
    newAdminCorreo: string
  ): Promise<CompaniaGD> {
    await this.ensureBase();

    // Actualizar lista
    await this.graph.patch(
      `/sites/${this.siteId}/lists/${this.listId}/items/${companiaId}/fields`,
      {
        Title: newTitle,
        AdministradorCom: newAdminCorreo,
      }
    );

    // Renombrar carpeta si cambió
    if (oldTitle !== newTitle) {
      await this.renameFolder(oldTitle, newTitle);
    }

    const updated = await this.graph.get(
      `/sites/${this.siteId}/lists/${this.listId}/items/${companiaId}?$expand=fields`
    );

    return this.toModel(updated);
  }

  /* ============================================================
      🔹 Eliminar compañía + carpeta
  ============================================================ */
  async deleteWithFolder(companiaId: string, title: string): Promise<void> {
    await this.ensureBase();

    await this.deleteFolder(title);

    await this.graph.delete(
      `/sites/${this.siteId}/lists/${this.listId}/items/${companiaId}`
    );

    console.log(`🗑️ Compañía eliminada: ${title}`);
  }
}
