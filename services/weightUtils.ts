
/**
 * Utility for formatting weights according to animal preference.
 * Specifically handles Grams, Ounces, and Lbs/Oz with eighths.
 */
export const formatWeightDisplay = (grams: number | undefined, unit: 'g' | 'oz' | 'lbs_oz' = 'g') => {
    if (grams === undefined || grams === null || isNaN(grams)) return '';
    
    if (unit === 'g') {
        return `${Math.round(grams)}g`;
    }

    // Conversion: 1 gram = 0.035274 ounces
    const totalOz = grams * 0.035274;
    const wholeOz = Math.floor(totalOz);
    const fraction = totalOz - wholeOz;
    
    // Falconry standard uses eighths of an ounce
    let eighths = Math.round(fraction * 8);
    let displayOz = wholeOz;
    let displayEighths = '';
    
    if (eighths === 8) {
        displayOz += 1;
    } else if (eighths > 0) {
        displayEighths = ` ${eighths}/8`;
    }

    if (unit === 'oz') {
        return `${displayOz}${displayEighths}oz`;
    }

    if (unit === 'lbs_oz') {
        const lbs = Math.floor(displayOz / 16);
        const remOz = displayOz % 16;
        if (lbs === 0) {
            return `${remOz}${displayEighths}oz`;
        }
        return `${lbs}lb ${remOz}${displayEighths}oz`;
    }

    return `${Math.round(grams)}g`;
};
