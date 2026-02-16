import React, { useState, useEffect, useTransition } from 'react';
import { Animal, LogType, LogEntry, AnimalCategory, HealthCondition, HealthRecordType } from '../types';
import { X, Check, Utensils, Scale, Heart, Plane, Trophy, Star, Thermometer, Camera, MapPin, CloudSun, Wind, Droplets, ArrowLeftRight, Sparkles, Clock, Sun, Moon, FileText, Pill, Trash2, Plus, ListFilter, Loader2 } from 'lucide-react';
import { getCurrentWeather } from '../services/weatherService';
import { DEFAULT_ENRICHMENT_TYPES } from '../constants';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  onDelete?: (id: string) => void;
  animal: Animal;
  initialType?: LogType;
  existingLog?: LogEntry;
  foodOptions: Record<AnimalCategory, string[]>;
  feedMethods: string[];
  defaultNotes?: string;
  initialDate?: string;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 1920;
        const maxHeight = 1080;
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const AddEntryModal: React.FC<AddEntryModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, animal, initialType = LogType.FEED, existingLog, foodOptions, feedMethods, defaultNotes, initialDate 
}) => {
  const [isPending, startTransition] = useTransition();

  const [logFormType, setLogFormType] = useState<LogType>(initialType);
  const [logDate, setLogDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState(new Date().toTimeString().slice(0, 5));
  const [logNotes, setLogNotes] = useState('');
  const [logInitials, setLogInitials] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);

  const [feedType, setFeedType] = useState('');
  const [feedQuantity, setFeedQuantity] = useState('');
  const [feedMethod, setFeedMethod] = useState('');
  const [mammalDiet, setMammalDiet] = useState<{id: number, quantity: string, item: string}[]>([{ id: Date.now(), quantity: '', item: '' }]);
  const [hasCast, setHasCast] = useState<string>('');
  
  const [weightValue, setWeightValue] = useState('');
  const [weightPounds, setWeightPounds] = useState('0');
  const [weightOunces, setWeightOunces] = useState('0');
  const [weightEighths, setWeightEighths] = useState('0');

  const [genericValue, setGenericValue] = useState('');
  const [healthType, setHealthType] = useState<HealthRecordType>(HealthRecordType.OBSERVATION);
  const [healthCondition, setHealthCondition] = useState<HealthCondition>(HealthCondition.HEALTHY);
  const [healthBcs, setHealthBcs] = useState<string>('');
  const [healthFeather, setHealthFeather] = useState('');
  
  const [medName, setMedName] = useState('');
  const [medBatch, setMedBatch] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medRoute, setMedRoute] = useState('');
  const [medFrequency, setMedFrequency] = useState('SID (Once daily)');
  const [medEndDate, setMedEndDate] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  const [flightDuration, setFlightDuration] = useState('');
  const [flightQuality, setFlightQuality] = useState('Good');
  const [gpsData, setGpsData] = useState<string | null>(null);
  const [weatherDesc, setWeatherDesc] = useState('');
  const [windSpeed, setWindSpeed] = useState('');

  const [tempAmbient, setTempAmbient] = useState('');
  const [tempBasking, setTempBasking] = useState('');
  const [tempCool, setTempCool] = useState('');

  const [movementType, setMovementType] = useState<'Acquisition' | 'Disposition' | 'Transfer'>('Transfer');
  const [movementSource, setMovementSource] = useState('');
  const [movementDest, setMovementDest] = useState('');

  const [weatheringStart, setWeatheringStart] = useState('09:00');
  const [weatheringEnd, setWeatheringEnd] = useState('16:00');

  const isExotic = animal.category === AnimalCategory.EXOTICS;
  const inputClass = "w-full px-3 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-shadow";

  const availableTypes = React.useMemo(() => {
    const allTypes = [
        LogType.WEIGHT, LogType.FEED, LogType.HEALTH, 
        LogType.FLIGHT, LogType.ENRICHMENT, LogType.WEATHERING, 
        LogType.TRAINING, LogType.TEMPERATURE, LogType.MISTING, LogType.WATER
    ];

    if (isExotic) {
        return allTypes.filter(type => ![
            LogType.FLIGHT, 
            LogType.TRAINING, 
            LogType.WEATHERING, 
            LogType.ENRICHMENT
        ].includes(type));
    }
    
    return allTypes;
  }, [isExotic]);

  useEffect(() => {
    if (isOpen && !existingLog && (logFormType === LogType.FLIGHT || logFormType === LogType.WEIGHT || logFormType === LogType.WEATHERING)) {
        const fetchWeather = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            if (logDate === todayStr) {
                const data = await getCurrentWeather();
                if (data) {
                    setTempAmbient(data.temperature.toString());
                    if (logFormType === LogType.FLIGHT || logFormType === LogType.WEATHERING) {
                        setWeatherDesc(data.description);
                        setWindSpeed(data.windSpeed.toString());
                    }
                }
            }
        };
        fetchWeather();
    }
  }, [isOpen, existingLog, logFormType, logDate]);

  useEffect(() => {
    if (isOpen) {
        if (existingLog) {
            setLogFormType(existingLog.type);
            const d = new Date(existingLog.date);
            const validDate = isNaN(d.getTime()) ? new Date() : d;
            setLogDate(validDate.toISOString().split('T')[0]);
            setLogTime(validDate.toTimeString().slice(0, 5));
            setLogNotes(existingLog.notes || '');
            setLogInitials(existingLog.userInitials || '');
            setAttachment(existingLog.attachmentUrl || null);
            setGenericValue(existingLog.value);
            
            if (existingLog.type === LogType.FEED) {
                setFeedMethod(existingLog.feedMethod || '');
                setHasCast(existingLog.hasCast === true ? 'yes' : existingLog.hasCast === false ? 'no' : '');
                if (animal.category === AnimalCategory.MAMMALS) {
                    const parts = existingLog.value.split(', ');
                    const rows = parts.map((p, idx) => {
                        const subParts = p.split(' ');
                        const qty = subParts[0] || '';
                        const item = subParts.slice(1).join(' ') || '';
                        return { id: Date.now() + idx, quantity: qty, item: item };
                    });
                    setMammalDiet(rows.length > 0 ? rows : [{ id: Date.now(), quantity: '', item: '' }]);
                } else {
                    const parts = existingLog.value.split(' ');
                    setFeedQuantity(parts[0] || '');
                    setFeedType(parts.slice(1).join(' ') || '');
                }
            }

            if (existingLog.type === LogType.WEIGHT) {
                setWeightValue(existingLog.weightGrams?.toString() || existingLog.value);
            }

            if (existingLog.type === LogType.HEALTH) {
                setHealthType(existingLog.healthType || HealthRecordType.OBSERVATION);
                setHealthCondition(existingLog.condition || HealthCondition.HEALTHY);
                setHealthBcs(existingLog.bcs?.toString() || '');
                setHealthFeather(existingLog.featherCondition || '');
                if (existingLog.healthType === HealthRecordType.MEDICATION) {
                    setMedName(existingLog.medicationName || '');
                    setMedBatch(existingLog.medicationBatch || '');
                    setMedDosage(existingLog.medicationDosage || '');
                    setMedRoute(existingLog.medicationRoute || '');
                    setMedFrequency(existingLog.medicationFrequency || 'SID (Once daily)');
                    setMedEndDate(existingLog.medicationEndDate || '');
                    setPrescribedBy(existingLog.prescribedBy || '');
                }
            }

            if (existingLog.type === LogType.TEMPERATURE) {
                setTempBasking(existingLog.baskingTemp?.toString() || '');
                setTempCool(existingLog.coolTemp?.toString() || '');
                setTempAmbient(existingLog.temperature?.toString() || '');
            }
        } else {
            setLogFormType(initialType);
            const now = new Date();
            setLogDate(initialDate || now.toISOString().split('T')[0]);
            setLogTime(now.toTimeString().slice(0, 5));
            setLogNotes(defaultNotes || '');
            setLogInitials('');
            setAttachment(null);
            setGenericValue('');
            setFeedType('');
            setFeedQuantity('');
            setFeedMethod('');
            setHasCast('');
            setMammalDiet([{ id: Date.now(), quantity: '', item: '' }]);
            setWeightValue('');
            setWeightPounds('0');
            setWeightOunces('0');
            setWeightEighths('0');
            setHealthType(HealthRecordType.OBSERVATION);
            setHealthCondition(HealthCondition.HEALTHY);
            setHealthBcs('');
            setHealthFeather('');
            setMedName('');
            setMedBatch('');
            setMedDosage('');
            setMedRoute('');
            setMedFrequency('SID (Once daily)');
            setMedEndDate('');
            setPrescribedBy('');
            setTempBasking('');
            setTempCool('');
            setTempAmbient('');
        }
    }
  }, [isOpen, existingLog, initialType, defaultNotes, initialDate, animal.category]);

  const updateMammalDietRow = (id: number, field: 'quantity' | 'item', value: string) => {
    setMammalDiet(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeMammalDietRow = (id: number) => {
    setMammalDiet(prev => prev.filter(row => row.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setAttachment(resized);
      } catch (err) {
        console.error("Image processing failed", err);
      }
    }
  };

  const handleDelete = () => {
    if (existingLog && onDelete && window.confirm('Permanently remove this statutory record entry?')) {
        onDelete(existingLog.id);
        onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(() => {
        let value = '';
        let weightGrams: number | undefined = undefined;

        if (logFormType === LogType.FEED) {
            if (animal.category === AnimalCategory.MAMMALS) {
                const validItems = mammalDiet.filter(d => d.item && d.quantity);
                value = validItems.length > 0 ? validItems.map(d => `${d.quantity} ${d.item}`).join(', ') : 'Fed';
            } else { value = `${feedQuantity} ${feedType}`.trim(); }
        } else if (logFormType === LogType.WEIGHT) {
            if (animal.weightUnit === 'lbs_oz' || animal.weightUnit === 'oz') {
                const lb = animal.weightUnit === 'lbs_oz' ? (parseFloat(weightPounds) || 0) : 0;
                const oz = parseFloat(weightOunces) || 0;
                const eighthsNum = parseInt(weightEighths) || 0;
                const totalOz = (lb * 16) + oz + (eighthsNum / 8);
                weightGrams = parseFloat((totalOz * 28.3495).toFixed(1));
                value = animal.weightUnit === 'lbs_oz' ? `${lb}lb ${oz}${eighthsNum > 0 ? ` ${eighthsNum}/8` : ''}oz` : `${oz}${eighthsNum > 0 ? ` ${eighthsNum}/8` : ''}oz`;
            } else {
                value = weightValue;
                weightGrams = parseFloat(weightValue);
            }
        } else if (logFormType === LogType.HEALTH) {
            value = healthType === HealthRecordType.MEDICATION ? `${medName} (${medDosage})` : (genericValue || healthType);
        } else if (logFormType === LogType.FLIGHT) value = `${flightDuration} mins - ${flightQuality}`;
        else if (logFormType === LogType.MOVEMENT) value = `${movementType}: ${movementSource || 'On Site'} -> ${movementDest || 'On Site'}`;
        else if (logFormType === LogType.WEATHERING) value = `${weatheringStart} - ${weatheringEnd}`;
        else if (logFormType === LogType.TEMPERATURE) value = isExotic ? `B: ${tempBasking}°C C: ${tempCool}°C` : `${tempAmbient}°C`;
        else if (logFormType === LogType.MISTING) value = 'Completed - Misting';
        else if (logFormType === LogType.WATER) value = 'Completed - Waters';
        else value = genericValue;

        const dateTime = `${logDate}T${logTime}:00`;
        const timestamp = new Date(dateTime).getTime();
        
        if (isNaN(timestamp)) {
            alert("Invalid Date or Time value.");
            return;
        }

        const newEntry: LogEntry = {
          id: existingLog ? existingLog.id : Date.now().toString(),
          date: dateTime,
          type: logFormType,
          value: value,
          notes: logNotes,
          userInitials: logInitials,
          timestamp: timestamp,
          attachmentUrl: attachment || undefined,
          weightGrams,
          feedMethod: logFormType === LogType.FEED ? feedMethod : undefined,
          healthType: logFormType === LogType.HEALTH ? healthType : undefined,
          condition: logFormType === LogType.HEALTH ? healthCondition : undefined,
          bcs: logFormType === LogType.HEALTH && healthBcs ? parseFloat(healthBcs) : undefined,
          featherCondition: logFormType === LogType.HEALTH ? healthFeather : undefined,
          temperature: tempAmbient ? parseFloat(tempAmbient) : undefined,
          baskingTemp: tempBasking ? parseFloat(tempBasking) : undefined,
          coolTemp: tempCool ? parseFloat(tempCool) : undefined,
          weatherDesc: weatherDesc || undefined,
          windSpeed: windSpeed ? parseFloat(windSpeed) : undefined,
          flightDuration: flightDuration ? parseFloat(flightDuration) : undefined,
          flightQuality: flightQuality || undefined,
          gpsUrl: gpsData || undefined,
          movementType: logFormType === LogType.MOVEMENT ? movementType : undefined,
          movementSource: logFormType === LogType.MOVEMENT ? movementSource : undefined,
          movementDestination: logFormType === LogType.MOVEMENT ? movementDest : undefined,
          weatheringStart: logFormType === LogType.WEATHERING ? weatheringStart : undefined,
          weatheringEnd: logFormType === LogType.WEATHERING ? weatheringEnd : undefined,
          medicationName: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? medName : undefined,
          medicationBatch: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? medBatch : undefined,
          medicationDosage: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? medDosage : undefined,
          medicationRoute: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? medRoute : undefined,
          medicationFrequency: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? medFrequency : undefined,
          medicationEndDate: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? medEndDate : undefined,
          prescribedBy: logFormType === LogType.HEALTH && healthType === HealthRecordType.MEDICATION ? prescribedBy : undefined,
          hasCast: logFormType === LogType.FEED && hasCast ? (hasCast === 'yes') : undefined,
        };
        
        onSave(newEntry);
        onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                        {logFormType === LogType.FEED && <Utensils className="text-amber-500" size={24} />}
                        {logFormType === LogType.WEIGHT && <Scale className="text-blue-500" size={24} />}
                        {logFormType === LogType.HEALTH && <Heart className="text-rose-500" size={24} />}
                        {logFormType === LogType.TEMPERATURE && <Thermometer className="text-orange-500" size={24} />}
                        {logFormType !== LogType.FEED && logFormType !== LogType.WEIGHT && logFormType !== LogType.HEALTH && logFormType !== LogType.TEMPERATURE && <FileText size={24} className="text-slate-500" />}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">{existingLog ? 'Edit Record' : `Log ${logFormType} Entry`}</h2>
                            <p className="text-sm text-slate-500 font-medium">{animal.name}</p>
                        </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    {!existingLog && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-2"><ListFilter size={14}/> Change Entry Type</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {availableTypes.map(type => (
                                    <button key={type} type="button" onClick={() => setLogFormType(type)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all border ${logFormType === type ? 'bg-blue-600 text-white border-blue-500 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{type}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={logDate} onChange={e => setLogDate(e.target.value)} className={inputClass}/></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Time</label><input type="time" required value={logTime} onChange={e => setLogTime(e.target.value)} className={inputClass}/></div>
                    </div>

                    {logFormType === LogType.FEED && (
                        <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                            {animal.category === AnimalCategory.MAMMALS ? (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Diet Composition</label>
                                    <div className="space-y-2">{mammalDiet.map((dietRow) => (<div key={dietRow.id} className="flex gap-2 items-center"><div className="flex-1"><input type="text" placeholder="Qty" value={dietRow.quantity} onChange={(e) => updateMammalDietRow(dietRow.id, 'quantity', e.target.value)} className={inputClass}/></div><div className="flex-[2]"><select value={dietRow.item} onChange={(e) => updateMammalDietRow(dietRow.id, 'item', e.target.value)} className={inputClass}><option value="">Select Item...</option>{(foodOptions[animal.category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>{mammalDiet.length > 1 && (<button type="button" onClick={() => removeMammalDietRow(dietRow.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={18} /></button>)}</div>))}</div>
                                    <button type="button" onClick={() => setMammalDiet([...mammalDiet, {id: Date.now(), quantity: '', item: ''}])} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:text-amber-800 mt-2"><Plus size={14} /> Add Food Item</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label><input type="number" step="0.1" required value={feedQuantity} onChange={e => setFeedQuantity(e.target.value)} className={inputClass} placeholder="1"/></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Food Item</label><select required value={feedType} onChange={e => setFeedType(e.target.value)} className={inputClass}><option value="">Select...</option>{(foodOptions[animal.category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                    </div>
                                    {animal.category === AnimalCategory.RAPTORS && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Cast Produced? *</label>
                                            <select required value={hasCast} onChange={e => setHasCast(e.target.value)} className={inputClass}>
                                                <option value="">Select...</option>
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {logFormType === LogType.WEIGHT && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            {animal.weightUnit === 'lbs_oz' ? (
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lbs</label><input type="number" min="0" value={weightPounds} onChange={e => setWeightPounds(e.target.value)} className={inputClass}/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Oz</label><input type="number" min="0" max="15" value={weightOunces} onChange={e => setWeightOunces(e.target.value)} className={inputClass}/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Eighths</label><select value={weightEighths} onChange={e => setWeightEighths(e.target.value)} className={inputClass}>{[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n.toString()}>.{n}/8</option>)}</select></div>
                                </div>
                            ) : animal.weightUnit === 'oz' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ounces</label><input type="number" min="0" value={weightOunces} onChange={e => setWeightOunces(e.target.value)} className={inputClass}/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Eighths</label><select value={weightEighths} onChange={e => setWeightEighths(e.target.value)} className={inputClass}>{[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n.toString()}>.{n}/8</option>)}</select></div>
                                </div>
                            ) : (
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Weight (g)</label><input type="number" step="0.1" required value={weightValue} onChange={e => setWeightValue(e.target.value)} className={inputClass}/></div>
                            )}
                        </div>
                    )}

                    {logFormType === LogType.TEMPERATURE && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                             {isExotic ? (
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-sm font-medium text-orange-800 mb-1 flex items-center gap-1"><Sun size={14}/> Basking End (°C)</label>
                                         <input type="number" step="0.5" required value={tempBasking} onChange={e => setTempBasking(e.target.value)} className={inputClass} placeholder="32.5"/>
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-orange-800 mb-1 flex items-center gap-1"><Moon size={14}/> Cool End (°C)</label>
                                         <input type="number" step="0.5" required value={tempCool} onChange={e => setTempCool(e.target.value)} className={inputClass} placeholder="22.0"/>
                                     </div>
                                 </div>
                             ) : (
                                 <div>
                                     <label className="block text-sm font-medium text-orange-800 mb-1">Ambient Temperature (°C)</label>
                                     <input type="number" step="0.5" required value={tempAmbient} onChange={e => setTempAmbient(e.target.value)} className={inputClass}/>
                                 </div>
                             )}
                        </div>
                    )}

                    {(logFormType === LogType.MISTING || logFormType === LogType.WATER) && (
                        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 flex items-center justify-center gap-3">
                             <Check className="text-emerald-600" size={32} />
                             <p className="font-bold text-emerald-800 text-lg uppercase tracking-tight">Confirming {logFormType} check for today.</p>
                        </div>
                    )}
                    
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes / Observations</label><textarea rows={3} value={logNotes} onChange={e => setLogNotes(e.target.value)} className={`${inputClass} resize-none`}/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Logged By (Initials)</label><input type="text" required maxLength={3} value={logInitials} onChange={e => setLogInitials(e.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="ABC"/></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Attachment</label><div className="flex items-center gap-2"><label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm flex-1 flex items-center justify-center gap-2 transition-colors border border-slate-200"><Camera size={16}/> {attachment ? 'Change' : 'Upload'}<input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" /></label>{attachment && (<button type="button" onClick={() => setAttachment(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button>)}</div></div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 shrink-0">
                        {existingLog && onDelete ? (
                            <button type="button" onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors">
                                <Trash2 size={18} /> Delete Entry
                            </button>
                        ) : <div></div>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors">Cancel</button>
                            <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                {isPending ? 'Saving...' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
            </form>
        </div>
    </div>
  );
};

export default AddEntryModal;