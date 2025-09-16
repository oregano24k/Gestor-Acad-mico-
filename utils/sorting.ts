import type { Semester } from '../types';

const getSortableValue = (name: string): (number | string)[] => {
    const ordinalMap: { [key: string]: number } = {
        'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4, 'quinto': 5,
        'sexto': 6, 'séptimo': 7, 'septimo': 7, 'octavo': 8, 'noveno': 9, 'décimo': 10, 'decimo': 10,
        'undécimo': 11, 'undecimo': 11, 'duodécimo': 12, 'duodecimo': 12
    };

    const lowerName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const yearMatch = name.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

    let ordinal = 0;

    // Check for ordinal words
    for (const word in ordinalMap) {
        if (lowerName.includes(word)) {
            ordinal = ordinalMap[word];
            break;
        }
    }

    // If no word found, check for numeric parts
    if (ordinal === 0) {
        // Check for 'YYYY-XX' or 'YYYY.XX' format
        const periodMatch = name.match(/\b\d{4}[-.](\d{1,2})\b/);
        if (periodMatch) {
            ordinal = parseInt(periodMatch[1], 10);
        } else {
            // Check for standalone numbers that could be ordinals
            const numberMatch = lowerName.match(/(\d+)/);
            if (numberMatch) {
                const num = parseInt(numberMatch[1], 10);
                // Heuristic: if it's a small number, it's likely an ordinal. Exclude years.
                if (num > 0 && num < 100 && num !== year) {
                    ordinal = num;
                }
            }
        }
    }
    
    // Sort by year, then by ordinal. Fallback to the original name.
    return [year, ordinal, name];
};

export const semesterSorter = (a: Pick<Semester, 'name'>, b: Pick<Semester, 'name'>): number => {
    const valA = getSortableValue(a.name);
    const valB = getSortableValue(b.name);

    const yearA = valA[0] as number;
    const yearB = valB[0] as number;
    if (yearA !== yearB) {
        return yearA - yearB;
    }

    const ordinalA = valA[1] as number;
    const ordinalB = valB[1] as number;
    if (ordinalA !== ordinalB) {
        return ordinalA - ordinalB;
    }

    return String(valA[2]).localeCompare(String(valB[2]));
};
