
import React, { useState, useEffect, useActionState } from 'react';
import { Animal, LogType, LogEntry, AnimalCategory, HealthCondition, HealthRecordType, ShellQuality, EggOutcome, Task } from '../types';
import { X, Check, Utensils, Scale, Heart, Plane, Trophy, Star, Thermometer, Camera, MapPin, CloudSun, Wind, Droplets, ArrowLeftRight, Sparkles, Clock, Sun, Moon, FileText, Pill, Trash2, Plus, ListFilter, Loader2, Egg, AlertTriangle, Ticket, Users } from 'lucide-react';
import { getCurrentWeather } from '../services/weatherService';
import { BCSSelector } from './BCSSelector';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  onAddTask?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onUpdateAnimal?: (animal: Animal) => void;
  animal: Animal;
  allAnimals?: Animal[];
  initialType?: LogType;
  existingLog?: LogEntry;
  foodOptions: Record<AnimalCategory, string[]>;
  feedMethods: string[];
  eventTypes?: string[];
  defaultNotes?: string;
  initialDate?: string;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1920, maxHeight = 1080;
        let { width, height } = img;
        if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }}
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const AddEntryModal: React.FC<AddEntryModalProps> = ({ 
  isOpen, onClose, onSave, onAddTask, onDelete, onUpdateAnimal, animal, allAnimals = [], initialType = LogType.FEED, existingLog, foodOptions, feedMethods, eventTypes = [], defaultNotes, initialDate 
}) => {
  
  const [logFormType, setLogFormType] = useState<LogType>(initialType);
  const [logDate, setLogDate] = useState('');
  const [logTime, setLogTime] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logInitials, setLogInitials] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [feedType, setFeedType] = useState('');
  const [feedQuantity, setFeedQuantity] = useState('');
  const [hasCast, setHasCast] = useState<string>('');
  const [weightValue, setWeightValue] = useState('');
  const [healthType, setHealthType] = useState<HealthRecordType>(HealthRecordType.OBSERVATION);
  const [healthBcs, setHealthBcs] = useState<number>(3);
  const [tempBasking, setTempBasking] = useState('');
  const [tempCool, setTempCool] = useState('');
  const [shellQuality, setShellQuality] = useState<ShellQuality>(ShellQuality.NORMAL);
  const [eventType, setEventType] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [selectedEventAnimals, setSelectedEventAnimals] = useState<string[]>([animal.id]);

  useEffect(() => {
    if (isOpen) {
        if (existingLog) {
            setLogFormType(existingLog.type);
            const d = new Date(existingLog.date);
            setLogDate(d.toISOString().split('T')[0]);
            setLogTime(d.toTimeString().slice(0, 5));
            setLogNotes(existingLog.notes || '');
            setLogInitials(existingLog.userInitials || '');
            if (existingLog.type === LogType.FEED) {
                const parts = existingLog.value.split(' ');
                setFeedQuantity(parts[0] || '');
                setFeedType(parts.slice(1).join(' ') || '');
                setHasCast(existingLog.hasCast === true ? 'yes' : 'no');
            }
            if (existingLog.type === LogType.WEIGHT) setWeightValue(existingLog.weightGrams?.toString() || existingLog.value);
            if (existingLog.type === LogType.HEALTH) { setHealthType(existingLog.healthType || HealthRecordType.OBSERVATION); setHealthBcs(existingLog.bcs || 3); }
            if (existingLog.type === LogType.TEMPERATURE) { setTempBasking(existingLog.baskingTemp?.toString() || ''); setTempCool(existingLog.coolTemp?.toString() || ''); }
            if (existingLog.type === LogType.EGG) setShellQuality(existingLog.shellQuality || ShellQuality.NORMAL);
            if (existingLog.type === LogType.EVENT) { setEventType(existingLog.eventType || ''); setEventStartTime(existingLog.eventStartTime || ''); setEventEndTime(existingLog.eventEndTime || ''); setSelectedEventAnimals(existingLog.eventAnimalIds || [animal.id]); }
        } else {
            setLogFormType(initialType);
            const now = new Date();
            setLogDate(initialDate || now.toISOString().split('T')[0]);
            setLogTime(now.toTimeString().slice(0, 5));
            setLogNotes(defaultNotes || '');
            // Reset other fields
            setFeedType(''); setFeedQuantity(''); setHasCast(''); setWeightValue(''); setHealthType(HealthRecordType.OBSERVATION); setHealthBcs(3); setTempBasking(''); setTempCool(''); setShellQuality(ShellQuality.NORMAL); setEventType(''); setEventStartTime(''); setEventEndTime(''); setSelectedEventAnimals([animal.id]);
        }
    }
  }, [isOpen, existingLog, initialType, defaultNotes, initialDate]);

  const submitAction = async (prevState: any, formDataObj: FormData) => {
    let value = '', weightGrams: number | undefined;
    if (logFormType === LogType.FEED) value = `${feedQuantity} ${feedType}`.trim();
    if (logFormType === LogType.WEIGHT) { value = weightValue; weightGrams = parseFloat(weightValue); }
    if (logFormType === LogType.HEALTH) value = healthType;
    const dateTime = `${logDate}T${logTime}:00`;
    
    const baseEntry: LogEntry = {
      id: existingLog?.id || Date.now().toString(),
      date: dateTime, type: logFormType, value, notes: logNotes, userInitials: logInitials,
      timestamp: new Date(dateTime).getTime(), attachmentUrl: attachment || undefined, weightGrams,
      hasCast: logFormType === LogType.FEED && hasCast ? (hasCast === 'yes') : undefined,
      healthType: logFormType === LogType.HEALTH ? healthType : undefined,
      bcs: logFormType === LogType.HEALTH ? healthBcs : undefined,
      baskingTemp: tempBasking ? parseFloat(tempBasking) : undefined,
      coolTemp: tempCool ? parseFloat(tempCool) : undefined,
      shellQuality: logFormType === LogType.EGG ? shellQuality : undefined,
      eventType: logFormType === LogType.EVENT ? eventType : undefined,
      eventStartTime: logFormType === LogType.EVENT ? eventStartTime : undefined,
      eventEndTime: logFormType === LogType.EVENT ? eventEndTime : undefined,
      eventAnimalIds: logFormType === LogType.EVENT ? selectedEventAnimals : undefined,
    };
    
    if (logFormType === LogType.EVENT && selectedEventAnimals.length > 1 && onUpdateAnimal && !existingLog) {
      selectedEventAnimals.forEach(id => {
          const target = allAnimals.find(a => a.id === id);
          if (target) onUpdateAnimal({ ...target, logs: [{ ...baseEntry, id: `evt_${Date.now()}_${id}` }, ...target.logs] });
      });
    } else {
      onSave(baseEntry);
    }
    onClose();
    return { success: true };
  };

  const [state, formAction, isPending] = useActionState(submitAction, { success: false });

  const inputClass = "w-full px-3 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-shadow";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/0 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{existingLog ? 'Edit Record' : `Log ${logFormType} Entry`} for {animal.name}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
            </div>
            
            <form action={formAction} className="p-6 space-y-5 overflow-y-auto">
                    {/* FIX: Explicitly cast enum values to string array to fix 'unknown' type error in JSX mapping. */}
                    {!existingLog && (<div className="bg-slate-50 p-3 rounded-xl border border-slate-200"><label className="block text-xs font-semibold text-slate-500 mb-2"><ListFilter size={14} className="inline mr-2"/>Change Type</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(Object.values(LogType) as string[]).map(type => (<button key={String(type)} type="button" onClick={() => setLogFormType(type as LogType)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase ${logFormType === type ? 'bg-blue-600 text-white' : 'bg-white'}`}>{type}</button>))}</div></div>)}
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Date<input type="date" required value={logDate} onChange={e => setLogDate(e.target.value)} className={inputClass}/></label></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Time<input type="time" required value={logTime} onChange={e => setLogTime(e.target.value)} className={inputClass}/></label></div>
                    </div>
                    {logFormType === LogType.FEED && (<div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200"><div className="grid grid-cols-2 gap-4"><div><label>Quantity<input type="number" step="0.1" required value={feedQuantity} onChange={e => setFeedQuantity(e.target.value)} className={inputClass}/></label></div><div><label>Food Item<select required value={feedType} onChange={e => setFeedType(e.target.value)} className={inputClass}><option value="">Select...</option>
                        {/* FIX: Explicitly cast foodOptions values to string array to fix 'unknown' type inference issues. */}
                        {(foodOptions[animal.category] || [] as string[]).map(opt => <option key={String(opt)} value={opt as string}>{opt as string}</option>)}
                      </select></label></div></div>{(animal.category === AnimalCategory.RAPTORS || animal.category === AnimalCategory.OWLS) && (<div><label>Cast Produced?<select required value={hasCast} onChange={e => setHasCast(e.target.value)} className={inputClass}><option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option></select></label></div>)}</div>)}
                    {logFormType === LogType.WEIGHT && (<div><label>Weight ({animal.weightUnit})<input type="number" step="0.1" required value={weightValue} onChange={e => setWeightValue(e.target.value)} className={inputClass}/></label></div>)}
                    {logFormType === LogType.HEALTH && (<div className="space-y-4 bg-rose-50 p-4 rounded-lg border border-rose-200"><label>Type<select value={healthType} onChange={e => setHealthType(e.target.value as HealthRecordType)} className={inputClass}>
                        {/* FIX: Explicitly cast enum values to string array to fix 'unknown' type error in JSX mapping. */}
                        {(Object.values(HealthRecordType) as string[]).map(t=><option key={String(t)} value={t}>{t}</option>)}
                      </select></label><label>Body Condition<BCSSelector value={healthBcs} onChange={setHealthBcs} /></label></div>)}
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes<textarea rows={3} value={logNotes} onChange={e => setLogNotes(e.target.value)} className={inputClass}/></label></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label>Logged By (Initials)<input type="text" required maxLength={3} value={logInitials} onChange={e => setLogInitials(e.target.value.toUpperCase())} className={`${inputClass} uppercase`}/></label></div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        {existingLog && onDelete ? (<button type="button" onClick={() => { if(window.confirm('Delete entry?')) { onDelete(existingLog.id); onClose(); }}} className="text-rose-600 font-semibold"><Trash2/></button>) : <div/>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2">
                              {isPending ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                              Save
                            </button>
                        </div>
                    </div>
            </form>
        </div>
    </div>
  );
};

export default AddEntryModal;