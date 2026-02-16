import React, { useState, useMemo } from 'react';
import { TimeLogEntry, User, UserRole } from '../types';
import { Clock, Calendar, ArrowRight, Timer, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';

interface TimeSheetsProps {
    timeLogs: TimeLogEntry[];
    currentUser: User;
    users: User[];
    onDeleteLog?: (id: string) => void;
    onUpdateLog?: (log: TimeLogEntry) => void;
}

const TimeSheets: React.FC<TimeSheetsProps> = ({ timeLogs, currentUser, users, onDeleteLog, onUpdateLog }) => {
    const [filterUserId, setFilterUserId] = useState<string>('ALL');
    const [filterDate, setFilterDate] = useState<string>('');
    const [editingLog, setEditingLog] = useState<TimeLogEntry | null>(null);

    const isAdmin = currentUser.role === UserRole.ADMIN;

    const filteredLogs = useMemo(() => {
        return [...timeLogs].filter(log => {
            const userMatch = filterUserId === 'ALL' || log.userId === filterUserId;
            const dateMatch = !filterDate || log.date === filterDate;
            return userMatch && dateMatch;
        }).sort((a, b) => b.startTime - a.startTime);
    }, [timeLogs, filterUserId, filterDate]);

    const formatDuration = (mins?: number) => {
        if (mins === undefined || mins === null) return 'Duty Active';
        const hrs = Math.floor(mins / 60);
        const m = mins % 60;
        return `${hrs}h ${m}m`;
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Permanently remove this attendance record from the statutory ledger?")) {
            onDeleteLog?.(id);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                        <Clock className="text-slate-600" size={28} /> Attendance Ledger
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Authorized record of personnel presence and operational hours.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="flex-1 md:w-48">
                        <select 
                            value={filterUserId} 
                            onChange={(e) => setFilterUserId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                        >
                            <option value="ALL">Entire Team</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 md:w-40">
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-emerald-500 focus:outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Data</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clock Log</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duty Duration</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                {isAdmin && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:hidden">Admin</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map(log => {
                                const isActive = log.status === 'Active';
                                return (
                                    <tr key={log.id} className="bg-white hover:bg-slate-50 transition-all group border-l-4 border-l-transparent hover:border-l-emerald-500 hover:shadow-md relative z-0 hover:z-10">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[10px] border border-white shadow-sm">
                                                    {log.userName.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <span className="font-black text-slate-900 text-sm uppercase tracking-tight">{log.userName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-slate-800 text-sm">{new Date(log.date).toLocaleDateString('en-GB')}</div>
                                            <div className="text-[10px] font-black text-slate-300 mt-1 uppercase tracking-widest flex items-center gap-1"><Calendar size={10}/> Registry Key: {log.id.slice(-6)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 font-mono text-[10px] font-black text-slate-500">
                                                <span className="bg-slate-50 px-2 py-1 rounded border border-slate-200">{new Date(log.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <ArrowRight size={12} className="text-slate-300" />
                                                <span className={isActive ? 'text-slate-300 italic' : 'bg-slate-50 px-2 py-1 rounded border border-slate-200'}>
                                                    {log.endTime ? new Date(log.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                                <Timer size={12}/> {formatDuration(log.durationMinutes)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                isActive ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right print:hidden">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setEditingLog(log)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all"
                                                        title="Edit Log"
                                                    >
                                                        <Edit2 size={14}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(log.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm transition-all"
                                                        title="Delete Log"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-24 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Nil Attendance Records Found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT LOG MODAL */}
            {editingLog && (
                <EditTimeLogModal 
                    log={editingLog} 
                    onClose={() => setEditingLog(null)} 
                    onSave={(updated) => {
                        onUpdateLog?.(updated);
                        setEditingLog(null);
                    }} 
                />
            )}
        </div>
    );
};

interface EditTimeLogModalProps {
    log: TimeLogEntry;
    onClose: () => void;
    onSave: (log: TimeLogEntry) => void;
}

const EditTimeLogModal: React.FC<EditTimeLogModalProps> = ({ log, onClose, onSave }) => {
    const [date, setDate] = useState(log.date);
    const [startTime, setStartTime] = useState(new Date(log.startTime).toTimeString().slice(0, 5));
    const [endTime, setEndTime] = useState(log.endTime ? new Date(log.endTime).toTimeString().slice(0, 5) : '');
    const [status, setStatus] = useState(log.status);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const startTs = new Date(`${date}T${startTime}`).getTime();
        let endTs: number | undefined = undefined;
        let duration: number | undefined = undefined;

        if (endTime && status === 'Completed') {
            endTs = new Date(`${date}T${endTime}`).getTime();
            if (endTs < startTs) {
                alert("Clock-out time cannot be before clock-in time.");
                return;
            }
            duration = Math.floor((endTs - startTs) / 60000);
        }

        onSave({
            ...log,
            date,
            startTime: startTs,
            endTime: endTs,
            durationMinutes: duration,
            status: status
        });
    };

    const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 focus:outline-none transition-all placeholder-slate-400";

    return (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-0 animate-in zoom-in-95 border-2 border-slate-300 overflow-hidden">
                <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Edit Attendance</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registry Correction: {log.userName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-900 p-1"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Duty Date</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clock In</label>
                                <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clock Out</label>
                                <input 
                                    type="time" 
                                    value={endTime} 
                                    onChange={e => {
                                        setEndTime(e.target.value);
                                        if (e.target.value) setStatus('Completed');
                                    }} 
                                    className={`${inputClass} ${status === 'Active' ? 'opacity-50' : ''}`} 
                                    disabled={status === 'Active'}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Shift Status</label>
                            <select 
                                value={status} 
                                onChange={e => {
                                    setStatus(e.target.value as any);
                                    if (e.target.value === 'Active') setEndTime('');
                                }} 
                                className={inputClass}
                            >
                                <option value="Active">Currently on Duty (Active)</option>
                                <option value="Completed">Shift Finalized (Completed)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-100 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="text-amber-600 shrink-0" size={18} />
                        <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
                            Warning: Updating statutory attendance records requires Curatorial authorization. All changes are logged.
                        </p>
                    </div>

                    <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]">
                        Authorize & Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TimeSheets;