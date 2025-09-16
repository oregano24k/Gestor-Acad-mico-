import React, { useMemo } from 'react';
import type { Class } from '../types';
import { getGradePoints, getLetterGrade } from '../utils/grades';

interface GPACalculatorViewProps {
  // FIX: Update the `classes` prop to include `name` and `credits` properties, which are part of the enriched class data passed to this component.
  classes: (Class & { name: string; credits: number })[];
}

const GPACalculatorView: React.FC<GPACalculatorViewProps> = ({ classes }) => {
  const gpaData = useMemo(() => {
    let totalQualityPoints = 0;
    let totalCreditsForGPA = 0;
    const totalCreditsInSemester = classes.reduce((sum, cls) => sum + cls.credits, 0);

    const classDetails = classes.map(cls => {
      const scores = Object.values(cls.grades);
      const finalScore = scores.reduce((sum, score) => sum + (score || 0), 0);
      const hasGrades = scores.length > 0 && scores.some(s => typeof s === 'number');
      
      const letter = hasGrades ? getLetterGrade(finalScore) : '-';
      const points = hasGrades ? getGradePoints(finalScore) : 0;
      const totalValue = points * cls.credits;

      if (hasGrades) {
        totalQualityPoints += totalValue;
        totalCreditsForGPA += cls.credits;
      }

      return {
        id: cls.id,
        name: cls.name,
        credits: cls.credits,
        grades: cls.grades,
        finalScore: hasGrades ? finalScore : '-',
        letterGrade: letter,
        gradePoints: hasGrades ? points.toFixed(1) : '-',
        totalValue: hasGrades ? totalValue.toFixed(2) : '-',
      };
    });

    const gpa = totalCreditsForGPA > 0 ? (totalQualityPoints / totalCreditsForGPA).toFixed(2) : '0.00';

    return { classDetails, totalCredits: totalCreditsInSemester, totalQualityPoints, gpa };
  }, [classes]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-5">
             <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cálculo de Índice Académico</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Detalle de las calificaciones y créditos para el cuatrimestre actual.
             </p>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Asignatura</th>
              <th scope="col" className="px-6 py-3 text-center">Créditos</th>
              <th scope="col" className="px-6 py-3">Calificaciones</th>
              <th scope="col" className="px-6 py-3 text-center">Nota Final</th>
              <th scope="col" className="px-6 py-3 text-center">Letra</th>
              <th scope="col" className="px-6 py-3 text-center">Valor #</th>
              <th scope="col" className="px-6 py-3 text-center">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {gpaData.classDetails.map((cls) => (
              <tr key={cls.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {cls.name}
                </th>
                <td className="px-6 py-4 text-center">{cls.credits}</td>
                <td className="px-6 py-4 font-mono">
                  {Object.keys(cls.grades).length > 0 ? (
                    <span>
                      {Object.values(cls.grades).filter(v => typeof v === 'number').join(' + ')}
                    </span>
                  ) : (
                    <span className="text-xs italic text-gray-400">Sin calificar</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">{cls.finalScore}</td>
                <td className="px-6 py-4 text-center font-bold">{cls.letterGrade}</td>
                <td className="px-6 py-4 text-center">{cls.gradePoints}</td>
                <td className="px-6 py-4 text-center">{cls.totalValue}</td>
              </tr>
            ))}
            {gpaData.classDetails.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        No hay asignaturas para calcular el índice.
                    </td>
                </tr>
            )}
          </tbody>
           {gpaData.classDetails.length > 0 && (
            <tfoot className="font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700">
                <tr>
                    <td scope="row" className="px-6 py-3 text-base">Totales</td>
                    <td className="px-6 py-3 text-center">{gpaData.totalCredits}</td>
                    <td colSpan={4} className="px-6 py-3"></td>
                    <td className="px-6 py-3 text-center">{gpaData.totalQualityPoints.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-900/50">
                    <td scope="row" colSpan={6} className="px-6 py-4 text-right text-lg font-bold">Índice del Cuatrimestre</td>
                    <td className="px-6 py-4 text-center text-lg font-bold text-blue-600 dark:text-blue-400">{gpaData.gpa}</td>
                </tr>
            </tfoot>
           )}
        </table>
      </div>
    </div>
  );
};

export default GPACalculatorView;