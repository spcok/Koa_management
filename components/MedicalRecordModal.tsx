
import React, { useState, useRef } from 'react';
import { Animal, LogType, LogEntry, HealthRecordType, HealthCondition, User } from '../types';
import { X, Check, Pill, Skull, Camera, Microscope, Target } from 'lucide-react';

interface MedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: LogEntry, animalId: string, isDeceased: boolean) => void;
  animals: Animal[];
  preSelectedAnimalId?: string;
  currentUser?: User | null;
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
                const maxWidth = 1200;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
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

const MedicalRecordModal: React.FC<MedicalRecordModalProps> = ({ 
  isOpen, onClose, onSave, animals, preSelectedAnimalId, currentUser 
}) => {
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(preSelectedAnimalId || '');
  const [recordType, setRecordType] = useState<HealthRecordType>(HealthRecordType.OBSERVATION);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState<HealthCondition>(HealthCondition.HEALTHY);
  const [logEntry, setLogEntry] = useState('');
  const [bcs, setBcs] = useState(5);
  const [featherCondition, setFeatherCondition] = useState('');
  const [initials, setInitials] = useState(currentUser?.initials || '');
  const [attachment, setAttachment] = useState<string | null>(null);
  
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [bodyPart, setBodyPart] = useState('');
  const [bodyCoords, setBodyCoords] = useState<{x: number, y: number} | undefined>(undefined);
  const mapRef = useRef<HTMLDivElement>(null);

  const [medName, setMedName] = useState('');
  const [medBatch, setMedBatch] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medRoute, setMedRoute] = useState('');
  const [medFrequency, setMedFrequency] = useState('SID');
  const [medEndDate, setMedEndDate] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  const [sampleType, setSampleType] = useState('');
  const [labResult, setLabResult] = useState('');

  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('');

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 transition-all shadow-inner";

  const handleBodyMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setBodyCoords({ x, y });
      
      let region = 'General Body';
      if (y < 25) region = 'Head / Neck';
      else if (y > 75) region = 'Feet / Tail / Lower Body';
      else if (x < 35) region = 'Left Wing / Side';
      else if (x > 65) region = 'Right Wing / Side';
      else region = 'Keel / Torso';
      setBodyPart(region);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimalId || !initials) return;

    const now = Date.now();
    const isDeceased = condition === HealthCondition.DECEASED;
    let val = logEntry || recordType;
    
    if (isDeceased) val = 'DECEASED STATUS';
    else if (recordType === HealthRecordType.MEDICATION) val = `${medName} @ ${medDosage}`;
    else if (recordType === HealthRecordType.PARASITOLOGY) val = `${sampleType}: ${labResult}`;
    
    const healthLog: LogEntry = {
      id: `h_${now}`, date, type: LogType.HEALTH, value: val, notes: logEntry, timestamp: now,
      healthType: recordType, condition, bcs, featherCondition, userInitials: initials, attachmentUrl: attachment || undefined,
      bodyPart: showBodyMap ? bodyPart : undefined, bodyMapCoords: showBodyMap ? bodyCoords : undefined,
      medicationName: recordType === HealthRecordType.MEDICATION ? medName : undefined,
      medicationBatch: recordType === HealthRecordType.MEDICATION ? medBatch : undefined,
      medicationDosage: recordType === HealthRecordType.MEDICATION ? medDosage : undefined,
      medicationRoute: recordType === HealthRecordType.MEDICATION ? medRoute : undefined,
      medicationFrequency: recordType === HealthRecordType.MEDICATION ? medFrequency : undefined,
      medicationEndDate: recordType === HealthRecordType.MEDICATION ? medEndDate : undefined,
      prescribedBy: recordType === HealthRecordType.MEDICATION ? prescribedBy : undefined,
      sampleType: (recordType === HealthRecordType.PARASITOLOGY || recordType === HealthRecordType.PATHOLOGY) ? sampleType : undefined,
      labResult: (recordType === HealthRecordType.PARASITOLOGY || recordType === HealthRecordType.PATHOLOGY) ? labResult : undefined,
      causeOfDeath: isDeceased ? causeOfDeath : undefined, disposalMethod: isDeceased ? disposalMethod : undefined
    };

    onSave(healthLog, selectedAnimalId, isDeceased);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border-4 border-white/20 overflow-hidden max-h-[95vh]">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Clinical Ledger</h2>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Authorized Statutory Record Entry</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Patient Subject</label>
                        <select required value={selectedAnimalId} onChange={e => setSelectedAnimalId(e.target.value)} className={inputClass} disabled={!!preSelectedAnimalId}>
                            <option value="">-- Choose Subject --</option>
                            {animals.filter(a => !a.archived || a.id === preSelectedAnimalId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clinical Type</label>
                        <select value={recordType} onChange={e => setRecordType(e.target.value as any)} className={inputClass}>
                            {Object.values(HealthRecordType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Current Condition</label>
                        <select value={condition} onChange={e => setCondition(e.target.value as any)} className={inputClass}>
                            {Object.values(HealthCondition).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-inner space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-emerald-500"/> Diagnostics</h4>
                        <button type="button" onClick={() => setShowBodyMap(!showBodyMap)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${showBodyMap ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200'}`}>Body Map</button>
                    </div>

                    {showBodyMap && (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                             <div 
                                ref={mapRef} onClick={handleBodyMapClick}
                                className="relative w-full h-48 bg-white rounded-2xl border-2 border-slate-200 cursor-crosshair overflow-hidden group shadow-sm"
                            >
                                <div className="absolute inset-0 flex items-center justify-center opacity-10 font-black text-6xl uppercase tracking-tighter text-slate-400 pointer-events-none">Anatomical Map</div>
                                {bodyCoords && (
                                    <div className="absolute w-5 h-5 bg-rose-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center animate-bounce -translate-x-1/2 -translate-y-1/2" style={{ left: `${bodyCoords.x}%`, top: `${bodyCoords.y}%` }}>
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    </div>
                                )}
                            </div>
                            <input type="text" placeholder="Specify Anatomical Region..." value={bodyPart} onChange={e => setBodyPart(e.target.value)} className={inputClass} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Body Cond. Score (1-10)</label>
                            <input type="number" step="0.5" value={bcs} onChange={e => setBcs(parseFloat(e.target.value))} className={inputClass}/>
                         </div>
                         <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Feather / Coat</label>
                            <input type="text" placeholder="Excellent / Molting / Poor" value={featherCondition} onChange={e => setFeatherCondition(e.target.value)} className={inputClass}/>
                         </div>
                    </div>
                </div>

                {recordType === HealthRecordType.MEDICATION && (
                    <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-2">
                         <div className="flex items-center gap-2 text-blue-800 font-black text-[10px] uppercase mb-2"><Pill size={14}/> Medication Details</div>
                         <input type="text" placeholder="Medication Name" required value={medName} onChange={e => setMedName(e.target.value)} className={inputClass}/>
                         <div className="grid grid-cols-2 gap-2">
                             <input type="text" placeholder="Dosage (e.g. 0.5ml)" value={medDosage} onChange={e => setMedDosage(e.target.value)} className={inputClass}/>
                             <input type="text" placeholder="Frequency (e.g. BID)" value={medFrequency} onChange={e => setMedFrequency(e.target.value)} className={inputClass}/>
                         </div>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clinical Account / Observations</label>
                    <textarea required value={logEntry} onChange={e => setLogEntry(e.target.value)} className={`${inputClass} resize-none h-32`} placeholder="Record detailed observations..."/>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-slate-100">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass}/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Auth. Officer</label>
                        <input type="text" required maxLength={3} value={initials} onChange={e => setInitials(e.target.value.toUpperCase())} className={inputClass}/>
                    </div>
                </div>
                
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]">
                  Commit & Secure Record
                </button>
            </form>
        </div>
    </div>
  );
};

export default MedicalRecordModal;
