
import React, { useState, useMemo, useEffect } from 'react';
import { Animal, LogType, LogEntry, AnimalCategory, HealthCondition, OrganizationProfile, HazardRating, ConservationStatus, HealthRecordType } from '../types';
import { ArrowLeft, Utensils, Scale, Heart, Edit2, Trash2, Plus, Globe, Loader2, FileText, Stethoscope, Printer, X, Thermometer, ShieldAlert, Sparkles, RefreshCw, AlignLeft, Sun, Moon, Droplets, Zap } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Area } from 'recharts';
import { generateSpeciesCard, generateExoticSummary } from '../services/geminiService';
import { formatWeightDisplay } from '../services/weightUtils';
import AddEntryModal from './AddEntryModal';
import AnimalFormModal from './AnimalFormModal';
import MedicalRecordModal from './MedicalRecordModal';
import ReactMarkdown from 'react-markdown';
import { IUCNBadge } from './IUCNBadge';

const DetailItem = ({ label, value, italic = false, mono = false, color = 'text-slate-700' }: { label: string, value?: string | number, italic?: boolean, mono?: boolean, color?: string }) => (
    <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
        <p className={`text-sm font-bold ${color} ${italic ? 'italic' : ''} ${mono ? 'font-mono' : ''}`}>{value || '-'}</p>
    </div>
);

interface AnimalProfileProps {
  animal: Animal;
  onBack: () => void;
  onUpdateAnimal: (updatedAnimal: Animal) => void;
  onDeleteAnimal: () => void;
  foodOptions: Record<AnimalCategory, string[]>;
  feedMethods: Record<AnimalCategory, string[]>;
  orgProfile?: OrganizationProfile | null;
  locations?: string[];
  isAdmin: boolean;
}

