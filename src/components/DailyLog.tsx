
import React, { useState, useOptimistic, use } from 'react';
import { Animal, AnimalCategory, LogType, LogEntry, User, SortOption } from '../types';
import { ClipboardList, Check, Droplets, ChevronLeft, ChevronRight, Plus, Thermometer, Scale, Utensils, ArrowRight } from 'lucide-react';
import { formatWeightDisplay } from '../services/weightUtils';
import AddEntryModal from './AddEntryModal';
import { AppContext } from '../context/AppContext';

interface DailyLogProps {
  animals: Animal[];
  onUpdateAnimal: (animal: Animal) => void;
  foodOptions: Record<AnimalCategory, string[]>;
  feedMethods: Record<AnimalCategory, string[]>;
  eventTypes?: string[];
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  currentUser?: User | null;
  activeCategory: AnimalCategory;
  setActiveCategory: (cat: AnimalCategory) => void;
  viewDate: string;
  setViewDate: (date: string) => void;
}

const DailyLog: React.FC<DailyLogProps> = ({ 
    animals, onUpdateAnimal, foodOptions, feedMethods, eventTypes = [], sortOption, setSortOption, 
    currentUser, activeCategory, setActiveCategory, viewDate, setViewDate 
}) => {
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [logType, setLogType] = useState<LogType>(LogType.WEIGHT);
  const [editingLog, setEditingLog] = useState<LogEntry | undefined>(undefined);

  const [optimisticAnimals, setOptimisticAnimals] = useOptimistic(
    animals,
    (state: Animal[], newLogAction: { animalId: string, log: LogEntry }) => {
        return state.map(animal => {
            if (animal.id === newLogAction.animalId) {
                // Add or replace log
                const newLogs = [newLogAction.log, ...(animal.logs || []).filter(l => l.id !== newLogAction.log.id)];
                return { ...animal, logs: newLogs };
            }
            return animal;
        });
    }
  );

  // Directly compute derived data in the render body for React 19
  const filteredAndSortedAnimals = [...optimisticAnimals]
    .filter(a => a.category === activeCategory && !a.archived)
    .sort((a, b) => {
        if (sortOption === 'alpha-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'alpha-desc') return b.name.localeCompare(a.name);
        if (sortOption === 'custom') return (a.order ?? 0) - (b.order ?? 0);
        return 0;
    });

  const getTodayLog = (animal: Animal, type: LogType): LogEntry | undefined => {
    return (animal.logs || []).find(log => log.date.startsWith(viewDate) && log.type === type);
  };

  const handleCellClick = (animalId: string, type: LogType, existingLog?: LogEntry) => {
    setSelectedAnimalId(animalId);
    setLogType(type);
    setEditingLog(existingLog);
    setModalOpen(true);
  };

  const handleQuickCheck = (animal: Animal, type: LogType) => {
      const existingLog = getTodayLog(animal, type);
      if (existingLog) return; 

      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 5);
      const newEntry: LogEntry = {
          id: `${type.toLowerCase()}_${Date.now()}`,
          date: `${viewDate}T${timeStr}:00`,
          type: type,
          value: `Completed - ${type}`,
          userInitials: currentUser?.initials || '??',
          timestamp: Date.now()
      };

      // Optimistically update UI
      setOptimisticAnimals({ animalId: animal.id, log: newEntry });
      
      // Persist change
      onUpdateAnimal({
          ...animal,
          logs: [newEntry, ...(animal.logs || [])]
      });
  };

  const cycleSort = () => {
      if (sortOption === 'alpha-asc') setSortOption('alpha-desc');
      else if (sortOption === 'alpha-desc') setSortOption('custom');
      else setSortOption('alpha-asc');
  };

  const isExotic = activeCategory === AnimalCategory.EXOTICS;
  const showTemp = isExotic || activeCategory === AnimalCategory.MAMMALS;
  const cellPadding = isExotic ? "px-2 md:px-4 py-3" : "px-5 py-4";
  const headerFontSize = isExotic ? "text-[9px]" : "text-[10px]";

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
            <ClipboardList className="text-slate-600" size={28} /> Daily Operations
          </h1>
          <p className="text-slate-500 text-sm font-medium">Mandatory husbandry logs for {viewDate}.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border-2 border-slate-200 rounded-lg bg-white px-3 py-1.5 justify-center shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Sort</span>
                <button 
                    onClick={cycleSort} 
                    className={`text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[10px] font-bold uppercase transition-all ${sortOption === 'custom' ? 'text-emerald-600' : ''}`}
                >
                    {sortOption === 'alpha-asc' ? 'Alpha ASC' : sortOption === 'alpha-desc' ? 'Alpha DESC' : 'Custom'}
                    <ArrowRight size={12} className={sortOption === 'alpha-desc' ? 'rotate-90' : sortOption === 'alpha-asc' ? '-rotate-90' : 'rotate-0'}/>
                </button>
            </div>
            <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-300 shadow-sm">
                <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft size={18}/></button>
                <input type="date" value={viewDate} onChange={e => { if(viewDate !== e.target.value) setViewDate(e.target.value); }} className="bg-transparent border-none focus:ring-0 text-slate-800 font-black text-[10px] w-32 text-center p-0 uppercase tracking-widest"/>
                <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d.toISOString().split('T')[0]); }} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight size={18}/></button>
            </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Object.values(AnimalCategory).map((cat) => (
            <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-2 ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}>{cat}</button>
        ))}
      </div>

        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0 table-fixed sm:table-auto">
                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                        <tr>
                            <th className={`${cellPadding} ${headerFontSize} font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 ${isExotic ? 'w-[30%] sm:w-auto' : ''}`}>Identity</th>
                            <th className={`${cellPadding} ${headerFontSize} font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 ${isExotic ? 'w-[25%] sm:w-auto' : ''}`}>
                                {isExotic ? 'Gradient' : 'Live Wt'}
                            </th>
                            {showTemp && !isExotic && <th className={`${cellPadding} ${headerFontSize} font-black text-slate-500 uppercase tracking-widest border-b border-slate-200`}>Envir.</th>}
                            <th className={`${cellPadding} ${headerFontSize} font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 ${isExotic ? 'w-[25%] sm:w-auto' : ''}`}>Intake</th>
                            {isExotic && <th className={`${cellPadding} ${headerFontSize} font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-200 w-[20%] sm:w-auto`}>Tasks</th>}
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredAndSortedAnimals.map(animal => {
                            const weightLog = getTodayLog(animal, LogType.WEIGHT);
                            const feedLog = getTodayLog(animal, LogType.FEED);
                            const tempLog = getTodayLog(animal, LogType.TEMPERATURE);
                            const mistLog = getTodayLog(animal, LogType.MISTING);
                            const waterLog = getTodayLog(animal, LogType.WATER);
                            
                            return (
                                <tr key={animal.id} className="bg-white hover:bg-slate-50/50 transition-all group border-l-4 border-l-transparent hover:border-l-emerald-500 relative z-0 hover:z-10">
                                    <td className={`${cellPadding} border-b border-slate-100 min-w-0`}>
                                        <div className="flex items-center gap-2">
                                            <img src={animal.imageUrl} alt="" className={`w-8 h-8 rounded-full object-cover border-2 border-slate-200 shadow-sm shrink-0 ${isExotic ? 'hidden sm:block' : ''}`} />
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-900 text-[11px] sm:text-sm uppercase tracking-tight truncate">{animal.name}</p>
                                                {!isExotic && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{animal.species}</p>}
                                                {isExotic && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate sm:tracking-wider">{animal.species}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className={`${cellPadding} border-b border-slate-100`}>
                                        <button type="button" onClick={() => handleCellClick(animal.id, isExotic ? LogType.TEMPERATURE : LogType.WEIGHT, isExotic ? tempLog : weightLog)} className={`w-full flex items-center justify-between min-h-[2.5rem] px-2 -mx-2 rounded-xl border-2 border-transparent hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left ${!(isExotic ? tempLog : weightLog) ? 'border-dashed border-slate-200' : ''}`}>
                                            <div className="flex-1 min-w-0">
                                            {isExotic ? (tempLog ? (<span className="font-black text-slate-800 flex items-center gap-1 text-[10px] sm:text-xs"><Thermometer size={12} className="text-rose-500 shrink-0"/> {tempLog.baskingTemp}°/{tempLog.coolTemp}°</span>) : (<span className="text-slate-300 font-bold uppercase text-[9px] sm:text-[10px] tracking-tight sm:tracking-widest">Gradient</span>)) : (weightLog ? (<span className="font-black text-slate-800 flex items-center gap-2"><Scale size={14} className="text-blue-500"/> {weightLog.weightGrams !== undefined ? formatWeightDisplay(weightLog.weightGrams, animal.weightUnit) : weightLog.value}</span>) : (<span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Weight</span>))}
                                            </div>
                                            <div className={`shrink-0 ml-1 transition-all ${isExotic ? (tempLog ? 'opacity-100' : 'opacity-0 group-hover:opacity-100') : (weightLog ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}`}>{(isExotic ? tempLog : weightLog) ? <Check size={14} className="text-emerald-500" /> : <Plus size={14} className="text-emerald-400" />}</div>
                                        </button>
                                    </td>

                                    {showTemp && !isExotic && (
                                        <td className={`${cellPadding} border-b border-slate-100`}>
                                            <button type="button" onClick={() => handleCellClick(animal.id, LogType.TEMPERATURE, tempLog)} className={`w-full flex items-center justify-between min-h-[2.5rem] px-2 -mx-2 rounded-xl border-2 border-transparent hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left ${!tempLog ? 'border-dashed border-slate-200' : ''}`}>
                                                <div className="flex-1 min-w-0">{tempLog ? (<span className="font-black text-slate-800 flex items-center gap-2"><Thermometer size={14} className="text-rose-500"/> {tempLog.temperature}°C</span>) : (<span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Temp</span>)}</div>
                                                <div className={`shrink-0 ml-1 transition-all ${tempLog ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{tempLog ? <Check size={14} className="text-emerald-500" /> : <Plus size={14} className="text-emerald-400" />}</div>
                                            </button>
                                        </td>
                                    )}

                                    <td className={`${cellPadding} border-b border-slate-100`}>
                                        <button type="button" onClick={() => handleCellClick(animal.id, LogType.FEED, feedLog)} className={`w-full flex items-center justify-between min-h-[2.5rem] px-2 -mx-2 rounded-xl border-2 border-transparent hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left ${!feedLog ? 'border-dashed border-slate-200' : ''}`}>
                                            <div className="flex-1 min-w-0">{feedLog ? (<div className="flex flex-col min-w-0"><span className="font-black text-emerald-700 text-[9px] sm:text-[11px] uppercase tracking-tighter sm:tracking-tight flex items-center gap-1 truncate"><Utensils size={10} className="shrink-0"/> {feedLog.value}</span></div>) : (<span className="text-slate-300 font-bold uppercase text-[9px] sm:text-[10px] tracking-tight sm:tracking-widest">Intake</span>)}</div>
                                            <div className={`shrink-0 ml-1 transition-all ${feedLog ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{feedLog ? <Check size={14} className="text-emerald-500" /> : <Plus size={14} className="text-emerald-400" />}</div>
                                        </button>
                                    </td>

                                    {isExotic && (
                                        <td className={`${cellPadding} text-center border-b border-slate-100`}>
                                            <div className="flex justify-center gap-2 sm:gap-4">
                                                <button type="button" className="relative group/check" onClick={() => handleQuickCheck(animal, LogType.MISTING)}>
                                                    <Droplets size={isExotic ? 18 : 22} className={`transition-all duration-300 cursor-pointer ${mistLog ? 'text-emerald-500 scale-110' : 'text-slate-200 hover:text-emerald-300'}`} />
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/check:opacity-100 pointer-events-none uppercase tracking-widest z-20">MIST</span>
                                                </button>
                                                <button type="button" className="relative group/check" onClick={() => handleQuickCheck(animal, LogType.WATER)}>
                                                    <Check size={18} className={`transition-all duration-300 cursor-pointer ${waterLog ? 'text-blue-500 scale-110' : 'text-slate-200 hover:text-blue-300'}`} />
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/check:opacity-100 pointer-events-none uppercase tracking-widest z-20">WATER</span>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

      {modalOpen && selectedAnimalId && (
          <AddEntryModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(entry) => {
              const animal = animals.find(a => a.id === selectedAnimalId);
              if (animal) {
                  setOptimisticAnimals({ animalId: animal.id, log: entry });
                  onUpdateAnimal({ ...animal, logs: [entry, ...(animal.logs || []).filter(l => l.id !== entry.id)] });
              }
          }} onUpdateAnimal={onUpdateAnimal} animal={animals.find(a => a.id === selectedAnimalId)!} allAnimals={animals} initialType={logType} existingLog={editingLog} foodOptions={foodOptions} feedMethods={feedMethods[activeCategory] || []} eventTypes={eventTypes} initialDate={viewDate}/>
      )}
    </div>
  );
};

export default DailyLog;
