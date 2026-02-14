
import { Animal, LogType, LogEntry, HealthRecordType, HealthCondition, AnimalCategory } from "../types";

// Helper to escape CSV fields
const escapeCSV = (str: string | undefined | number) => {
  if (str === undefined || str === null) return '';
  const stringValue = String(str);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Helper to parse a single CSV line respecting quotes
const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            // Check for escaped quote ""
            if (inQuote && line[i + 1] === '"') {
                current += '"';
                i++; // skip next char
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
};

// Helper to parse fractions like "10 3/4" or "3 8 5/8"
const parseFalconryWeight = (str: string): number => {
    // Clean string
    const s = str.trim().replace(/\s+/g, ' ');
    const parts = s.split(' ');
    
    let lbs = 0;
    let oz = 0;
    
    // Check for fraction
    const parsePart = (p: string) => {
        if (p.includes('/')) {
            const [n, d] = p.split('/').map(Number);
            return d !== 0 ? n / d : 0;
        }
        return parseFloat(p) || 0;
    };

    if (parts.length === 3) {
        // "3 8 5/8" -> 3lb 8oz 5/8oz
        lbs = parsePart(parts[0]);
        oz = parsePart(parts[1]) + parsePart(parts[2]);
    } else if (parts.length === 2) {
        // "10 3/4" (Oz) OR "3 8" (Lb Oz)
        // Heuristic: If 2nd part is fraction, assume Oz. If integer, assume Lb Oz.
        if (parts[1].includes('/')) {
             oz = parsePart(parts[0]) + parsePart(parts[1]);
        } else {
             lbs = parsePart(parts[0]);
             oz = parsePart(parts[1]);
        }
    } else if (parts.length === 1) {
        // Single value. If likely lbs (e.g. < 8 and for a big bird) vs oz (e.g. 10). 
        // Without species context, it's safer to check for typical Oz ranges (e.g. 5-50).
        // But some eagles are 8-12 lbs.
        // Actually, mostly typically recorded in Oz unless "3lb".
        // Let's assume Oz for single number.
        oz = parsePart(parts[0]);
    }
    
    return (lbs * 16 + oz) * 28.3495; // Return grams
};

export const exportAnimalsToCSV = (animals: Animal[]): string => {
  const headers = [
    'ID', 'Name', 'Species', 'LatinName', 'Category', 'DOB', 'Location', 
    'Description', 'SpecialRequirements', 'SummerWeight', 'WinterWeight', 'FlyingWeight', 'ImageURL', 'RingNumber',
    'TargetDayTemp', 'TargetNightTemp', 'TargetHumidity', 'MistingFreq', 'WaterType',
    'LogID', 'LogDate', 'LogType', 'LogValue', 'LogNotes', 
    'HealthType', 'HealthCondition', 'BCS', 'FeatherCond', 'Initials', 'Attachment'
  ];

  const rows: string[] = [headers.join(',')];

  animals.forEach(animal => {
    if (animal.logs.length === 0) {
      // Animal with no logs
      rows.push([
        animal.id, animal.name, animal.species, escapeCSV(animal.latinName), animal.category, animal.dob, animal.location,
        escapeCSV(animal.description), escapeCSV(animal.specialRequirements), 
        animal.summerWeight, animal.winterWeight, animal.flyingWeight, escapeCSV(animal.imageUrl), escapeCSV(animal.ringNumber),
        animal.targetDayTemp, animal.targetNightTemp, animal.targetHumidity, escapeCSV(animal.mistingFrequency), escapeCSV(animal.waterType),
        '', '', '', '', '', '', '', '', '', '', ''
      ].join(','));
    } else {
      // One row per log entry
      animal.logs.forEach(log => {
        rows.push([
          animal.id, animal.name, animal.species, escapeCSV(animal.latinName), animal.category, animal.dob, animal.location,
          escapeCSV(animal.description), escapeCSV(animal.specialRequirements), 
          animal.summerWeight, animal.winterWeight, animal.flyingWeight, escapeCSV(animal.imageUrl), escapeCSV(animal.ringNumber),
          animal.targetDayTemp, animal.targetNightTemp, animal.targetHumidity, escapeCSV(animal.mistingFrequency), escapeCSV(animal.waterType),
          log.id, log.date, log.type, escapeCSV(log.value), escapeCSV(log.notes),
          escapeCSV(log.healthType), escapeCSV(log.condition), escapeCSV(log.bcs),
          escapeCSV(log.featherCondition), escapeCSV(log.userInitials), escapeCSV(log.attachmentUrl)
        ].join(','));
      });
    }
  });

  return rows.join('\n');
};

export const parseCSVToAnimals = (csvContent: string): Animal[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const animalsMap = new Map<string, Animal>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const clean = (val: string) => val ? val.trim() : '';

    // Adjust length check based on new columns (19 columns before LogID)
    if (values.length < 10) continue;

    const id = clean(values[0]);
    
    if (!animalsMap.has(id)) {
      animalsMap.set(id, {
        id,
        name: clean(values[1]),
        species: clean(values[2]),
        latinName: clean(values[3]) || undefined,
        category: clean(values[4]) as AnimalCategory,
        dob: clean(values[5]),
        location: clean(values[6]),
        description: clean(values[7]),
        specialRequirements: clean(values[8]),
        summerWeight: Number(clean(values[9])) || undefined,
        winterWeight: Number(clean(values[10])) || undefined,
        flyingWeight: Number(clean(values[11])) || undefined,
        imageUrl: clean(values[12]),
        ringNumber: clean(values[13]) || undefined,
        targetDayTemp: Number(clean(values[14])) || undefined,
        targetNightTemp: Number(clean(values[15])) || undefined,
        targetHumidity: Number(clean(values[16])) || undefined,
        mistingFrequency: clean(values[17]) || undefined,
        waterType: clean(values[18]) || undefined,
        logs: [],
        documents: []
      });
    }

    const logId = clean(values[19]);
    if (logId) {
      const animal = animalsMap.get(id);
      if (animal) {
        animal.logs.push({
          id: logId,
          date: clean(values[20]),
          type: clean(values[21]) as LogType,
          value: clean(values[22]),
          notes: clean(values[23]),
          timestamp: new Date(clean(values[20])).getTime(),
          healthType: clean(values[24]) as HealthRecordType || undefined,
          condition: clean(values[25]) as HealthCondition || undefined,
          bcs: Number(clean(values[26])) || undefined,
          featherCondition: clean(values[27]) || undefined,
          userInitials: clean(values[28]) || undefined,
          attachmentUrl: clean(values[29]) || undefined
        });
      }
    }
  }

  return Array.from(animalsMap.values());
};

