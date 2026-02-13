
import React, { useState, useMemo } from 'react';
import { Animal, LogType, LogEntry, HealthRecordType, HealthCondition, AnimalCategory, Task, User, UserRole, OrganizationProfile } from '../types';
import { Heart, Activity, Calendar, Save, Upload, FileText, AlertCircle, Plus, X, Filter, RotateCcw, Clock, User as UserIcon, Edit2, Trash2, Skull, Printer, Biohazard, ShieldCheck, Thermometer, AlertTriangle, Pill, ClipboardList, ArrowRight, Sparkles, Loader2, Check, BarChart3, Microscope, LayoutList } from 'lucide-react';
import { analyzeHealthHistory, analyzeCollectionHealth } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import AddEntryModal from './AddEntryModal';
import MedicalRecordModal from './MedicalRecordModal';

interface HealthProps {
  animals: Animal[];
  onSelectAnimal: (animal: Animal) => void;
  onUpdateAnimal: (animal: Animal) => void;
  tasks?: Task[];
  onAddTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  users?: User[];
  currentUser?: User;
  orgProfile?: OrganizationProfile | null;
}

const Health: React.FC<HealthProps> = ({ animals, onSelectAnimal, onUpdateAnimal, tasks, onAddTask, onUpdateTask, onDeleteTask, users, currentUser, orgProfile }) => {
  const [activeTab, setActiveTab] = useState<'medical' | 'quarantine' | 'mar' | 'parasitology'>('medical');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // AI Insights State
  const [aiInsight, setAiInsight] = useState<{animalId: string, text: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Collection Briefing State
  const [collectionBrief, setCollectionBrief] = useState<string | null>(null);
  const [isBriefing, setIsBriefing] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<AnimalCategory | 'ALL'>('ALL');
  const [filterAnimalId, setFilterAnimalId] = useState<string>('ALL');
  const [filterHealthType, setFilterHealthType] = useState<HealthRecordType | 'ALL'>('ALL');

  // Record Editing State
  const [editingLog, setEditingLog] = useState<LogEntry | undefined>(undefined);
  const [editingAnimal, setEditingAnimal] = useState<Animal | undefined>(undefined);

  // MAR Administration
  const handleAdministerMed = (animal: Animal, medLog: LogEntry) => {
      if(!window.confirm(`Confirm administration of ${medLog.medicationName}?`)) return;
      
      const adminLog: LogEntry = {
          id: `med_admin_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: LogType.HEALTH,
          healthType: HealthRecordType.MEDICATION,
          value: `Administered: ${medLog.medicationName}`,
          notes: `Dosage: ${medLog.medicationDosage}, Route: ${medLog.medicationRoute}. Ref: ${medLog.id}`,
          userInitials: currentUser?.initials || 'SYS',
          timestamp: Date.now(),
          condition: HealthCondition.UNDER_TREATMENT
      };

      onUpdateAnimal({
          ...animal,
          logs: [adminLog, ...(animal.logs || [])]
      });
  };

  const handleGenerateAiInsight = async (animal: Animal) => {
    setIsAnalyzing(true);
    const text = await analyzeHealthHistory(animal);
    setAiInsight({ animalId: animal.id, text });
    setIsAnalyzing(false);
  };

  const handleGenerateCollectionBrief = async () => {
      setIsBriefing(true);
      const brief = await analyzeCollectionHealth(animals);
      setCollectionBrief(brief);
      setIsBriefing(false);
  };

  const handleReleaseFromQuarantine = (animal: Animal) => {
      if (!window.confirm(`Release ${animal.name} from quarantine?`)) return;
      const log: LogEntry = {
          id: `q_rel_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: LogType.HEALTH,
          healthType: HealthRecordType.RELEASE,
          value: 'Released from Quarantine',
          notes: 'Cleared for return to normal activities.',
          userInitials: currentUser?.initials || 'SYS',
          timestamp: Date.now()
      };
      const updatedAnimal = { ...animal, isQuarantine: false, logs: [log, ...(animal.logs || [])] };
      onUpdateAnimal(updatedAnimal);
  };

  const handleEditLog = (log: LogEntry & { animal: Animal }) => {
    setEditingLog(log);
    setEditingAnimal(log.animal);
    setIsModalOpen(true);
  };

  const handleDeleteLog = (logId: string, animal: Animal) => {
    if (window.confirm('Permanently purge clinical record? This action is mandatory for statutory compliance auditing.')) {
        const updatedLogs = (animal.logs || []).filter(l => l.id !== logId);
        onUpdateAnimal({ ...animal, logs: updatedLogs });
    }
  };

  const handleSaveMedicalRecord = (healthLog: LogEntry, animalId: string, isDeceased: boolean) => {
      const animal = animals.find(a => a.id === animalId);
      if (animal) {
          onUpdateAnimal({ 
              ...animal, 
              logs: [healthLog, ...(animal.logs || [])], 
              archived: isDeceased 
          });
      }
  };

  const recentHealthLogs = useMemo(() => {
    return animals
      .flatMap(animal => (animal.logs || []).filter(log => log.type === LogType.HEALTH).map(log => ({ ...log, animal })))
      .filter(log => {
        const categoryMatch = filterCategory === 'ALL' || log.animal.category === filterCategory;
        const animalMatch = filterAnimalId === 'ALL' || log.animal.id === filterAnimalId;
        const typeMatch = filterHealthType === 'ALL' || log.healthType === filterHealthType;
        return categoryMatch && animalMatch && typeMatch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [animals, filterCategory, filterAnimalId, filterHealthType]);

  const parasitologyLogs = useMemo(() => {
      return recentHealthLogs.filter(l => 
          l.healthType === HealthRecordType.PARASITOLOGY || 
          l.healthType === HealthRecordType.PATHOLOGY
      );
  }, [recentHealthLogs]);

  const upcomingChecks = useMemo(() => {
      if (!tasks) return [];
      return tasks.filter(t => t.type === LogType.HEALTH && !t.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks]);

  const quarantineAnimals = useMemo(() => animals.filter(a => a.isQuarantine), [animals]);

  // Identify Active Medications
  const activeMedicationMap = useMemo(() => {
      const map = new Map<string, { animal: Animal, logs: LogEntry[] }>();
      
      animals.forEach(animal => {
          if (animal.archived) return;
          const activeMeds: LogEntry[] = [];
          const processedNames = new Set<string>();
          
          const sortedLogs = [...(animal.logs || [])]
            .filter(l => l.healthType === HealthRecordType.MEDICATION && l.medicationName)
            .sort((a,b) => b.timestamp - a.timestamp);
          
          sortedLogs.forEach(log => {
              if (log.medicationName && !processedNames.has(log.medicationName)) {
                  const endDateStr = log.medicationEndDate;
                  const endDate = endDateStr ? new Date(endDateStr) : new Date(8640000000000000); 
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  if (endDate >= today) {
                      activeMeds.push(log);
                  }
                  processedNames.add(log.medicationName);
              }
          });

          if (activeMeds.length > 0) {
              map.set(animal.id, { animal, logs: activeMeds });
          }
      });
      return map;
  }, [animals]);

  const inputClass = "w-full px-3 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 transition-all";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Heart className="text-rose-500" fill="currentColor" /> Medical Centre
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Statutory veterinary diagnostics and collection-wide health tracking.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={handleGenerateCollectionBrief} 
                disabled={isBriefing}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-black"
            >
                {isBriefing ? <Loader2 size={16} className="animate-spin"/> : <BarChart3 size={16}/>} Morning Briefing
            </button>
            <button onClick={() => { setEditingLog(undefined); setEditingAnimal(undefined); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
                <Plus size={16} /> New Record
            </button>
        </div>
      </div>

      <div className="flex gap-2 border-b-2 border-slate-200 mb-4 overflow-x-auto scrollbar-hide">
          {[
              { id: 'medical', label: 'Clinical Ledger', icon: FileText },
              { id: 'mar', label: 'MAR Charts', icon: Pill },
              { id: 'parasitology', label: 'Parasitology', icon: Microscope },
              { id: 'quarantine', label: 'Isolation Station', icon: Biohazard }
          ].map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 whitespace-nowrap -mb-[2px] ${activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  <tab.icon size={16}/> {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'medical' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-left-2 duration-300">
              <div className="lg:col-span-3 space-y-5">
                    {collectionBrief && (
                         <div className="bg-slate-900 border-l-8 border-emerald-500 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group animate-in slide-in-from-top-4">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity size={160} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-emerald-400">
                                        <ShieldCheck size={14}/> Curator's Health Audit Brief
                                    </h3>
                                    <button onClick={() => setCollectionBrief(null)} className="text-white/40 hover:text-white"><X size={20}/></button>
                                </div>
                                <div className="prose prose-sm prose-invert max-w-none font-medium leading-relaxed">
                                    <ReactMarkdown>{collectionBrief}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}

                    {aiInsight && (
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group animate-in zoom-in-95">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Sparkles size={14}/> Subject Clinical Analysis: {animals.find(a => a.id === aiInsight.animalId)?.name}
                                    </h3>
                                    <button onClick={() => setAiInsight(null)} className="text-white/60 hover:text-white"><X size={16}/></button>
                                </div>
                                <div className="prose prose-sm prose-invert max-w-none font-medium leading-relaxed">
                                    <ReactMarkdown>{aiInsight.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-slate-200 flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Section Filter</label>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className={inputClass}>
                                <option value="ALL">Entire Collection</option>
                                {Object.values(AnimalCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Patient Search</label>
                            <select value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)} className={inputClass}>
                                <option value="ALL">All Active Patients</option>
                                {animals.filter(a => filterCategory === 'ALL' || a.category === filterCategory).map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Type Filter</label>
                            <select value={filterHealthType} onChange={(e) => setFilterHealthType(e.target.value as any)} className={inputClass}>
                                <option value="ALL">All Record Types</option>
                                {Object.values(HealthRecordType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">BCS Gauging</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Clinical Snapshot</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentHealthLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group relative">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-slate-800 text-sm">{new Date(log.date).toLocaleDateString('en-GB')}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{log.healthType}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{log.animal.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">{log.animal.species}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.bcs ? (
                                                    <div className="flex flex-col gap-1 w-24">
                                                        <div className="flex justify-between text-[9px] font-black text-slate-400">
                                                            <span>BODY COND.</span>
                                                            <span className={log.bcs < 3 || log.bcs > 8 ? 'text-rose-600' : 'text-emerald-600'}>{log.bcs}/10</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                            <div className={`h-full ${log.bcs < 3 || log.bcs > 8 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${log.bcs * 10}%` }}></div>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-[10px] text-slate-300 font-bold">N/A</span>}
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-xs font-medium text-slate-600 italic line-clamp-1 mb-2">"{log.value}"</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                                                        log.condition === HealthCondition.HEALTHY ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                        log.condition === HealthCondition.MONITORING ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                                        'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {log.condition}
                                                    </span>
                                                    {log.bodyPart && (
                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                                                            Site: {log.bodyPart}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button 
                                                      onClick={() => handleGenerateAiInsight(log.animal)}
                                                      disabled={isAnalyzing}
                                                      className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all"
                                                      title="AI Clinical Diagnostic"
                                                    >
                                                        {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                                                    </button>
                                                    <button onClick={() => handleEditLog(log)} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" title="Edit Entry">
                                                        <Edit2 size={14}/>
                                                    </button>
                                                    <button onClick={() => handleDeleteLog(log.id, log.animal)} className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" title="Delete Entry">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                    <button onClick={() => onSelectAnimal(log.animal)} className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" title="View Patient File">
                                                        <ArrowRight size={14}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
              </div>
              
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl border-2 border-slate-800">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 border-b-2 border-white/5 pb-4">
                          <Clock size={16} className="text-emerald-500"/> Clinical Rota
                      </h3>
                      <div className="space-y-4">
                          {upcomingChecks.map(task => (
                              <div key={task.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group active:scale-[0.98]">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{new Date(task.dueDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}</span>
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                  </div>
                                  <p className="font-black text-xs uppercase tracking-tight mb-1 text-white">{animals.find(a => a.id === task.animalId)?.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium leading-tight group-hover:text-white transition-colors">{task.title}</p>
                              </div>
                          ))}
                          {upcomingChecks.length === 0 && (
                              <div className="text-center py-10 opacity-20"><ClipboardList size={48} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase tracking-widest">No Active Rota</p></div>
                          )}
                      </div>
                  </div>

                  <div className="bg-amber-50 rounded-[2rem] p-6 border-2 border-amber-200 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-amber-900 border-b border-amber-200 pb-4">
                          <Biohazard size={16} className="text-amber-600"/> Isolation Area
                      </h3>
                      <div className="space-y-3">
                          {quarantineAnimals.map(a => (
                              <div key={a.id} onClick={() => onSelectAnimal(a)} className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-xl hover:shadow-md cursor-pointer transition-all">
                                  <div>
                                      <p className="text-xs font-black uppercase text-amber-950">{a.name}</p>
                                      <p className="text-[9px] font-bold text-amber-600 uppercase">{a.species}</p>
                                  </div>
                                  <ArrowRight size={14} className="text-amber-300"/>
                              </div>
                          ))}
                          {quarantineAnimals.length === 0 && (
                               <div className="text-center py-8 opacity-40"><ShieldCheck size={32} className="mx-auto mb-2 text-emerald-600"/><p className="text-[9px] font-black uppercase tracking-widest text-emerald-800">Area Sterile</p></div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'mar' && (
          <div className="animate-in slide-in-from-left-2 duration-300">
              <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                          <Pill className="text-blue-500" size={24} /> Medication Administration Record
                      </h2>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">Active Regimens Only</span>
                  </div>

                  {activeMedicationMap.size > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {Array.from(activeMedicationMap.values()).map(({animal, logs}) => (
                              <div key={animal.id} className="bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden flex flex-col">
                                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                                      <div>
                                          <h3 className="font-black text-slate-900 uppercase tracking-tight">{animal.name}</h3>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase">{animal.species}</p>
                                      </div>
                                      <img src={animal.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                  </div>
                                  <div className="p-4 flex-1 space-y-4">
                                      {logs.map(log => (
                                          <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                              <div className="flex justify-between items-start mb-2">
                                                  <h4 className="font-bold text-blue-700 text-sm">{log.medicationName}</h4>
                                                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{log.medicationFrequency}</span>
                                              </div>
                                              <div className="text-xs text-slate-600 space-y-1 mb-3">
                                                  <p><span className="font-bold">Dosage:</span> {log.medicationDosage}</p>
                                                  <p><span className="font-bold">Route:</span> {log.medicationRoute}</p>
                                                  <p className="text-[10px] text-slate-400">Ends: {log.medicationEndDate ? new Date(log.medicationEndDate).toLocaleDateString() : 'Indefinite'}</p>
                                              </div>
                                              <button 
                                                onClick={() => handleAdministerMed(animal, log)}
                                                className="w-full bg-blue-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                              >
                                                  <Check size={14}/> Administer
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-24 text-slate-400">
                          <Pill size={48} className="mx-auto mb-4 opacity-20"/>
                          <p className="text-xs font-black uppercase tracking-[0.2em]">No Active Medications</p>
                          <p className="text-xs mt-2">Start a treatment plan via the Clinical Ledger.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'parasitology' && (
          <div className="animate-in slide-in-from-left-2 duration-300">
              <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 overflow-hidden">
                  <div className="p-6 border-b-2 border-slate-200 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                          <Microscope className="text-purple-500" size={24} /> Parasitology & Pathology
                      </h2>
                  </div>
                  
                  <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sample / Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lab Results</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parasitologyLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-800 text-sm">{new Date(log.date).toLocaleDateString('en-GB')}</div>
                                            <div className="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-1">{log.healthType}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{log.animal.name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{log.animal.species}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                                                {log.sampleType || 'Unspecified Sample'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${
                                                    log.labResult?.toLowerCase().includes('negative') || log.labResult?.toLowerCase().includes('clear') 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : log.labResult?.toLowerCase().includes('positive') 
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {log.labResult || 'Pending'}
                                                </span>
                                            </div>
                                            {log.attachmentUrl && (
                                                <div className="mt-2 w-16 h-12 bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(log.attachmentUrl, '_blank')}>
                                                    <img src={log.attachmentUrl} alt="Lab Result" className="w-full h-full object-cover"/>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onSelectAnimal(log.animal)} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1 justify-end">
                                                View File <ArrowRight size={12}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {parasitologyLogs.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-24 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No Lab Records Found</td></tr>
                                )}
                            </tbody>
                        </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'quarantine' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-2 duration-300">
              {quarantineAnimals.map(animal => (
                  <div key={animal.id} className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                      <div className="bg-amber-100 p-3 border-b border-amber-200 flex justify-between items-center">
                          <h3 className="font-bold text-amber-900 flex items-center gap-2">
                              <AlertTriangle size={18}/> {animal.name}
                          </h3>
                          <span className="text-xs font-bold bg-white text-amber-800 px-2 py-1 rounded-full border border-amber-200">
                              {animal.species}
                          </span>
                      </div>
                      <div className="p-4 flex-1">
                          <div className="mb-4">
                              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Reason for Isolation</p>
                              <p className="text-sm text-stone-800 font-medium bg-white p-2 rounded border border-amber-100">
                                  {animal.quarantineReason || "No reason specified."}
                              </p>
                          </div>
                          <div className="flex justify-between items-center text-sm text-amber-800 mb-4">
                              <span className="flex items-center gap-1"><Biohazard size={14}/> Since:</span>
                              <span className="font-bold">{new Date(animal.quarantineStartDate || Date.now()).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="bg-white rounded-lg p-3 border border-amber-100 mb-2">
                              <p className="text-[10px] font-bold text-stone-400 uppercase mb-2">Latest Vitals</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex items-center gap-1 text-stone-600">
                                      <Thermometer size={12}/> 
                                      {(animal.logs || []).find(l => l.type === LogType.TEMPERATURE)?.temperature || '-'}°C
                                  </div>
                                  <div className="text-right font-bold text-stone-700">
                                      {(animal.logs || []).find(l => l.type === LogType.WEIGHT)?.value || '-'}
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="p-3 bg-white border-t border-amber-100">
                          <button 
                              onClick={() => handleReleaseFromQuarantine(animal)}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
                          >
                              <ShieldCheck size={16}/> Medical Release
                          </button>
                      </div>
                  </div>
              ))}
              {quarantineAnimals.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-stone-200 text-stone-400">
                      <ShieldCheck size={48} className="mb-4 opacity-20 text-emerald-500" />
                      <p className="font-medium text-lg">No animals currently in isolation.</p>
                      <p className="text-sm">Facility is clear.</p>
                  </div>
              )}
          </div>
      )}

      {/* MODALS */}
      {editingLog && editingAnimal && isModalOpen && (
          <AddEntryModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setEditingLog(undefined); setEditingAnimal(undefined); }} 
            onSave={(entry) => {
                const updatedLogs = editingAnimal.logs.map(l => l.id === entry.id ? entry : l);
                onUpdateAnimal({ ...editingAnimal, logs: updatedLogs });
                setIsModalOpen(false);
                setEditingLog(undefined);
                setEditingAnimal(undefined);
            }} 
            onDelete={(id) => handleDeleteLog(id, editingAnimal)}
            animal={editingAnimal} 
            initialType={editingLog.type} 
            existingLog={editingLog} 
            foodOptions={{} as any} 
            feedMethods={[]} 
          />
      )}

      {!editingLog && isModalOpen && (
          <MedicalRecordModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveMedicalRecord}
            animals={animals}
            currentUser={currentUser}
          />
      )}
    </div>
  );
};

export default Health;
