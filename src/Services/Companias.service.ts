// src/Services/Companias.service.ts
import { GraphRest } from "../graph/GraphRest";
import type { CompaniaGD } from "../Models/CompaniaGD";
import { ensureIds, ensureDriveId } from "../utils/Commons";

/**
 * Servicio de gestión de Compañías
 * ------------------------------------------------------------
 * ✔ Registra las compañías en la lista "CompaniasGD"
 * ✔ Crea automáticamente una carpeta por compañía en la biblioteca
 *   "Gestión Documental"
 * ✔ Será el nivel raíz donde se anidarán las Áreas y Subáreas
 */
export class CompaniasService {
  private graph: GraphRest;
  private hostname: string;
  private sitePath: string;
  private listName: string;

  private siteId?: string;
  private listId?: string;
  private driveId: string = ""; // ID de la biblioteca “Gestión Documental”

  constructor(
    graph: GraphRest,
    hostname = "estudiodemoda.sharepoint.com",
    sitePath = "/sites/TransformacionDigital/IN/Test",
    listName = "CompaiasGD" // ⚠️ Nombre exacto de la lista en SharePoint
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  /* ============================================================
     🔹 Conversión de un item de SharePoint a nuestro modelo local
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
     🔹 Crear una nueva compañía (lista + carpeta en biblioteca)
     ============================================================ */
  async create(compania: Omit<CompaniaGD, "Id">): Promise<CompaniaGD> {
    if (!compania.Title?.trim()) {
      throw new Error("El nombre de la compañía (Title) es obligatorio.");
    }

    // 1️⃣ Resolver IDs base: sitio, lista y biblioteca
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

    const driveIds = await ensureDriveId(
      this.siteId,
      this.driveId,
      this.graph,
      this.hostname,
      this.sitePath,
      "Gestion Documental" // Nombre visible de la biblioteca
    );
    this.driveId = driveIds.driveId;

    // 2️⃣ Registrar en la lista "CompaniasGD"
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

    // 3️⃣ Crear carpeta raíz con el nombre de la compañía
    try {
      console.log(
        `🧩 Creando carpeta para la compañía '${compania.Title}' en biblioteca 'Gestión Documental'`
      );

      await this.graph.post<any>(
        `/drives/${this.driveId}/root/children`,
        {
          name: compania.Title,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail", // evita sobrescritura
        }
      );

      console.log(`✅ Carpeta creada correctamente: ${compania.Title}`);
    } catch (err: any) {
      if (err?.status === 409) {
        console.warn("⚠️ La carpeta ya existía, se omitió la creación.");
      } else {
        console.error("❌ Error al crear la carpeta de la compañía:", err);
      }
    }

    // Retornamos el modelo local
    return this.toModel(createdItem);
  }

  /* ============================================================
     🔹 Listar todas las compañías registradas
     ============================================================ */
  async getAll(): Promise<CompaniaGD[]> {
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
