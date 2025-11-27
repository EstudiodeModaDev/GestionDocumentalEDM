// ============================================================
// ModalConfirmacion — Modal de confirmación genérico
// ------------------------------------------------------------
// Props:
//  - open: boolean
//  - title: string
//  - message: string
//  - onConfirm: () => void
//  - onCancel: () => void
// ============================================================

import "./ModalConfirmacion.css";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ModalConfirmacion({
  open,
  title = "Confirmar acción",
  message = "¿Estás seguro de continuar?",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: Props) {

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <p>{message}</p>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-secundario" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn-primario" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
