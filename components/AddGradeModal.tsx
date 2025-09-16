
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface AddGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGrade: (description: string, score: number) => void;
}

const AddGradeModal: React.FC<AddGradeModalProps> = ({ isOpen, onClose, onAddGrade }) => {
  const [description, setDescription] = useState('');
  const [score, setScore] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
        setDescription('');
        setScore('');
        setError('');
    }
  }, [isOpen]);
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setDescription(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const scoreNum = parseInt(score, 10);

    if (description.trim() && !isNaN(scoreNum)) {
      if (scoreNum < 0 || scoreNum > 35) {
        setError('La calificación debe estar entre 0 y 35.');
        return;
      }
      onAddGrade(description, scoreNum);
      onClose();
    } else {
        setError('Todos los campos son obligatorios y la calificación debe ser un número entero.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Calificación">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descripción
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
              placeholder="Ej. Primer Parcial"
              required
            />
          </div>
          <div>
            <label htmlFor="score" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Calificación
            </label>
            <input
              type="number"
              id="score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
              placeholder="Ej. 30"
              min="0"
              max="35"
              step="1"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Agregar Calificación
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddGradeModal;