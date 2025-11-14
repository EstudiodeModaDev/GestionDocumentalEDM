// src/Funcionalidades/useUserRoleFromSP.ts

import { useEffect, useState } from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import type { RolUsuario, UsuarioGD } from "../Models/UsuarioGD";

/**
 * Hook que:
 *  - Busca el usuario en la lista UsuariosGD de SharePoint
 *  - Si no existe → devuelve rol "SinAcceso"
 *  - Si existe → devuelve su rol real + CompaniaID + AreaID
 */
export function useUserRoleFromSP(userMail: string | undefined) {
  const { UsuariosGD } = useGraphServices();

  const [userData, setUserData] = useState<UsuarioGD | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userMail) return;
    let cancel = false;

    (async () => {
      try {
        const data = await UsuariosGD.getByCorreo(userMail);

        if (!cancel) {
          setUserData(data ?? null); // si no existe → null
        }
      } catch (err) {
        console.error("Error al obtener usuario desde SharePoint:", err);
        if (!cancel) setError("No se pudo obtener el usuario.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [UsuariosGD, userMail]);

  /* ============================================================
     🔹 LÓGICA DE ROLES FINAL
     ------------------------------------------------------------
     - Usuario NO registrado → "SinAcceso"
     - Usuario registrado → usar su rol guardado
  ============================================================ */

  let role: RolUsuario = "SinAcceso"; // 👈 REGISTRO NO ENCONTRADO = SIN ACCESO
  let companiaID: string | undefined = undefined;
  let areaID: string | undefined = undefined;

  if (!loading && userData) {
    // 👤 Usuario encontrado → usar rol real
    role = userData.Rol;
    companiaID = userData.CompaniaID;
    areaID = userData.AreaID;
  }

  return {
    role,
    companiaID,
    areaID,
    userData,
    loading,
    error,
  };
}
