
import React, { useState } from 'react';
import { Task, Animal, LogType, User, SiteLogEntry } from '../types';
import { CheckCircle2, Circle, Plus, Calendar, User as UserIcon, AlertCircle, ListTodo } from 'lucide-react';
import AddEntryModal from './AddEntryModal';

interface TasksProps {
  tasks: Task[];
  animals: Animal[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  users?: User[];
  currentUser?: User | null;
  onAddSiteLog?: (log: SiteLogEntry) => void;
  onUpdateAnimal?: (animal: Animal) => void;
}

const Tasks: React.FC<TasksProps> = ({ 
    tasks, animals, onAddTask, onUpdateTask, onDeleteTask, users, currentUser, onAddSiteLog, onUpdateAnimal 
}) => {
  const [filter, setFilter] = useState<'assigned' | 'pending' | 'completed'>('assigned');
  const [showModal, setShowModal] = useState(false);
  const [selectedAnimalForEntry, setSelectedAnimalForEntry] = useState<Animal | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter(t => {
      if (filter === 'assigned') return !t.completed && (t.assignedTo === currentUser?.id);
      if (filter === 'pending') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleTaskClick = (task: Task) => {
      if (task.completed) {
          if (window.confirm("Re-open task?")) onUpdateTask({ ...task, completed: false });
          return;
      }
      if (task.type === LogType.HEALTH && task.animalId) {
          const animal = animals.find(a => a.id === task.animalId);
          if (animal) { 
              setCompletingTask(task);
              setSelectedAnimalForEntry(animal);
              setShowEntryModal(true);
              return;
          }
      }
      if (window.confirm(`Complete: ${task.title}?`)) {
          onUpdateTask({ ...task, completed: true });
      }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                    <ListTodo className="text-slate-600" size={28} /> Duty Rota
                </h1>
                <p className="text-slate-500 text-sm font-medium">Section Care Tasks & Assignments</p>
             </div>
             <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all hover:bg-black"><Plus size={20} /></button>
        </div>

        <div className="flex bg-white p-1 rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden w-full md:w-auto self-start inline-flex">
            {[
                { id: 'assigned', label: 'My Tasks' },
                { id: 'pending', label: 'All Tasks' },
                { id: 'completed', label: 'Completed' }
            ].map(f => (
                <button 
                    key={f.id} 
                    onClick={() => setFilter(f.id as any)} 
                    className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filter === f.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    {f.label}
                </button>
            ))}
        </div>

        <div className="space-y-3 pb-24">
            {filteredTasks.length > 0 ? filteredTasks.map(task => {
                const animal = animals.find(a => a.id === task.animalId);
                const isOverdue = !task.completed && task.dueDate < new Date().toISOString().split('T')[0];
                const assignedUser = users?.find(u => u.id === task.assignedTo);

                return (
                    <div key={task.id} className={`bg-white rounded-2xl border-2 border-slate-300 border-l-4 overflow-hidden shadow-sm transition-all active:scale-[0.99] flex items-stretch hover:shadow-md ${isOverdue ? 'hover:border-l-rose-500 border-l-rose-500/20' : 'hover:border-l-emerald-500 border-l-transparent'} ${task.completed ? 'opacity-60' : ''}`}>
                        <div className="flex-1 p-5 cursor-pointer" onClick={() => handleTaskClick(task)}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 tracking-widest">{task.type}</span>
                                {isOverdue && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 tracking-widest flex items-center gap-1"><AlertCircle size={10}/> Overdue</span>}
                                {assignedUser && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-500 tracking-widest border border-slate-200 flex items-center gap-1"><UserIcon size={8}/> {assignedUser.initials}</span>}
                            </div>
                            <h3 className="font-bold text-base text-slate-900 leading-tight mb-2 uppercase tracking-tight">{task.title}</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> {new Date(task.dueDate).toLocaleDateString()}</span>
                                {animal && <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{animal.name}</span>}
                            </div>
                        </div>
                        <button onClick={() => handleTaskClick(task)} className={`w-20 flex flex-col items-center justify-center transition-all border-l-2 border-slate-100 ${task.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-300 hover:bg-slate-50'}`}>
                            {task.completed ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                        </button>
                    </div>
                );
            }) : (
                <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">Rota Cleared</p>
                </div>
            )}
        </div>

        {showEntryModal && selectedAnimalForEntry && (
            <AddEntryModal isOpen={showEntryModal} onClose={() => setShowEntryModal(false)} onSave={(entry) => {
                onUpdateAnimal?.({ ...selectedAnimalForEntry, logs: [entry, ...selectedAnimalForEntry.logs] });
                onUpdateTask({ ...completingTask!, completed: true });
                setShowEntryModal(false);
            }} animal={selectedAnimalForEntry} initialType={LogType.HEALTH} foodOptions={{} as any} feedMethods={[]}/>
        )}
    </div>
  );
};

export default Tasks;
