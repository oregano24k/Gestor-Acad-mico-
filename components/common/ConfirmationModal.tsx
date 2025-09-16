import React, { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  confirmButtonVariant = 'primary',
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-gray-600 dark:text-gray-400 leading-relaxed">
        {children}
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          {cancelButtonText}
        </Button>
        <Button type="button" variant={confirmButtonVariant} onClick={onConfirm}>
          {confirmButtonText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
