
import React, { useState, useMemo } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import type { Student, Semester, PensumClass } from '../types';

interface AddFromPensumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClasses: (pensumClassIds: string[]) => void;
  student: Student;
  activeSemesterId: string | null;
}

const AddFromPensumModal: React.FC<AddFromPensumModalProps> = ({ isOpen, onClose, onAddClasses, student, activeSemesterId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeSemester = useMemo(() => {
    return student.semesters.find(s => s.id === activeSemesterId);
  }, [student, activeSemesterId]);

  const availableClasses = useMemo(() => {
    if (!student.pensum || !activeSemester) return [];

    const classIdsInSemester = new Set(activeSemester.classes.map(c => c.pensumClassId));
    
    return student.pensum
      .filter(pc => !classIdsInSemester.has(pc.id))
      .filter(pc => 
        pc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pc.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [student.pensum, activeSemester, searchTerm]);
  
  const handleToggleSelection = (pensumClassId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pensumClassId)) {
        newSet.delete(pensumClassId);
      } else {
        newSet.add(pensumClassId);
      }
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size > 0) {
      onAddClasses(Array.from(selectedIds));
      handleClose();
    }
  };

  const handleClose = () => {
      setSearchTerm('');
      setSelectedIds(new Set());
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Añadir Asignaturas del Pensum">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
          />
          <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
            {availableClasses.length > 0 ? (
                <ul>
                {availableClasses.map(pc => (
                    <li key={pc.id} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700">
                    <label className={`flex items-center p-3 cursor-pointer transition-colors ${selectedIds.has(pc.id) ? 'bg-blue-50 dark:bg-blue-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <input
                        type="checkbox"
                        checked={selectedIds.has(pc.id)}
                        onChange={() => handleToggleSelection(pc.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="ml-3 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{pc.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">{pc.code} &middot; {pc.credits} Créditos</p>
                        </div>
                    </label>
                    </li>
                ))}
                </ul>
            ) : (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>No hay más asignaturas disponibles en el pensum para añadir a este cuatrimestre.</p>
                </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.size} seleccionada(s)</p>
          <div className="flex space-x-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={selectedIds.size === 0}>
              Añadir Selección
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddFromPensumModal;
