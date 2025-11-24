// ============================================================
// src/Services/Areas.service.ts
// Servicio oficial de Gestión de Áreas — COMPLETO con deleteFolder()
// ============================================================

import type { AreaGD } from "../Models/Area";
import type { GraphRest } from "../graph/GraphRest";

// nuevos import despues del refactor
import {
  ensureIds,
  resolveDriveByName,
  ensureFolderInDrive,
  createFolder,
  findFolder
} from "../utils/Commons";

export class AreasService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;

  // ⭐ DriveId de la biblioteca "Gestión Documental"
  private driveId: string = "";

  constructor(
    graph: GraphRest,
    hostname = "estudiodemoda.sharepoint.com",
    sitePath = "/sites/TransformacionDigital/IN/Test",
    listName = "AreasGD"
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  // ============================================================
  // 🔹 Convertir un SP ListItem → AreaGD
  // ============================================================
  private toModel(item: any): AreaGD {
    const f = item?.fields ?? {};
    return {
      Id: String(item?.ID ?? item?.id ?? ""),
      Title: f.Title ?? "",
      AdministradorId: f.AdministradorId ?? "",
      FechaCreacion: f.FechaCreacion ?? "",
      Activa: f.Activa ?? false,
      NombreCompania: f.NombreCompania ?? "",
      ResponsableId: f.ResponsableId ?? "",
    };
  }

  // ============================================================
  // 🔹 Crear área + carpeta
  // ============================================================
  async create(area: Omit<AreaGD, "Id">): Promise<AreaGD> {
    if (!area.Title?.trim()) {
      throw new Error("❌ Debe especificarse el nombre del área.");
    }
    if (!area.NombreCompania?.trim()) {
      throw new Error("❌ Debe especificarse la compañía del área.");
    }

    // 1) IDs de lista
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

    // 2) Drive
    this.driveId = await resolveDriveByName(
      this.graph,
      this.siteId!,
      "Gestión Documental"
    );


    // 3) Crear registro del área
    const payload = {
      fields: {
        Title: area.Title,
        AdministradorId: area.AdministradorId,
        FechaCreacion: area.FechaCreacion ?? new Date().toISOString(),
        Activa: area.Activa ?? true,
        NombreCompania: area.NombreCompania,
        ResponsableId: area.ResponsableId ?? "",
      },
    };

    const item = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      payload
    );

    // 4) Crear carpeta del área
    try {
     const companyFolderId = await ensureFolderInDrive(
      this.graph,
      this.driveId,
      area.NombreCompania
    );


    await createFolder(this.graph, this.driveId, companyFolderId, area.Title);

    } catch (err: any) {
      if (err?.status === 409) {
        console.warn("⚠️ Carpeta de área ya existía.");
      } else {
        console.error("❌ Error creando carpeta del área:", err);
      }
    }

    return this.toModel(item);
  }

  // ============================================================
  // 🔹 Obtener todas las áreas
  // ============================================================
  async getAll(): Promise<AreaGD[]> {
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

    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields`
    );

    return (res.value ?? []).map((i: any) => this.toModel(i));
  }

  // ============================================================
  // 🔹 Actualizar responsable
  // ============================================================
  async setResponsable(areaId: string, correo: string | null): Promise<void> {
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

    await this.graph.patch(
      `/sites/${this.siteId}/lists/${this.listId}/items/${areaId}/fields`,
      {
        ResponsableId: correo ?? "",
      }
    );
  }

  // ============================================================
  // 🔹 Actualizar campos del área
  // ============================================================
  async update(areaId: string, fields: Record<string, any>): Promise<void> {
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

    await this.graph.patch(
      `/sites/${this.siteId}/lists/${this.listId}/items/${areaId}/fields`,
      fields
    );
  }

  // ============================================================
  // 🔥 NUEVO — Eliminar carpeta del área
  // ============================================================
  async deleteFolder(area: AreaGD): Promise<void> {
    if (!area?.Title || !area?.NombreCompania) return;

    // 1) Asegurar drive y folders base
    if (!this.siteId || !this.listId) {
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

    this.driveId = await resolveDriveByName(
      this.graph,
      this.siteId!,
      "Gestión Documental"
    );


    // 2) Ubicar carpeta principal de compañía
    const companyFolderId = await ensureFolderInDrive(
  this.graph,
  this.driveId,
  area.NombreCompania
);

    // 3) Buscar carpeta del área dentro de la compañía
    const areaFolder = await findFolder(
      this.graph,
      this.driveId,
      companyFolderId,
      area.Title
    );


    if (!areaFolder) {
      console.warn("⚠️ No se encontró carpeta para esta área.");
      return;
    }

    // 4) Eliminar carpeta
    await this.graph.delete(
      `/drives/${this.driveId}/items/${areaFolder.id}`
    );

    console.log("🗑️ Carpeta eliminada:", areaFolder.name);
  }

  // ============================================================
  // 🔹 Eliminar registro del área (SP List)
  // ============================================================
  async delete(areaId: string): Promise<void> {
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

    await this.graph.delete(
      `/sites/${this.siteId}/lists/${this.listId}/items/${areaId}`
    );
  }
}
