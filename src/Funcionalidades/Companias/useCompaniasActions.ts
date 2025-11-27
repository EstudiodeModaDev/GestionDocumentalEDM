// ============================================================
// src/Funcionalidades/useCompaniasActions.ts
// ------------------------------------------------------------
// Hook unificado para acciones de compañías:
//   - Crear compañía  (modo: "crear")
//   - Editar compañía  (modo: "editar")
//   - Eliminar compañía (modo: "eliminar")
//
// Los componentes (modales) solo se encargan de la UI,
// este hook maneja TODA la lógica de negocio.
// ============================================================

import { useState, useEffect } from "react";

import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { UsuarioGD } from "../../Models/UsuarioGD";
import type { UsuarioBasic } from "../../Models/Commons";

import { validarRolAdminCompania } from "../../utils/validation/validateCompania";
import { validateAdminComRole } from "../../utils/Commons";

// Tipos de servicios (flexibles para no romper nada)
type UsuariosGDService = any;
type CompaniasService = any;
type AreasService = any;

type ModoCompania = "crear" | "editar" | "eliminar";

interface Params {
  modo: ModoCompania;

  // Servicios
  UsuariosGD: UsuariosGDService;
  CompaniasService: CompaniasService;
  Areas?: AreasService; // solo necesario en editar/eliminar

  // Datos base
  compania?: CompaniaGD;

  // Callbacks
  onCreada?: (c: CompaniaGD) => void;
  onActualizada?: (c: CompaniaGD) => void;
  onEliminada?: (id: string) => void;
  onCerrar: () => void;

  // NAV
  triggerRefresh: () => void;
}

