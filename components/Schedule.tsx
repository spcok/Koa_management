
import React, { useState, useMemo, useTransition } from 'react';
import { Animal, AnimalCategory, Task, LogType } from '../types';
import { CalendarClock, Plus, Calendar, Trash2, Filter, Utensils, RefreshCw, Loader2 } from 'lucide-react';

interface ScheduleProps {
  animals: Animal[];
  tasks: Task[];
  foodOptions: Record<AnimalCategory, string[]>;
  onAddTasks: (tasks: Task[]) => void;
  onDeleteTask: (id: string) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ animals, tasks, foodOptions, onAddTasks, onDeleteTask }) => {
  // Generation State
  const [selectedCategory, setSelectedCategory] = useState<AnimalCategory>(AnimalCategory.EXOTICS);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [withCalciDust, setWithCalciDust] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'interval'>('manual');
  
  // React 19 Transition
  const [isPending, startTransition] = useTransition();
  
  // Viewing State
  const [viewFilterAnimalId, setViewFilterAnimalId] = useState<string>('ALL');

  // Manual Mode
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  // Interval Mode
  const [intervalDays, setIntervalDays] = useState(3);
  const [intervalStart, setIntervalStart] = useState(new Date().toISOString().split('T')[0]);
  const [occurrences, setOccurrences] = useState(5);

  const filteredAnimals = animals.filter(a => a.category === selectedCategory);

  const toggleDate = (date: string) => {
      setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const handleGenerate = () => {
      if (!selectedAnimalId || !foodType || !quantity) return;
      
      startTransition(() => {
          const animal = animals.find(a => a.id === selectedAnimalId);
          if (!animal) return;

          let datesToSchedule: string[] = [];

          if (scheduleMode === 'manual') {
              datesToSchedule = selectedDates;
          } else {
              // Robust date calculation to avoid timezone offsets
              const [y, m, d] = intervalStart.split('-').map(Number);
              // Create date in local time (months are 0-indexed)
              const startDate = new Date(y, m - 1, d);

              for (let i = 0; i < occurrences; i++) {
                  const current = new Date(startDate);
                  current.setDate(startDate.getDate() + (i * intervalDays));
                  
                  // Format back to YYYY-MM-DD manually to respect local time
                  const year = current.getFullYear();
                  const month = String(current.getMonth() + 1).padStart(2, '0');
                  const day = String(current.getDate()).padStart(2, '0');
                  datesToSchedule.push(`${year}-${month}-${day}`);
              }
          }

          const notes = `${quantity} ${foodType}${withCalciDust ? ' + Calci-dust' : ''}`;
          
          const newTasks: Task[] = datesToSchedule.map(date => ({
              id: `task_${Date.now()}_${Math.random()}`,
              animalId: selectedAnimalId,
              type: LogType.FEED,
              title: `Feed ${animal.name}`,
              dueDate: date,
              completed: false,
              recurring: false,
              notes: notes
          }));

          onAddTasks(newTasks);
          
          // Reset
          setSelectedDates([]);
      });
  };

  // View Filtering Logic
  const scheduledFeeds = useMemo(() => {
    return tasks
        .filter(t => !t.completed && t.type === LogType.FEED)
        .filter(t => viewFilterAnimalId === 'ALL' || t.animalId === viewFilterAnimalId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, viewFilterAnimalId]);

  // Calendar Grid Generator
  const calendarDays = useMemo(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for(let i=1; i<=daysInMonth; i++) {
          // Construct local date manually to ensure YYYY-MM-DD matches display
          const d = new Date(year, month, i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          days.push(`${y}-${m}-${day}`);
      }
      return days;
  }, []); // Empty dependency array as this month view is static relative to current session

  const inputClass = "w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
             <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarClock className="text-emerald-600" /> Feeding Schedule
                </h1>
                <p className="text-slate-500">Plan and view future feeding tasks.</p>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: CREATION */}
            <div className="lg:col-span-1 space-y-6">
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                     <h2 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
                        <Plus size={18} className="text-emerald-600"/> Schedule Multiple Feedings
                     </h2>
                     
                     <div className="space-y-5">
                        <div className="bg-white p-1 rounded-lg flex border border-slate-200">
                            {Object.values(AnimalCategory).map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Animal *</label>
                            <select value={selectedAnimalId} onChange={e => setSelectedAnimalId(e.target.value)} className={inputClass}>
                                <option value="">Select Animal...</option>
                                {filteredAnimals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Food Type *</label>
                                <select value={foodType} onChange={e => setFoodType(e.target.value)} className={inputClass}>
                                    <option value="">Select...</option>
                                    {(foodOptions?.[selectedCategory] || []).map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity *</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} placeholder="1"/>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="calci" checked={withCalciDust} onChange={e => setWithCalciDust(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 bg-slate-700 border-slate-600"/>
                            <label htmlFor="calci" className="text-sm font-medium text-slate-600">With Calci-dust</label>
                        </div>

                        <hr className="border-slate-200" />

                        <div>
                             <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Select Feeding Dates *</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="intervalMode" 
                                        checked={scheduleMode === 'interval'} 
                                        onChange={(e) => setScheduleMode(e.target.checked ? 'interval' : 'manual')}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 bg-slate-700 border-slate-600"
                                    />
                                    <label htmlFor="intervalMode" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Auto-calculate by interval</label>
                                </div>
                             </div>

                             {scheduleMode === 'manual' ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                         <span className="text-sm font-bold text-slate-800">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 bg-white p-2 rounded-lg border border-slate-200">
                                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                                            <div key={d} className="text-center text-[10px] text-slate-400 font-bold py-1">{d}</div>
                                        ))}
                                        {calendarDays.map(date => {
                                            // date is strictly YYYY-MM-DD
                                            const dObj = new Date(date); 
                                            // getDate() on a local date constructed from YYYY, MM, DD returns correct day
                                            const [y, m, d] = date.split('-').map(Number);
                                            const localDate = new Date(y, m-1, d);
                                            const dayNum = localDate.getDate();
                                            const colStart = localDate.getDay() + 1;
                                            const isSelected = selectedDates.includes(date);
                                            
                                            const style = dayNum === 1 ? { gridColumnStart: colStart } : {};

                                            return (
                                                <button 
                                                    key={date}
                                                    style={style}
                                                    onClick={() => toggleDate(date)}
                                                    className={`h-8 rounded text-xs font-bold transition-all ${
                                                        isSelected ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {dayNum}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-right">{selectedDates.length} dates selected</p>
                                </div>
                             ) : (
                                <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-start gap-3">
                                        <RefreshCw size={20} className="text-emerald-500 mt-1"/>
                                        <div className="text-xs text-slate-500">
                                            Automatically generate feeding tasks starting from a date, repeating every X days.
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Start Date</label>
                                        <input type="date" value={intervalStart} onChange={e => setIntervalStart(e.target.value)} className="w-full text-sm bg-slate-700 text-white border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"/>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Repeat Every (Days)</label>
                                            <input type="number" min="1" value={intervalDays} onChange={e => setIntervalDays(parseInt(e.target.value))} className="w-full text-sm bg-slate-700 text-white border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Total Occurrences</label>
                                            <input type="number" min="1" max="50" value={occurrences} onChange={e => setOccurrences(parseInt(e.target.value))} className="w-full text-sm bg-slate-700 text-white border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"/>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={!selectedAnimalId || !foodType || !quantity || (scheduleMode === 'manual' && selectedDates.length === 0) || isPending}
                            className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            {isPending ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />}
                            {isPending ? 'Scheduling...' : 'Confirm Schedule'}
                        </button>
                     </div>
                 </div>
            </div>

            {/* RIGHT COLUMN: VIEWING */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                         <div>
                            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Utensils size={20} className="text-orange-500"/> Scheduled Feeds
                            </h2>
                            <p className="text-xs text-slate-500">{scheduledFeeds.length} upcoming feeds scheduled</p>
                         </div>
                         
                         <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                             <Filter size={14} className="text-slate-400 ml-2" />
                             <select 
                                value={viewFilterAnimalId} 
                                onChange={(e) => setViewFilterAnimalId(e.target.value)}
                                className="bg-transparent text-sm font-medium text-slate-700 border-none focus:ring-0 cursor-pointer"
                             >
                                 <option value="ALL">All Animals</option>
                                 {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                             </select>
                         </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 max-h-[600px]">
                        {scheduledFeeds.length > 0 ? (
                            <div className="space-y-3">
                                {scheduledFeeds.map(task => {
                                    const animal = animals.find(a => a.id === task.animalId);
                                    if (!animal) return null;
                                    
                                    const dateObj = new Date(task.dueDate);
                                    const isToday = task.dueDate === new Date().toISOString().split('T')[0];

                                    return (
                                        <div key={task.id} className="flex items-center bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all group">
                                            <div className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center mr-4 border ${isToday ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                <span className="text-[10px] uppercase font-bold">{dateObj.toLocaleString('default', {month: 'short'})}</span>
                                                <span className="text-xl font-bold leading-none">{dateObj.getDate()}</span>
                                                <span className="text-[10px] font-medium">{dateObj.toLocaleString('default', {weekday: 'short'})}</span>
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-800">{animal.name}</h3>
                                                    <span className="text-xs text-slate-500 bg-slate-100 px-1.5 rounded">{animal.species}</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-600 mt-0.5">{task.notes}</p>
                                            </div>

                                            <button 
                                                onClick={() => onDeleteTask(task.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Schedule Item"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Calendar size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No scheduled feeds found.</p>
                                <p className="text-sm opacity-70">Use the creation tool to add new feeds.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Schedule;
