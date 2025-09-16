import React, { useMemo } from 'react';
import type { Class, PensumClass, GradeConcept } from '../types';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import { getLetterGrade } from '../utils/grades';
import { gradeConceptInfo } from '../types';

type EnrichedClass = Class & Omit<PensumClass, 'id'>;

interface ClassCardProps {
  classData: EnrichedClass;
  onUpdateGrade: (classId: string, concept: GradeConcept, score: number | null) => void;
  onRemoveClass: (classId: string) => void;
  onEditClass: (classData: EnrichedClass) => void;
}

const formatTime12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hourString, minute] = time24.split(':');
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour || 12; // Convert hour 0 to 12
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
};


const ClassCard: React.FC<ClassCardProps> = ({ classData, onUpdateGrade, onRemoveClass, onEditClass }) => {

  const finalGrade = useMemo(() => {
    return Object.values(classData.grades).reduce((sum, score) => sum + (score || 0), 0);
  }, [classData.grades]);

  const letterGrade = useMemo(() => {
    if (Object.keys(classData.grades).length === 0) return '';
    return getLetterGrade(finalGrade);
  }, [finalGrade, classData.grades]);

  const handleGradeChange = (concept: GradeConcept, value: string) => {
      const score = parseInt(value, 10);
      const max = gradeConceptInfo[concept].max;
      
      if (value === '') {
          onUpdateGrade(classData.id, concept, null);
      } else if (!isNaN(score) && score >= 0 && score <= max) {
          onUpdateGrade(classData.id, concept, score);
      }
  };
  
  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-blue-500';
    if (grade >= 80) return 'text-green-500';
    if (grade >= 70) return 'text-yellow-500';
    if (grade >= 60) return 'text-orange-500';
    return 'text-red-500';
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-lg flex flex-col">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{classData.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{classData.code} &middot; {classData.credits} Créditos</p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                    {classData.schedule.map(s => (
                        <p key={s.id}>{s.day} &middot; {formatTime12Hour(s.startTime)} - {formatTime12Hour(s.endTime)}</p>
                    ))}
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Nota Final</p>
                <div className="flex items-baseline justify-end gap-2">
                  <p className={`text-3xl font-bold ${getGradeColor(finalGrade)}`}>{finalGrade}</p>
                  {letterGrade && <span className={`text-2xl font-bold ${getGradeColor(finalGrade)}`}>{letterGrade.toUpperCase()}</span>}
                </div>
            </div>
        </div>
      </div>
      <div className="p-5 flex-grow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500 dark:text-gray-400">
                    <tr>
                        <th className="pb-2 font-medium">Concepto</th>
                        <th className="pb-2 font-medium text-right">Calificación</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(gradeConceptInfo).map(([key, config]) => (
                        <tr key={key} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">{config.label}</td>
                            <td className="py-2 text-right">
                                <input
                                    type="number"
                                    min="0"
                                    max={config.max}
                                    value={classData.grades[key as GradeConcept] ?? ''}
                                    onChange={(e) => handleGradeChange(key as GradeConcept, e.target.value)}
                                    className="w-20 px-2 py-1 text-right bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                                    placeholder={`/ ${config.max}`}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      <div className="p-5 bg-gray-50 dark:bg-gray-800/50 flex justify-end items-center">
        <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onEditClass(classData)}>
                <PencilIcon className="w-5 h-5"/>
                Editar
            </Button>
            <Button variant="danger" onClick={() => onRemoveClass(classData.id)}>
                <TrashIcon className="w-5 h-5"/>
                Quitar
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;