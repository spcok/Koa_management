
/**
 * Optimized weight utility for Kent Owl Academy.
 * Handles precision conversion between grams and imperial falconry units.
 */
export const formatWeightDisplay = (grams: number | undefined, unit: 'g' | 'oz' | 'lbs_oz' = 'g') => {
    if (grams === undefined || grams === null || isNaN(grams) || grams < 0) return '-';
    
    if (unit === 'g') return `${Math.round(grams)}g`;

    // High precision conversion: 1 gram = 0.0352739619 ounces
    const totalOz = grams * 0.0352739619;
    
    // Falconry precision: 1/8th of an ounce increments
    const wholeOz = Math.floor(totalOz);
    const remainder = totalOz - wholeOz;
    let eighths = Math.round(remainder * 8);
    
    let finalOz = wholeOz;
    if (eighths === 8) {
        finalOz += 1;
        eighths = 0;
    }

    const eighthsStr = eighths > 0 ? ` ${eighths}/8` : '';

    if (unit === 'oz') return `${finalOz}${eighthsStr}oz`;

    if (unit === 'lbs_oz') {
        const lbs = Math.floor(finalOz / 16);
        const remOz = finalOz % 16;
        if (lbs === 0) return `${remOz}${eighthsStr}oz`;
        return `${lbs}lb ${remOz}${eighthsStr}oz`;
    }

    return `${Math.round(grams)}g`;
};
