import React, { useMemo } from 'react';
import type { Class, Schedule } from '../types';

interface ScheduleViewProps {
  // FIX: Update the `classes` prop to include the `name` property, which is part of the enriched class data passed to this component.
  classes: (Class & { name: string })[];
}

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const START_HOUR = 7;
const END_HOUR = 22;
const INTERVAL_MINUTES = 30;

// Generar franjas horarias para las filas del horario
const timeSlots = Array.from({ length: (END_HOUR - START_HOUR) * (60 / INTERVAL_MINUTES) }, (_, i) => {
    const totalMinutes = START_HOUR * 60 + i * INTERVAL_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const formatTimeStr12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hourString, minute] = time24.split(':');
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour || 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
};

// Helper para convertir la hora "HH:mm" a un índice de franja horaria
const timeToSlotIndex = (time: string): number => {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + minute;
    const startMinutes = START_HOUR * 60;
    return Math.floor((totalMinutes - startMinutes) / INTERVAL_MINUTES);
};

interface GridCell {
    classInfo: { name: string; color: { screen: string; print: string }; };
    scheduleInfo: Schedule;
    rowspan: number;
}
type CellData = GridCell | { isSpanned: true } | null;

const ScheduleView: React.FC<ScheduleViewProps> = ({ classes }) => {
  const colorPalette = useMemo(() => [
    { screen: 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 text-blue-800 dark:text-blue-200', print: 'class-cell-blue' },
    { screen: 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200', print: 'class-cell-green' },
    { screen: 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 text-yellow-800 dark:text-yellow-200', print: 'class-cell-yellow' },
    { screen: 'bg-purple-100 dark:bg-purple-900/50 border-purple-500 text-purple-800 dark:text-purple-200', print: 'class-cell-purple' },
    { screen: 'bg-pink-100 dark:bg-pink-900/50 border-pink-500 text-pink-800 dark:text-pink-200', print: 'class-cell-pink' },
    { screen: 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 text-indigo-800 dark:text-indigo-200', print: 'class-cell-indigo' },
    { screen: 'bg-teal-100 dark:bg-teal-900/50 border-teal-500 text-teal-800 dark:text-teal-200', print: 'class-cell-teal' },
  ], []);

  const classColors = useMemo(() => {
    const colorMap = new Map<string, {screen: string, print: string}>();
    classes.forEach((cls, index) => {
      colorMap.set(cls.id, colorPalette[index % colorPalette.length]);
    });
    return colorMap;
  }, [classes, colorPalette]);

  const scheduleGrid = useMemo(() => {
    const grid: CellData[][] = Array.from({ length: timeSlots.length }, () =>
        Array(diasSemana.length).fill(null)
    );

    classes.forEach(cls => {
        const color = classColors.get(cls.id) || { screen: '', print: '' };
        cls.schedule.forEach(s => {
            const dayIndex = diasSemana.indexOf(s.day);
            if (dayIndex === -1) return;

            const startSlot = timeToSlotIndex(s.startTime);
            const endSlot = timeToSlotIndex(s.endTime);
            const rowspan = endSlot - startSlot;

            if (rowspan > 0 && startSlot >= 0 && endSlot <= timeSlots.length) {
                grid[startSlot][dayIndex] = {
                    classInfo: { name: cls.name, color },
                    scheduleInfo: s,
                    rowspan,
                };
                for (let i = startSlot + 1; i < endSlot; i++) {
                    grid[i][dayIndex] = { isSpanned: true };
                }
            }
        });
    });

    return grid;
  }, [classes, classColors]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
      <table className="w-full min-w-[1000px] border-collapse text-center">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50">
            <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 p-3 font-semibold text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 w-24">Hora</th>
            {diasSemana.map(day => (
              <th key={day} className="p-3 font-semibold text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time, slotIndex) => (
            <tr key={time} className="h-8">
              {slotIndex % 2 === 0 && (
                <td 
                  rowSpan={2}
                  className="sticky left-0 z-10 bg-white dark:bg-gray-800 p-2 font-medium text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 align-top"
                >
                  {formatTimeStr12Hour(time)}
                </td>
              )}
              {diasSemana.map((day, dayIndex) => {
                const cellData = scheduleGrid[slotIndex][dayIndex];
                if (!cellData) {
                  return <td key={day} className="border border-gray-200 dark:border-gray-700"></td>;
                }
                if ('isSpanned' in cellData && cellData.isSpanned) {
                  return null;
                }
                if ('classInfo' in cellData) {
                  const cellColor = cellData.classInfo.color;
                  return (
                    <td 
                      key={day} 
                      className={`class-cell border border-gray-200 dark:border-gray-700 align-top relative border-l-4 ${cellColor.screen} ${cellColor.print}`}
                      rowSpan={cellData.rowspan}
                    >
                      <div className="p-2 text-left text-xs h-full flex flex-col">
                        <div>
                          <p className="font-bold">{cellData.classInfo.name}</p>
                        </div>
                        {cellData.rowspan > 1 &&
                          <p className="font-medium mt-auto opacity-80">
                            {formatTimeStr12Hour(cellData.scheduleInfo.startTime)} - {formatTimeStr12Hour(cellData.scheduleInfo.endTime)}
                          </p>
                        }
                      </div>
                    </td>
                  );
                }
                return null;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleView;