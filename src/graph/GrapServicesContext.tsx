import * as React from "react";
// import { useAuth } from "../auth/authContext";
import { GraphRest } from "./GraphRest";
import { useAuth } from "../auth/authContext";

/* ================== Tipos de config ================== */
export type SiteConfig = {
  hostname: string;
  sitePath: string; // Debe iniciar con '/'
};

export type UnifiedConfig = {
  hd: SiteConfig;    // sitio principal (HD)
  test: SiteConfig;  // sitio de pruebas (Paz y salvos)
  lists: Record<string, string>; // Listas dinámicas
};

/* ================== Tipos del contexto ================== */
export type GraphServices = {
  graph: GraphRest;
  // Aquí irían los servicios (ejemplo: Sociedades, Proveedores, etc.)
};

/* ================== Contexto ================== */
const GraphServicesContext = React.createContext<GraphServices | null>(null);

/* ================== Default config ================== */
const DEFAULT_CONFIG: UnifiedConfig = {
  hd: {
    hostname: "estudiodemoda.sharepoint.com",
    sitePath: "/sites/TransformacionDigital/IN/HD",    // se cambiara por el link que cree cesar
  },
  test: {
    hostname: "estudiodemoda.sharepoint.com",
    sitePath: "/sites/TransformacionDigital/IN/Test",     // se cambiara por el link que cree cesar
  },
  lists: {},
};

/* ================== Provider ================== */
type ProviderProps = {
  children: React.ReactNode;
  config?: Partial<UnifiedConfig>;
};

export const GraphServicesProvider: React.FC<ProviderProps> = ({ children, config }) => {
  const { getToken } = useAuth();

  // Mergeo de config
  const cfg: UnifiedConfig = React.useMemo(() => {
    const base = DEFAULT_CONFIG;
    const normPath = (p: string) => (p.startsWith("/") ? p : `/${p}`);

    const hd: SiteConfig = {
      hostname: config?.hd?.hostname ?? base.hd.hostname,
      sitePath: normPath(config?.hd?.sitePath ?? base.hd.sitePath),
    };

    const test: SiteConfig = {
      hostname: config?.test?.hostname ?? base.test.hostname,
      sitePath: normPath(config?.test?.sitePath ?? base.test.sitePath),
    };

    const lists = { ...base.lists, ...(config?.lists ?? {}) };

    return { hd, test, lists };
  }, [config]);

  // Cliente Graph
  const graph = React.useMemo(() => new GraphRest(getToken), [getToken]);

  // Instanciar servicios (por ahora solo el cliente Graph)
  const services = React.useMemo<GraphServices>(() => {
    return { graph };
  }, [graph, cfg]);

  return (
    <GraphServicesContext.Provider value={services}>
      {children}
    </GraphServicesContext.Provider>
  );
};

/* ================== Hook de consumo ================== */
export function useGraphServices(): GraphServices {
  const ctx = React.useContext(GraphServicesContext);
  if (!ctx) throw new Error("useGraphServices debe usarse dentro de <GraphServicesProvider>.");
  return ctx;
}
