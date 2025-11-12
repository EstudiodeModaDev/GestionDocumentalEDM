// src/Services/Areas.service.ts
import { GraphRest } from "../graph/GraphRest";
import type { AreaGD } from "../Models/Area";
import { ensureIds } from "../utils/Commons";

/**
 * Servicio de gestión de Áreas
 * ------------------------------------------------------------
 * ✔ Registra nuevas áreas en la lista "AreasGD"
 * ✔ Crea automáticamente la carpeta del área dentro de la compañía correspondiente:
 *   "Gestión Documental/{NombreCompania}/{NombreÁrea}"
 */
export class AreasService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;
  private driveId: string = ""; // ID del drive correcto (Gestión Documental)

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
     🔹 Mapeo de SharePoint → Modelo local
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
    };
  }

  /* ============================================================
     🔹 Resolver el Drive correcto (Gestión Documental)
     ============================================================ */
  private async resolveDrive(): Promise<string> {
    if (this.driveId) return this.driveId;

    if (!this.siteId) throw new Error("❌ siteId indefinido, ejecuta ensureIds primero.");

    const expectedUrl =
      "https://estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/Test/Gestion%20Documental";

    const drives = await this.graph.get<any>(`/sites/${this.siteId}/drives`);

    const matched = drives.value?.find(
      (d: any) =>
        d.name?.toLowerCase().trim() === "gestion documental" &&
        d.webUrl?.toLowerCase().trim() === expectedUrl.toLowerCase().trim()
    );

    if (!matched?.id)
      throw new Error("❌ No se encontró la biblioteca 'Gestión Documental'.");

    this.driveId = matched.id;
    console.log("✅ Biblioteca confirmada:", matched.webUrl);
    return this.driveId;
  }

  /* ============================================================
     🔹 Verifica que exista la carpeta de la compañía
     ============================================================ */
  private async ensureCompanyFolder(companyName: string): Promise<string> {
    if (!this.driveId) throw new Error("driveId indefinido");

    // Listar carpetas raíz
    const children = await this.graph.get<any>(
      `/drives/${this.driveId}/root/children?$filter=folder ne null`
    );

    const folder = children.value?.find(
      (f: any) => f.name?.toLowerCase().trim() === companyName.toLowerCase().trim()
    );

    if (folder) {
      console.log("📂 Carpeta de compañía encontrada:", folder.name);
      return folder.id;
    }

    // Si no existe → crearla
    const created = await this.graph.post<any>(
      `/drives/${this.driveId}/root/children`,
      {
        name: companyName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }
    );

    console.log("✅ Carpeta de compañía creada:", created.webUrl);
    return created.id;
  }

  /* ============================================================
     🔹 Crear nueva área dentro de la carpeta de compañía
     ============================================================ */
  async create(area: Omit<AreaGD, "Id">): Promise<AreaGD> {
    if (!area.Title?.trim()) throw new Error("El nombre del área es obligatorio.");
    if (!area.NombreCompania?.trim())
      throw new Error("Debe especificarse el nombre de la compañía.");

    // 1️⃣ Resolver IDs del sitio y lista
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

    // 2️⃣ Resolver Drive correcto (Gestión Documental)
    const driveId = await this.resolveDrive();
    this.driveId = driveId;

    // 3️⃣ Crear el registro en la lista
    const payload = {
      fields: {
        Title: area.Title,
        AdministradorId: area.AdministradorId,
        FechaCreacion: area.FechaCreacion ?? new Date().toISOString(),
        Activa: area.Activa ?? true,
        NombreCompania: area.NombreCompania,
      },
    };

    const createdItem = await this.graph.post<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items`,
      payload
    );

    // 4️⃣ Crear carpeta dentro de la compañía
    try {
      const companyFolderId = await this.ensureCompanyFolder(area.NombreCompania);

      const newFolder = await this.graph.post<any>(
        `/drives/${this.driveId}/items/${companyFolderId}/children`,
        {
          name: area.Title,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }
      );

      console.log(`✅ Carpeta creada: ${newFolder.webUrl}`);
    } catch (err: any) {
      if (err?.status === 409)
        console.warn("⚠️ Carpeta ya existente, se omite creación.");
      else console.error("❌ Error al crear carpeta de área:", err);
    }

    return this.toModel(createdItem);
  }

  /* ============================================================
     🔹 Obtener todas las áreas registradas
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
}
