import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface AddPensumClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPensumClass: (name: string, credits: number, code: string) => void;
}

const AddPensumClassModal: React.FC<AddPensumClassModalProps> = ({ isOpen, onClose, onAddPensumClass }) => {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!isOpen) {
        setName('');
        setCredits('');
        setCode('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const creditsNum = parseInt(credits, 10);
    if (name.trim() && !isNaN(creditsNum) && creditsNum >= 0) {
      onAddPensumClass(name.trim(), creditsNum, code.trim());
      onClose();
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Asignatura al Pensum">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="pensumClassName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la Asignatura</label>
            <input type="text" id="pensumClassName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white" placeholder="Ej. Cálculo Diferencial" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="pensumClassCredits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Créditos</label>
                <input type="number" id="pensumClassCredits" value={credits} onChange={(e) => setCredits(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white" placeholder="Ej. 4" min="0" required />
            </div>
            <div>
                <label htmlFor="pensumClassCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código (Opcional)</label>
                <input type="text" id="pensumClassCode" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white" placeholder="Ej. MAT-101" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Agregar al Pensum
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPensumClassModal;
