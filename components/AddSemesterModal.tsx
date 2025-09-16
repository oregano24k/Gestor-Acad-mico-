import React, { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface AddSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSemester: (name: string) => void;
}

const AddSemesterModal: React.FC<AddSemesterModalProps> = ({ isOpen, onClose, onAddSemester }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddSemester(name);
      setName('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Nuevo Cuatrimestre">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="semesterName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nombre del Cuatrimestre
            </label>
            <input
              type="text"
              id="semesterName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
              placeholder="Ej. 2024-03"
              required
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Agregar Cuatrimestre
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSemesterModal;
