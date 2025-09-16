
import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Student, Class, Semester, PensumClass, GradeConcept } from '../types';
import ClassCard from './ClassCard';
import Button from './common/Button';
import BookOpenIcon from './icons/BookOpenIcon';
import PlusIcon from './icons/PlusIcon';
import ScheduleView from './ScheduleView';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import ViewColumnsIcon from './icons/ViewColumnsIcon';
import GPACalculatorView from './GPACalculatorView';
import CalculatorIcon from './icons/CalculatorIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import { getGradePoints } from '../utils/grades';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardDocumentListIcon from './icons/ClipboardDocumentListIcon';
import SparklesIcon from './icons/SparklesIcon';
import { semesterSorter } from '../utils/sorting';

type EnrichedClass = Class & Omit<PensumClass, 'id'>;

interface StudentDetailsProps {
  student: Student;
  selectedSemesterId: string | null;
  onSelectSemester: (id: string | null) => void;
  onAddSemester: () => void;
  onOpenAddFromPensumModal: () => void;
  onUpdateGrade: (semesterId: string, classId: string, concept: GradeConcept, score: number | null) => void;
  onRemoveClassFromSemester: (payload: { semesterId: string; classId: string; }) => void;
  onOpenEditClassModal: (classData: EnrichedClass) => void;
  onOpenImportClassModal: () => void;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ 
  student, 
  selectedSemesterId,
  onSelectSemester,
  onAddSemester,
  onOpenAddFromPensumModal,
  onUpdateGrade, 
  onRemoveClassFromSemester, 
  onOpenEditClassModal,
  onOpenImportClassModal
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'schedule' | 'gpa'>('cards');
  const [isExporting, setIsExporting] = useState(false);
  
  const hasSemesters = useMemo(() => student.semesters && student.semesters.length > 0, [student.semesters]);

  useEffect(() => {
    if (hasSemesters) {
      const currentSelectionIsValid = student.semesters.some(s => s.id === selectedSemesterId);
      if (!selectedSemesterId || !currentSelectionIsValid) {
        // Sort semesters by name to select the latest one as default
        const sortedSemesters = [...student.semesters].sort(semesterSorter);
        onSelectSemester(sortedSemesters[sortedSemesters.length - 1].id);
      }
    } else if (selectedSemesterId) {
      onSelectSemester(null);
    }
  }, [student, selectedSemesterId, onSelectSemester, hasSemesters]);
  
  const selectedSemester = useMemo(() => {
    return student.semesters?.find(s => s.id === selectedSemesterId) || null;
  }, [student.semesters, selectedSemesterId]);

  const classesWithDetails: EnrichedClass[] = useMemo(() => {
    if (!selectedSemester || !student.pensum) return [];
    const pensumMap = new Map(student.pensum.map(pc => [pc.id, pc]));
    return selectedSemester.classes
      .map(c => {
        const pensumClass = pensumMap.get(c.pensumClassId);
        if (!pensumClass) return null;
        const { id: pensumId, ...restOfPensum } = pensumClass;
        return {
            ...c,
            ...restOfPensum
        };
      })
      .filter((c): c is EnrichedClass => c !== null);
  }, [selectedSemester, student.pensum]);


  const gpa = useMemo(() => {
    if (classesWithDetails.length === 0) return '0.00';
    
    let totalQualityPoints = 0;
    let totalCredits = 0;

    classesWithDetails.forEach(cls => {
        const scores = Object.values(cls.grades);
        if (scores.length > 0) {
            const finalScore = scores.reduce((sum, score) => sum + (score || 0), 0);
            const gradePoints = getGradePoints(finalScore);
            totalQualityPoints += gradePoints * cls.credits;
            totalCredits += cls.credits;
        }
    });

    return totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : '0.00';
  }, [classesWithDetails]);
  
  const overallGpa = useMemo(() => {
    if (!student?.semesters || student.semesters.length === 0 || !student.pensum) return '0.00';
    const pensumMap = new Map(student.pensum.map(p => [p.id, p]));

    let totalQualityPoints = 0;
    let totalCredits = 0;

    student.semesters.forEach(semester => {
        semester.classes.forEach(clsInstance => {
            const scores = Object.values(clsInstance.grades);
            if(scores.length > 0) {
                const pensumData = pensumMap.get(clsInstance.pensumClassId);
                if (!pensumData) return;

                const finalScore = scores.reduce((sum, score) => sum + (score || 0), 0);
                const gradePoints = getGradePoints(finalScore);
                totalQualityPoints += gradePoints * pensumData.credits;
                totalCredits += pensumData.credits;
            }
        });
    });

    return totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : '0.00';
  }, [student.semesters, student.pensum]);

