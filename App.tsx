import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Student, Class, GradeSheet, Schedule, Semester, ParsedClass, PensumClass, GradeConcept } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import StudentList from './components/StudentList';
import StudentDetails from './components/StudentDetails';
import AddStudentModal from './components/AddStudentModal';
import AddPensumClassModal from './components/AddPensumClassModal';
import ImportScheduleModal from './components/ImportScheduleModal';
import EditClassModal from './components/EditClassModal';
import ConfirmationModal from './components/common/ConfirmationModal';
import AddSemesterModal from './components/AddSemesterModal';
import SettingsView from './components/SettingsView';
import AddFromPensumModal from './components/AddFromPensumModal';
import ImportClassModal from './components/ImportClassModal';
import { semesterSorter } from './utils/sorting';

type ImportedClass = { name: string; credits: number; schedule: Omit<Schedule, 'id'>[] };

const App: React.FC = () => {
  const [students, setStudents] = useLocalStorage<Student[]>('students', []);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');

  const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [isAddPensumClassModalOpen, setAddPensumClassModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isImportClassModalOpen, setImportClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setEditClassModalOpen] = useState(false);
  const [isAddSemesterModalOpen, setAddSemesterModalOpen] = useState(false);
  const [isAddFromPensumModalOpen, setAddFromPensumModalOpen] = useState(false);
  
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);

  const [studentIdToDelete, setStudentIdToDelete] = useState<string | null>(null);
  const [classToRemove, setClassToRemove] = useState<{ classId: string; semesterId: string; } | null>(null);


  useEffect(() => {
    let studentsToUpdate = students;
    let madeChanges = false;

    // Migration 1: To new Pensum data structure and new GradeSheet.
    const needsPensumMigration = studentsToUpdate.some(s => !(s as any).pensum || (s.semesters.some(sem => sem.classes.some(c => Array.isArray(c.grades)))));
    if (needsPensumMigration) {
      madeChanges = true;
      studentsToUpdate = studentsToUpdate.map(s => {
        const needsGradeMigration = s.semesters.some(sem => sem.classes.some(c => Array.isArray(c.grades)));
        if ((s as any).pensum && !needsGradeMigration) return s; 
        const student = s as any; 
        let semesters = student.semesters || [];
        if (student.classes && (!semesters || semesters.length === 0)) {
          semesters = [{ id: crypto.randomUUID(), name: 'Cuatrimestre General', classes: student.classes }];
        }
        let newPensum = student.pensum || [];
        let pensumMap = new Map<string, string>();
        if (!student.pensum) {
            const allOldClasses = semesters.flatMap((sem: any) => sem.classes || []);
            const uniqueClasses = new Map<string, any>();
            allOldClasses.forEach((c: any) => {
                const key = c.code || c.name;
                if (!uniqueClasses.has(key)) {
                    uniqueClasses.set(key, c);
                }
            });
            uniqueClasses.forEach(oldClass => {
                const key = oldClass.code || oldClass.name;
                const newPensumClass: PensumClass = {
                    id: crypto.randomUUID(),
                    name: oldClass.name,
                    code: oldClass.code,
                    credits: oldClass.credits,
                };
                newPensum.push(newPensumClass);
                pensumMap.set(key, newPensumClass.id);
            });
        }
        const newSemesters = semesters.map((sem: any) => ({
          ...sem,
          classes: (sem.classes || []).map((oldClass: any) => {
            let pensumClassId = oldClass.pensumClassId;
            if(!pensumClassId) {
                const key = oldClass.code || oldClass.name;
                pensumClassId = pensumMap.get(key);
            }
            if (!pensumClassId) return null;
            return {
              id: oldClass.id, 
              pensumClassId,
              schedule: oldClass.schedule,
              grades: {},
            };
          }).filter((c: Class | null): c is Class => c !== null)
        }));
        return {
          id: student.id,
          name: student.name,
          pensum: newPensum,
          semesters: newSemesters,
        };
      });
    }

    // Migration 2: Remove CONTROL_FN grade concept from existing data.
    const keyToRemove = 'CONTROL_FN';
    const needsControlFnMigration = studentsToUpdate.some(s => 
      s.semesters.some(sem => 
        sem.classes.some(c => c.grades && (c.grades as any).hasOwnProperty(keyToRemove))
      )
    );
    if (needsControlFnMigration) {
        madeChanges = true;
        studentsToUpdate = studentsToUpdate.map(student => ({
            ...student,
            semesters: student.semesters.map(semester => ({
                ...semester,
                classes: semester.classes.map(cls => {
                    if (cls.grades && (cls.grades as any).hasOwnProperty(keyToRemove)) {
                        const newGrades = { ...cls.grades };
                        delete (newGrades as any)[keyToRemove];
                        return { ...cls, grades: newGrades };
                    }
                    return cls;
                })
            }))
        }));
    }

    if (madeChanges) {
      setStudents(studentsToUpdate as Student[]);
    }
  }, []);

  const handleAddStudent = (name: string) => {
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name,
      semesters: [],
      pensum: [],
    };
    const updatedStudents = [...students, newStudent];
    setStudents(updatedStudents);
    setSelectedStudentId(newStudent.id);
    setCurrentView('dashboard');
  };
  
  const handleAddSemester = (name: string) => {
    if (!selectedStudentId) return;
    const newSemester: Semester = { id: crypto.randomUUID(), name, classes: [] };
    setStudents(prev => prev.map(s => 
      s.id === selectedStudentId 
        ? { ...s, semesters: [...s.semesters, newSemester] } 
        : s
    ));
    setActiveSemesterId(newSemester.id);
  };

  const handleConfirmDeleteStudent = useCallback(() => {
    if (!studentIdToDelete) return;
    const updatedStudents = students.filter(student => student.id !== studentIdToDelete);
    setStudents(updatedStudents);
    if (selectedStudentId === studentIdToDelete) {
        setSelectedStudentId(updatedStudents.length > 0 ? updatedStudents[0].id : null);
    }
    setStudentIdToDelete(null);
  }, [studentIdToDelete, students, selectedStudentId, setStudents]);

  const handleAddPensumClass = useCallback((name: string, credits: number, code: string) => {
    if (!selectedStudentId) return;
    
    const newPensumClass: PensumClass = {
      id: crypto.randomUUID(),
      name,
      credits,
      code: code || `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    };
    
    setStudents(prev => prev.map(student => {
      if (student.id === selectedStudentId) {
        const isDuplicate = student.pensum.some(pc => 
            (pc.code && code && pc.code.toLowerCase() === code.toLowerCase()) || 
            pc.name.toLowerCase() === name.toLowerCase()
        );
        if (isDuplicate) {
            console.warn("Se intentó agregar una asignatura duplicada al pensum.");
            return student;
        }
        const updatedPensum = [...student.pensum, newPensumClass];
        return { ...student, pensum: updatedPensum };
      }
      return student;
    }));
  }, [selectedStudentId, setStudents]);
  
  const handleAddClassesToSemester = useCallback((pensumClassIds: string[]) => {
      if (!selectedStudentId || !activeSemesterId) return;

      const newClassInstances: Class[] = pensumClassIds.map(pcId => ({
          id: crypto.randomUUID(),
          pensumClassId: pcId,
          schedule: [],
          grades: {},
      }));

      setStudents(prev => prev.map(student => {
          if (student.id === selectedStudentId) {
              const updatedSemesters = student.semesters.map(sem =>
                  sem.id === activeSemesterId ? { ...sem, classes: [...sem.classes, ...newClassInstances] } : sem
              );
              return { ...student, semesters: updatedSemesters };
          }
          return student;
      }));
  }, [selectedStudentId, activeSemesterId, setStudents]);

  const handleOpenEditClassModal = (classData: any) => {
    setEditingClass(classData);
    setEditClassModalOpen(true);
  };

  const handleEditClass = useCallback((classInstanceId: string, name: string, credits: number, schedule: Omit<Schedule, 'id'>[]) => {
    if (!selectedStudentId || !activeSemesterId) return;
    
    setStudents(prev => prev.map(student => {
      if (student.id !== selectedStudentId) return student;

      const semester = student.semesters.find(s => s.id === activeSemesterId);
      const classInstance = semester?.classes.find(c => c.id === classInstanceId);
      if (!classInstance) return student;
      
      const pensumClass = student.pensum.find(p => p.id === classInstance.pensumClassId);
      
      const updatedPensum = pensumClass 
        ? student.pensum.map(p => p.id === pensumClass.id ? {...p, name, credits} : p)
        : student.pensum;
        
      const updatedSemesters = student.semesters.map(s => {
        if (s.id !== activeSemesterId) return s;
        return {
          ...s,
          classes: s.classes.map(c => c.id === classInstanceId ? {...c, schedule: schedule.map(sch => ({...sch, id: crypto.randomUUID()}))} : c)
        }
      });

      return { ...student, pensum: updatedPensum, semesters: updatedSemesters };
    }));
  }, [selectedStudentId, activeSemesterId, setStudents]);
  
  const handleImportClasses = useCallback((importedClasses: ImportedClass[]) => {
    if (!selectedStudentId) return;

    setStudents(prev => prev.map(student => {
        if (student.id !== selectedStudentId) return student;

        const updatedPensum = [...student.pensum];
        const existingNames = new Set(student.pensum.map(pc => pc.name.toLowerCase()));

        importedClasses.forEach(cls => {
            if (!existingNames.has(cls.name.toLowerCase())) {
                const newPensumClass: PensumClass = {
                    id: crypto.randomUUID(),
                    name: cls.name,
                    credits: cls.credits,
                    code: `AI-IMG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
                };
                updatedPensum.push(newPensumClass);
                existingNames.add(newPensumClass.name.toLowerCase());
            }
        });
        
        return { ...student, pensum: updatedPensum };
    }));
  }, [selectedStudentId, setStudents]);
    
  const handleImportClass = useCallback((importedClass: ImportedClass) => {
    if (!selectedStudentId || !activeSemesterId) return;

    setStudents(prev => prev.map(student => {
      if (student.id !== selectedStudentId) return student;
      
      let pensumClassId: string;
      let updatedPensum = [...student.pensum];

      const existingPensumClass = student.pensum.find(pc => pc.name.toLowerCase() === importedClass.name.toLowerCase());

      if (existingPensumClass) {
        pensumClassId = existingPensumClass.id;
      } else {
        const newPensumClass: PensumClass = {
          id: crypto.randomUUID(),
          name: importedClass.name,
          credits: importedClass.credits,
          code: `AI-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        };
        updatedPensum.push(newPensumClass);
        pensumClassId = newPensumClass.id;
      }
      
      const newClassInstance: Class = {
        id: crypto.randomUUID(),
        pensumClassId,
        grades: {},
        schedule: importedClass.schedule.map(s => ({...s, id: crypto.randomUUID()}))
      };
      
      const updatedSemesters = student.semesters.map(semester => {
        if (semester.id === activeSemesterId) {
          return { ...semester, classes: [...semester.classes, newClassInstance] };
        }
        return semester;
      });

      return { ...student, pensum: updatedPensum, semesters: updatedSemesters };
    }));
  }, [selectedStudentId, activeSemesterId, setStudents]);
  
  const handleImportPensum = (parsedClasses: ParsedClass[]) => {
    if (!selectedStudentId) return;

    setStudents(prevStudents => {
      const studentIndex = prevStudents.findIndex(s => s.id === selectedStudentId);
      if (studentIndex === -1) return prevStudents;

      const studentToUpdate = { ...prevStudents[studentIndex] };
      
      const existingPensumCodes = new Set(studentToUpdate.pensum.map(pc => pc.code).filter(Boolean));
      const newPensumClasses: PensumClass[] = [];

      parsedClasses.forEach(p_class => {
        if (!p_class.classCode || !existingPensumCodes.has(p_class.classCode)) {
          const newPc: PensumClass = {
            id: crypto.randomUUID(),
            name: p_class.className,
            code: p_class.classCode,
            credits: p_class.credits,
          };
          newPensumClasses.push(newPc);
          if (newPc.code) existingPensumCodes.add(newPc.code);
        }
      });

      const updatedPensum = [...studentToUpdate.pensum, ...newPensumClasses];
      const pensumMapByCode = new Map(updatedPensum.map(pc => [pc.code, pc]));
      
      const classesBySemesterName = new Map<string, ParsedClass[]>();
      parsedClasses.forEach(cls => {
        const semesterName = cls.semester.trim() || 'Cuatrimestre General';
        if (!classesBySemesterName.has(semesterName)) {
          classesBySemesterName.set(semesterName, []);
        }
        classesBySemesterName.get(semesterName)!.push(cls);
      });

      const existingSemesters = new Map(studentToUpdate.semesters.map(s => [s.name, s]));

      classesBySemesterName.forEach((classesInSemester, semesterName) => {
        const pensumClassesForSemester = classesInSemester
          .map(c => pensumMapByCode.get(c.classCode))
          .filter((pc): pc is PensumClass => !!pc);
        
        const newClassInstances: Class[] = pensumClassesForSemester.map(pc => ({
          id: crypto.randomUUID(),
          pensumClassId: pc.id,
          schedule: [],
          grades: {},
        }));

        if (existingSemesters.has(semesterName)) {
          const semester = existingSemesters.get(semesterName)!;
          const existingPensumClassIds = new Set(semester.classes.map(c => c.pensumClassId));
          const uniqueNewInstances = newClassInstances.filter(inst => !existingPensumClassIds.has(inst.pensumClassId));
          semester.classes.push(...uniqueNewInstances);
        } else {
          const newSemester: Semester = {
            id: crypto.randomUUID(),
            name: semesterName,
            classes: newClassInstances,
          };
          existingSemesters.set(semesterName, newSemester);
        }
      });
      
      studentToUpdate.semesters = Array.from(existingSemesters.values()).sort(semesterSorter);
      studentToUpdate.pensum = updatedPensum;
      
      const newStudents = [...prevStudents];
      newStudents[studentIndex] = studentToUpdate;
      return newStudents;
    });

    setCurrentView('dashboard');
  };

  const handleConfirmRemoveClass = useCallback(() => {
    if (!selectedStudentId || !classToRemove) return;
    const { classId, semesterId } = classToRemove;
    setStudents(prev => prev.map(student => {
      if (student.id === selectedStudentId) {
        const updatedSemesters = student.semesters.map(sem => 
          sem.id === semesterId ? { ...sem, classes: sem.classes.filter(c => c.id !== classId) } : sem
        );
        return { ...student, semesters: updatedSemesters };
      }
      return student;
    }));
    setClassToRemove(null);
  }, [selectedStudentId, classToRemove, setStudents]);
  
  const handleUpdateGrade = useCallback((semesterId: string, classId: string, concept: GradeConcept, score: number | null) => {
    if (!selectedStudentId) return;

    setStudents(prev => prev.map(student => {
        if (student.id !== selectedStudentId) return student;

        const updatedSemesters = student.semesters.map(semester => {
            if (semester.id !== semesterId) return semester;

            const updatedClasses = semester.classes.map(cls => {
                if (cls.id !== classId) return cls;

                const newGrades: GradeSheet = { ...cls.grades };
                if (score === null || isNaN(score)) {
                    delete newGrades[concept];
                } else {
                    newGrades[concept] = score;
                }
                
                return { ...cls, grades: newGrades };
            });

            return { ...semester, classes: updatedClasses };
        });

        return { ...student, semesters: updatedSemesters };
    }));
  }, [selectedStudentId, setStudents]);


  const selectedStudent = useMemo(() => {
    return students.find(student => student.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const studentToDeleteDetails = useMemo(() => {
    if (!studentIdToDelete) return null;
    return students.find(s => s.id === studentIdToDelete);
  }, [studentIdToDelete, students]);

  const classToRemoveDetails = useMemo(() => {
    if (!classToRemove || !selectedStudent) return null;
    const semester = selectedStudent.semesters.find(s => s.id === classToRemove.semesterId);
    const classInstance = semester?.classes.find(c => c.id === classToRemove.classId);
    if (!classInstance) return null;
    return selectedStudent.pensum.find(p => p.id === classInstance.pensumClassId) || null;
  }, [classToRemove, selectedStudent]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row font-sans text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-900">
      {currentView === 'settings' ? (
        <SettingsView 
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
            onImportPensum={handleImportPensum}
            onBack={() => setCurrentView('dashboard')}
            onOpenAddPensumClassModal={() => setAddPensumClassModalOpen(true)}
            onOpenImportModal={() => setImportModalOpen(true)}
        />
      ) : (
        <>
          <StudentList 
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={id => { setSelectedStudentId(id); setActiveSemesterId(null); }}
            onAddStudent={() => setAddStudentModalOpen(true)}
            onDeleteStudent={setStudentIdToDelete}
            onSwitchToSettingsView={() => setCurrentView('settings')}
          />
          <main className="flex-1 flex flex-col overflow-hidden">
            {selectedStudent ? (
              <StudentDetails 
                key={selectedStudent.id}
                student={selectedStudent} 
                selectedSemesterId={activeSemesterId}
                onSelectSemester={setActiveSemesterId}
                onAddSemester={() => setAddSemesterModalOpen(true)}
                onOpenAddFromPensumModal={() => setAddFromPensumModalOpen(true)}
                onUpdateGrade={handleUpdateGrade}
                onRemoveClassFromSemester={setClassToRemove}
                onOpenEditClassModal={handleOpenEditClassModal}
                onOpenImportClassModal={() => setImportClassModalOpen(true)}
              />
            ) : (
                <div className="flex-grow h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v17.792M4.5 5.947h15M14.25 3.104v17.792M19.5 5.947h-15" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.896c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Bienvenido al Gestor Académico</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Selecciona un alumno de la lista o agrega uno nuevo para empezar.</p>
                </div>
            )}
          </main>
        </>
      )}

      <AddStudentModal 
        isOpen={isAddStudentModalOpen}
        onClose={() => setAddStudentModalOpen(false)}
        onAddStudent={handleAddStudent}
      />
      
      {selectedStudent && (
          <>
            <AddSemesterModal
              isOpen={isAddSemesterModalOpen}
              onClose={() => setAddSemesterModalOpen(false)}
              onAddSemester={(name) => { handleAddSemester(name); setAddSemesterModalOpen(false); }}
            />
            <AddPensumClassModal 
              isOpen={isAddPensumClassModalOpen}
              onClose={() => setAddPensumClassModalOpen(false)}
              onAddPensumClass={(name, credits, code) => { handleAddPensumClass(name, credits, code); setAddPensumClassModalOpen(false); }}
            />
            <AddFromPensumModal
              isOpen={isAddFromPensumModalOpen}
              onClose={() => setAddFromPensumModalOpen(false)}
              student={selectedStudent}
              activeSemesterId={activeSemesterId}
              onAddClasses={(pensumClassIds) => { handleAddClassesToSemester(pensumClassIds); setAddFromPensumModalOpen(false); }}
            />
            <ImportScheduleModal
              isOpen={isImportModalOpen}
              onClose={() => setImportModalOpen(false)}
              onImportClasses={(classes) => { handleImportClasses(classes); setImportModalOpen(false); }}
            />
             <ImportClassModal
              isOpen={isImportClassModalOpen}
              onClose={() => setImportClassModalOpen(false)}
              onImportClass={(cls) => { handleImportClass(cls); setImportClassModalOpen(false); }}
            />
            {editingClass && (
              <EditClassModal
                isOpen={isEditClassModalOpen}
                onClose={() => { setEditClassModalOpen(false); setEditingClass(null); }}
                onEditClass={(classId, name, credits, schedule) => { handleEditClass(classId, name, credits, schedule); setEditClassModalOpen(false); setEditingClass(null); }}
                classToEdit={editingClass}
              />
            )}
          </>
      )}

      {studentToDeleteDetails && (
        <ConfirmationModal
          isOpen={!!studentIdToDelete}
          onClose={() => setStudentIdToDelete(null)}
          onConfirm={handleConfirmDeleteStudent}
          title="Confirmar Eliminación de Alumno"
          confirmButtonText="Eliminar Alumno"
          confirmButtonVariant="danger"
        >
          <p>
            ¿Estás seguro de que quieres eliminar a <strong className="font-semibold text-gray-800 dark:text-gray-100">{studentToDeleteDetails.name}</strong>?
            <br />
            Se borrarán todos sus datos. Esta acción es irreversible.
          </p>
        </ConfirmationModal>
      )}

      {classToRemoveDetails && (
        <ConfirmationModal
          isOpen={!!classToRemove}
          onClose={() => setClassToRemove(null)}
          onConfirm={handleConfirmRemoveClass}
          title="Confirmar Acción"
          confirmButtonText="Sí, Quitar"
          confirmButtonVariant="danger"
        >
          <p>
            ¿Estás seguro de que quieres quitar la asignatura <strong className="font-semibold text-gray-800 dark:text-gray-100">{classToRemoveDetails.name}</strong> de este cuatrimestre?
            <br />
            La asignatura permanecerá en tu pensum y podrás volver a añadirla más tarde.
          </p>
        </ConfirmationModal>
      )}
    </div>
  );
};

export default App;
