// ============================================================
// src/components/context/NavContext.tsx
// Contexto global para controlar el árbol del sidebar.
// Provee:
//  ✔ qué nodo está seleccionado
//  ✔ qué nodos están expandidos
//  ✔ refrescos real-time al crear/editar/eliminar
//  ✔ highlight automático (selecciona + expande + scroll)
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

  // ⭐ Seleccionar + expandir + hacer scroll al nodo recién creado/editado
  highlightNode: (id: string) => void;
};

const NavContext = createContext<NavContextType | undefined>(undefined);

// ============================================================
// PROVIDER PRINCIPAL
// ============================================================
export function NavProvider({ children }: { children: ReactNode }) {
  // Nodo seleccionado actualmente en el sidebar
  const [selected, setSelected] = useState("home");

  // Qué nodos están expandidos (companías, áreas)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Bandera para refrescar árbol (ej: al crear/eliminar compañía/área)
  const [refreshFlag, setRefreshFlag] = useState(0);

  const expandNode = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: true }));

  const collapseNode = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: false }));

  const toggleNode = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const triggerRefresh = () => setRefreshFlag((x) => x + 1);

  // ============================================================
  // ⭐ highlightNode — la magia para navegar después de crear nodos
  //
  // Hace lo siguiente:
  // 1. Expande la raíz ("companias")
  // 2. Expande la compañía si el nodo es c-XX
  // 3. Selecciona el nodo recién creado
  // 4. Scroll al nodo real en el DOM
  // ============================================================
  const highlightNode = (id: string) => {
    // 1) Siempre expandimos la raíz del árbol de compañías
    expandNode("companias");

    // 2) Si es una compañía (c-XX), expandirla también
    if (id.startsWith("c-")) {
      expandNode(id);
    }

    // 3) Seleccionar el nodo
    setSelected(id);

    // 4) Hacer scroll al nodo cuando el DOM lo pinte
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 150);
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
        highlightNode,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================
export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) {
    throw new Error("useNav() debe usarse dentro de <NavProvider>");
  }
  return ctx;
}