export function useCompaniasActions({
  modo,
  compania,
  UsuariosGD,
  CompaniasService,
  Areas,
  onCreada,
  onActualizada,
  onEliminada,
  onCerrar,
  triggerRefresh,
}: Params) {
  // ============================================================
  // ESTADOS GENERALES (crear / editar)
  // ============================================================
  const [nombre, setNombre] = useState<string>(compania?.Title ?? "");
  const [seleccionado, setSeleccionado] = useState<UsuarioBasic | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // ESTADOS PARA ELIMINAR
  // ============================================================
  const [usuariosAsociados, setUsuariosAsociados] = useState<UsuarioGD[]>([]);
  const [areasAsociadas, setAreasAsociadas] = useState<any[]>([]);
  const [segundaConfirmacion, setSegundaConfirmacion] = useState(false);

  const tituloSeguro = compania?.Title ?? "";

  // ============================================================
  // RESET AL CAMBIAR DE MODO / COMPAÑÍA
  // ------------------------------------------------------------
  // ⚠ IMPORTANTE:
  //   - Usamos SOLO `modo` y `compania?.Id` como dependencias,
  //     para evitar bucles de renderizado.
  //   - NO ponemos `compania` entero, porque el padre podría
  //     pasar un nuevo objeto en cada render (distinta ref)
  //     y eso dispararía el efecto infinitamente.
  // ============================================================
  useEffect(() => {
    setError(null);
    setLoading(false);

    if (modo === "crear") {
      // Crear → limpiar nombre y selección
      setNombre("");
      setSeleccionado(null);
      return;
    }

    if (modo === "editar" && compania) {
      // Editar → precargar nombre y admin actual
      setNombre(compania.Title ?? "");

      if (compania.AdministradorCom) {
        setSeleccionado({
          nombre: compania.AdministradorCom,
          correo: compania.AdministradorCom,
        });
      } else {
        setSeleccionado(null);
      }

      return;
    }

    if (modo === "eliminar" && compania) {
      // Eliminar → cargar usuarios y áreas asociadas
      void cargarAsociaciones();
    }
  }, [modo, compania?.Id]); // 👈 dependemos solo del Id, NO del objeto completo

  // ============================================================
  // CARGAR USUARIOS/ÁREAS ASOCIADAS (ELIMINAR)
  // ============================================================
  async function cargarAsociaciones() {
    if (!Areas || !UsuariosGD || !compania) return;

    try {
      setError(null);
      setSegundaConfirmacion(false);

      const usuarios: UsuarioGD[] = await UsuariosGD.getAll();
      setUsuariosAsociados(
        usuarios.filter((u: UsuarioGD) => u.CompaniaID === tituloSeguro)
      );

      const areas = await Areas.getAll();
      setAreasAsociadas(
        (areas ?? []).filter((a: any) => a.NombreCompania === tituloSeguro)
      );
    } catch (err) {
      console.error("❌ Error cargando info de compañía:", err);
      setError("Error obteniendo información asociada.");
    }
  }

  // ============================================================
  // CREAR COMPAÑÍA  (modo: "crear")
  // ============================================================
  async function crearCompania(): Promise<CompaniaGD | null> {
    if (modo !== "crear") return null;

    setError(null);

    if (!nombre.trim()) {
      setError("Debes ingresar el nombre de la compañía.");
      return null;
    }

    if (!seleccionado) {
      setError("Debes seleccionar un administrador.");
      return null;
    }

    try {
      setLoading(true);

      const correo = seleccionado.correo.trim().toLowerCase();
      const existente = await UsuariosGD.getByCorreo(correo);

      // Validación de rol (helper global existente)
      const errorRol = validateAdminComRole(existente);
      if (errorRol) {
        setError(errorRol);
        return null;
      }

      // Upsert de usuario como AdministradorCom
      await UsuariosGD.upsertByCorreo({
        Nombre: seleccionado.nombre || correo,
        Correo: correo,
        Rol: "AdministradorCom",
        CompaniaID: nombre.trim(),
        AreaID: undefined,
      });

      // Crear compañía en SharePoint
      const nueva: CompaniaGD = await CompaniasService.create({
        Title: nombre.trim(),
        AdministradorCom: correo,
        FechaCreacion: new Date().toISOString(),
        Activa: true,
      });

      onCreada?.(nueva);
      triggerRefresh();
      onCerrar();

      return nueva;
    } catch (err) {
      console.error("❌ Error creando compañía:", err);
      setError("Ocurrió un error al crear la compañía.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // EDITAR COMPAÑÍA  (modo: "editar")
  //   - `correoFinal` viene ya calculado desde el modal
  // ============================================================
  async function guardarCambios(correoFinal: string): Promise<void> {
    if (modo !== "editar" || !compania || !Areas) return;

    setError(null);

    if (!nombre.trim()) {
      setError("El nombre de la compañía es obligatorio.");
      return;
    }

    if (!correoFinal) {
      setError("Debes definir un administrador.");
      return;
    }

    const correoAdminOriginal = compania.AdministradorCom ?? "";

    try {
      setLoading(true);

      // 1) Validar rol del nuevo admin
      const usuarioNuevo: UsuarioGD | null = await UsuariosGD.getByCorreo(
        correoFinal
      );
      const motivo = validarRolAdminCompania(
        usuarioNuevo,
        compania.Title ?? ""
      );
      if (motivo) {
        setError(motivo);
        return;
      }

      // 2) Resetear admin anterior si cambió
      if (correoAdminOriginal && correoAdminOriginal !== correoFinal) {
        const anterior: UsuarioGD | null = await UsuariosGD.getByCorreo(
          correoAdminOriginal
        );
        if (anterior) {
          await UsuariosGD.upsertByCorreo({
            Nombre: anterior.Title || anterior.Correo,
            Correo: anterior.Correo,
            Rol: "SinAcceso",
            CompaniaID: undefined,
            AreaID: undefined,
          });
        }
      }

      // 3) Upsert del nuevo admin
      const nombreAdmin =
        seleccionado?.nombre || usuarioNuevo?.Title || correoFinal;

      await UsuariosGD.upsertByCorreo({
        Nombre: nombreAdmin,
        Correo: correoFinal,
        Rol: "AdministradorCom",
        CompaniaID: nombre.trim(),
        AreaID: undefined,
      });

      // 4) Actualizar compañía en SharePoint
      const oldTitle = compania.Title ?? "";
      const newTitle = nombre.trim();

      const actualizada: CompaniaGD =
        await CompaniasService.updateNombreYAdmin(
          compania.Id,
          oldTitle,
          newTitle,
          correoFinal
        );

      // 5) Si cambió el nombre → actualizar usuarios y áreas
      if (oldTitle !== newTitle) {
        const usuarios: UsuarioGD[] = await UsuariosGD.getAll();

        for (const u of usuarios.filter(
          (u: UsuarioGD) => u.CompaniaID === oldTitle
        )) {
          await UsuariosGD.upsertByCorreo({
            Nombre: u.Title || u.Correo,
            Correo: u.Correo,
            Rol: u.Rol,
            CompaniaID: newTitle,
            AreaID: u.AreaID,
          });
        }

        const areas = await Areas.getAll();
        for (const area of areas ?? []) {
          if (area.NombreCompania === oldTitle && area.Id) {
            await Areas.update(area.Id, { NombreCompania: newTitle });
          }
        }
      }

      onActualizada?.(actualizada);
      triggerRefresh();
      onCerrar();
    } catch (err) {
      console.error("❌ Error actualizando compañía:", err);
      setError("Ocurrió un error al actualizar la compañía.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // ELIMINAR COMPAÑÍA  (modo: "eliminar")
  // ============================================================
  async function eliminarCompania(): Promise<void> {
    if (modo !== "eliminar" || !compania) return;

    setError(null);

    // 1) No permitir eliminar si tiene áreas
    if (areasAsociadas.length > 0) {
      setError(
        `No puedes eliminar la compañía porque tiene ${areasAsociadas.length} área(s) asociada(s).`
      );
      return;
    }

    // 2) Doble confirmación si tiene usuarios
    if (usuariosAsociados.length > 0 && !segundaConfirmacion) {
      setSegundaConfirmacion(true);
      setError(
        `Esta compañía tiene ${usuariosAsociados.length} usuario(s) asociado(s).
Si confirmas, quedarán con Rol="SinAcceso" y sin compañía.
Presiona "Eliminar" otra vez para continuar.`
      );
      return;
    }

    try {
      setLoading(true);

      // 3) Resetear usuarios asociados
      for (const u of usuariosAsociados) {
        await UsuariosGD.upsertByCorreo({
          Nombre: u.Title || u.Correo,
          Correo: u.Correo,
          Rol: "SinAcceso",
          CompaniaID: undefined,
          AreaID: undefined,
        });
      }

      // 4) Eliminar carpeta + registro en SP
      if (!compania.Id) {
        setError("La compañía no tiene un ID válido.");
        return;
      }

      await CompaniasService.deleteWithFolder(compania.Id, tituloSeguro);

      // 5) Callback a componente padre
      onEliminada?.(compania.Id);

      // 6) Refrescar NAV
      triggerRefresh();

      // 7) Cerrar modal
      onCerrar();
    } catch (err) {
      console.error("❌ Error eliminando compañía:", err);
      setError("Ocurrió un error al eliminar la compañía.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // API EXPUESTA AL COMPONENTE
  // ============================================================
  return {
    // Estados generales
    nombre,
    setNombre,
    seleccionado,
    setSeleccionado,
    loading,
    error,
    setError,

    // Asociaciones (solo relevantes en eliminar)
    usuariosAsociados,
    areasAsociadas,
    segundaConfirmacion,

    // Acciones
    crearCompania,
    guardarCambios,   // recibe (correoFinal: string)
    eliminarCompania,
  };
}
  