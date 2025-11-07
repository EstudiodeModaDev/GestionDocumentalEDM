export class GraphRest {
  private getToken: () => Promise<string>;
  private base = 'https://graph.microsoft.com/v1.0';

  constructor(getToken: () => Promise<string>, baseUrl?: string) {
    this.getToken = getToken;
    if (baseUrl) this.base = baseUrl;
  }

  // Core: hace la llamada y parsea respuesta de forma segura (maneja 204/no content)
  private async call<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
    init?: RequestInit
  ): Promise<T> {
    const token = await this.getToken();
    const hasBody = body !== undefined && body !== null;

    const res = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        // Quita esta Prefer si no la necesitas
        Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
        ...(init?.headers || {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      ...init,
    });

    // ---- Manejo de error con mensaje detallado de Graph ----
    if (!res.ok) {
      let detail = '';
      try {
        const txt = await res.text();
        if (txt) {
          try {
            const j = JSON.parse(txt);
            detail = j?.error?.message || j?.message || txt;
          } catch {
            detail = txt;
          }
        }
      } catch {}
      throw new Error(`${method} ${path} → ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
    }

    // ---- 204 No Content o respuesta vacía ----
    if (res.status === 204) return undefined as unknown as T;

    // ---- Parseo seguro según content-type ----
    const ct = res.headers.get('content-type') || '';
    const txt = await res.text(); // evita error si está vacío
    if (!txt) return undefined as unknown as T;

    if (ct.includes('application/json')) {
      return JSON.parse(txt) as T;
    }

    // Si la respuesta no es JSON, retorna texto
    return txt as unknown as T;
  }

  async getBlob(path: string) {
      const token = await this.getToken(); // mismo token que ya te sirve
      const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Graph ${res.status}`);
    return await res.blob();
  }

  // Helpers públicos
  get<T = any>(path: string, init?: RequestInit) {
    return this.call<T>('GET', path, undefined, init);
  }

  post<T = any>(path: string, body: any, init?: RequestInit) {
    return this.call<T>('POST', path, body, init);
  }

  patch<T = any>(path: string, body: any, init?: RequestInit) {
    // PATCH a /fields suele devolver 204; este call ya lo maneja
    return this.call<T>('PATCH', path, body, init);
  }

  delete(path: string, init?: RequestInit) {
    // DELETE típicamente devuelve 204 No Content
    return this.call<void>('DELETE', path, undefined, init);
  }

  async getAbsolute<T = any>(url: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly',
        ...(init?.headers || {}),
      },
      ...init,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const txt = await res.text();
        if (txt) {
          try { detail = JSON.parse(txt)?.error?.message ?? JSON.parse(txt)?.message ?? txt; }
          catch { detail = txt; }
        }
      } catch {}
      throw new Error(`GET (absolute) ${url} → ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
    }

    if (res.status === 204) return undefined as unknown as T;

    const ct = res.headers.get('content-type') ?? '';
    const txt = await res.text();
    if (!txt) return undefined as unknown as T;
    return ct.includes('application/json') ? JSON.parse(txt) as T : (txt as unknown as T);
  }
}
