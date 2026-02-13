
import React, { useState, useEffect } from 'react';
import { Animal, LogType, LogEntry, AnimalCategory, HealthCondition, HealthRecordType } from '../types';
import { X, Check, Utensils, Scale, Heart, Plane, Trophy, Star, Thermometer, Camera, MapPin, CloudSun, Wind, Droplets, ArrowLeftRight, Sparkles, Clock, Sun, Moon, FileText, Pill, Trash2, Plus, ListFilter, Microscope, Target } from 'lucide-react';
import { getCurrentWeather } from '../services/weatherService';

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

const generateUniqueId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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

const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const AddEntryModal: React.FC<AddEntryModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, animal, initialType = LogType.FEED, existingLog, foodOptions, feedMethods, defaultNotes, initialDate 
}) => {
  const [logFormType, setLogFormType] = useState<LogType>(initialType);
  const [logDate, setLogDate] = useState(initialDate || getLocalToday());
  const [logTime, setLogTime] = useState(new Date().toTimeString().slice(0, 5));
  const [logNotes, setLogNotes] = useState('');
  const [logInitials, setLogInitials] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);

  const [feedType, setFeedType] = useState('');
  const [feedQuantity, setFeedQuantity] = useState('');
  const [feedMethod, setFeedMethod] = useState('');
  const [mammalDiet, setMammalDiet] = useState<{id: string, quantity: string, item: string}[]>([{ id: generateUniqueId(), quantity: '', item: '' }]);
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
  const [bodyPart, setBodyPart] = useState('');
  
  const [medName, setMedName] = useState('');
  const [medBatch, setMedBatch] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medRoute, setMedRoute] = useState('');
  const [medFrequency, setMedFrequency] = useState('SID (Once daily)');
  const [medEndDate, setMedEndDate] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  const [sampleType, setSampleType] = useState('');
  const [labResult, setLabResult] = useState('');

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
    return isExotic ? allTypes.filter(type => ![LogType.FLIGHT, LogType.TRAINING, LogType.WEATHERING, LogType.ENRICHMENT].includes(type)) : allTypes;
  }, [isExotic]);

  useEffect(() => {
    if (isOpen && !existingLog && (logFormType === LogType.FLIGHT || logFormType === LogType.WEIGHT || logFormType === LogType.WEATHERING)) {
        const fetchWeather = async () => {
            if (logDate === getLocalToday()) {
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
                    setMammalDiet(parts.map(p => {
                        const subParts = p.split(' ');
                        return { id: generateUniqueId(), quantity: subParts[0] || '', item: subParts.slice(1).join(' ') || '' };
                    }));
                } else {
                    const parts = existingLog.value.split(' ');
                    setFeedQuantity(parts[0] || '');
                    setFeedType(parts.slice(1).join(' ') || '');
                }
            }
            if (existingLog.type === LogType.WEIGHT) setWeightValue(existingLog.weightGrams?.toString() || existingLog.value);
            if (existingLog.type === LogType.HEALTH) {
                setHealthType(existingLog.healthType || HealthRecordType.OBSERVATION);
                setHealthCondition(existingLog.condition || HealthCondition.HEALTHY);
                setHealthBcs(existingLog.bcs?.toString() || '');
                setHealthFeather(existingLog.featherCondition || '');
                setBodyPart(existingLog.bodyPart || '');
                if (existingLog.healthType === HealthRecordType.MEDICATION) {
                    setMedName(existingLog.medicationName || '');
                    setMedDosage(existingLog.medicationDosage || '');
                    setMedRoute(existingLog.medicationRoute || '');
                    setMedFrequency(existingLog.medicationFrequency || 'SID (Once daily)');
                    setMedEndDate(existingLog.medicationEndDate || '');
                }
            }
            if (existingLog.type === LogType.TEMPERATURE) {
                setTempBasking(existingLog.baskingTemp?.toString() || '');
                setTempCool(existingLog.coolTemp?.toString() || '');
                setTempAmbient(existingLog.temperature?.toString() || '');
            }
        } else {
            setLogFormType(initialType);
            setLogDate(initialDate || getLocalToday());
            setLogTime(new Date().toTimeString().slice(0, 5));
            setLogNotes(defaultNotes || '');
            setLogInitials('');
            setAttachment(null);
            setGenericValue('');
            setFeedType(''); setFeedQuantity(''); setFeedMethod(''); setHasCast('');
            setMammalDiet([{ id: generateUniqueId(), quantity: '', item: '' }]);
            setWeightValue(''); setWeightPounds('0'); setWeightOunces('0'); setWeightEighths('0');
            setHealthType(HealthRecordType.OBSERVATION); setHealthCondition(HealthCondition.HEALTHY);
            setHealthBcs(''); setHealthFeather(''); setBodyPart('');
            setMedName(''); setMedDosage(''); setMedRoute(''); setMedFrequency('SID (Once daily)'); setMedEndDate('');
            setTempBasking(''); setTempCool(''); setTempAmbient('');
        }
    }
  }, [isOpen, existingLog, initialType, defaultNotes, initialDate, animal.category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let value = '';
    let weightGrams: number | undefined = undefined;

    if (logFormType === LogType.FEED) {
        if (animal.category === AnimalCategory.MAMMALS) {
            value = mammalDiet.filter(d => d.item && d.quantity).map(d => `${d.quantity} ${d.item}`).join(', ');
        } else value = `${feedQuantity} ${feedType}`.trim();
    } else if (logFormType === LogType.WEIGHT) {
        if (animal.weightUnit === 'lbs_oz' || animal.weightUnit === 'oz') {
            const lb = animal.weightUnit === 'lbs_oz' ? (parseFloat(weightPounds) || 0) : 0;
            const oz = parseFloat(weightOunces) || 0;
            const eighthsNum = parseInt(weightEighths) || 0;
            const totalOz = (lb * 16) + oz + (eighthsNum / 8);
            weightGrams = parseFloat((totalOz * 28.3495).toFixed(1));
            value = animal.weightUnit === 'lbs_oz' ? `${lb}lb ${oz}${eighthsNum > 0 ? ` ${eighthsNum}/8` : ''}oz` : `${oz}${eighthsNum > 0 ? ` ${eighthsNum}/8` : ''}oz`;
        } else { value = weightValue; weightGrams = parseFloat(weightValue); }
    } else if (logFormType === LogType.HEALTH) {
        value = healthType === HealthRecordType.MEDICATION ? `${medName} (${medDosage})` : genericValue || healthType;
    } else if (logFormType === LogType.TEMPERATURE) value = isExotic ? `B: ${tempBasking}°C C: ${tempCool}°C` : `${tempAmbient}°C`;
    else value = genericValue;

    const dateTime = `${logDate}T${logTime}:00`;
    if (isNaN(new Date(dateTime).getTime())) { alert("Invalid date/time."); return; }

    onSave({
      id: existingLog ? existingLog.id : Date.now().toString(),
      date: dateTime, type: logFormType, value, notes: logNotes, userInitials: logInitials, timestamp: new Date(dateTime).getTime(),
      attachmentUrl: attachment || undefined, weightGrams, feedMethod: logFormType === LogType.FEED ? feedMethod : undefined,
      healthType: logFormType === LogType.HEALTH ? healthType : undefined, condition: logFormType === LogType.HEALTH ? healthCondition : undefined,
      bcs: logFormType === LogType.HEALTH && healthBcs ? parseFloat(healthBcs) : undefined,
      featherCondition: logFormType === LogType.HEALTH ? healthFeather : undefined, bodyPart: logFormType === LogType.HEALTH ? bodyPart : undefined,
      temperature: tempAmbient ? parseFloat(tempAmbient) : undefined, baskingTemp: tempBasking ? parseFloat(tempBasking) : undefined, coolTemp: tempCool ? parseFloat(tempCool) : undefined,
      hasCast: logFormType === LogType.FEED && hasCast ? (hasCast === 'yes') : undefined,
      medicationName: healthType === HealthRecordType.MEDICATION ? medName : undefined,
      medicationDosage: healthType === HealthRecordType.MEDICATION ? medDosage : undefined
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    {logFormType === LogType.FEED && <Utensils className="text-amber-500" size={24} />}
                    {logFormType === LogType.WEIGHT && <Scale className="text-blue-500" size={24} />}
                    {logFormType === LogType.HEALTH && <Heart className="text-rose-500" size={24} />}
                    {logFormType === LogType.TEMPERATURE && <Thermometer className="text-orange-500" size={24} />}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{existingLog ? 'Edit Record' : `Log ${logFormType} Entry`}</h2>
                        <p className="text-sm text-slate-500 font-medium">{animal.name}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto scrollbar-thin">
                {!existingLog && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availableTypes.map(type => (
                            <button key={type} type="button" onClick={() => setLogFormType(type)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase border transition-all ${logFormType === type ? 'bg-blue-600 text-white border-blue-500 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{type}</button>
                        ))}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={logDate} onChange={e => setLogDate(e.target.value)} className={inputClass}/></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Time</label><input type="time" required value={logTime} onChange={e => setLogTime(e.target.value)} className={inputClass}/></div>
                </div>
                {logFormType === LogType.FEED && (
                    <div className="space-y-4 bg-amber-50 p-4 rounded-xl border border-amber-200">
                        {animal.category === AnimalCategory.MAMMALS ? (
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-amber-800 uppercase">Composite Diet Plan</label>
                                {mammalDiet.map((row) => (
                                    <div key={row.id} className="flex gap-2">
                                        <input type="text" placeholder="Qty" value={row.quantity} onChange={(e) => setMammalDiet(prev => prev.map(r => r.id === row.id ? {...r, quantity: e.target.value} : r))} className={inputClass}/>
                                        <select value={row.item} onChange={(e) => setMammalDiet(prev => prev.map(r => r.id === row.id ? {...r, item: e.target.value} : r))} className={inputClass}>
                                            <option value="">Select Item...</option>
                                            {foodOptions[animal.category]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setMammalDiet(prev => prev.filter(r => r.id !== row.id))} className="p-2 text-rose-500"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setMammalDiet(prev => [...prev, {id: generateUniqueId(), quantity: '', item: ''}])} className="text-xs font-bold text-amber-700 flex items-center gap-1"><Plus size={14}/> Add Item</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-amber-800">Quantity</label><input type="number" step="0.1" required value={feedQuantity} onChange={e => setFeedQuantity(e.target.value)} className={inputClass}/></div>
                                <div><label className="block text-xs font-bold text-amber-800">Food Item</label><select required value={feedType} onChange={e => setFeedType(e.target.value)} className={inputClass}><option value="">Select...</option>{foodOptions[animal.category]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                            </div>
                        )}
                        {animal.category === AnimalCategory.RAPTORS && (
                            <div><label className="block text-xs font-bold text-amber-800">Cast Produced? *</label><select required value={hasCast} onChange={e => setHasCast(e.target.value)} className={inputClass}><option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option></select></div>
                        )}
                    </div>
                )}
                {logFormType === LogType.WEIGHT && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        {animal.weightUnit?.includes('oz') ? (
                            <div className="grid grid-cols-3 gap-2">
                                <div><label className="text-xs font-bold text-blue-800">Lbs</label><input type="number" value={weightPounds} onChange={e => setWeightPounds(e.target.value)} className={inputClass}/></div>
                                <div><label className="text-xs font-bold text-blue-800">Oz</label><input type="number" value={weightOunces} onChange={e => setWeightOunces(e.target.value)} className={inputClass}/></div>
                                <div><label className="text-xs font-bold text-blue-800">Eighths</label><select value={weightEighths} onChange={e => setWeightEighths(e.target.value)} className={inputClass}>{[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n.toString()}>.{n}/8</option>)}</select></div>
                            </div>
                        ) : <div><label className="text-xs font-bold text-blue-800">Weight (g)</label><input type="number" step="0.1" required value={weightValue} onChange={e => setWeightValue(e.target.value)} className={inputClass}/></div>}
                    </div>
                )}
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes / Observations</label><textarea rows={3} value={logNotes} onChange={e => setLogNotes(e.target.value)} className={`${inputClass} resize-none`} placeholder="Details..."/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Logged By (Initials)</label><input type="text" required maxLength={3} value={logInitials} onChange={e => setLogInitials(e.target.value.toUpperCase())} className={inputClass}/></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Photo Attachment</label><label className="cursor-pointer bg-slate-100 p-2 rounded-lg flex items-center justify-center gap-2 border border-slate-200"><Camera size={16}/> {attachment ? 'Update' : 'Upload'}<input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setAttachment(await resizeImage(f)); }} className="hidden" /></label></div>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-200">
                    {existingLog && onDelete ? <button type="button" onClick={() => onDelete(existingLog.id)} className="text-rose-600 font-bold">Delete Record</button> : <div></div>}
                    <div className="flex gap-3"><button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Record</button></div>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AddEntryModal;
