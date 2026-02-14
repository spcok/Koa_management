
import React, { useState, useEffect, useRef } from 'react';
import { Animal, AnimalCategory, LogType, LogEntry, HazardRating, ConservationStatus } from '../types';
import { X, Check, Camera, Scale, MapPin, Sparkles, Loader2, AlignLeft, Zap, Shield, History, Info, Fingerprint, AlertCircle, Thermometer, Droplets, Sun, Moon, FileText, Globe, Image as ImageIcon, Skull } from 'lucide-react';
import { getLatinName, getConservationStatus } from '../services/geminiService';

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (animal: Animal) => void;
  initialData?: Animal;
  locations?: string[]; 
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
        const maxWidth = 800;
        const maxHeight = 800;
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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const AnimalFormModal: React.FC<AnimalFormModalProps> = ({ isOpen, onClose, onSave, initialData, locations = [] }) => {
  const [formData, setFormData] = useState<Partial<Animal>>({
    category: AnimalCategory.OWLS,
    name: '',
    species: '',
    latinName: '',
    dob: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    specialRequirements: '',
    imageUrl: `https://picsum.photos/seed/${Date.now()}/400/400`,
    distributionMapUrl: '',
    weightUnit: 'g',
    sex: 'Unknown',
    isVenomous: false,
    hazardRating: HazardRating.NONE,
    isDobUnknown: false,
    hasNoId: false,
    redListStatus: ConservationStatus.NE,
    arrivalDate: new Date().toISOString().split('T')[0],
    origin: '',
    sire: '',
    dam: '',
    microchip: '',
    ringNumber: '',
    targetDayTemp: undefined,
    targetNightTemp: undefined,
    targetBaskingTemp: undefined,
    targetCoolTemp: undefined,
    targetHumidity: undefined,
  });

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const requirementsRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic Resize Effect for Requirements
  useEffect(() => {
    if (requirementsRef.current) {
        requirementsRef.current.style.height = 'auto';
        requirementsRef.current.style.height = `${requirementsRef.current.scrollHeight}px`;
    }
  }, [formData.specialRequirements]);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData({ ...initialData });
        } else {
            setFormData({
                category: AnimalCategory.OWLS,
                name: '',
                species: '',
                latinName: '',
                dob: new Date().toISOString().split('T')[0],
                location: locations[0] || 'Unassigned',
                description: '',
                specialRequirements: '',
                imageUrl: `https://picsum.photos/seed/${Date.now()}/400/400`,
                distributionMapUrl: '',
                logs: [],
                documents: [],
                weightUnit: 'g',
                sex: 'Unknown',
                arrivalDate: new Date().toISOString().split('T')[0],
                origin: '',
                sire: '',
                dam: '',
                isVenomous: false,
                hazardRating: HazardRating.NONE,
                isDobUnknown: false,
                hasNoId: false,
                redListStatus: ConservationStatus.NE,
                microchip: '',
                ringNumber: '',
                targetDayTemp: undefined,
                targetNightTemp: undefined,
                targetBaskingTemp: undefined,
                targetCoolTemp: undefined,
                targetHumidity: undefined,
            });
        }
    }
  }, [isOpen, initialData, locations]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'distributionMapUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setFormData(prev => ({ ...prev, [field]: resized }));
      } catch (e) {
        console.error("Image upload failed");
      }
    }
  };

  const handleAutoFill = async () => {
    if (!formData.species || isAutoFilling) return;
    setIsAutoFilling(true);
    try {
        const [latin, status] = await Promise.all([
            getLatinName(formData.species),
            getConservationStatus(formData.species)
        ]);
        setFormData(prev => ({ 
            ...prev, 
            latinName: latin || prev.latinName,
            redListStatus: status || prev.redListStatus 
        }));
    } catch (e) { console.error("AI Sync failed", e); } finally { setIsAutoFilling(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let logs = initialData?.logs || [];
    if (!initialData && formData.arrivalDate) {
        logs = [{
            id: `acq_${Date.now()}`,
            date: formData.arrivalDate,
            type: LogType.MOVEMENT,
            value: `Initial Acquisition: ${formData.origin || 'Source Unknown'}`,
            notes: `Record authorized upon creation in the statutory registry.`,
            timestamp: Date.now(),
            userInitials: 'SYS',
            movementType: 'Acquisition',
            movementSource: formData.origin || 'External',
            movementDestination: formData.location || 'Site'
        }, ...logs];
    }
    const finalAnimal: Animal = {
        id: initialData?.id || `animal_${Date.now()}`,
        name: (formData.name || 'Unknown').trim(),
        species: (formData.species || 'Unknown').trim(),
        latinName: (formData.latinName || '').trim(),
        category: formData.category || AnimalCategory.OWLS,
        dob: formData.isDobUnknown ? '' : (formData.dob || new Date().toISOString().split('T')[0]),
        location: formData.location || 'Unassigned',
        description: (formData.description || '').trim(),
        specialRequirements: (formData.specialRequirements || '').trim(),
        imageUrl: formData.imageUrl || '',
        distributionMapUrl: formData.distributionMapUrl || '',
        logs: logs,
        documents: initialData?.documents || [],
        ringNumber: formData.ringNumber,
        weightUnit: formData.weightUnit || 'g',
        archived: formData.archived || false,
        microchip: formData.microchip,
        arrivalDate: formData.arrivalDate,
        origin: formData.origin,
        sire: formData.sire,
        dam: formData.dam,
        sex: formData.sex || 'Unknown',
        isVenomous: !!formData.isVenomous,
        hazardRating: formData.hazardRating || HazardRating.NONE,
        isDobUnknown: !!formData.isDobUnknown,
        hasNoId: !!formData.hasNoId,
        redListStatus: formData.redListStatus || ConservationStatus.NE,
        summerWeight: formData.summerWeight,
        winterWeight: formData.winterWeight,
        flyingWeight: formData.flyingWeight,
        targetDayTemp: formData.targetDayTemp,
        targetNightTemp: formData.targetNightTemp,
        targetBaskingTemp: formData.targetBaskingTemp,
        targetCoolTemp: formData.targetCoolTemp,
        targetHumidity: formData.targetHumidity,
    };
    onSave(finalAnimal);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-2.5 bg-[#f3f6f9] border border-[#e1e8ef] rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-300";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
            
            {/* Header Mirroring Reference */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-2">{initialData ? 'Edit Animal Record' : 'Add Animal Record'}</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ZLA 1981 SECTION 9 STATUTORY REGISTRY</p>
                </div>
                <button type="button" onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors p-1"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* LEFT COLUMN: Media Assets */}
                    <div className="lg:col-span-4 grid grid-cols-2 gap-4 h-fit">
                        <section>
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">PROFILE PHOTO</h3>
                            <div className="relative group aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-[#f9fafb] flex items-center justify-center">
                                <img src={formData.imageUrl} alt="Subject" className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                                <label className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <div className="bg-white/90 p-3 rounded-full shadow-lg text-slate-900"><Camera size={20} /></div>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} className="hidden" />
                                </label>
                            </div>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-tight text-center mt-2">CLICK TO UPLOAD</p>
                        </section>

                        <section className="bg-[#f9fbff] rounded-2xl p-4 border border-[#e8f0fe] flex flex-col">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Globe size={12}/> RANGE MAP
                            </h3>
                            <div className="relative group flex-1 w-full rounded-lg overflow-hidden border border-[#d0e1fd] bg-white flex items-center justify-center shadow-inner aspect-square">
                                {formData.distributionMapUrl ? (
                                    <img src={formData.distributionMapUrl} alt="Range Map" className="w-full h-full object-cover filter contrast-125"/>
                                ) : (
                                    <div className="text-center opacity-20"><Globe size={24} className="mx-auto mb-1 text-slate-900"/><p className="text-[7px] font-black uppercase">No Data</p></div>
                                )}
                                <label className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                                    <span className="bg-white text-slate-900 px-2 py-1 rounded border border-slate-200 text-[8px] font-black uppercase tracking-widest shadow-lg">Upload</span>
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'distributionMapUrl')} className="hidden" />
                                </label>
                            </div>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-tight text-center mt-2">NATIVE RANGE</p>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Statutory Sections */}
                    <div className="lg:col-span-8 space-y-12">
                        
                        {/* SECTION: IDENTIFICATION & TAXONOMY */}
                        <section className="space-y-6">
                            <h3 className="text-[11px] font-black text-[#10b981] uppercase tracking-[0.2em] flex items-center gap-2 pb-3 border-b border-[#f0fdf4]">
                                <Info size={16}/> IDENTIFICATION & TAXONOMY
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-5">
                                    <label className={labelClass}>SUBJECT CALL NAME *</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="Aragog" />
                                </div>
                                <div className="md:col-span-4">
                                    <label className={labelClass}>COLLECTION SECTION *</label>
                                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as AnimalCategory})} className={inputClass}>
                                        {Object.values(AnimalCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <label className={labelClass}>ENCLOSURE / LOCATION *</label>
                                    <input 
                                        type="text" 
                                        list="location-list"
                                        required 
                                        value={formData.location} 
                                        onChange={e => setFormData({...formData, location: e.target.value})} 
                                        className={inputClass} 
                                        placeholder="Aviary 1" 
                                    />
                                    <datalist id="location-list">
                                        {locations.map(loc => <option key={loc} value={loc} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-7">
                                    <label className={labelClass}>COMMON SPECIES NAME *</label>
                                    <div className="flex gap-2">
                                        <input type="text" required value={formData.species} onChange={e => setFormData({...formData, species: e.target.value})} className={inputClass} placeholder="Salmon Pink Tarantula" />
                                        <button type="button" onClick={handleAutoFill} disabled={isAutoFilling} className="px-4 bg-[#0f172a] text-white rounded-lg hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50">
                                            {isAutoFilling ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-5">
                                    <label className={labelClass}>SCIENTIFIC (LATIN) NAME</label>
                                    <input type="text" value={formData.latinName} onChange={e => setFormData({...formData, latinName: e.target.value})} className={`${inputClass} italic`} placeholder="Lasiodora parahybana" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-4">
                                    <label className={labelClass}>BIOLOGICAL SEX</label>
                                    <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value as any})} className={inputClass}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                                <div className="md:col-span-4">
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                        <label className="text-10px font-black text-slate-400 uppercase tracking-widest leading-none">DATE OF BIRTH</label>
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setFormData({...formData, isDobUnknown: !formData.isDobUnknown})}>
                                            <div className={`w-4 h-4 rounded-sm border-2 transition-colors flex items-center justify-center ${formData.isDobUnknown ? 'bg-slate-700 border-slate-700' : 'bg-white border-slate-300'}`}>
                                                {formData.isDobUnknown && <Check size={10} className="text-white"/>}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">D.O.B UNKNOWN</span>
                                        </div>
                                    </div>
                                    <input type="date" disabled={formData.isDobUnknown} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={`${inputClass} ${formData.isDobUnknown ? 'opacity-30 grayscale' : ''}`} />
                                </div>
                                <div className="md:col-span-4">
                                    <label className={labelClass}>IUCN RED LIST STATUS</label>
                                    <select value={formData.redListStatus} onChange={e => setFormData({...formData, redListStatus: e.target.value as ConservationStatus})} className={inputClass}>
                                        {Object.values(ConservationStatus).map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: STATUTORY ACQUISITION & PEDIGREE */}
                        <section className="bg-[#f8fbff] rounded-[1.5rem] p-8 border border-[#e1e9f5] shadow-sm space-y-8">
                            <h3 className="text-[11px] font-black text-[#2563eb] uppercase tracking-[0.2em] flex items-center gap-2 pb-3 border-b border-[#eef2ff]">
                                <History size={16}/> STATUTORY ACQUISITION & PEDIGREE
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className={labelClass}>DATE OF ARRIVAL *</label>
                                    <input type="date" required value={formData.arrivalDate} onChange={e => setFormData({...formData, arrivalDate: e.target.value})} className={inputClass} />
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2">DATE ACQUIRED BY KENT OWL ACADEMY</p>
                                </div>
                                <div>
                                    <label className={labelClass}>SOURCE / ORIGIN</label>
                                    <input type="text" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className={inputClass} placeholder="Previous zoo, breeder, or rescue local..." />
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2">MANDATORY FOR MOVEMENT AUDIT TRAIL</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className={labelClass}>SIRE (FATHER)</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                                        <input type="text" value={formData.sire} onChange={e => setFormData({...formData, sire: e.target.value})} className={`${inputClass} pl-12`} placeholder="Ancestry ID or Name" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>DAM (MOTHER)</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                                        <input type="text" value={formData.dam} onChange={e => setFormData({...formData, dam: e.target.value})} className={`${inputClass} pl-12`} placeholder="Ancestry ID or Name" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: ENVIRONMENTAL PARAMETERS & TARGETS */}
                        <section className="bg-[#fff7ed] rounded-[1.5rem] p-8 border border-[#ffedd5] shadow-sm space-y-8">
                            <h3 className="text-[11px] font-black text-[#ea580c] uppercase tracking-[0.2em] flex items-center gap-2 pb-3 border-b border-[#fed7aa]">
                                <Thermometer size={16}/> ENVIRONMENTAL PARAMETERS & TARGETS
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className={labelClass}>TARGET DAY TEMP (°C)</label>
                                    <input type="number" step="0.5" value={formData.targetDayTemp || ''} onChange={e => setFormData({...formData, targetDayTemp: parseFloat(e.target.value)})} className={inputClass} placeholder="e.g. 28" />
                                </div>
                                <div>
                                    <label className={labelClass}>TARGET NIGHT TEMP (°C)</label>
                                    <input type="number" step="0.5" value={formData.targetNightTemp || ''} onChange={e => setFormData({...formData, targetNightTemp: parseFloat(e.target.value)})} className={inputClass} placeholder="e.g. 20" />
                                </div>
                                {formData.category === AnimalCategory.EXOTICS && (
                                    <>
                                        <div>
                                            <label className={labelClass}>BASKING TARGET (°C)</label>
                                            <input type="number" step="0.5" value={formData.targetBaskingTemp || ''} onChange={e => setFormData({...formData, targetBaskingTemp: parseFloat(e.target.value)})} className={inputClass} placeholder="e.g. 35" />
                                        </div>
                                        <div>
                                            <label className={labelClass}>COOL END TARGET (°C)</label>
                                            <input type="number" step="0.5" value={formData.targetCoolTemp || ''} onChange={e => setFormData({...formData, targetCoolTemp: parseFloat(e.target.value)})} className={inputClass} placeholder="e.g. 24" />
                                        </div>
                                    </>
                                )}
                                <div className={formData.category === AnimalCategory.EXOTICS ? 'col-span-full md:col-span-2 lg:col-span-1' : ''}>
                                    <label className={labelClass}>TARGET HUMIDITY (%)</label>
                                    <input type="number" value={formData.targetHumidity || ''} onChange={e => setFormData({...formData, targetHumidity: parseInt(e.target.value)})} className={inputClass} placeholder="e.g. 60" />
                                </div>
                            </div>
                        </section>

                        {/* SECTION: INDIVIDUAL MARKERS & BIOMETRICS */}
                        <section className="space-y-6">
                            <h3 className="text-[11px] font-black text-[#f59e0b] uppercase tracking-[0.2em] flex items-center gap-2 pb-3 border-b border-[#fffbeb]">
                                <Zap size={16}/> INDIVIDUAL MARKERS & BIOMETRICS
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-2">
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">IDENTIFICATION</label>
                                         <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                                             const newState = !formData.hasNoId;
                                             setFormData({...formData, hasNoId: newState, microchip: newState ? '' : formData.microchip, ringNumber: newState ? '' : formData.ringNumber});
                                         }}>
                                             <div className={`w-4 h-4 rounded-sm border-2 transition-colors flex items-center justify-center ${formData.hasNoId ? 'bg-slate-700 border-slate-700' : 'bg-white border-slate-300'}`}>
                                                 {formData.hasNoId && <Check size={10} className="text-white"/>}
                                             </div>
                                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">NO ID AVAILABLE</span>
                                         </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" disabled={formData.hasNoId} value={formData.microchip} onChange={e => setFormData({...formData, microchip: e.target.value})} className={`${inputClass} font-mono ${formData.hasNoId ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`} placeholder="Microchip..." />
                                        <input type="text" disabled={formData.hasNoId} value={formData.ringNumber} onChange={e => setFormData({...formData, ringNumber: e.target.value})} className={`${inputClass} font-mono ${formData.hasNoId ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`} placeholder="Ring Number..." />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className={labelClass}>HAZARD CLASS</label>
                                    <select value={formData.hazardRating} onChange={e => setFormData({...formData, hazardRating: e.target.value as HazardRating})} className={inputClass}>
                                        {Object.values(HazardRating).map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end pb-1.5">
                                    <label className="flex items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.isVenomous ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-300 group-hover:border-rose-300'}`}>
                                            {formData.isVenomous && <Check size={14} className="text-white" />}
                                        </div>
                                        <input type="checkbox" checked={formData.isVenomous} onChange={e => setFormData({...formData, isVenomous: e.target.checked})} className="hidden" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-rose-600 transition-colors flex items-center gap-1.5">
                                            <Skull size={10} className={formData.isVenomous ? 'text-white' : 'text-slate-300'}/> VENOMOUS
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: NARRATIVE & CRITICAL REQUIREMENTS */}
                        <section className="space-y-6">
                            <div>
                                <label className={labelClass}>INTERNAL SUBJECT DESCRIPTION</label>
                                <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} resize-none h-32 font-medium bg-white`} placeholder="Record physical attributes, personality, or role in collection..."/>
                            </div>
                            
                            <div className="bg-[#eef2ff] p-8 rounded-3xl border border-[#dbeafe] shadow-inner">
                                <label className="block text-[11px] font-black text-[#4f46e5] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <AlertCircle size={16}/> CRITICAL HUSBANDRY REQUIREMENTS
                                </label>
                                <textarea 
                                    ref={requirementsRef}
                                    rows={3} 
                                    value={formData.specialRequirements} 
                                    onChange={e => setFormData({...formData, specialRequirements: e.target.value})} 
                                    className="w-full px-5 py-4 bg-white border border-[#c7d2fe] rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#4f46e5] transition-all resize-y shadow-sm placeholder-[#94a3b8] min-h-[100px] overflow-hidden" 
                                    placeholder="Enter each requirement on a new line. Each line will appear as a separate bullet point in the subject file..."/>
                                <p className="text-[8px] font-black text-[#6366f1] uppercase tracking-widest mt-3 opacity-60">TIP: EACH LINE REPRESENTS ONE STATUTORY REQUIREMENT</p>
                            </div>
                        </section>
                    </div>
                </div>

                {/* SIGN-OFF FOOTER */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-12 border-t border-slate-100 pb-4">
                    <div className="flex items-center gap-4 text-slate-400">
                        <Shield size={24} className="opacity-40"/>
                        <p className="text-[10px] font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                            I VERIFY THAT THIS RECORD REPRESENTS AN ACCURATE ENTRY INTO THE KENT OWL ACADEMY STATUTORY STOCK LEDGER PURSUANT TO ZLA 1981.
                        </p>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-8 py-4 bg-white text-slate-500 border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Discard Draft</button>
                        <button type="submit" className="flex-1 sm:flex-none px-12 py-4 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                            <Check size={20} /> AUTHORIZE RECORD
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AnimalFormModal;
