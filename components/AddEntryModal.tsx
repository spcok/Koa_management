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
            if (existingLog.type === LogType.WEIGHT) setWeightValue(existingLog.weightGrams?.toString() || existingLog.value || '');
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

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-black placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition-all uppercase tracking-wider";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden border-2 border-slate-200">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{existingLog ? 'Edit Record' : `Log ${logFormType} Entry`}</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Update: {animal.name}</p>
                </div>
                <button onClick={onClose} className="text-slate-300 hover:text-slate-900 p-2 bg-white rounded-xl shadow-sm border border-slate-200 transition-all"><X size={24}/></button>
            </div>
            
            <form action={formAction} className="p-8 space-y-6 overflow-y-auto scrollbar-hide">
                    {!existingLog && (
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 shadow-inner">
                        <label className={labelClass}>Switch Registry Category</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(Object.values(LogType) as LogType[])
                            .filter(type => {
                                // Filter out Misting and Water for non-Exotics
                                if (animal.category !== AnimalCategory.EXOTICS && (type === LogType.MISTING || type === LogType.WATER)) {
                                    return false;
                                }
                                return true;
                            })
                            .map(type => (
                            <button key={String(type)} type="button" onClick={() => setLogFormType(type)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${logFormType === type ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>{type}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div><label className={labelClass}>Entry Date<input type="date" required value={logDate} onChange={e => setLogDate(e.target.value)} className={inputClass}/></label></div>
                        <div><label className={labelClass}>Entry Time<input type="time" required value={logTime} onChange={e => setLogTime(e.target.value)} className={inputClass}/></label></div>
                    </div>

                    {logFormType === LogType.FEED && (
                      <div className="space-y-6 bg-amber-50/30 p-6 rounded-[2rem] border-2 border-amber-100/50">
                        <div className="grid grid-cols-2 gap-6">
                          <div><label className={labelClass}>Diet Quantity<input type="number" step="0.1" required value={feedQuantity || ''} onChange={e => setFeedQuantity(e.target.value)} className={inputClass}/></label></div>
                          <div><label className={labelClass}>Food Inventory Item<select required value={feedType} onChange={e => setFeedType(e.target.value)} className={inputClass}><option value="">Select...</option>{(foodOptions[animal.category] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></label></div>
                        </div>
                        {(animal.category === AnimalCategory.RAPTORS || animal.category === AnimalCategory.OWLS) && (
                          <div><label className={labelClass}>Statutory Cast Produced?<select required value={hasCast} onChange={e => setHasCast(e.target.value)} className={inputClass}><option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option></select></label></div>
                        )}
                      </div>
                    )}

                    {logFormType === LogType.WEIGHT && (
                      <div className="bg-blue-50/30 p-6 rounded-[2rem] border-2 border-blue-100/50">
                        <label className={labelClass}>Subject Weight ({animal.weightUnit})<input type="number" step="0.1" required value={weightValue} onChange={e => setWeightValue(e.target.value)} className={inputClass}/></label>
                      </div>
                    )}

                    {logFormType === LogType.HEALTH && (
                      <div className="space-y-6 bg-rose-50/30 p-6 rounded-[2rem] border-2 border-rose-100/50">
                        <label className={labelClass}>Clinical Classification<select value={healthType} onChange={e => setHealthType(e.target.value as HealthRecordType)} className={inputClass}>{(Object.values(HealthRecordType) as string[]).map(t=><option key={t} value={t}>{t}</option>)}</select></label>
                        <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm"><label className={labelClass}>Visual Body Condition (Keel)</label><BCSSelector value={healthBcs} onChange={setHealthBcs} /></div>
                      </div>
                    )}

                    <div><label className={labelClass}>Narrative / Clinical Notes<textarea rows={4} value={logNotes} onChange={e => setLogNotes(e.target.value)} className={`${inputClass} normal-case h-32 resize-none font-semibold text-slate-700`} placeholder="Describe observations, health status, or specific actions taken..."/></label></div>

                    <div className="grid grid-cols-2 gap-6">
                        <div><label className={labelClass}>Officer Initials (3 Max)<input type="text" required maxLength={3} value={logInitials} onChange={e => setLogInitials(e.target.value.toUpperCase())} className={inputClass} placeholder="ABC"/></label></div>
                    </div>

                    <div className="flex justify-between items-center pt-8 border-t-2 border-slate-100 mt-4 shrink-0">
                        {existingLog && onDelete ? (
                          <button type="button" onClick={() => { if(window.confirm('Permanently purge this record?')) { onDelete(existingLog.id); onClose(); }}} className="flex items-center gap-2 px-5 py-3 text-rose-600 hover:bg-rose-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                            <Trash2 size={18}/> Purge Entry
                          </button>
                        ) : <div/>}
                        <div className="flex gap-4">
                            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Cancel</button>
                            <button type="submit" disabled={isPending} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-3">
                              {isPending ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}
                              Authorise & Save
                            </button>
                        </div>
                    </div>
            </form>
        </div>
    </div>
  );
};

export default AddEntryModal;