
import { Animal, LogType, LogEntry, HealthRecordType, HealthCondition, AnimalCategory } from "../types";

const escapeCSV = (str: string | undefined | number) => {
  if (str === undefined || str === null) return '';
  const stringValue = String(str);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                current += '"';
                i++;
            } else inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            values.push(current);
            current = '';
        } else current += char;
    }
    values.push(current);
    return values;
};

// Precise Falconry Weight Parser (Lb, Oz, Eighths)
const parseFalconryWeight = (str: string): number => {
    const clean = str.toLowerCase().replace(/[oz|lb|s]/g, '').trim();
    const parts = clean.split(/\s+/);
    
    let lbs = 0, oz = 0, eighths = 0;

    const parsePart = (p: string) => {
        if (p.includes('/')) {
            const [n, d] = p.split('/').map(Number);
            return d !== 0 ? n / d : 0;
        }
        return parseFloat(p) || 0;
    };

    if (parts.length === 3) {
        lbs = parsePart(parts[0]);
        oz = parsePart(parts[1]);
        eighths = parsePart(parts[2]);
    } else if (parts.length === 2) {
        if (parts[1].includes('/')) {
            oz = parsePart(parts[0]);
            eighths = parsePart(parts[1]);
        } else {
            lbs = parsePart(parts[0]);
            oz = parsePart(parts[1]);
        }
    } else if (parts.length === 1) {
        oz = parsePart(parts[0]);
    }

    const totalOz = (lbs * 16) + oz + eighths;
    return totalOz * 28.3495; // Convert to grams
};

export const exportAnimalsToCSV = (animals: Animal[]): string => {
  const headers = ['ID', 'Name', 'Species', 'Latin', 'Category', 'Location', 'LastWeight', 'LastFeed'];
  const rows = [headers.join(',')];
  animals.forEach(a => {
    const lw = a.logs.find(l => l.type === LogType.WEIGHT);
    const lf = a.logs.find(l => l.type === LogType.FEED);
    rows.push([a.id, a.name, a.species, escapeCSV(a.latinName), a.category, a.location, lw?.value || '', escapeCSV(lf?.value)].join(','));
  });
  return rows.join('\n');
};

export const parseSmartCSV = (csvContent: string, currentAnimals: Animal[], defaultCategory: AnimalCategory = AnimalCategory.OWLS): Animal[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return currentAnimals;
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = {
    name: headers.indexOf('name'),
    weight: headers.findIndex(h => h.includes('weight')),
    feed: headers.findIndex(h => h.includes('feed') || h.includes('food')),
    date: headers.indexOf('date')
  };

  const animalsMap = new Map<string, Animal>();
  currentAnimals.forEach(a => animalsMap.set(a.name.toLowerCase(), { ...a, logs: [...a.logs] }));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[idx.name]?.trim();
    if (!name) continue;

    let animal = animalsMap.get(name.toLowerCase());
    if (!animal) continue;

    const date = cols[idx.date] || new Date().toISOString().split('T')[0];
    const weightStr = cols[idx.weight];
    if (weightStr) {
      const grams = parseFalconryWeight(weightStr);
      animal.logs.push({ id: `csv_w_${Date.now()}_${i}`, date: `${date}T10:00:00`, type: LogType.WEIGHT, value: weightStr, weightGrams: grams, timestamp: Date.now() });
    }
  }
  return Array.from(animalsMap.values());
};
