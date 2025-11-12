// src/Services/UsuariosGD.service.ts
import { GraphRest } from "../graph/GraphRest";
import type { UsuarioGD, RolUsuario } from "../Models/UsuarioGD";

export class UsuariosGDService {
  private graph!: GraphRest;
  private hostname!: string;
  private sitePath!: string;
  private listName!: string;

  private siteId?: string;
  private listId?: string;

  constructor(
    graph: GraphRest,
    hostname = "estudiodemoda.sharepoint.com",
    sitePath = "/sites/TransformacionDigital/IN/GD", // Ajusta según tu sitio real
    listName = "UsuariosGD" // nombre de la lista en SharePoint
  ) {
    this.graph = graph;
    this.hostname = hostname;
    this.sitePath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
    this.listName = listName;
  }

  private esc(s: string) {
    return String(s).replace(/'/g, "''");
  }

  private loadCache() {
    try {
      const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
      const raw = localStorage.getItem(k);
      if (raw) {
        const { siteId, listId } = JSON.parse(raw);
        this.siteId = siteId || this.siteId;
        this.listId = listId || this.listId;
      }
    } catch {}
  }

  private saveCache() {
    try {
      const k = `sp:${this.hostname}${this.sitePath}:${this.listName}`;
      localStorage.setItem(k, JSON.stringify({ siteId: this.siteId, listId: this.listId }));
    } catch {}
  }

  private async ensureIds() {
    if (!this.siteId || !this.listId) this.loadCache();

    if (!this.siteId) {
      const site = await this.graph.get<any>(`/sites/${this.hostname}:${this.sitePath}`);
      this.siteId = site?.id;
      if (!this.siteId) throw new Error("No se pudo resolver siteId");
      this.saveCache();
    }

    if (!this.listId) {
      const lists = await this.graph.get<any>(
        `/sites/${this.siteId}/lists?$filter=displayName eq '${this.esc(this.listName)}'`
      );
      const list = lists?.value?.[0];
      if (!list?.id) throw new Error(`Lista no encontrada: ${this.listName}`);
      this.listId = list.id;
      this.saveCache();
    }
  }

  // ---------- Mapeo ----------
  private toModel(item: any): UsuarioGD {
    const f = item?.fields ?? {};
    return {
      ID: String(item?.ID ?? item.id ?? item.Id ?? ""),
      Title: f.Nombre ?? f.Title ?? "",
      Correo: f.Correo ?? "",
      Rol: f.Rol as RolUsuario,
      AreaId: f.AreaId ?? "",
      SubareaId: f.SubareaId ?? "",
    };
  }

  // ---------- CRUD ----------
  async getAll() {
    await this.ensureIds();
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields`
    );
    return (res.value ?? []).map((x: any) => this.toModel(x));
  }

  async getByCorreo(correo: string): Promise<UsuarioGD | null> {
    await this.ensureIds();
    const filter = `fields/Correo eq '${this.esc(correo)}'`;
    const res = await this.graph.get<any>(
      `/sites/${this.siteId}/lists/${this.listId}/items?$expand=fields&$filter=${filter}`
    );
    const items = res?.value ?? [];
    return items.length > 0 ? this.toModel(items[0]) : null;
  }
}
