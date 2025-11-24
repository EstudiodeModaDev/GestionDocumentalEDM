// ============================================================
// src/components/context/NavContext.tsx
// Contexto global para navegación del sidebar
// Soluciona:
//  ✔ seleccionar nodo desde cualquier vista
//  ✔ expandir automáticamente compañías/áreas
//  ✔ refrescar navbar en tiempo real (crear/editar/eliminar compañía/área)
//  ✔ resaltar compañía recién creada o editada
// ============================================================

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type NavContextType = {
  selected: string;
  expanded: Record<string, boolean>;

  setSelected: (id: string) => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  toggleNode: (id: string) => void;

  refreshFlag: number;
  triggerRefresh: () => void;

  // 🌟 NUEVO: Seleccionar y expandir automáticamente un nodo
  highlightNode: (id: string) => void;
};

const NavContext = createContext<NavContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================
export function NavProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState("home");

  // controla qué nodos están expandidos
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // bandera para forzar recarga del árbol NAV (Sidebar)
  const [refreshFlag, setRefreshFlag] = useState(0);

  const expandNode = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: true }));

  const collapseNode = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: false }));

  const toggleNode = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const triggerRefresh = () => setRefreshFlag((x) => x + 1);

  // ============================================================
  // 🌟 NUEVO: Resaltar una compañía/área recién creada o actualizada
  // ============================================================
  const highlightNode = (id: string) => {
    setSelected(id);       // selecciona en el sidebar
    expandNode(id);        // lo expande
    triggerRefresh();      // refresca el árbol del NAV
  };

  return (
    <NavContext.Provider
      value={{
        selected,
        expanded,
        setSelected,
        expandNode,
        collapseNode,
        toggleNode,
        refreshFlag,
        triggerRefresh,
        highlightNode, // 👈 agregado
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================
export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNav() debe usarse dentro de <NavProvider>");
  }
  return ctx;
}
