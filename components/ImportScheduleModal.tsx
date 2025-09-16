import React, { useState, useRef, useCallback, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import `Schedule` type to correctly define the prop type for onImportClasses.
import type { Schedule } from '../types';

interface ImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Update prop type to match the shape of the data returned by the AI.
  onImportClasses: (classes: { name: string, credits: number, schedule: Omit<Schedule, 'id'>[] }[]) => void;
}

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({ isOpen, onClose, onImportClasses }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsScanning(false);
            setScanError('');
            setIsDragging(false);
        }
    }, [isOpen]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };
    
    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setScanError('Por favor, selecciona un archivo de imagen válido.');
            return;
        }
        const base64Image = await fileToBase64(file);
        await scanSchedule(base64Image, file.type);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const scanSchedule = async (base64ImageData: string, mimeType: string) => {
        setIsScanning(true);
        setScanError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                  parts: [
                      { inlineData: { data: base64ImageData, mimeType } },
                      { text: "Analiza esta imagen de un horario universitario y extrae todas las asignaturas que encuentres. Para cada asignatura, proporciona el nombre, el número de créditos y una lista de sus horarios semanales. Para cada horario, indica el día de la semana en español (ej. Lunes, Martes), la hora de inicio y la hora de fin en formato HH:mm de 24 horas." }
                  ]
              },
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              className: { type: Type.STRING, description: "El nombre de la asignatura." },
                              credits: { type: Type.NUMBER, description: "El número de créditos." },
                              schedule: {
                                  type: Type.ARRAY,
                                  items: {
                                      type: Type.OBJECT,
                                      properties: {
                                          day: { type: Type.STRING, description: "Día de la semana en español." },
                                          startTime: { type: Type.STRING, description: "Hora de inicio en formato HH:mm." },
                                          endTime: { type: Type.STRING, description: "Hora de fin en formato HH:mm." },
                                      },
                                      required: ['day', 'startTime', 'endTime']
                                  }
                              }
                          },
                           required: ['className', 'credits', 'schedule']
                      }
                  }
              }
            });

            const result = JSON.parse(response.text);
            
            if (Array.isArray(result)) {
                const formattedClasses = result.map((item: any) => ({
                    name: item.className || 'Asignatura Desconocida',
                    credits: item.credits || 0,
                    schedule: (item.schedule || [])
                        .map((s: any) => {
                            const matchedDay = diasSemana.find(d => d.toLowerCase().startsWith(s.day?.toLowerCase().substring(0, 3) || ''));
                            if (matchedDay && s.startTime && s.endTime && s.startTime < s.endTime) {
                                return { day: matchedDay, startTime: s.startTime, endTime: s.endTime };
                            }
                            return null;
                        })
                        .filter((s): s is { day: string, startTime: string, endTime: string } => s !== null),
                }));
                onImportClasses(formattedClasses);
                onClose();
            } else {
                 throw new Error('La respuesta de la IA no tiene el formato esperado.');
            }

        } catch (e) {
            console.error("Error al escanear el horario:", e);
            setScanError('No se pudo analizar el horario. Inténtalo de nuevo con una imagen más clara y bien recortada.');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
  
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Horario con IA">
            <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Sube una captura de pantalla de tu horario y la IA se encargará de añadir todas tus asignaturas automáticamente.
                </p>

                <label 
                    htmlFor="schedule-upload"
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG o WEBP</p>
                    </div>
                    <input id="schedule-upload" ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/png, image/jpeg, image/webp" />
                </label>
                
                {isScanning && (
                    <div className="mt-4 text-center">
                        <div role="status" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                             <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Analizando horario... Esto puede tardar un momento.</span>
                        </div>
                    </div>
                )}
                
                {scanError && <p className="text-sm text-red-500 text-center mt-3">{scanError}</p>}

                <div className="mt-6 flex justify-end">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isScanning}>
                        Cancelar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ImportScheduleModal;