// Specialized Parser for Daily Sheets (Format 4)
const parseDailyBirdRecords = (csvContent: string, currentAnimals: Animal[], defaultCategory: AnimalCategory = AnimalCategory.OWLS): Animal[] => {
    // 1. Extract Global Metadata (Date, Weather, Temp)
    const lines = csvContent.split('\n');
    let globalDate = new Date().toISOString().split('T')[0];
    let globalWeather = '';
    let globalTemp = '';
    let globalSignOff = '';

    // Scan for metadata (usually at bottom or top)
    lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('date,') && line.match(/Date,(\d{1,2}\/\d{1,2}\/\d{4})/i)) {
            const match = line.match(/Date,(\d{1,2}\/\d{1,2}\/\d{4})/i);
            if (match) {
                const [d, m, y] = match[1].split('/');
                globalDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
            }
        }
        if (lower.includes('weather,')) {
            const parts = parseCSVLine(line);
            if (parts[1]) globalWeather = parts[1];
        }
        if (lower.includes('tempature') || lower.includes('temperature')) {
             const parts = parseCSVLine(line);
             if (parts[1]) globalTemp = parts[1];
        }
        if (lower.startsWith('sign off')) {
             const parts = parseCSVLine(line);
             if (parts[1]) globalSignOff = parts[1];
        }
    });

    // 2. Find Header Row
    let headerIdx = -1;
    for(let i=0; i<lines.length; i++) {
        if (lines[i].toLowerCase().includes('name,species') || lines[i].toLowerCase().includes('animal name,species')) {
            headerIdx = i;
            break;
        }
    }

    if (headerIdx === -1) return currentAnimals;

    const headers = parseCSVLine(lines[headerIdx]).map(h => h.trim().toLowerCase());
    const idx = {
        name: headers.indexOf('name'),
        species: headers.findIndex(h => h === 'species'),
        weight: headers.findIndex(h => h.includes('weight')),
        feed: headers.findIndex(h => h === 'feed' || h.includes('food')),
        timeFed: headers.findIndex(h => h.includes('time')),
        signOff: headers.findIndex(h => h.includes('sign') || h.includes('initial')),
        notes: headers.indexOf('notes'),
        activities: headers.indexOf('activities'),
        cast: headers.indexOf('cast')
    };

    // Prepare Animal Map
    const animalsMap = new Map<string, Animal>();
    currentAnimals.forEach(a => animalsMap.set(a.name.toLowerCase().trim(), { ...a, logs: [...a.logs] }));

    // 3. Process Rows
    for(let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(',')) continue; // Skip empty rows or meta rows like ",,,,,,"
        
        const cols = parseCSVLine(line);
        // Check if this is a meta row (e.g. Date,...) that we already handled, or just empty data
        if (cols.length < 2 || !cols[idx.name]) continue;
        if (cols[0].toLowerCase().includes('date') || cols[0].toLowerCase().includes('weather')) continue;

        const name = cols[idx.name].trim();
        if (!name) continue;

        let animal = animalsMap.get(name.toLowerCase());
        // Create if missing
        if (!animal) {
             animal = {
                id: `imported_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                name: name,
                species: idx.species > -1 ? cols[idx.species] : 'Unknown',
                category: defaultCategory, // Use passed default
                dob: new Date().toISOString(),
                location: 'Unknown',
                description: 'Imported via Daily Record',
                specialRequirements: '',
                imageUrl: `https://picsum.photos/seed/${name.replace(/\s/g,'')}/400/400`,
                logs: [],
                documents: []
            };
            animalsMap.set(name.toLowerCase(), animal);
        }

        const rowInitials = idx.signOff > -1 && cols[idx.signOff] ? cols[idx.signOff] : (globalSignOff || 'SYS');
        const notesBase = idx.notes > -1 ? cols[idx.notes] : '';
        const activities = idx.activities > -1 ? cols[idx.activities] : '';
        const cast = idx.cast > -1 ? cols[idx.cast] : '';
        
        // --- Weight Log ---
        if (idx.weight > -1 && cols[idx.weight]) {
            const wStr = cols[idx.weight].trim();
            const grams = parseFalconryWeight(wStr);
            if (grams > 0) {
                // Default weight time to 10:00 AM
                const weightTime = "10:00"; 
                const logId = `log_${globalDate}_w_${animal.id}`;
                
                // Deduplicate
                if (!animal.logs.some(l => l.date.startsWith(globalDate) && l.type === LogType.WEIGHT)) {
                    animal.logs.push({
                        id: logId,
                        date: `${globalDate}T${weightTime}:00`,
                        type: LogType.WEIGHT,
                        value: wStr, // Keep original string "10 3/4"
                        weightGrams: grams,
                        notes: `Cast: ${cast}. ${activities}`.trim(),
                        userInitials: rowInitials,
                        timestamp: new Date(`${globalDate}T${weightTime}:00`).getTime(),
                        temperature: globalTemp ? parseFloat(globalTemp) : undefined
                    });
                }
            }
        }

        // --- Feed Log ---
        if (idx.feed > -1 && cols[idx.feed]) {
            const feedStr = cols[idx.feed].trim();
            let timeStr = "17:00"; // Default
            if (idx.timeFed > -1 && cols[idx.timeFed]) {
                // Parse 1230 -> 12:30
                const t = cols[idx.timeFed].trim();
                if (t.length === 4 && !t.includes(':')) {
                    timeStr = `${t.substr(0,2)}:${t.substr(2)}`;
                } else if (t.includes(':')) {
                    timeStr = t;
                }
            }

            const logId = `log_${globalDate}_f_${animal.id}`;
             if (!animal.logs.some(l => l.date.startsWith(globalDate) && l.type === LogType.FEED)) {
                animal.logs.push({
                    id: logId,
                    date: `${globalDate}T${timeStr}:00`,
                    type: LogType.FEED,
                    value: feedStr,
                    notes: notesBase,
                    userInitials: rowInitials,
                    timestamp: new Date(`${globalDate}T${timeStr}:00`).getTime()
                });
            }
        }
    }

    return Array.from(animalsMap.values());
};