  const handleExportPDF = async () => {
      const scheduleElement = document.querySelector<HTMLElement>('.printable-area');
      if (!scheduleElement) return;

      setIsExporting(true);

      try {
        const printHeader = scheduleElement.querySelector<HTMLElement>('.print-header');
        if (printHeader) {
          printHeader.style.display = 'block';
        }

        const canvas = await html2canvas(scheduleElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        });

        if (printHeader) {
          printHeader.style.display = 'none';
        }

        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = 297; const pdfHeight = 210;
        const imgWidth = canvas.width; const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        let finalImgWidth = pdfWidth - 20; let finalImgHeight = finalImgWidth / ratio;
        if (finalImgHeight > pdfHeight - 20) {
            finalImgHeight = pdfHeight - 20;
            finalImgWidth = finalImgHeight * ratio;
        }
        const xOffset = (pdfWidth - finalImgWidth) / 2;
        const yOffset = (pdfHeight - finalImgHeight) / 2;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight);
        const studentName = student.name.replace(/\s/g, '_');
        const semesterName = selectedSemester?.name.replace(/\s/g, '_') || 'Horario';
        pdf.save(`${studentName}_${semesterName}.pdf`);

      } catch(error) {
        console.error("Error exporting to PDF:", error);
      } finally {
        setIsExporting(false);
      }
    };

  if (!student) {
    return (
      <div className="flex-grow h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900/50">
          <BookOpenIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Bienvenido al Gestor Académico</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Selecciona un alumno de la lista o agrega uno nuevo para empezar.</p>
      </div>
    );
  }
  
  const viewButtonClasses = (isActive: boolean) => 
    `p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="flex-grow h-full overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-4 md:p-8">
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{student.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
              {hasSemesters && (
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex items-center">
                    <button onClick={() => setViewMode('cards')} className={viewButtonClasses(viewMode === 'cards')} aria-label="Vista de tarjetas"><ViewColumnsIcon className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('schedule')} className={viewButtonClasses(viewMode === 'schedule')} aria-label="Vista de horario"><CalendarDaysIcon className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('gpa')} className={viewButtonClasses(viewMode === 'gpa')} aria-label="Vista de calculadora"><CalculatorIcon className="w-5 h-5" /></button>
                </div>
              )}
              {viewMode === 'schedule' && hasSemesters && (
                <Button onClick={handleExportPDF} variant="secondary" disabled={isExporting}>
                   {isExporting ? <><SpinnerIcon className="w-5 h-5" /> Exportando...</> : <><ArrowDownTrayIcon className="w-5 h-5" /> Exportar PDF</>}
                </Button>
              )}
               <Button onClick={onOpenImportClassModal} disabled={!selectedSemesterId || viewMode === 'gpa'} variant="secondary">
                <SparklesIcon className="w-5 h-5"/> Importar con IA
              </Button>
               <Button onClick={onOpenAddFromPensumModal} disabled={!selectedSemesterId || viewMode === 'gpa'}>
                <ClipboardDocumentListIcon className="w-5 h-5"/> Añadir del Pensum
              </Button>
          </div>
        </div>
        
        {hasSemesters && (
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
            <label htmlFor="semester-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Cuatrimestre:</label>
            <select
              id="semester-select" value={selectedSemesterId || ''} onChange={(e) => onSelectSemester(e.target.value)}
              className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
            >
              {[...student.semesters].sort(semesterSorter).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button onClick={onAddSemester} variant="secondary"> <PlusIcon className="w-4 h-4" /> </Button>
          </div>
        )}
      </div>

      {!hasSemesters ? (
        <div className="text-center py-16 px-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">¡Empecemos por el Pensum!</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Este perfil de alumno está vacío. El primer paso es cargar el pensum académico.
            <br />
            Utiliza el botón <strong>Configuración</strong> en el panel de alumnos para importar todas las asignaturas.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-4">
              {selectedSemester && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <div>
                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Índice Cuatrimestral</h4>
                          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{gpa}</p>
                      </div>
                  </div>
              )}
              {student.semesters && student.semesters.length > 0 && (
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <div>
                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Índice General</h4>
                          <p className="text-4xl font-bold text-green-600 dark:text-green-400">{overallGpa}</p>
                      </div>
                  </div>
              )}
          </div>

          {classesWithDetails.length > 0 ? (
            viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {classesWithDetails.map(cls => (
                    <ClassCard 
                      key={cls.id} 
                      classData={cls} 
                      onUpdateGrade={(classId, concept, score) => selectedSemesterId && onUpdateGrade(selectedSemesterId, classId, concept, score)}
                      onRemoveClass={(classId) => selectedSemesterId && onRemoveClassFromSemester({ semesterId: selectedSemesterId, classId })}
                      onEditClass={onOpenEditClassModal}
                    />
                ))}
              </div>
            ) : viewMode === 'schedule' ? (
              <div className="printable-area">
                  <div className="print-header">
                      <h1>{student.name}</h1>
                      {selectedSemester && <p>{selectedSemester.name}</p>}
                  </div>
                  <ScheduleView classes={classesWithDetails} />
              </div>
            ) : (
              <GPACalculatorView classes={classesWithDetails} />
            )
          ) : (
            <div className="text-center py-16 px-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">Cuatrimestre Vacío</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Usa el botón <strong>"Añadir del Pensum"</strong> para empezar a planificar este cuatrimestre.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentDetails;
