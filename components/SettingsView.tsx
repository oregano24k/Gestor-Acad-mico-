import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';

import type { ParsedClass, Student } from '../types';
import Button from './common/Button';
import SpinnerIcon from './icons/SpinnerIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import SparklesIcon from './icons/SparklesIcon';
import PlusIcon from './icons/PlusIcon';
import PensumTableView from './PensumTableView';
import { semesterSorter } from '../utils/sorting';

interface SettingsViewProps {
    students: Student[];
    selectedStudentId: string | null;
    onSelectStudent: (id: string | null) => void;
    onImportPensum: (parsedClasses: ParsedClass[]) => void;
    onBack: () => void;
    onOpenAddPensumClassModal: () => void;
    onOpenImportModal: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ students, selectedStudentId, onSelectStudent, onImportPensum, onBack, onOpenAddPensumClassModal, onOpenImportModal }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedClasses, setParsedClasses] = useState<ParsedClass[] | null>(null);
    const [semesterFilter, setSemesterFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    useEffect(() => {
        setSemesterFilter('all');
        setStatusFilter('all');
    }, [selectedStudentId]);

    const pensumWithData = useMemo(() => {
        if (!selectedStudent) return [];

        const classInstances = new Map<string, { highestScore: number, isTaken: boolean }>();

        selectedStudent.semesters.forEach(semester => {
            semester.classes.forEach(classInstance => {
                const pensumId = classInstance.pensumClassId;
                const currentData = classInstances.get(pensumId) || { highestScore: -1, isTaken: true };
                currentData.isTaken = true;
                
                // FIX: The `grades` property is now an object (GradeSheet), not an array.
                // This updates the logic to correctly calculate the final score from the object.
                const gradeValues = Object.values(classInstance.grades);
                if (gradeValues.length > 0) {
                    const finalScore = gradeValues.reduce((sum, score) => sum + (score || 0), 0);
                    if (finalScore > currentData.highestScore) {
                        currentData.highestScore = finalScore;
                    }
                }
                classInstances.set(pensumId, currentData);
            });
        });

        return selectedStudent.pensum.map(pc => {
            const data = classInstances.get(pc.id);
            let status = 'Pendiente';
            let finalGrade: number | null = null;
            let statusColor = 'text-gray-500 dark:text-gray-400';

            if (data && data.highestScore > -1) {
                finalGrade = data.highestScore;
                if (finalGrade > 70) {
                    status = 'Aprobada';
                    statusColor = 'text-green-600 dark:text-green-400';
                }
                // Otherwise, the status remains 'Pendiente'
            }

            return {
                ...pc,
                status,
                finalGrade,
                statusColor
            };
        }).sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
    }, [selectedStudent]);

    const filteredPensumData = useMemo(() => {
        let filteredData = pensumWithData;

        if (semesterFilter !== 'all' && selectedStudent) {
            const selectedSemester = selectedStudent.semesters.find(s => s.id === semesterFilter);
            if (selectedSemester) {
                const classIdsInSemester = new Set(selectedSemester.classes.map(c => c.pensumClassId));
                filteredData = filteredData.filter(pc => classIdsInSemester.has(pc.id));
            }
        }
        
        if (statusFilter !== 'all') {
            filteredData = filteredData.filter(pc => pc.status === statusFilter);
        }
        
        return filteredData;

    }, [pensumWithData, semesterFilter, statusFilter, selectedStudent]);

    const resetState = () => {
        setIsProcessing(false);
        setError('');
        setIsDragging(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
        setParsedClasses(null);
    }

    const fileToText = async (file: File): Promise<string> => {
        const data = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
        }
        return fullText;
    };
    
    const processFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            setError('Por favor, selecciona un archivo PDF válido.');
            return;
        }
        setError('');
        setIsProcessing(true);
        setParsedClasses(null);

        try {
            const pdfText = await fileToText(file);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                  parts: [
                      { text: `Analiza este texto extraído de un pensum académico en formato PDF. Extrae todas las asignaturas. Para cada una, identifica su nombre (className), código (classCode), la cantidad de créditos (credits) y el cuatrimestre o período al que pertenece (semester). El cuatrimestre suele ser un número o una descripción como 'Primer Cuatrimestre'. El texto es: ${pdfText}` }
                  ]
              },
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              className: { type: Type.STRING, description: "Nombre de la asignatura." },
                              classCode: { type: Type.STRING, description: "Código único de la asignatura." },
                              credits: { type: Type.NUMBER, description: "Número de créditos." },
                              semester: { type: Type.STRING, description: "Cuatrimestre al que pertenece." }
                          },
                           required: ['className', 'classCode', 'credits', 'semester']
                      }
                  }
              }
            });

            const result = JSON.parse(response.text);
            
            if (Array.isArray(result) && result.length > 0) {
                setParsedClasses(result);
            } else {
                 throw new Error('La IA no pudo encontrar asignaturas en el documento o la respuesta no tuvo el formato esperado.');
            }

        } catch (e) {
            console.error("Error al procesar el pensum:", e);
            setError('No se pudo analizar el pensum. Asegúrate de que el PDF contenga texto seleccionable y no solo imágenes.');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleConfirmImport = () => {
        if (parsedClasses) {
            onImportPensum(parsedClasses);
        }
    }

    return (
        <main className="flex-grow h-full overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-4 md:p-8 w-full">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Button variant="secondary" onClick={onBack}>
                        <ArrowLeftIcon className="w-5 h-5"/>
                        Volver
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Importar Pensum Académico (PDF)</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                        Sube el archivo PDF de un pensum. La IA lo analizará para añadir automáticamente todas las asignaturas y cuatrimestres al alumno seleccionado.
                    </p>

                    <div className="mb-6">
                        <label htmlFor="student-select-settings" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Paso 1: Seleccionar Alumno
                        </label>
                        <select
                            id="student-select-settings"
                            value={selectedStudentId || ''}
                            onChange={(e) => {
                                onSelectStudent(e.target.value || null);
                                resetState();
                            }}
                            className="block w-full max-w-sm px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                            disabled={students.length === 0}
                        >
                            <option value="">-- {students.length > 0 ? 'Elige un alumno' : 'No hay alumnos registrados'} --</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {selectedStudentId && (
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Paso 2: Cargar PDF y Revisar
                             </label>
                             {!parsedClasses ? (
                                <div>
                                    <label 
                                        htmlFor="pensum-upload"
                                        className={`mt-2 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                            isDragging 
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <DocumentTextIcon className="w-10 h-10 mb-4 text-gray-400"/>
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">SOLO ARCHIVOS PDF</p>
                                        </div>
                                        <input id="pensum-upload" ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="application/pdf" disabled={isProcessing} />
                                    </label>
                                    
                                    {isProcessing && (
                                        <div className="mt-4 text-center">
                                            <div role="status" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <SpinnerIcon className="w-5 h-5" />
                                                <span>Analizando PDF... Esto puede tardar unos segundos.</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
                                </div>
                             ) : (
                                <div className="mt-2">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Revisa las Asignaturas Encontradas</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Hemos encontrado {parsedClasses.length} asignaturas en el documento. Confirma que los datos son correctos antes de importar.
                                    </p>
                                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3">Asignatura</th>
                                                    <th scope="col" className="px-6 py-3">Código</th>
                                                    <th scope="col" className="px-6 py-3 text-center">Créditos</th>
                                                    <th scope="col" className="px-6 py-3">Cuatrimestre</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedClasses.map((cls, index) => (
                                                <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                    <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{cls.className}</td>
                                                    <td className="px-6 py-4">{cls.classCode}</td>
                                                    <td className="px-6 py-4 text-center">{cls.credits}</td>
                                                    <td className="px-6 py-4">{cls.semester}</td>
                                                </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6 flex justify-end items-center gap-4">
                                        <Button variant="secondary" onClick={resetState}>
                                            Subir otro archivo
                                        </Button>
                                        <Button onClick={handleConfirmImport} disabled={isProcessing}>
                                            Confirmar e Importar
                                        </Button>
                                    </div>
                                </div>
                             )}
                        </div>
                    )}
                </div>

                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Otras Opciones de Gestión del Pensum</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                        Añade asignaturas individuales o importa un horario desde una imagen. Estas acciones modificarán el pensum maestro del alumno seleccionado.
                    </p>
                    <div className="space-y-4 md:space-y-0 md:flex md:gap-4">
                         <div className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Importar Horario con IA</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 my-2">
                                Sube una captura de pantalla de un horario y la IA extraerá las asignaturas y las añadirá al pensum.
                            </p>
                            <Button onClick={onOpenImportModal} disabled={!selectedStudentId} variant="secondary">
                                <SparklesIcon className="w-5 h-5"/>
                                Importar desde Imagen
                            </Button>
                        </div>
                        <div className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Añadir Asignatura Manualmente</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 my-2">
                                Ideal para asignaturas electivas o que no aparecen en el pensum PDF. Se añadirá a la lista maestra.
                            </p>
                            <Button onClick={onOpenAddPensumClassModal} disabled={!selectedStudentId} variant="secondary">
                                <PlusIcon className="w-5 h-5"/>
                                Agregar Manualmente
                            </Button>
                        </div>
                    </div>
                </div>

                {selectedStudent && selectedStudent.pensum.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Pensum Cargado ({filteredPensumData.length} de {selectedStudent.pensum.length} asignaturas)
                            </h2>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="semester-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Cuatrimestre:</label>
                                    <select 
                                        id="semester-filter"
                                        value={semesterFilter}
                                        onChange={(e) => setSemesterFilter(e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                                        disabled={!selectedStudent || selectedStudent.semesters.length === 0}
                                    >
                                        <option value="all">Todos</option>
                                        {[...selectedStudent.semesters].sort(semesterSorter).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                     <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Estado:</label>
                                    <select 
                                        id="status-filter"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="Aprobada">Aprobada</option>
                                        <option value="Pendiente">Pendiente</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                       <PensumTableView 
                            pensum={filteredPensumData} 
                        />
                    </div>
                )}
            </div>
        </main>
    );
};

export default SettingsView;
