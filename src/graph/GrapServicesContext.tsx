// ============================================================
// src/graph/GrapServicesContext.tsx
// ------------------------------------------------------------
// Contexto central que expone todos los servicios Graph:
//  - UsuariosGDService
//  - AreasService
//  - CompaniasService
//  - BuscarUsuService    ← ⭐ Nuevo servicio
// ============================================================

import * as React from "react";
import { GraphRest } from "./GraphRest";
import { useAuth } from "../auth/authContext";

// Servicios existentes
import { UsuariosGDService } from "../Services/UsuariosGD.service";
import { AreasService } from "../Services/Areas.service";
import { CompaniasService } from "../Services/Companias.service";

// ⭐ Nuevo servicio de búsqueda de usuarios AAD
import { BuscarUsuService } from "../Services/BuscarUsu.service";

/* ================== Tipos de configuración ================== */
export type SiteConfig = { hostname: string; sitePath: string };

export type UnifiedConfig = {
  gd: SiteConfig;
  test: SiteConfig;
  lists: {
    UsuariosGD: string;
    AreasGD: string;
    CompaniasGD: string;
    [key: string]: string;
  };
};

/* ================== Tipos del contexto ================== */
export type GraphServices = {
  graph: GraphRest;
  UsuariosGD: UsuariosGDService;
  Areas: AreasService;
  Companias: CompaniasService;

  // ⭐ NUEVO: servicio para buscar usuarios por nombre/correo
  BuscarUsu: BuscarUsuService;
};

/* ============================================================
   ⚠️ No exportar el contexto en PascalCase (HMR / React Refresh)
============================================================ */
const GraphServicesContext = React.createContext<GraphServices | null>(null);

/* ================== Config por defecto ================== */
const DEFAULT_CONFIG: UnifiedConfig = {
  gd: {
    hostname: "estudiodemoda.sharepoint.com",
    sitePath: "/sites/TransformacionDigital/IN/GD",
  },
  test: {
    hostname: "estudiodemoda.sharepoint.com",
    sitePath: "/sites/TransformacionDigital/IN/Test",
  },
  lists: {
    UsuariosGD: "UsuariosGD",
    AreasGD: "AreasGD",
    CompaniasGD: "CompaniasGD",
  },
};

/* ================== Provider ================== */
type ProviderProps = { children: React.ReactNode; config?: Partial<UnifiedConfig> };

export const GraphServicesProvider: React.FC<ProviderProps> = ({ children, config }) => {
  const { getToken } = useAuth();

  /* ============================================================
     Mezcla la configuración base con overrides opcionales
  ============================================================ */
  const cfg: UnifiedConfig = React.useMemo(() => {
    const base = DEFAULT_CONFIG;
    const norm = (p: string) => (p.startsWith("/") ? p : `/${p}`);

    const gd: SiteConfig = {
      hostname: config?.gd?.hostname ?? base.gd.hostname,
      sitePath: norm(config?.gd?.sitePath ?? base.gd.sitePath),
    };

    const test: SiteConfig = {
      hostname: config?.test?.hostname ?? base.test.hostname,
      sitePath: norm(config?.test?.sitePath ?? base.test.sitePath),
    };

    const lists = { ...base.lists, ...(config?.lists ?? {}) };

    return { gd, test, lists };
  }, [config]);

  /* ============================================================
     Cliente GraphRest → usa getToken() automáticamente
  ============================================================ */
  const graph = React.useMemo(() => new GraphRest(getToken), [getToken]);

  /* ============================================================
     Instanciación de TODOS los servicios expuestos
     Incluye BuscarUsuService (nuevo)
  ============================================================ */
  const services = React.useMemo<GraphServices>(() => {
    const { lists, test } = cfg;

    const UsuariosGD = new UsuariosGDService(
      graph,
      test.hostname,
      test.sitePath,
      lists.UsuariosGD
    );

    const Areas = new AreasService(
      graph,
      test.hostname,
      test.sitePath,
      lists.AreasGD
    );

    const Companias = new CompaniasService(
      graph,
      test.hostname,
      test.sitePath,
      lists.CompaniasGD
    );

    // ⭐ Servicio de búsqueda de usuarios AAD
    const BuscarUsu = new BuscarUsuService(graph);

    return {
      graph,
      UsuariosGD,
      Areas,
      Companias,
      BuscarUsu, // ⭐ Exportado al contexto
    };
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
  if (!ctx)
    throw new Error("useGraphServices debe usarse dentro de <GraphServicesProvider>.");
  return ctx;
}
