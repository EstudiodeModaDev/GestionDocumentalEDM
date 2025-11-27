// ============================================================
// src/Funcionalidades/useUserAutocomplete.ts
// ============================================================

import { useState, useEffect, useRef } from "react";
import type { UsuarioBasic } from "../../Models/Commons";

interface UseUserAutocompleteArgs {
  BuscarUsu: {
    buscar: (texto: string) => Promise<UsuarioBasic[]>;
  };
  delay?: number;
}

export function useUserAutocomplete({ BuscarUsu, delay = 350 }: UseUserAutocompleteArgs) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UsuarioBasic[]>([]);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscador con debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const lista = await BuscarUsu.buscar(query.trim());
        setResults(lista);
      } catch (err) {
        console.error("❌ Error en useUserAutocomplete:", err);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, BuscarUsu, delay]);

  function clearResults() {
    setResults([]);
  }

  function reset() {
    setQuery("");
    setResults([]);
    setLoading(false);
  }

  return {
    query,
    setQuery,
    results,
    loading,
    dropdownRef,
    clearResults,
    reset,
  };
}