// Smart parser for multiple CSV formats (Feeding, Weight, Health, Event)
export const parseSmartCSV = (csvContent: string, currentAnimals: Animal[], defaultCategory: AnimalCategory = AnimalCategory.OWLS): Animal[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return currentAnimals;

  // Check for "Daily Bird Records" Format
  if (csvContent.includes("Daily Bird Records") || csvContent.toLowerCase().includes("time fed")) {
      console.log("Detected Daily Bird Records Format");
      return parseDailyBirdRecords(csvContent, currentAnimals, defaultCategory);
  }

  const clean = (val: string) => val ? val.trim() : '';
  const headers = parseCSVLine(lines[0]).map(clean);

  // Helper to find column index case-insensitively
  const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => n.toLowerCase() === h.toLowerCase()));

  const idx = {
    date: findIdx(['Date', 'date']),
    time: findIdx(['Time', 'time']),
    name: findIdx(['Animal Name', 'Name', 'Animal']),
    species: findIdx(['Species', 'species']),
    category: findIdx(['Category', 'Section']),
    notes: findIdx(['Notes', 'Note', 'Comments']),
    recordedBy: findIdx(['Recorded By', 'Recorder', 'Initials', 'By']),
    
    // Weight specific
    weight: findIdx(['Weight', 'weight']),
    weightGrams: findIdx(['Weight (grams)', 'Weight(g)']),
    
    // Event specific
    eventType: findIdx(['Event Type', 'Type']),
    location: findIdx(['Location', 'Place']),
    duration: findIdx(['Duration (hours)', 'Duration']),
    client: findIdx(['Client Name', 'Client']),
    
    // Health specific
    recordType: findIdx(['Record Type']),
    description: findIdx(['Description']),
    weightExam: findIdx(['Weight on Exam']),
    bcs: findIdx(['Body Condition Score', 'Body Condition', 'BCS']),
    feather: findIdx(['Feather Condition', 'Feathers']),
    condition: findIdx(['Condition Status', 'Condition']),
    medication: findIdx(['Medication']),
    
    // Feeding specific
    foodType: findIdx(['Food Type', 'Food', 'Item']),
    quantity: findIdx(['Quantity', 'Qty', 'Amount'])
  };

  if (idx.name === -1 || idx.date === -1) {
      console.warn("CSV missing required columns (Date, Animal Name)");
      return currentAnimals; // Return original if unknown format
  }

  // Determine Mode based on column presence
  let mode: 'WEIGHT' | 'EVENT' | 'HEALTH' | 'FEED' | 'UNKNOWN' = 'UNKNOWN';
  
  if (idx.weight !== -1 || idx.weightGrams !== -1) mode = 'WEIGHT';
  if (idx.eventType !== -1 && idx.client !== -1) mode = 'EVENT'; // Stronger check for Event
  if (idx.recordType !== -1) mode = 'HEALTH';
  if (idx.foodType !== -1 && idx.quantity !== -1) mode = 'FEED';
  
  // Refine Event vs Weight if vague (Event Type matches Type?)
  if (mode === 'UNKNOWN') {
      if (idx.eventType > -1) mode = 'EVENT';
      else if (idx.weight > -1) mode = 'WEIGHT';
  }

  console.log(`Smart Import Detected Mode: ${mode}`);

  // Create lookup for existing animals to merge
  const animalsMap = new Map<string, Animal>();
  currentAnimals.forEach(a => animalsMap.set(a.name.toLowerCase().trim(), { ...a, logs: [...a.logs] }));

  for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const name = clean(values[idx.name]);
      if (!name) continue;

      let animal = animalsMap.get(name.toLowerCase());
      if (!animal) {
          // Create new if not exists
          animal = {
              id: `imported_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
              name: name,
              species: idx.species > -1 ? clean(values[idx.species]) : 'Unknown',
              category: idx.category > -1 ? (clean(values[idx.category]) as AnimalCategory || defaultCategory) : defaultCategory,
              dob: new Date().toISOString(),
              location: 'Unknown',
              description: 'Imported Record',
              specialRequirements: '',
              imageUrl: `https://picsum.photos/seed/${name.replace(/\s/g,'')}/400/400`,
              logs: [],
              documents: []
          };
          animalsMap.set(name.toLowerCase(), animal);
      }

      // Date Time Construction
      let dateStr = clean(values[idx.date]);
      // Attempt to fix DD/MM/YYYY to YYYY-MM-DD
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = dateStr.split('/');
          dateStr = `${y}-${m}-${d}`;
      }
      
      let timeStr = '12:00';
      if (idx.time > -1 && clean(values[idx.time])) {
          timeStr = clean(values[idx.time]);
      }
      // Basic normalization of time
      if (!timeStr.includes(':') && timeStr.length === 4) timeStr = `${timeStr.substr(0,2)}:${timeStr.substr(2)}`;
      if (!timeStr.includes(':')) timeStr = '12:00';

      const dateTime = `${dateStr}T${timeStr}:00`; 
      const timestamp = new Date(dateTime).getTime();
      if (isNaN(timestamp)) continue; // Skip invalid dates

      const userInitials = idx.recordedBy > -1 ? clean(values[idx.recordedBy]) : 'IMP';
      const baseNotes = idx.notes > -1 ? clean(values[idx.notes]) : '';

      let newLog: LogEntry | null = null;

      if (mode === 'WEIGHT') {
          let grams = 0;
          let valStr = '';
          
          if (idx.weightGrams > -1 && clean(values[idx.weightGrams])) {
              grams = parseFloat(clean(values[idx.weightGrams]));
              valStr = grams.toString();
          } else if (idx.weight > -1) {
              valStr = clean(values[idx.weight]);
              // Try parsing "12.63oz" or "3 8 5/8"
              if (valStr.toLowerCase().includes('oz') || valStr.toLowerCase().includes('lb')) {
                  const oz = parseFloat(valStr.replace(/[^\d.]/g, ''));
                  grams = oz * 28.3495; // Simplified fallback, robust parser is better if needed
              } else {
                  // Try strict falconry parse first
                  const strictGrams = parseFalconryWeight(valStr);
                  if (strictGrams > 0) grams = strictGrams;
                  else grams = parseFloat(valStr);
              }
          }

          if (grams > 0 || valStr) {
              newLog = {
                  id: `log_${timestamp}_w_${Math.random().toString(36).substr(2,4)}`,
                  date: dateTime,
                  type: LogType.WEIGHT,
                  value: valStr || grams.toFixed(1),
                  weightGrams: grams > 0 ? grams : undefined,
                  notes: baseNotes,
                  userInitials,
                  timestamp
              };
          }
      } else if (mode === 'EVENT') {
          const eventType = clean(values[idx.eventType]);
          const loc = idx.location > -1 ? clean(values[idx.location]) : '';
          const dur = idx.duration > -1 ? clean(values[idx.duration]) : '';
          const client = idx.client > -1 ? clean(values[idx.client]) : '';
          
          let notes = baseNotes;
          if (dur) notes += ` Duration: ${dur}h.`;
          if (client) notes += ` Client: ${client}.`;

          newLog = {
              id: `log_${timestamp}_e_${Math.random().toString(36).substr(2,4)}`,
              date: dateTime,
              type: LogType.EVENT,
              value: eventType,
              eventName: eventType,
              eventLocation: loc,
              notes: notes.trim(),
              userInitials,
              timestamp
          };
      } else if (mode === 'HEALTH') {
          const typeStr = clean(values[idx.recordType]);
          const desc = clean(values[idx.description]);
          const condStr = idx.condition > -1 ? clean(values[idx.condition]) : '';
          const weightExam = idx.weightExam > -1 ? clean(values[idx.weightExam]) : '';
          const meds = idx.medication > -1 ? clean(values[idx.medication]) : '';
          
          // Map Type
          let hType = HealthRecordType.OBSERVATION;
          if (typeStr.toLowerCase().includes('exam')) hType = HealthRecordType.EXAMINATION;
          else if (typeStr.toLowerCase().includes('vet')) hType = HealthRecordType.VET_VISIT;
          else if (typeStr.toLowerCase().includes('med')) hType = HealthRecordType.MEDICATION;

          // Map Condition
          let cond = HealthCondition.HEALTHY;
          if (condStr.toLowerCase().includes('monit')) cond = HealthCondition.MONITORING;
          if (condStr.toLowerCase().includes('treat')) cond = HealthCondition.UNDER_TREATMENT;
          if (condStr.toLowerCase().includes('crit')) cond = HealthCondition.CRITICAL;

          let fullNotes = desc;
          if (meds) fullNotes += ` Meds: ${meds}`;
          if (baseNotes) fullNotes += ` ${baseNotes}`;

          // Parse weight if present in health record
          let wGrams = undefined;
          if (weightExam) {
             wGrams = parseFalconryWeight(weightExam);
          }

          newLog = {
              id: `log_${timestamp}_h_${Math.random().toString(36).substr(2,4)}`,
              date: dateTime,
              type: LogType.HEALTH,
              value: desc || typeStr,
              healthType: hType,
              condition: cond,
              bcs: idx.bcs > -1 ? parseFloat(clean(values[idx.bcs])) : undefined,
              featherCondition: idx.feather > -1 ? clean(values[idx.feather]) : undefined,
              weightGrams: wGrams,
              notes: fullNotes.trim(),
              userInitials,
              timestamp
          };
      } else if (mode === 'FEED') {
          const food = clean(values[idx.foodType]);
          const qty = clean(values[idx.quantity]);
          newLog = {
              id: `log_${timestamp}_f_${Math.random().toString(36).substr(2,4)}`,
              date: dateTime,
              type: LogType.FEED,
              value: `${qty} ${food}`.trim(),
              notes: baseNotes,
              userInitials,
              timestamp
          };
      }

      if (newLog) {
          // Deduplicate: Check if a log with same Date, Type and Value exists
          const exists = animal.logs.some(l => 
              l.date === newLog?.date && 
              l.type === newLog.type && 
              l.value === newLog.value
          );
          if (!exists) {
              animal.logs.push(newLog);
          }
      }
  }

  return Array.from(animalsMap.values());
};
