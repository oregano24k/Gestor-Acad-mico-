import React from 'react';
import type { PensumClass } from '../types';

interface PensumTableViewProps {
  pensum: (PensumClass & { status: string; finalGrade: number | null; statusColor: string })[];
}

const PensumTableView: React.FC<PensumTableViewProps> = ({ pensum }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">Código</th>
            <th scope="col" className="px-6 py-3">Asignatura</th>
            <th scope="col" className="px-6 py-3 text-center">Créditos</th>
            <th scope="col" className="px-6 py-3 text-center">Nota Final</th>
            <th scope="col" className="px-6 py-3 text-center">Estado</th>
          </tr>
        </thead>
        <tbody>
          {pensum.map((cls) => (
            <tr key={cls.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              <td className="px-6 py-4 font-mono">{cls.code || '-'}</td>
              <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                {cls.name}
              </th>
              <td className="px-6 py-4 text-center">{cls.credits}</td>
              <td className="px-6 py-4 text-center font-medium">
                {cls.finalGrade ?? '-'}
              </td>
              <td className={`px-6 py-4 text-center font-semibold ${cls.statusColor}`}>
                {cls.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PensumTableView;