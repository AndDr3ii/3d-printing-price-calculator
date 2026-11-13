import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop confirm-modal-backdrop" onClick={onClose}>
      <div
        className="modal-card confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="confirm-modal-top">
          <div className="confirm-icon-badge" aria-hidden="true">
            <AlertTriangle size={20} />
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="confirm-modal-body">
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h3>
          <p className="confirm-modal-desc">{message}</p>
        </div>

        <div className="confirm-modal-footer">
          <button
            type="button"
            className="btn-secondary confirm-cancel-btn"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-danger confirm-delete-btn"
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            <Trash2 size={15} />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
