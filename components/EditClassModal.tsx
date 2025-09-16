import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import type { Class, Schedule } from '../types';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditClass: (classId: string, name: string, credits: number, schedule: Omit<Schedule, 'id'>[]) => void;
  // FIX: Update prop type to include `name` and `credits` for pre-filling the form.
  classToEdit: Class & { name: string; credits: number };
}

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const EditClassModal: React.FC<EditClassModalProps> = ({ isOpen, onClose, onEditClass, classToEdit }) => {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(0);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleTimes, setScheduleTimes] = useState<{ [key: string]: { startTime: string; endTime: string } }>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && classToEdit) {
      setName(classToEdit.name);
      setCredits(classToEdit.credits);
      const days = classToEdit.schedule.map(s => s.day);
      setSelectedDays(days);
      const times = classToEdit.schedule.reduce((acc, s) => {
        acc[s.day] = { startTime: s.startTime, endTime: s.endTime };
        return acc;
      }, {} as { [key: string]: { startTime: string; endTime: string } });
      setScheduleTimes(times);
      setError('');
    }
  }, [isOpen, classToEdit]);

  const handleDayChange = (day: string) => {
    setSelectedDays(prev => {
      const newSelectedDays = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      const newScheduleTimes = { ...scheduleTimes };
      if (!newSelectedDays.includes(day)) {
        delete newScheduleTimes[day];
      }
      setScheduleTimes(newScheduleTimes);
      return newSelectedDays;
    });
  };

  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setScheduleTimes(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        startTime: prev[day]?.startTime || '',
        endTime: prev[day]?.endTime || '',
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (name.trim() && credits >= 0 && selectedDays.length > 0) {
      const incompleteSchedule = selectedDays.some(day => !scheduleTimes[day]?.startTime || !scheduleTimes[day]?.endTime);
      if (incompleteSchedule) {
        setError('Debes especificar una hora de inicio y fin para cada día seleccionado.');
        return;
      }
      
      for (const day of selectedDays) {
        const { startTime, endTime } = scheduleTimes[day];
        if (startTime >= endTime) {
            setError(`En ${day}, la hora de fin debe ser posterior a la hora de inicio.`);
            return;
        }
      }

      const newSchedule = selectedDays.map(day => ({
        day,
        startTime: scheduleTimes[day].startTime,
        endTime: scheduleTimes[day].endTime,
      }));

      onEditClass(classToEdit.id, name, credits, newSchedule);
    } else if (selectedDays.length === 0) {
        setError('Debes seleccionar al menos un día para el horario.');
    } else {
        setError('Por favor, completa todos los campos correctamente.');
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Asignatura">
       <div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="editClassName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la Asignatura</label>
                  <input type="text" id="editClassName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white" required />
                </div>
                <div>
                    <label htmlFor="editClassCredits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Créditos</label>
                     <input
                        type="number"
                        id="editClassCredits"
                        value={credits}
                        onChange={(e) => setCredits(parseInt(e.target.value, 10) || 0)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                        min="0"
                        required
                    />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Días de Clase</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {diasSemana.map(day => (
                        <label key={day} className={`flex items-center justify-center p-2 text-sm rounded-md cursor-pointer border transition-colors ${selectedDays.includes(day) ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                            <input type="checkbox" checked={selectedDays.includes(day)} onChange={() => handleDayChange(day)} className="sr-only" />
                            {day.substring(0,3)}
                        </label>
                    ))}
                  </div>

                  {selectedDays.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Define los horarios</h4>
                        {selectedDays.sort((a,b) => diasSemana.indexOf(a) - diasSemana.indexOf(b)).map(day => (
                            <div key={day} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-x-3 gap-y-2 items-center">
                               <label className="font-medium text-sm text-gray-800 dark:text-gray-200">{day}</label>
                               <div className="flex items-center gap-2">
                                 <label htmlFor={`editStartTime-${day}`} className="text-xs text-gray-500 dark:text-gray-400">Inicio:</label>
                                 <input 
                                   type="time" 
                                   id={`editStartTime-${day}`}
                                   value={scheduleTimes[day]?.startTime || ''}
                                   onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                                   className="block w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-white"
                                   required
                                 />
                               </div>
                               <div className="flex items-center gap-2">
                                 <label htmlFor={`editEndTime-${day}`} className="text-xs text-gray-500 dark:text-gray-400">Fin:</label>
                                 <input 
                                   type="time" 
                                   id={`editEndTime-${day}`}
                                   value={scheduleTimes[day]?.endTime || ''}
                                   onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                                   className="block w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm text-gray-900 dark:text-white"
                                   required
                                 />
                               </div>
                            </div>
                        ))}
                    </div>
                  )}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Cambios
              </Button>
            </div>
          </form>
       </div>
    </Modal>
  );
};

export default EditClassModal;