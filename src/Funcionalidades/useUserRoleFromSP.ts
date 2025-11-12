// src/Funcionalidades/useUserRoleFromSP.ts
import { useEffect, useState } from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import type { RolUsuario, UsuarioGD } from "../Models/UsuarioGD";

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
          setUserData(data);
        }
      } catch (err) {
        console.error("Error al obtener el rol desde SharePoint:", err);
        if (!cancel) setError("No se pudo obtener el rol del usuario.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [UsuariosGD, userMail]);

  // ✅ Lógica corregida:
  // - Si el usuario está en la lista, usamos su rol.
  // - Si no está, asumimos el rol más bajo (UsuarioSubarea).
  // - No asignamos roles de administrador por defecto.
  let role: RolUsuario = "UsuarioSubarea";
  if (userData?.Rol) {
    role = userData.Rol;
  }

  return { role, userData, loading, error };
}
