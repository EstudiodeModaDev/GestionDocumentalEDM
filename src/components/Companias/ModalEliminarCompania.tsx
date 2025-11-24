import { useEffect, useState } from "react";
import "./ModalEliminarCompania.css";
import type { CompaniaGD } from "../../Models/CompaniaGD";
import type { UsuarioGD } from "../../Models/UsuarioGD";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNav } from "../Context/NavContext";  // 👈 NAV CONTEXT

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  compania: CompaniaGD;
  onEliminada: (id: string) => void;
  CompaniasService: any;
}

export default function ModalEliminarCompania({
  abierto,
  onCerrar,
  compania,
  onEliminada,
  CompaniasService,
}: Props) {
  const { UsuariosGD, Areas } = useGraphServices();
  const { triggerRefresh } = useNav(); // 👈 Para refrescar el NAV

  const [loading, setLoading] = useState(false);
  const [usuariosAsociados, setUsuariosAsociados] = useState<UsuarioGD[]>([]);
  const [areasAsociadas, setAreasAsociadas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [segundaConfirmacion, setSegundaConfirmacion] = useState(false);

  const tituloSeguro = compania.Title ?? "";

  /*===============================================================
    Cargar usuarios/áreas asociadas
  ===============================================================*/
  useEffect(() => {
    if (!abierto) return;

    (async () => {
      try {
        setError(null);
        setSegundaConfirmacion(false);

        const usuarios = await UsuariosGD.getAll();
        setUsuariosAsociados(
          usuarios.filter((u) => u.CompaniaID === tituloSeguro)
        );

        const areas = await Areas.getAll();
        setAreasAsociadas(
          (areas ?? []).filter((a: any) => a.NombreCompania === tituloSeguro)
        );
      } catch (err) {
        console.error("❌ Error cargando info de compañía:", err);
        setError("Error obteniendo información asociada.");
      }
    })();
  }, [abierto, UsuariosGD, Areas, tituloSeguro]);

  /*===============================================================
    Eliminar compañía
  ===============================================================*/
  const handleEliminar = async () => {
    setError(null);

    // 1️⃣ No se permite eliminar si hay áreas
    if (areasAsociadas.length > 0) {
      setError(
        `No puedes eliminar la compañía porque tiene ${areasAsociadas.length} área(s) asociada(s).`
      );
      return;
    }

    // 2️⃣ Confirmación adicional si tiene usuarios
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

      // 3️⃣ Resetear usuarios asociados
      for (const u of usuariosAsociados) {
        await UsuariosGD.upsertByCorreo({
          Nombre: u.Title || u.Correo,
          Correo: u.Correo,
          Rol: "SinAcceso",
          CompaniaID: undefined,
          AreaID: undefined,
        });
      }

      // 4️⃣ Eliminar carpeta + registro
      await CompaniasService.deleteWithFolder(compania.Id ?? "", tituloSeguro);

      // 5️⃣ Avisar al padre
      if (compania.Id) {
        onEliminada(compania.Id);
      }

      // 6️⃣ 🔥 REFRESCAR NAVBAR PARA QUE SE ACTUALICE EN TIEMPO REAL
      triggerRefresh();

      // 7️⃣ Cerrar modal
      onCerrar();

    } catch (err) {
      console.error("❌ Error eliminando compañía:", err);
      setError("Error al eliminar la compañía.");
    } finally {
      setLoading(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Eliminar Compañía</h2>
          <button className="close-btn" onClick={onCerrar}>✕</button>
        </div>

        <div className="modal-body">
          <p>
            ¿Deseas eliminar la compañía <strong>{tituloSeguro}</strong>?
          </p>

          <ul style={{ marginTop: ".5rem" }}>
            <li>Usuarios asociados: <strong>{usuariosAsociados.length}</strong></li>
            <li>Áreas asociadas: <strong>{areasAsociadas.length}</strong></li>
          </ul>

          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button onClick={onCerrar} className="btn-cancelar" disabled={loading}>
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            className="btn-crear btn-accion-eliminar"
            disabled={loading}
          >
            {loading
              ? "Eliminando..."
              : segundaConfirmacion
              ? "Eliminar definitivamente"
              : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
