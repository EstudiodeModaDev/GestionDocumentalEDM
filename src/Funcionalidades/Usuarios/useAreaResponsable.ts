// ============================================================
// src/Funcionalidades/useAreaResponsable.ts
// ------------------------------------------------------------
// Lógica completa para cambiar el responsable de un área:
//
//   ✔ Validar nuevo responsable
//   ✔ Resetear responsable anterior (SinAcceso)
//   ✔ O… reasignarlo a otra área como UsuarioArea
//   ✔ Actualizar campo Responsable del área
//   ✔ Exponer estados y acciones al modal
// ============================================================

import { useState, useEffect } from "react";

import type { UsuarioBasic } from "../../Models/Commons";
import type { UsuarioGD } from "../../Models/UsuarioGD";
import type { AreaGD } from "../../Models/Area";

import { validateResponsableRole } from "../../utils/validation/validateResponsable";

type UsuariosGDService = any;
type AreasService = any;

interface Params {
  areaId: string;
  areaName: string;
  companiaName: string;

  UsuariosGD: UsuariosGDService;
  Areas: AreasService;

  responsableActual?: string;
  onSuccess?: () => void;
  onClose: () => void;
}

export function useAreaResponsable({
  areaId,
  areaName,
  companiaName,
  UsuariosGD,
  Areas,
  responsableActual,
  onSuccess,
  onClose,
}: Params) {
  const [seleccionado, setSeleccionado] = useState<UsuarioBasic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // Dropdown de acciones sobre responsable anterior
  // ============================================================
  type AccionAnterior = "sinAcceso" | "reasignar";
  const [accionAnterior, setAccionAnterior] =
    useState<AccionAnterior>("sinAcceso");

  const [areasDisponibles, setAreasDisponibles] = useState<AreaGD[]>([]);
  const [areaReasignada, setAreaReasignada] = useState<string>("");

  // ============================================================
  // Cargar áreas disponibles de la compañía
  // ============================================================
  useEffect(() => {
    async function cargarAreas() {
      const lista = await Areas.getAll();
      setAreasDisponibles(
        (lista ?? []).filter(
          (a: AreaGD) => a.NombreCompania === companiaName
        )
      );
    }

    cargarAreas();
  }, [companiaName, Areas]);

  function reset() {
    setSeleccionado(null);
    setError(null);
    setLoading(false);

    setAccionAnterior("sinAcceso");
    setAreaReasignada("");
  }

  // ============================================================
  // GUARDAR RESPONSABLE
  // ============================================================
  async function guardarResponsable(): Promise<void> {
    setError(null);

    if (!seleccionado) {
      setError("Debes seleccionar un usuario.");
      return;
    }

    try {
      setLoading(true);

      const nuevoCorreo = seleccionado.correo.toLowerCase();
      const existente: UsuarioGD | null = await UsuariosGD.getByCorreo(
        nuevoCorreo
      );

      // --------------------------------------------------------
      // 1. VALIDAR NUEVO RESPONSABLE
      // --------------------------------------------------------
      if (existente) {
        const motivo = validateResponsableRole(
          existente.Rol,
          existente.AreaID,
          existente.CompaniaID,
          areaName,
          companiaName
        );

        if (motivo) {
          setError(motivo);
          setLoading(false);
          return;
        }
      }

      // --------------------------------------------------------
      // 2. PROCESAR RESPONSABLE ANTERIOR
      // --------------------------------------------------------
      if (responsableActual && responsableActual !== nuevoCorreo) {
        const responsableAnterior = await UsuariosGD.getByCorreo(
          responsableActual
        );

        if (responsableAnterior) {
          if (accionAnterior === "sinAcceso") {
            // 🔹 Opción A: dejarlo sin acceso
            await UsuariosGD.upsertByCorreo({
              Nombre: responsableAnterior.Title || responsableAnterior.Correo,
              Correo: responsableAnterior.Correo,
              Rol: "SinAcceso",
              CompaniaID: undefined,
              AreaID: undefined,
            });

          } else if (accionAnterior === "reasignar") {
            // 🔹 Opción B: reasignarlo a otra área de la compañía
            if (!areaReasignada) {
              setError("Debes seleccionar un área para reasignarlo.");
              setLoading(false);
              return;
            }

            await UsuariosGD.upsertByCorreo({
              Nombre: responsableAnterior.Title || responsableAnterior.Correo,
              Correo: responsableAnterior.Correo,
              Rol: "UsuarioArea",
              CompaniaID: companiaName,
              AreaID: areaReasignada, // 🔥 área seleccionada
            });
          }
        }
      }

      // --------------------------------------------------------
      // 3. UPSERT NUEVO RESPONSABLE
      // --------------------------------------------------------
      await UsuariosGD.upsertByCorreo({
        Nombre: seleccionado.nombre,
        Correo: nuevoCorreo,
        Rol: "ResponsableArea",
        CompaniaID: companiaName,
        AreaID: areaName,
      });

      // --------------------------------------------------------
      // 4. Actualizar tabla Áreas
      // --------------------------------------------------------
      await Areas.setResponsable(areaId, nuevoCorreo);

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("❌ Error asignando responsable:", err);
      setError("Ocurrió un error al asignar el responsable.");
    } finally {
      setLoading(false);
    }
  }

  return {
    seleccionado,
    setSeleccionado,

    loading,
    error,
    setError,

    accionAnterior,
    setAccionAnterior,

    areasDisponibles,
    areaReasignada,
    setAreaReasignada,

    guardarResponsable,
    reset,
  };
}
