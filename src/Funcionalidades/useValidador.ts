// ============================================================
// Hook global: useValidador.ts
// ------------------------------------------------------------
// Permite validar y sanitizar entradas según una regla definida.
// Cada regla especifica placeholder, sanitización y validación.
// ============================================================

import { useState } from "react";

export type Regla = {
  placeholder: string;
  sanitizar?: (s: string) => string;
  validar?: (s: string) => string | null;
};

export function useValidador(regla: Regla) {
  const [error, setError] = useState<string | null>(null);

  const onChange = (value: string) => {
    const sanitizado = regla.sanitizar ? regla.sanitizar(value) : value;
    const errorValidacion = regla.validar ? regla.validar(value) : null;

    setError(errorValidacion);

    return sanitizado;
  };

  return {
    error,
    placeholder: regla.placeholder,
    onChange,
  };
}
