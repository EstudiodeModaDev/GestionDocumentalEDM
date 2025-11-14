// src/Services/Areas.service.ts
import { GraphRest } from "../graph/GraphRest";
import type { AreaGD } from "../Models/Area";
import { ensureIds } from "../utils/Commons";

/**
 * Servicio de gestión de Áreas
 * ------------------------------------------------------------
 * ✔ Registra nuevas áreas en la lista "AreasGD"
 * ✔ Crea automáticamente la carpeta del área en:
 *
 *     Gestión Documental / {Compañía} / {Área}
 *
 * ✔ Ahora también:
 *    • Actualiza el ResponsableId de un área concreta
 */
export class AreasService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;
  private driveId: string = ""; // <-- ID de la biblioteca "Gestión Documental"

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

  /* ============================================================
     🔹 Convierte un ítem SP → AreaGD
  ============================================================ */
  private toModel(item: any): AreaGD {
    const f = item?.fields ?? {};
    return {
      Id: String(item?.ID ?? item.id ?? ""),
      Title: f.Title ?? "",
      AdministradorId: f.AdministradorId ?? "",
      FechaCreacion: f.FechaCreacion ?? "",
      Activa: f.Activa ?? false,
      NombreCompania: f.NombreCompania ?? "",
      ResponsableId: f.ResponsableId ?? "",
    };
  }

  /* ============================================================
     🔹 Resuelve la biblioteca correcta: Gestión Documental
  ============================================================ */
  private async resolveDrive(): Promise<string> {
    if (this.driveId) return this.driveId;

    if (!this.siteId)
      throw new Error("❌ siteId indefinido. Ejecuta ensureIds primero.");

    const expectedUrl =
      "https://estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/Test/Gestion%20Documental";

    const drives = await this.graph.get<any>(`/sites/${this.siteId}/drives`);

    const matched = drives.value?.find(
      (d: any) =>
        d.name?.toLowerCase() === "gestion documental" &&
        d.webUrl?.toLowerCase() === expectedUrl.toLowerCase()
    );

    if (!matched?.id)
      throw new Error("❌ No se encontró la biblioteca 'Gestión Documental'.");

    this.driveId = matched.id;

    console.log("📂 Biblioteca confirmada:", matched.webUrl);
    return this.driveId;
  }

  /* ============================================================
     🔹 Asegura que exista la carpeta de la compañía
  ============================================================ */
  private async ensureCompanyFolder(companyName: string): Promise<string> {
    if (!this.driveId) throw new Error("❌ driveId indefinido");

    // Listar carpetas raíz
    const children = await this.graph.get<any>(
      `/drives/${this.driveId}/root/children?$filter=folder ne null`
    );

    const folder = children.value?.find(
      (f: any) =>
        f.name?.toLowerCase().trim() === companyName.toLowerCase().trim()
    );

    if (folder) {
      console.log("📁 Carpeta de compañía encontrada:", folder.name);
      return folder.id;
    }

    // Crear carpeta de la compañía
    const created = await this.graph.post<any>(
      `/drives/${this.driveId}/root/children`,
      {
        name: companyName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }
    );

    console.log("📁 Carpeta de compañía creada:", created.webUrl);
    return created.id;
  }

  /* ============================================================
     🔹 Crear nueva área dentro de la carpeta de la compañía
  ============================================================ */
  async create(area: Omit<AreaGD, "Id">): Promise<AreaGD> {
    if (!area.Title?.trim())
      throw new Error("❌ El nombre del área es obligatorio.");

    if (!area.NombreCompania?.trim())
      throw new Error("❌ Debe especificarse la compañía.");

    // 1️⃣ Resolver IDs base
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

    // 2️⃣ Obtener la biblioteca correcta
    this.driveId = await this.resolveDrive();

    // 3️⃣ Insertar el registro en la lista
    const payload = {
      fields: {
        Title: area.Title,
        AdministradorId: area.AdministradorId,
        FechaCreacion: area.FechaCreacion ?? new Date().toISOString(),
        Activa: area.Activa ?? true,
        NombreCompania: area.NombreCompania,
        ResponsableId: area.ResponsableId, // normalmente vacío al crear
      },
    };

    const createdItem = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      payload
    );

    // 4️⃣ Crear carpeta dentro de la compañía
    try {
      const companyFolderId = await this.ensureCompanyFolder(
        area.NombreCompania
      );

      const newFolder = await this.graph.post<any>(
        `/drives/${this.driveId}/items/${companyFolderId}/children`,
        {
          name: area.Title,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }
      );

      console.log("📁 Carpeta del área creada:", newFolder.webUrl);
    } catch (err: any) {
      if (err?.status === 409)
        console.warn("⚠️ La carpeta del área ya existe.");
      else console.error("❌ Error al crear carpeta del área:", err);
    }

    return this.toModel(createdItem);
  }

  /* ============================================================
     🔹 Listar todas las áreas
  ============================================================ */
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

    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  /* ============================================================
     🔹 Actualizar ResponsableId de un área concreta
     ------------------------------------------------------------
     - areaId: ID del ítem de área en la lista AreasGD
     - correoResponsable: correo del nuevo responsable
       (o null/"" para limpiarlo)
  ============================================================ */
  async setResponsable(areaId: string, correoResponsable: string | null): Promise<void> {
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

    const payload = {
      ResponsableId: correoResponsable ?? "",
    };

    await this.graph.patch<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items/${areaId}/fields`,
      payload
    );
  }
}