const AnimalProfile: React.FC<AnimalProfileProps> = ({ 
  animal, onBack, onUpdateAnimal, onDeleteAnimal, foodOptions, feedMethods, 
  isAdmin, locations, orgProfile 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'husbandry' | 'medical' | 'intelligence'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isPostcardOpen, setIsPostcardOpen] = useState(false);
  const [logFormType, setLogFormType] = useState<LogType>(LogType.FEED);
  const [editingLog, setEditingLog] = useState<LogEntry | undefined>(undefined);
  const [speciesCardData, setSpeciesCardData] = useState<{text: string, mapImage?: string} | null>(null);
  const [isGeneratingSpecies, setIsGeneratingSpecies] = useState(false);
  const [postcardAiSummary, setPostcardAiSummary] = useState<string>('');
  const [isGeneratingPostcardAi, setIsGeneratingPostcardAi] = useState(false);

  const sortedLogs = useMemo(() => [...(animal.logs || [])].sort((a, b) => b.timestamp - a.timestamp), [animal.logs]);

  const handleGenerateIntelligence = async () => {
      setIsGeneratingSpecies(true);
      const data = await generateSpeciesCard(animal.species);
      setSpeciesCardData(data);
      setIsGeneratingSpecies(false);
  };

  const handleGeneratePostcardAi = async () => {
    setIsGeneratingPostcardAi(true);
    const summary = await generateExoticSummary(animal.species);
    setPostcardAiSummary(summary);
    setIsGeneratingPostcardAi(false);
  };

  useEffect(() => {
    if (isPostcardOpen && !postcardAiSummary) {
        handleGeneratePostcardAi();
    }
  }, [isPostcardOpen]);

  const getAge = (subject: Animal) => {
      if (subject.isDobUnknown || !subject.dob) return 'Unknown';
      const diff = Date.now() - new Date(subject.dob).getTime();
      if (isNaN(diff)) return 'Unknown';
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      if (years > 0) return `${years} years`;
      const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
      return `${months} months`;
  };

  const accentColorClass = useMemo(() => {
    if (animal.isVenomous) return 'border-l-rose-600';
    if (animal.hazardRating === HazardRating.HIGH) return 'border-l-rose-500';
    if (animal.hazardRating === HazardRating.MEDIUM) return 'border-l-amber-500';
    return 'border-l-emerald-500';
  }, [animal.hazardRating, animal.isVenomous]);

  return (
    <div className="min-h-screen bg-slate-200 pb-24 animate-in fade-in duration-500">
      <div className="bg-white border-b-2 border-slate-300 sticky top-0 z-30 shadow-sm no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Back to Dashboard
            </button>
            <div className="flex gap-2">
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 border-slate-300">
                    <Edit2 size={14} /> Edit Subject
                </button>
                <button onClick={() => setIsPostcardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                    <Printer size={14}/> Aviary Sign
                </button>
            </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 no-print">
          <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
              <img src={animal.imageUrl} alt={animal.name} className={`w-32 h-32 rounded-full object-cover border-4 shadow-lg bg-white ${animal.isVenomous ? 'border-rose-600' : 'border-white'}`} />
              <div className="pt-2">
                  <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-1">{animal.name}</h1>
                  <p className="text-lg text-slate-500 font-medium mb-3">{animal.species} <span className="text-slate-300 mx-2">|</span> <span className="text-sm font-bold uppercase tracking-widest text-slate-400 italic">{animal.latinName}</span></p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 font-bold uppercase tracking-wider">
                      <span>Sex: {animal.sex}</span>
                      <span>Age: {getAge(animal)}</span>
                      <span>Location: {animal.location}</span>
                  </div>
              </div>
          </div>

          <div className="flex border-b-2 border-slate-300 mb-8 overflow-x-auto gap-8 no-print">
              {['overview', 'husbandry', 'medical', 'intelligence'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-3 text-sm font-bold transition-colors whitespace-nowrap border-b-4 -mb-[2px] uppercase tracking-widest ${activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                      {tab}
                  </button>
              ))}
          </div>

          {activeTab === 'overview' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
                <div className={`bg-white rounded-3xl border-2 border-slate-300 shadow-md overflow-hidden border-l-8 ${accentColorClass}`}>
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlignLeft size={14}/> Subject Master File</h3>
                                <p className="text-slate-700 text-sm leading-relaxed font-medium">{animal.description || "No narrative recorded for this subject."}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14}/> Management Requirements</h3>
                                <p className="text-slate-700 text-sm leading-relaxed font-bold italic">"{animal.specialRequirements || "Standard protocol."}"</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-slate-100">
                            <DetailItem label="Scientific Name" value={animal.latinName} italic />
                            <DetailItem label="Microchip" value={animal.microchip} mono />
                            <DetailItem label="Ring Number" value={animal.ringNumber} mono />
                            <DetailItem label="Origin" value={animal.origin} />
                        </div>
                    </div>
                </div>
            </div>
          )}
      </div>

      {isPostcardOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#1C2C42] w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative overflow-hidden border-4 border-white/10 flex flex-col md:flex-row h-[600px] print:shadow-none print:border-none print:w-[210mm] print:h-auto">
                <button onClick={() => setIsPostcardOpen(false)} className="absolute top-6 right-6 text-white/40 hover:text-white z-50 p-2 bg-black/20 rounded-full no-print">
                    <X size={24}/>
                </button>

                <div className="w-full md:w-1/2 relative bg-slate-100 h-1/2 md:h-full shrink-0">
                    <img src={animal.imageUrl} alt={animal.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C2C42]/80 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-10 left-10 text-white">
                        <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">{animal.name}</h2>
                        <p className="text-xl font-bold text-emerald-400 uppercase tracking-widest mt-2">{animal.species}</p>
                    </div>
                </div>

                <div className="flex-1 p-10 md:p-14 flex flex-col justify-between text-white relative">
                    <div className="relative z-10 space-y-8">
                        <div>
                            <p className="text-emerald-400 font-black uppercase text-xs tracking-[0.3em] mb-4">Subject Narrative</p>
                            {isGeneratingPostcardAi ? (
                                <div className="space-y-3"><div className="h-4 bg-white/10 rounded w-full animate-pulse"></div><div className="h-4 bg-white/10 rounded w-5/6 animate-pulse"></div></div>
                            ) : (
                                <p className="text-xl font-medium leading-relaxed italic text-white/90">
                                    {postcardAiSummary || "Synthesizing Dossier..."}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-10">
                            <div><p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Age</p><p className="text-2xl font-black">{getAge(animal)}</p></div>
                            <div><p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Sex</p><p className="text-2xl font-black">{animal.sex || 'Unknown'}</p></div>
                        </div>
                    </div>
                    <div className="relative z-10 flex items-end justify-between border-t border-white/10 pt-10">
                        <div className="flex items-center gap-4">
                            {orgProfile?.logoUrl && <img src={orgProfile.logoUrl} className="h-12 w-auto invert brightness-0" alt="Logo" />}
                            <div>
                                <p className="font-black uppercase text-xs tracking-widest">{orgProfile?.name || 'Kent Owl Academy'}</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Registry ID: {animal.id.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>
                        <button onClick={() => window.print()} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-500/20 no-print">
                            <Printer size={18} className="inline mr-2"/> Print Sign
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnimalProfile;
