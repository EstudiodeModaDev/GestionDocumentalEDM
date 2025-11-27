// ============================================================
// Componente global: InputReglas.tsx
// ------------------------------------------------------------
// Input reutilizable que acepta cualquier regla de validación.
// Muestra mensaje de error y maneja sanitización automáticamente.
// ============================================================

import React from "react";
import { useValidador, type Regla } from "../../Funcionalidades/useValidador";

type Props = {
  value: string;
  onChange: (v: string) => void;
  regla: Regla;
  label?: string;
};

export function InputReglas({ value, onChange, regla, label }: Props) {
  const { error, placeholder, onChange: validar } = useValidador(regla);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = validar(e.target.value);
    onChange(result);
  };

  return (
    <div className="input-reglas-container">
      {label && <label className="input-reglas-label">{label}</label>}

      <input
        type="text"
        className={`input-reglas ${error ? "input-error" : ""}`}
        value={value}
        placeholder={placeholder}
        onChange={handleInput}
      />

      {error && <p className="input-reglas-error">{error}</p>}
    </div>
  );
}
