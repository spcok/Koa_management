
import React, { useState, useEffect } from 'react';
import { Animal, AnimalCategory, HazardRating, ConservationStatus } from '../types';
import { X, Save, Upload, Camera, AlertTriangle, Skull, Check, Thermometer, Info, RefreshCw } from 'lucide-react';
import { batchGetSpeciesData } from '../services/geminiService';

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
        const maxSize = 600;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
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
    name: '',
    species: '',
    latinName: '',
    category: AnimalCategory.OWLS,
    dob: new Date().toISOString().split('T')[0],
    isDobUnknown: false,
    sex: 'Unknown',
    location: '',
    description: '',
    specialRequirements: '',
    imageUrl: '',
    distributionMapUrl: '',
    summerWeight: undefined,
    winterWeight: undefined,
    flyingWeight: undefined,
    weightUnit: 'g',
    ringNumber: '',
    microchip: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    origin: '',
    targetDayTemp: undefined,
    targetNightTemp: undefined,
    targetBaskingTemp: undefined,
    targetCoolTemp: undefined,
    targetHumidity: undefined,
    hazardRating: HazardRating.NONE,
    isVenomous: false,
    redListStatus: ConservationStatus.NE,
    logs: [],
    documents: []
  });

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setFormData(prev => ({ ...prev, imageUrl: resized }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setFormData(prev => ({ ...prev, distributionMapUrl: resized }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSyncSpeciesData = async () => {
    if (!formData.species) return;
    setIsSyncing(true);
    try {
        const results = await batchGetSpeciesData([formData.species]);
        const data = results[formData.species];
        
        if (data) {
            setFormData(prev => ({
                ...prev,
                latinName: data.latin || prev.latinName,
                redListStatus: data.status || prev.redListStatus
            }));
        }
    } catch (e) {
        console.error("Sync failed", e);
    }
    setIsSyncing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.species || !formData.category) return;

    const newAnimal: Animal = {
      ...formData as Animal,
      id: initialData?.id || `a_${Date.now()}`,
      logs: initialData?.logs || [],
      documents: initialData?.documents || []
    };
    onSave(newAnimal);
    onClose();
  };

  const inputClass = "w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-slate-400";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 border-2 border-slate-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">{initialData ? 'Edit Subject' : 'New Accession'}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Collection Management Registry</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-white scrollbar-thin">
          <form id="animal-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Identity & Classification */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Info size={18}/>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Taxonomy & Identity</h3>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Image Upload */}
                    <div className="w-full md:w-64 shrink-0 space-y-3">
                        <div className="w-full aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden relative group hover:border-emerald-500 transition-colors">
                            {formData.imageUrl ? (
                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-4">
                                    <Camera className="mx-auto text-slate-300 mb-2 group-hover:text-emerald-500 transition-colors" size={32} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Add Photo</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <p className="text-[9px] text-center text-slate-400 font-bold uppercase">Click to upload image</p>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Subject Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Ghost" />
                            </div>
                            <div>
                                <label className={labelClass}>Taxonomic Category</label>
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as AnimalCategory})} className={inputClass}>
                                    {Object.values(AnimalCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Common Species Name</label>
                                <div className="flex gap-2">
                                    <input type="text" required value={formData.species} onChange={e => setFormData({...formData, species: e.target.value})} className={inputClass} placeholder="e.g. Barn Owl" />
                                    <button 
                                      type="button" 
                                      onClick={handleSyncSpeciesData} 
                                      disabled={isSyncing || !formData.species}
                                      className="p-2 bg-slate-100 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 rounded-xl transition-all disabled:opacity-50"
                                      title="Auto-fill Scientific Name & Status"
                                    >
                                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Scientific Name (Latin)</label>
                                <input type="text" value={formData.latinName} onChange={e => setFormData({...formData, latinName: e.target.value})} className={`${inputClass} italic`} placeholder="e.g. Tyto alba" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Distribution Map</label>
                            <div className="flex items-start gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="relative group w-32 h-20 bg-white rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-emerald-500 transition-all shrink-0">
                                    {formData.distributionMapUrl ? (
                                        <img src={formData.distributionMapUrl} alt="Map" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Upload size={20} className="mx-auto text-slate-300 mb-1 group-hover:text-emerald-500 transition-colors"/>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Upload Map</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleMapUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                        Upload a native range map for this species. This will be used on educational signage and info cards.
                                    </p>
                                    {formData.distributionMapUrl && (
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, distributionMapUrl: '' }))}
                                            className="mt-2 text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1"
                                        >
                                            <X size={12}/> Remove Map
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-4">
                                <label className={labelClass}>BIOLOGICAL SEX</label>
                                <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value as any})} className={inputClass}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Unknown">Unknown</option>
                                    <option value="N/A">N/A</option>
                                </select>
                            </div>
                            <div className="md:col-span-4">
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">DATE OF BIRTH</label>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setFormData({...formData, isDobUnknown: !formData.isDobUnknown})}>
                                        <div className={`w-4 h-4 rounded-sm border-2 transition-colors flex items-center justify-center ${formData.isDobUnknown ? 'bg-slate-700 border-slate-700' : 'bg-white border-slate-300'}`}>
                                            {formData.isDobUnknown && <Check size={10} className="text-white"/>}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">UNKNOWN</span>
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
                    </div>
                </div>
            </section>

            {/* 2. Operations & Housing */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <Save size={18}/>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Operations & Housing</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={labelClass}>Enclosure ID</label>
                        {locations && locations.length > 0 ? (
                            <select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className={inputClass}>
                                <option value="">Select Location...</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className={inputClass} placeholder="e.g. Aviary 1" />
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>Arrival Date</label>
                        <input type="date" value={formData.arrivalDate} onChange={e => setFormData({...formData, arrivalDate: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Source / Origin</label>
                        <input type="text" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className={inputClass} placeholder="e.g. Zoo Transfer, Breeder" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={labelClass}>Microchip / ISO</label>
                        <input type="text" value={formData.microchip} onChange={e => setFormData({...formData, microchip: e.target.value})} className={inputClass} placeholder="XXXXXXXXXXXXXXXX" />
                    </div>
                    <div>
                        <label className={labelClass}>Ring / Leg Band</label>
                        <input type="text" value={formData.ringNumber} onChange={e => setFormData({...formData, ringNumber: e.target.value})} className={inputClass} placeholder="Band ID" />
                    </div>
                    <div>
                        <label className={labelClass}>Weight Unit Preference</label>
                        <select value={formData.weightUnit} onChange={e => setFormData({...formData, weightUnit: e.target.value as any})} className={inputClass}>
                            <option value="g">Grams (g)</option>
                            <option value="oz">Ounces (oz)</option>
                            <option value="lbs_oz">Pounds & Ounces</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={labelClass}>Flying Weight (g)</label>
                        <input type="number" value={formData.flyingWeight || ''} onChange={e => setFormData({...formData, flyingWeight: parseFloat(e.target.value)})} className={inputClass} placeholder="Target" />
                    </div>
                    <div>
                        <label className={labelClass}>Winter Weight (g)</label>
                        <input type="number" value={formData.winterWeight || ''} onChange={e => setFormData({...formData, winterWeight: parseFloat(e.target.value)})} className={inputClass} placeholder="Resting Target" />
                    </div>
                </div>
            </section>

            {/* 3. Environment & Hazards */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                        <Thermometer size={18}/>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Environment & Safety</h3>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Temperature Targets (°C)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className={labelClass}>Day Ambient</label>
                            <input type="number" value={formData.targetDayTemp || ''} onChange={e => setFormData({...formData, targetDayTemp: parseFloat(e.target.value)})} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Night Ambient</label>
                            <input type="number" value={formData.targetNightTemp || ''} onChange={e => setFormData({...formData, targetNightTemp: parseFloat(e.target.value)})} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Basking Spot</label>
                            <input type="number" value={formData.targetBaskingTemp || ''} onChange={e => setFormData({...formData, targetBaskingTemp: parseFloat(e.target.value)})} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Cool End</label>
                            <input type="number" value={formData.targetCoolTemp || ''} onChange={e => setFormData({...formData, targetCoolTemp: parseFloat(e.target.value)})} className={inputClass} />
                        </div>
                    </div>
                </div>

                <div className="bg-rose-50 p-6 rounded-2xl border-2 border-rose-100">
                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={12}/> Risk Assessment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Hazard Rating</label>
                            <select value={formData.hazardRating} onChange={e => setFormData({...formData, hazardRating: e.target.value as HazardRating})} className={inputClass}>
                                {Object.values(HazardRating).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <div 
                                onClick={() => setFormData({...formData, isVenomous: !formData.isVenomous})}
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${formData.isVenomous ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-rose-200'}`}
                            >
                                {formData.isVenomous && <Skull size={14}/>}
                            </div>
                            <span className="text-sm font-bold text-rose-800 uppercase tracking-tight">Is Venomous / Toxic?</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Notes */}
            <section className="space-y-6">
                <div>
                    <label className={labelClass}>General Description</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} resize-none`} placeholder="Physical description, personality traits, history..." />
                </div>
                <div>
                    <label className={labelClass}>Special Husbandry Requirements</label>
                    <textarea rows={3} value={formData.specialRequirements} onChange={e => setFormData({...formData, specialRequirements: e.target.value})} className={`${inputClass} resize-none`} placeholder="Dietary nuances, medication, behavioral notes..." />
                </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-slate-100 bg-slate-50/50 shrink-0">
            <button 
                type="submit" 
                form="animal-form" 
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
            >
                <Save size={18}/> Save to Registry
            </button>
        </div>

      </div>
    </div>
  );
};

export default AnimalFormModal;
