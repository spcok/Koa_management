
import React, { useState, useMemo, useEffect } from 'react';
import { Animal, LogType, LogEntry, AnimalCategory, HealthCondition, Incident, OrganizationProfile, HazardRating, ConservationStatus } from '../types';
import { 
  ArrowLeft, Utensils, Scale, Heart, Edit2, Trash2, 
  Plus, Calendar, Globe, 
  Loader2, Zap, FileText, Stethoscope, Plane, Trophy, Droplets, Check, AlertTriangle, Skull, ArrowRight, Sun, Moon, AlignLeft, Info, Printer, X, Thermometer, ShieldAlert, Sparkles, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Area } from 'recharts';
import { generateSpeciesCard, generateExoticSummary } from '../services/geminiService';
import { formatWeightDisplay } from '../services/weightUtils';
import AddEntryModal from './AddEntryModal';
import AnimalFormModal from './AnimalFormModal';
import MedicalRecordModal from './MedicalRecordModal';
import SignGenerator from './SignGenerator';
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
  onAddIncident?: (incident: Incident) => void; 
  orgProfile?: OrganizationProfile | null;
  locations?: string[];
  isAdmin: boolean;
}

const AnimalProfile: React.FC<AnimalProfileProps> = ({ 
  animal, onBack, onUpdateAnimal, onDeleteAnimal, foodOptions, feedMethods, 
  isAdmin, locations, onAddIncident, orgProfile 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'husbandry' | 'medical' | 'intelligence'>('overview');
  const [husbandryFilter, setHusbandryFilter] = useState<LogType | 'ALL'>('ALL');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isSignGeneratorOpen, setIsSignGeneratorOpen] = useState(false);
  const [logFormType, setLogFormType] = useState<LogType>(LogType.FEED);
  const [editingLog, setEditingLog] = useState<LogEntry | undefined>(undefined);
  const [speciesCardData, setSpeciesCardData] = useState<{text: string, mapImage?: string} | null>(null);
  const [isGeneratingSpecies, setIsGeneratingSpecies] = useState(false);

  const sortedLogs = useMemo(() => [...(animal.logs || [])].sort((a, b) => b.timestamp - a.timestamp), [animal.logs]);

  const husbandryLogs = useMemo(() => {
      let logs = sortedLogs.filter(l => l.type !== LogType.HEALTH);
      if (husbandryFilter !== 'ALL') {
          logs = logs.filter(l => l.type === husbandryFilter);
      }
      return logs;
  }, [sortedLogs, husbandryFilter]);

  const medicalLogs = useMemo(() => sortedLogs.filter(l => l.type === LogType.HEALTH), [sortedLogs]);

  const chartData = useMemo(() => {
    return [...sortedLogs]
      .filter(l => l.type === LogType.WEIGHT)
      .slice(0, 30)
      .reverse()
      .map(l => ({
        date: new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: l.weightGrams || parseFloat(l.value) || 0
      }));
  }, [sortedLogs]);

  const handleGenerateIntelligence = async () => {
      setIsGeneratingSpecies(true);
      const data = await generateSpeciesCard(animal.species);
      setSpeciesCardData(data);
      setIsGeneratingSpecies(false);
  };

  const getAge = (subject: Animal) => {
      if (subject.isDobUnknown || !subject.dob) return 'Unknown';
      const diff = Date.now() - new Date(subject.dob).getTime();
      if (isNaN(diff)) return 'Unknown';
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
      if (years > 0) return `${years} years`;
      return `${months} months`;
  };

  const latestWeightLog = useMemo(() => sortedLogs.find(l => l.type === LogType.WEIGHT), [sortedLogs]);

  const isHazardous = animal.hazardRating === HazardRating.HIGH || animal.hazardRating === HazardRating.MEDIUM || animal.isVenomous;

  const getRedListColor = (status?: ConservationStatus) => {
      switch(status) {
          case ConservationStatus.CR:
          case ConservationStatus.EN:
          case ConservationStatus.EW:
          case ConservationStatus.EX: return 'bg-rose-600 text-white';
          case ConservationStatus.VU: return 'bg-amber-50 text-white';
          case ConservationStatus.NT: return 'bg-yellow-400 text-slate-900';
          case ConservationStatus.LC: return 'bg-emerald-600 text-white';
          default: return 'bg-slate-300 text-slate-700';
      }
  };

  const getRedListAbbreviation = (status?: ConservationStatus) => {
      if (!status) return 'NE';
      const mapping: Record<string, string> = {
          [ConservationStatus.LC]: 'LC',
          [ConservationStatus.NT]: 'NT',
          [ConservationStatus.VU]: 'VU',
          [ConservationStatus.EN]: 'EN',
          [ConservationStatus.CR]: 'CR',
          [ConservationStatus.EW]: 'EW',
          [ConservationStatus.EX]: 'EX',
          [ConservationStatus.DD]: 'DD',
          [ConservationStatus.NE]: 'NE',
          [ConservationStatus.NC]: 'NC',
      };
      return mapping[status] || 'NE';
  };

  const bannerColorClass = useMemo(() => {
      if (animal.isVenomous) return 'bg-rose-700 border-rose-500';
      if (animal.hazardRating === HazardRating.HIGH) return 'bg-rose-600 border-rose-400';
      if (animal.hazardRating === HazardRating.MEDIUM) return 'bg-amber-600 border-amber-400';
      return 'bg-slate-800 border-slate-600';
  }, [animal.hazardRating, animal.isVenomous]);

  const accentColorClass = useMemo(() => {
    if (animal.isVenomous) return 'border-l-rose-600';
    if (animal.hazardRating === HazardRating.HIGH) return 'border-l-rose-500';
    if (animal.hazardRating === HazardRating.MEDIUM) return 'border-l-amber-500';
    return 'border-l-emerald-500';
  }, [animal.hazardRating, animal.isVenomous]);

  const hasSpecialRequirements = useMemo(() => {
    return animal.specialRequirements && animal.specialRequirements.trim().length > 0;
  }, [animal.specialRequirements]);

  const handleEditLog = (log: LogEntry) => {
    setEditingLog(log);
    setLogFormType(log.type);
    setIsAddLogOpen(true);
  };

  const handleDeleteLog = (logId: string) => {
    const updatedLogs = (animal.logs || []).filter(l => l.id !== logId);
    onUpdateAnimal({ ...animal, logs: updatedLogs });
  };

  const handleSaveMedicalRecord = (healthLog: LogEntry, animalId: string, isDeceased: boolean) => {
      onUpdateAnimal({ 
          ...animal, 
          logs: [healthLog, ...(animal.logs || [])], 
          archived: isDeceased 
      });
  };

  return (
    <div className="min-h-screen bg-slate-200 pb-24 animate-in fade-in duration-500">
      
      {/* Top Navigation */}
      <div className="bg-white border-b-2 border-slate-300 sticky top-0 z-30 shadow-sm no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Back to Dashboard
            </button>
            <div className="flex gap-2">
                <button onClick={() => setIsSignGeneratorOpen(true)} className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 border-purple-200">
                    <ImageIcon size={14} /> Create Sign
                </button>
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 border-slate-300">
                    <Edit2 size={14} /> Edit
                </button>
                {isAdmin && (
                    <button onClick={() => window.confirm('Permanently delete record?') && onDeleteAnimal()} className="p-2 text-slate-400 hover:text-rose-600 bg-white border-2 border-slate-300 rounded-lg transition-all">
                        <Trash2 size={16}/>
                    </button>
                )}
            </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 no-print">
          
          {/* Hazard Alert for High Risk Animals */}
          {isHazardous && (
              <div className={`mb-6 text-white p-5 rounded-2xl shadow-xl flex items-center justify-between border-2 ${bannerColorClass}`}>
                  <div className="flex items-center gap-5">
                      <div className="bg-white/20 p-3 rounded-xl">
                          {animal.isVenomous ? <Skull size={36}/> : <AlertTriangle size={36}/>}
                      </div>
                      <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter leading-tight">CAUTION: {animal.hazardRating}</h3>
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
                            {animal.isVenomous ? 'Classification: Venomous / High Toxicity' : 'Classification: Special Handling Required'}
                          </p>
                      </div>
                  </div>
                  {animal.isVenomous && <Skull size={36} className="opacity-30" />}
              </div>
          )}

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
              <div className="shrink-0 relative">
                  <img 
                    src={animal.imageUrl} 
                    alt={animal.name} 
                    className={`w-32 h-32 rounded-full object-cover border-4 shadow-lg bg-slate-200 ${isHazardous ? (animal.hazardRating === HazardRating.HIGH || animal.isVenomous ? 'border-rose-600' : 'border-amber-500') : 'border-white'}`}
                  />
                  {isHazardous && (
                      <div className={`absolute -bottom-2 -right-2 text-white p-2 rounded-full border-2 border-white shadow-md ${animal.isVenomous || animal.hazardRating === HazardRating.HIGH ? 'bg-rose-600' : 'bg-amber-600'}`}>
                          {animal.isVenomous ? <Skull size={16}/> : <AlertTriangle size={16}/>}
                      </div>
                  )}
              </div>
              <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-1">{animal.name}</h1>
                    {isHazardous && (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            animal.hazardRating === HazardRating.HIGH || animal.isVenomous ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                            {animal.hazardRating}
                        </span>
                    )}
                  </div>
                  <p className="text-lg text-slate-500 font-medium mb-3">{animal.species} <span className="text-slate-300 mx-2">|</span> <span className="text-sm font-bold uppercase tracking-widest text-slate-400 italic">{animal.latinName}</span></p>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Sex:</span> {animal.sex || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Age:</span> {getAge(animal)}
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Enclosure:</span> {animal.location}
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Conservation:</span> 
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRedListColor(animal.redListStatus)}`}>{getRedListAbbreviation(animal.redListStatus)}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-slate-300 mb-8 overflow-x-auto gap-8 no-print">
              {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'husbandry', label: 'Husbandry Logs' },
                  { id: 'medical', label: 'Medical Records' },
                  { id: 'intelligence', label: 'Species Info' },
              ].map(tab => (
                  <button 
                    key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
                    className={`pb-3 text-sm font-bold transition-colors whitespace-nowrap border-b-4 -mb-[2px] ${
                        activeTab === tab.id 
                        ? 'border-teal-500 text-teal-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>

          {/* Content Area */}
          <div className="min-h-[400px] no-print">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><AlignLeft size={14}/> Subject Master File</h3>
                            </div>
                            <div className={`bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden border-l-8 ${accentColorClass}`}>
                                <div className="p-6 space-y-6 flex justify-between">
                                    <div className="flex-1">
                                        {/* Narrative Section */}
                                        <div className={`grid grid-cols-1 ${hasSpecialRequirements ? 'md:grid-cols-2' : ''} gap-8`}>
                                            <div className={hasSpecialRequirements ? '' : 'col-span-full'}>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject Description</h4>
                                                <p className="text-slate-700 text-sm leading-relaxed font-medium">{animal.description || "No narrative recorded for this subject."}</p>
                                            </div>
                                            {hasSpecialRequirements && (
                                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Zap size={12}/> Critical Husbandry Notes</h4>
                                                    <ul className="list-disc list-outside ml-4 space-y-1.5">
                                                        {animal.specialRequirements?.split('\n').filter(line => line.trim()).map((line, i) => (
                                                            <li key={i} className="text-slate-700 text-sm leading-relaxed font-bold pl-1">{line}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-6">
                                        <IUCNBadge status={animal.redListStatus} size="md" />
                                    </div>
                                </div>
                                
                                <div className="p-6 pt-0 space-y-6">
                                    {/* Environment Targets */}
                                    {(animal.targetDayTemp || animal.targetNightTemp || animal.targetBaskingTemp || animal.targetCoolTemp) && (
                                        <div className="pt-6 border-t border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Environmental Control Targets</h4>
                                            <div className="flex flex-wrap gap-4">
                                                {animal.targetDayTemp && (
                                                    <div className="bg-orange-500 border-2 border-orange-600 px-5 py-4 rounded-2xl flex items-center gap-4 text-white shadow-lg">
                                                        <Sun size={28} className="text-white" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-1">Day Target</p>
                                                            <p className="text-2xl font-black leading-none">{animal.targetDayTemp}°C</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {animal.targetNightTemp && (
                                                    <div className="bg-emerald-600 border-2 border-emerald-700 px-5 py-4 rounded-2xl flex items-center gap-4 text-white shadow-lg">
                                                        <Moon size={28} className="text-white" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-1">Night Target</p>
                                                            <p className="text-2xl font-black leading-none">{animal.targetNightTemp}°C</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {animal.targetBaskingTemp && (
                                                    <div className="bg-rose-600 border-2 border-rose-700 px-5 py-4 rounded-2xl flex items-center gap-4 text-white shadow-lg">
                                                        <Sun size={28} className="text-white" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-1">Basking Target</p>
                                                            <p className="text-2xl font-black leading-none">{animal.targetBaskingTemp}°C</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {animal.targetCoolTemp && (
                                                    <div className="bg-blue-500 border-2 border-blue-600 px-5 py-4 rounded-2xl flex items-center gap-4 text-white shadow-lg">
                                                        <Moon size={28} className="text-white" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-1">Cool End Target</p>
                                                            <p className="text-2xl font-black leading-none">{animal.targetCoolTemp}°C</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {animal.targetHumidity && (
                                                    <div className="bg-cyan-600 border-2 border-cyan-700 px-5 py-4 rounded-2xl flex items-center gap-4 text-white shadow-lg">
                                                        <Droplets size={28} className="text-white" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-1">Humidity</p>
                                                            <p className="text-2xl font-black leading-none">{animal.targetHumidity}%</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Registry Integration */}
                                    <div className="pt-6 border-t border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registry & Statutory Metadata</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <DetailItem label="Scientific Name" value={animal.latinName} italic />
                                            <DetailItem label="Microchip" value={animal.microchip} mono />
                                            <DetailItem label="Ring Number" value={animal.ringNumber} mono />
                                            <DetailItem label="Conservation" value={animal.redListStatus} color={getRedListColor(animal.redListStatus).split(' ')[1]} />
                                            <DetailItem label="Arrival Date" value={animal.arrivalDate ? new Date(animal.arrivalDate).toLocaleDateString() : '-'} />
                                            <DetailItem label="Subject Origin" value={animal.origin} />
                                            <DetailItem label="Hazard Class" value={animal.hazardRating} color={animal.hazardRating === HazardRating.HIGH ? 'text-rose-600' : 'text-slate-700'} />
                                            <DetailItem label="Toxicity" value={animal.isVenomous ? 'Venomous' : 'Non-Venomous'} color={animal.isVenomous ? 'text-rose-600' : 'text-slate-400'} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        
                        <section>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Weight History (30 Days)</h3>
                            <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-md h-72">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} dy={10} minTickGap={30} />
                                            <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={10} fontWeight="600" tickLine={false} axisLine={false} dx={-10} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                                                itemStyle={{ color: '#0f766e' }}
                                            />
                                            <Area type="monotone" dataKey="weight" stroke="#14b8a6" fill="url(#colorWeight)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: '#0f766e' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                        No weight data available to chart.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                    
                    {/* Right Sidebar */}
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Status</h3>
                            <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-md space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                        <Scale size={24}/>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest Weight</p>
                                        <p className="text-xl font-black text-slate-800">
                                            {latestWeightLog 
                                                ? (latestWeightLog.weightGrams !== undefined 
                                                    ? formatWeightDisplay(latestWeightLog.weightGrams, animal.weightUnit) 
                                                    : latestWeightLog.value) 
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                        <Utensils size={24}/>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Feed</p>
                                        <p className="text-xl font-black text-slate-800 truncate max-w-[150px]">
                                            {husbandryLogs.find(l => l.type === LogType.FEED)?.value || 'Nil Recorded'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Ranges</p>
                                    <div className="space-y-1">
                                        {animal.flyingWeight && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 font-bold">Fly Wt:</span>
                                                <span className="text-slate-900 font-black">{formatWeightDisplay(animal.flyingWeight, animal.weightUnit)}</span>
                                            </div>
                                        )}
                                        {animal.winterWeight && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 font-bold">Winter Wt:</span>
                                                <span className="text-slate-900 font-black">{formatWeightDisplay(animal.winterWeight, animal.weightUnit)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
              )}

              {activeTab === 'husbandry' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            {(['ALL', LogType.FEED, LogType.WEIGHT, LogType.FLIGHT, LogType.TRAINING, LogType.TEMPERATURE] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setHusbandryFilter(type)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${husbandryFilter === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { setEditingLog(undefined); setLogFormType(LogType.FEED); setIsAddLogOpen(true); }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all">
                            <Plus size={14}/> Add Husbandry Log
                        </button>
                    </div>
                    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Value</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Notes</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Auth & Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {husbandryLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{new Date(log.date).toLocaleDateString('en-GB')}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-black uppercase text-slate-500">{log.type}</span></td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-900">{log.weightGrams ? formatWeightDisplay(log.weightGrams, animal.weightUnit) : log.value}</td>
                                        <td className="px-6 py-4 text-xs text-slate-500 italic">{log.notes || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="font-mono text-[10px] font-black text-slate-300 uppercase">{log.userInitials}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditLog(log)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"><Edit2 size={12}/></button>
                                                    <button onClick={() => window.confirm('Purge log?') && handleDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}

              {activeTab === 'medical' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-end">
                        <button onClick={() => setIsMedicalModalOpen(true)} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/20">
                            <Stethoscope size={14}/> Log Medical Record
                        </button>
                    </div>
                    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Clinical Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnosis / Condition</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Auth & Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {medicalLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-700">{new Date(log.date).toLocaleDateString('en-GB')}</div>
                                            <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">{log.healthType}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${log.condition === HealthCondition.HEALTHY ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{log.condition}</span>
                                                {log.bcs && <span className="text-[10px] font-bold text-slate-400">BCS: {log.bcs}/10</span>}
                                            </div>
                                            <p className="text-sm font-medium text-slate-800 leading-relaxed italic">"{log.value}"</p>
                                            {log.notes && <p className="text-xs text-slate-500 mt-2">{log.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="font-mono text-[10px] font-black text-slate-300 uppercase">{log.userInitials}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditLog(log)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"><Edit2 size={12}/></button>
                                                    <button onClick={() => window.confirm('Purge log?') && handleDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={12}/></button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}

              {activeTab === 'intelligence' && (
                <div className="animate-in slide-in-from-bottom-4 duration-300">
                    {!speciesCardData ? (
                        <div className="bg-white rounded-[2rem] border-2 border-slate-300 p-12 text-center shadow-md">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-slate-100 text-slate-400">
                                <Sparkles size={40}/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-2">Species Intelligence Dossier</h3>
                            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 font-medium">Synthesize an AI-generated educational report for this species, including global conservation status and dietary adaptations.</p>
                            <button 
                                onClick={handleGenerateIntelligence} 
                                disabled={isGeneratingSpecies}
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center gap-3 mx-auto disabled:opacity-50"
                            >
                                {isGeneratingSpecies ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                {isGeneratingSpecies ? 'Synthesizing...' : 'Generate Dossier'}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white rounded-[2rem] border-2 border-slate-300 p-8 shadow-md prose prose-slate max-w-none">
                                <ReactMarkdown>{speciesCardData.text}</ReactMarkdown>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2 text-emerald-400"><Globe size={14}/> Native Range Map</h4>
                                    <div className="bg-white rounded-xl overflow-hidden aspect-square border-2 border-white/10 p-2 flex items-center justify-center">
                                        <img src={animal.distributionMapUrl || speciesCardData.mapImage} alt="Range Map" className="w-full h-auto mix-blend-multiply filter contrast-125" />
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase text-center mt-4 tracking-widest">AI Generated Distribution Modeling</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              )}
          </div>
      </div>

      {/* MODALS */}
      {isEditing && (
          <AnimalFormModal 
            isOpen={isEditing} 
            onClose={() => setIsEditing(false)} 
            onSave={(updated) => { onUpdateAnimal(updated); setIsEditing(false); }} 
            initialData={animal} 
            locations={locations}
          />
      )}

      {isAddLogOpen && (
          <AddEntryModal 
            isOpen={isAddLogOpen} 
            onClose={() => { setIsAddLogOpen(false); setEditingLog(undefined); }} 
            onSave={(entry) => { 
                let updatedLogs = [...animal.logs];
                if (editingLog) {
                    updatedLogs = updatedLogs.map(l => l.id === entry.id ? entry : l);
                } else {
                    updatedLogs = [entry, ...updatedLogs];
                }
                onUpdateAnimal({ ...animal, logs: updatedLogs }); 
                setIsAddLogOpen(false); 
                setEditingLog(undefined);
            }} 
            onDelete={handleDeleteLog}
            animal={animal} 
            initialType={logFormType} 
            existingLog={editingLog}
            foodOptions={foodOptions} 
            feedMethods={feedMethods[animal.category] || []}
          />
      )}

      {isMedicalModalOpen && (
          <MedicalRecordModal
            isOpen={isMedicalModalOpen}
            onClose={() => setIsMedicalModalOpen(false)}
            onSave={handleSaveMedicalRecord}
            animals={[animal]}
            preSelectedAnimalId={animal.id}
          />
      )}

      {isSignGeneratorOpen && (
          <SignGenerator 
            animal={animal}
            orgProfile={orgProfile}
            onClose={() => setIsSignGeneratorOpen(false)}
          />
      )}
    </div>
  );
};

export default AnimalProfile;
