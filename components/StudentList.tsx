

import React from 'react';
import type { Student } from '../types';
import UserIcon from './icons/UserIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import Cog6ToothIcon from './icons/Cog6ToothIcon';

interface StudentListProps {
  students: Student[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  onAddStudent: () => void;
  onDeleteStudent: (id: string) => void;
  onSwitchToSettingsView: () => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, selectedStudentId, onSelectStudent, onAddStudent, onDeleteStudent, onSwitchToSettingsView }) => {
  return (
    <div className="w-full md:w-80 bg-white dark:bg-gray-800 shadow-lg h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alumnos</h2>
            <button 
              onClick={onAddStudent} 
              className="p-2 rounded-full text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/80 transition-colors">
              <PlusIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        {students.length > 0 ? (
          <ul>
            {students.map(student => (
              <li key={student.id}>
                <button
                  onClick={() => onSelectStudent(student.id)}
                  className={`w-full text-left p-4 flex items-center gap-4 transition-colors duration-200 ${
                    selectedStudentId === student.id 
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <UserIcon className="w-8 h-8 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                  <div className="flex-grow">
                    <span className="font-semibold block">{student.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteStudent(student.id); }} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                      <TrashIcon className="w-5 h-5" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="mb-4">No hay alumnos registrados.</p>
            <p>Haz clic en el botón '+' para agregar el primero.</p>
          </div>
        )}
      </div>
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <button
          onClick={onSwitchToSettingsView}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Abrir configuración"
        >
          <Cog6ToothIcon className="w-6 h-6" />
          <span className="font-semibold">Configuración</span>
        </button>
      </div>
    </div>
  );
};

export default StudentList;