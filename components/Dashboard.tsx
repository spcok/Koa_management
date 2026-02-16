import React, { useState, useMemo } from 'react';
import { Animal, AnimalCategory, LogType, LogEntry, UserRole, SortOption, Task, HazardRating } from '../types';
import { Search, Plus, Scale, Utensils, ChevronLeft, ChevronRight, GripVertical, ArrowRight, Heart, ChevronDown, ChevronUp, CheckCircle, AlertCircle, ClipboardCheck, Skull, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { formatWeightDisplay } from '../services/weightUtils';
import AddEntryModal from './AddEntryModal';
import AnimalFormModal from './AnimalFormModal';

interface DashboardProps {
  animals: Animal[];
  userRole: UserRole | string | null;
  onSelectAnimal: (animal: Animal) => void;
  onAddAnimal: (animal: Animal) => void;
  onUpdateAnimal: (animal: Animal) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  isOrderLocked?: boolean;
  onToggleLock?: (locked: boolean) => void;
  activeTab: AnimalCategory;
  setActiveTab: (category: AnimalCategory) => void;
  foodOptions: Record<AnimalCategory, string[]>;
  feedMethods: Record<AnimalCategory, string[]>;
  locations: string[];
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onReorderAnimals?: (reorderedSubset: Animal[]) => void;
  viewDate: string;
  setViewDate: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    animals, userRole, onSelectAnimal, onAddAnimal, onUpdateAnimal, 
    activeTab, setActiveTab, foodOptions, feedMethods, locations, tasks,
    sortOption, setSortOption, isOrderLocked = true, onToggleLock,
    onReorderAnimals, viewDate, setViewDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [selectedAnimalForEntry, setSelectedAnimalForEntry] = useState<Animal | null>(null);
  const [entryModalInitialType, setEntryModalInitialType] = useState<LogType>(LogType.WEIGHT);
  const [isCreateAnimalModalOpen, setIsCreateAnimalModalOpen] = useState(false);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);

  // Split Memoization: Animal Stats (Heavy)
  // This depends only on animals, activeTab, and viewDate. It will NOT re-run when tasks change.
  const animalStats = useMemo(() => {
      const catAnimals = animals.filter(a => a.category === activeTab && !a.archived);
      const total = catAnimals.length;
      let weighed = 0;
      let fed = 0;
      
      const animalData = new Map<string, {
          todayWeight?: LogEntry,
          latestWeight?: LogEntry,
          todayFeed?: LogEntry,
          previousWeight?: LogEntry
      }>();

      catAnimals.forEach(animal => {
          const logs = animal.logs || [];
          const weights: LogEntry[] = [];
          const feeds: LogEntry[] = [];

          // Optimization: Single pass filtering
          for (let i = 0; i < logs.length; i++) {
              const l = logs[i];
              if (l.type === LogType.WEIGHT) weights.push(l);
              else if (l.type === LogType.FEED) feeds.push(l);
          }

          weights.sort((a, b) => b.timestamp - a.timestamp);

          const todayWeight = weights.find(l => l.date.startsWith(viewDate));
          const latestWeight = weights[0];
          // Previous is the first weight entry that does not match the viewDate
          const previousWeight = weights.find(l => !l.date.startsWith(viewDate));
          
          const todayFeed = feeds.find(l => l.date.startsWith(viewDate));
          
          if (todayWeight) weighed++;
          if (todayFeed) fed++;

          animalData.set(animal.id, { todayWeight, latestWeight, todayFeed, previousWeight });
      });

      return { total, weighed, fed, animalData };
  }, [animals, activeTab, viewDate]);

  // Split Memoization: Task Stats (Light/Frequent)
  // This depends ONLY on tasks. Interacting with tasks will not trigger the heavy animal calculation above.
  const taskStats = useMemo(() => {
      return {
          pendingTasks: tasks.filter(t => !t.completed && t.type !== LogType.HEALTH),
          pendingHealth: tasks.filter(t => !t.completed && t.type === LogType.HEALTH)
      };
  }, [tasks]);

  const filteredAnimals = useMemo(() => {
    let result = [...animals]
      .filter(a => a.category === activeTab && !a.archived && a.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (sortOption === 'alpha-asc') {
        result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'alpha-desc') {
        result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'custom') {
        result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return result;
  }, [animals, activeTab, searchTerm, sortOption]);

  const handleDragStart = (index: number) => {
      if (isOrderLocked) return;
      setDraggedIndex(index);
      if (sortOption !== 'custom') {
          setSortOption('custom');
      }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index || isOrderLocked) return;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex || !onReorderAnimals || isOrderLocked) {
          setDraggedIndex(null);
          return;
      }

      const newOrderedList = [...filteredAnimals];
      const draggedItem = newOrderedList.splice(draggedIndex, 1)[0];
      newOrderedList.splice(dropIndex, 0, draggedItem);

      onReorderAnimals(newOrderedList);
      setDraggedIndex(null);
  };

  const getWeightDisplay = (log: LogEntry | undefined, unit: 'g' | 'oz' | 'lbs_oz' = 'g') => {
      if (!log) return '-';
      if (log.weightGrams !== undefined) return formatWeightDisplay(log.weightGrams, unit);
      return log.value;
  };

  const getDateDisplay = (log?: LogEntry) => {
      if (!log) return '';
      const d = new Date(log.date);
      return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' }).toUpperCase()}`;
  };

  const getTimeDisplay = (log?: LogEntry) => {
      if (!log) return '';
      const d = new Date(log.date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const cycleSort = () => {
      if (sortOption === 'alpha-asc') setSortOption('alpha-desc');
      else if (sortOption === 'alpha-desc') setSortOption('custom');
      else setSortOption('alpha-asc');
  };

  return (
    <div className="p-3 md:p-8 pb-24 space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-xs md:text-sm">Overview of {animalStats.total} active animals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          <div className="bg-emerald-600 rounded-xl overflow-hidden shadow-sm relative group text-white border-2 border-emerald-700">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-800/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 h-1 md:h-1.5 bg-emerald-800/30 w-full">
                  <div className="h-full bg-white/40" style={{ width: `${(animalStats.weighed / (animalStats.total || 1)) * 100}%` }}></div>
              </div>
              <div className="p-4 md:p-6 relative z-10 flex justify-between items-center">
                  <div>
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Weighed Today</p>
                      <div className="flex items-baseline gap-1">
                          <span className="text-2xl md:text-4xl font-black">{animalStats.weighed}</span>
                          <span className="text-sm md:text-lg opacity-60 font-medium">/{animalStats.total}</span>
                      </div>
                  </div>
                  <Scale className="text-white/20 w-12 h-12 md:w-16 md:h-16 absolute -right-2 -bottom-4 rotate-12" />
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <Scale size={20} className="text-white md:w-6 md:h-6"/>
                  </div>
              </div>
          </div>

          <div className="bg-orange-500 rounded-xl overflow-hidden shadow-sm relative group text-white border-2 border-orange-600">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-800/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 h-1 md:h-1.5 bg-orange-800/30 w-full">
                  <div className="h-full bg-white/40" style={{ width: `${(animalStats.fed / (animalStats.total || 1)) * 100}%` }}></div>
              </div>
              <div className="p-4 md:p-6 relative z-10 flex justify-between items-center">
                  <div>
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Fed Today</p>
                      <div className="flex items-baseline gap-1">
                          <span className="text-2xl md:text-4xl font-black">{animalStats.fed}</span>
                          <span className="text-sm md:text-lg opacity-60 font-medium">/{animalStats.total}</span>
                      </div>
                  </div>
                  <Utensils className="text-white/20 w-12 h-12 md:w-16 md:h-16 absolute -right-2 -bottom-4 rotate-12" />
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <Utensils size={20} className="text-white md:w-6 md:h-6"/>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setIsTasksOpen(!isTasksOpen)}
                className="w-full flex justify-between items-center p-3 md:p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                  <div className="flex items-center gap-3">
                      <div className={`p-1 rounded border ${taskStats.pendingTasks.length > 0 ? 'bg-white border-slate-300 text-emerald-600' : 'bg-transparent border-emerald-600 text-emerald-600'}`}>
                          <ClipboardCheck size={16} />
                      </div>
                      <span className="font-bold text-slate-800 text-xs md:text-sm">Tasks & To-Dos</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="bg-slate-200 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">{taskStats.pendingTasks.length}</span>
                      {isTasksOpen ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                  </div>
              </button>
              {isTasksOpen && (
                  <div className="p-3 md:p-4 bg-white border-t-2 border-slate-100 max-h-60 overflow-y-auto">
                      {taskStats.pendingTasks.length > 0 ? (
                          <div className="space-y-2">
                              {taskStats.pendingTasks.map(t => (
                                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                      <div className="mt-0.5"><AlertCircle size={14} className="text-amber-500"/></div>
                                      <div>
                                          <p className="text-xs md:text-sm font-bold text-slate-700">{t.title}</p>
                                          <p className="text-[10px] md:text-xs text-slate-500">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-6 md:py-8 text-slate-400 text-xs md:text-sm flex flex-col items-center">
                              <CheckCircle size={20} className="mb-2 text-emerald-400 opacity-50"/>
                              All caught up!
                          </div>
                      )}
                  </div>
              )}
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setIsHealthOpen(!isHealthOpen)}
                className="w-full flex justify-between items-center p-3 md:p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                  <div className="flex items-center gap-3">
                      <div className="p-1 rounded border border-transparent text-rose-500">
                          <Heart size={16} />
                      </div>
                      <span className="font-bold text-slate-800 text-xs md:text-sm">Health Checks</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="bg-slate-200 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">{taskStats.pendingHealth.length}</span>
                      {isHealthOpen ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                  </div>
              </button>
              {isHealthOpen && (
                  <div className="p-3 md:p-4 bg-white border-t-2 border-slate-100 max-h-60 overflow-y-auto">
                      {taskStats.pendingHealth.length > 0 ? (
                          <div className="space-y-2">
                              {taskStats.pendingHealth.map(t => (
                                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                      <div className="mt-0.5"><Heart size={14} className="text-rose-500"/></div>
                                      <div>
                                          <p className="text-xs md:text-sm font-bold text-slate-700">{t.title}</p>
                                          <p className="text-[10px] md:text-xs text-slate-500">Scheduled: {new Date(t.dueDate).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-6 md:py-8 text-slate-400 text-xs md:text-sm flex flex-col items-center">
                              <Heart size={20} className="mb-2 text-rose-300 opacity-50"/>
                              No checks scheduled
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      <div className="flex flex-col gap-3 md:bg-white md:p-2 md:rounded-xl md:border-2 md:border-slate-300 md:shadow-sm">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full pb-1">
              {Object.values(AnimalCategory).map((cat) => (
                  <button 
                    key={cat} onClick={() => setActiveTab(cat)}
                    className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap border-2 ${activeTab === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}
                  >
                      {cat}
                  </button>
              ))}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <div className="flex items-center bg-white border-2 border-slate-200 rounded-lg px-2 w-full sm:w-auto shadow-sm">
                    <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} className="p-2 text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft size={16}/></button>
                    <input 
                        type="date" 
                        value={viewDate} 
                        onChange={e => setViewDate(e.target.value)}
                        className="px-1 py-1.5 text-[10px] md:text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 uppercase tracking-wider flex-1 text-center"
                    />
                    <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d.toISOString().split('T')[0]); }} className="p-2 text-slate-400 hover:text-slate-700 transition-colors"><ChevronRight size={16}/></button>
                </div>
                <div className="relative w-full sm:flex-1 sm:max-w-xs shadow-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-xs font-medium focus:border-slate-400 focus:outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 border-2 border-slate-200 rounded-lg bg-white px-3 py-1.5 w-full sm:w-auto justify-center shadow-sm">
                    <div className="flex items-center gap-1 mr-2 border-r border-slate-100 pr-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Sort</span>
                        <button 
                            onClick={cycleSort} 
                            className={`text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[10px] font-bold uppercase transition-all ${sortOption === 'custom' ? 'text-emerald-600' : ''}`}
                        >
                            {sortOption === 'alpha-asc' ? 'Alpha ASC' : sortOption === 'alpha-desc' ? 'Alpha DESC' : 'Custom'}
                            <ArrowRight size={12} className={sortOption === 'alpha-desc' ? 'rotate-90' : sortOption === 'alpha-asc' ? '-rotate-90' : 'rotate-0'}/>
                        </button>
                    </div>
                    {sortOption === 'custom' && (
                        <button 
                            onClick={() => onToggleLock?.(!isOrderLocked)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${isOrderLocked ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            title={isOrderLocked ? "Order Locked" : "Order Unlocked"}
                        >
                            {isOrderLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            <span className="text-[9px] font-black uppercase tracking-widest">{isOrderLocked ? 'Locked' : 'Unlock'}</span>
                        </button>
                    )}
                </div>
          </div>
      </div>

      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm relative">
          <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-slate-100 border-b-2 border-slate-200">
                      <tr>
                          {sortOption === 'custom' && !isOrderLocked && <th className="w-8 md:w-10 border-b border-slate-200 sticky left-0 z-20 bg-slate-100"></th>}
                          <th className={`px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 sticky z-20 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${sortOption === 'custom' && !isOrderLocked ? 'left-8 md:left-10' : 'left-0'}`}>Name</th>
                          <th className="hidden md:table-cell px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Species</th>
                          <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center md:text-left">Weight</th>
                          <th className="hidden lg:table-cell px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-400 border-b border-slate-200">Previous</th>
                          <th className="hidden lg:table-cell px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-400 border-b border-slate-200">Target</th>
                          <th className="px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right md:text-left">Last Fed</th>
                          <th className="hidden md:table-cell px-3 md:px-4 py-3 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-right border-b border-slate-200">Location</th>
                      </tr>
                  </thead>
                  <tbody className="text-xs md:text-sm">
                      {filteredAnimals.map((animal, index) => {
                          const d = animalStats.animalData.get(animal.id);
                          const hasWeightToday = !!d?.todayWeight;
                          const isBeingDragged = draggedIndex === index;
                          const isHighHazard = animal.hazardRating === HazardRating.HIGH || animal.isVenomous;
                          const isMedHazard = animal.hazardRating === HazardRating.MEDIUM;
                          
                          return (
                              <tr 
                                key={animal.id} 
                                draggable={sortOption === 'custom' && !isOrderLocked}
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`bg-white hover:bg-emerald-50/60 transition-all group border-l-4 border-l-transparent hover:border-l-emerald-500 ${isBeingDragged ? 'opacity-40 bg-slate-50' : 'cursor-pointer'}`}
                              >
                                  {sortOption === 'custom' && !isOrderLocked && (
                                      <td className="px-2 text-slate-300 group-hover:text-slate-400 border-b border-slate-100 sticky left-0 z-10 bg-inherit">
                                          <GripVertical size={16} />
                                      </td>
                                  )}
                                  <td className={`px-2 md:px-4 py-2 md:py-3 font-bold text-slate-900 border-b border-slate-100 sticky z-10 bg-inherit shadow-[2px_0_5px_rgba(0,0,0,0.03)] group-hover:bg-emerald-50/60 ${sortOption === 'custom' && !isOrderLocked ? 'left-8 md:left-10' : 'left-0'}`} onClick={() => onSelectAnimal(animal)}>
                                      <div className="flex items-center gap-1 md:gap-2">
                                        <span className="truncate max-w-[120px] md:max-w-none">{animal.name}</span>
                                        {isHighHazard && (
                                            <span title={animal.isVenomous ? 'Venomous Subject' : 'High Hazard Subject'}>
                                                <Skull size={12} className="text-rose-600 shrink-0" />
                                            </span>
                                        )}
                                        {isMedHazard && !isHighHazard && (
                                            <span title="Medium Hazard Subject">
                                                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                                            </span>
                                        )}
                                      </div>
                                  </td>
                                  <td className="hidden md:table-cell px-3 md:px-4 py-3 border-b border-slate-100" onClick={() => onSelectAnimal(animal)}>
                                      <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 md:py-1 rounded-full border border-slate-200 bg-white text-slate-600 group-hover:bg-emerald-100 group-hover:border-emerald-200 transition-colors whitespace-nowrap">{animal.species}</span>
                                  </td>
                                  <td className="px-2 md:px-4 py-2 md:py-3 border-b border-slate-100 text-center md:text-left" onClick={() => onSelectAnimal(animal)}>
                                      {hasWeightToday ? (
                                          <span className="font-bold text-slate-800">{getWeightDisplay(d?.todayWeight, animal.weightUnit)}</span>
                                      ) : (
                                          <span className="text-slate-300">-</span>
                                      )}
                                  </td>
                                  <td className="hidden lg:table-cell px-3 md:px-4 py-3 border-b border-slate-100" onClick={() => onSelectAnimal(animal)}>
                                      {d?.previousWeight ? (
                                          <div className="flex flex-col">
                                              <span className="font-bold text-slate-500 text-[10px] md:text-xs">{getWeightDisplay(d?.previousWeight, animal.weightUnit)}</span>
                                              <span className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase leading-none">{getDateDisplay(d?.previousWeight)}</span>
                                          </div>
                                      ) : (
                                          <span className="text-slate-300 text-[10px] italic">None</span>
                                      )}
                                  </td>
                                  <td className="hidden lg:table-cell px-3 md:px-4 py-3 text-[10px] md:text-xs font-medium text-slate-500 border-b border-slate-100" onClick={() => onSelectAnimal(animal)}>
                                      {animal.flyingWeight || animal.winterWeight ? (
                                          <div className="flex flex-col gap-0.5 leading-tight">
                                              {animal.flyingWeight && <span>FLY: {formatWeightDisplay(animal.flyingWeight, animal.weightUnit)}</span>}
                                              {animal.winterWeight && <span>WIN: {formatWeightDisplay(animal.winterWeight, animal.weightUnit)}</span>}
                                          </div>
                                      ) : '-'}
                                  </td>
                                  <td className="px-2 md:px-4 py-2 md:py-3 border-b border-slate-100 text-right md:text-left" onClick={() => onSelectAnimal(animal)}>
                                      {d?.todayFeed ? (
                                          <div className="flex flex-col gap-0.5 md:items-start items-end">
                                              <span className="font-bold text-slate-800 text-[10px] md:text-xs block leading-tight">{d.todayFeed.value}</span>
                                              <div className="flex items-baseline gap-1.5">
                                                  <span className="font-bold text-slate-800 text-[10px] md:text-xs leading-none">{getTimeDisplay(d.todayFeed)}</span>
                                                  <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase leading-none">
                                                      {getDateDisplay(d.todayFeed)}
                                                  </span>
                                              </div>
                                          </div>
                                      ) : (
                                          <span className="text-slate-300 text-[10px] italic">-</span>
                                      )}
                                  </td>
                                  <td className="hidden md:table-cell px-3 md:px-4 py-3 text-right text-[10px] md:text-xs font-bold text-slate-500 border-b border-slate-100" onClick={() => onSelectAnimal(animal)}>
                                      {animal.location}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {isAddEntryModalOpen && selectedAnimalForEntry && (
          <AddEntryModal 
            isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} 
            onSave={(entry) => onUpdateAnimal({ ...selectedAnimalForEntry, logs: [entry, ...(selectedAnimalForEntry.logs || [])] })} 
            animal={selectedAnimalForEntry} initialType={entryModalInitialType} 
            foodOptions={foodOptions} feedMethods={feedMethods[selectedAnimalForEntry.category] || []} 
          />
      )}
      
      {isCreateAnimalModalOpen && (
          <AnimalFormModal isOpen={isCreateAnimalModalOpen} onClose={() => setIsCreateAnimalModalOpen(false)} onSave={onAddAnimal} locations={locations} />
      )}
      
      {userRole === UserRole.ADMIN && (
          <button onClick={() => setIsCreateAnimalModalOpen(true)} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-emerald-600 text-white p-4 md:px-4 md:py-3 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 z-40 font-bold text-sm">
              <Plus size={24}/> <span className="hidden md:inline">Add Animal</span>
          </button>
      )}
    </div>
  );
};

export default Dashboard;