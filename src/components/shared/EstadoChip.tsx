interface EstadoChipProps {
  activo: boolean;
}

export default function EstadoChip({ activo }: EstadoChipProps) {
  return (
    <span className={`estado ${activo ? "activo" : "inactivo"}`}>
      {activo ? "Activa" : "Inactiva"}
    </span>
  );
}
