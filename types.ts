export interface Schedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

// Represents a class definition from the academic curriculum (pensum).
export interface PensumClass {
  id: string;
  name: string;
  code?: string;
  credits: number;
}

export enum GradeConcept {
  ACUMULADO_P1 = 'ACUMULADO_P1',
  PRIMER_PARCIAL = 'PRIMER_PARCIAL',
  SEGUNDO_PARCIAL = 'SEGUNDO_PARCIAL',
  EXAMEN_FINAL = 'EXAMEN_FINAL',
}

export const gradeConceptInfo: { [key in GradeConcept]: { label: string; max: number } } = {
  [GradeConcept.ACUMULADO_P1]: { label: 'Acumulado Primer Parcial 15', max: 15 },
  [GradeConcept.PRIMER_PARCIAL]: { label: 'Primer Parcial 20', max: 20 },
  [GradeConcept.SEGUNDO_PARCIAL]: { label: 'Segundo Parcial 35', max: 35 },
  [GradeConcept.EXAMEN_FINAL]: { label: 'Examen Final 30', max: 30 },
};

export type GradeSheet = {
  [key in GradeConcept]?: number;
};


// Represents an instance of a PensumClass being taken in a specific semester.
export interface Class {
  id: string; // Unique ID for this specific instance in the semester
  pensumClassId: string; // Foreign key to the PensumClass
  schedule: Schedule[];
  grades: GradeSheet;
}

export interface Semester {
  id: string;
  name: string;
  classes: Class[];
}

export interface Student {
  id: string;
  name: string;
  semesters: Semester[];
  pensum: PensumClass[];
}

export interface ParsedClass {
  className: string;
  classCode: string;
  credits: number;
  semester: string;
}