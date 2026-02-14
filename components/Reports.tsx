
import React, { useState, useMemo } from 'react';
import { REPORT_SCHEMAS, ReportSchema } from './reports/reportConfig';
import { Animal, LogType, LogEntry, Incident, SiteLogEntry, TimeLogEntry, OrganizationProfile, User } from '../types';
import { FileText, Download, Printer, Filter, Calendar, Search, LayoutList, ChevronDown, Table2 } from 'lucide-react';
import { DocumentService } from '../services/DocumentService';

interface ReportsProps {
  animals: Animal[];
  incidents?: Incident[];
  siteLogs?: SiteLogEntry[];
  timeLogs?: TimeLogEntry[];
  users?: User[];
  orgProfile?: OrganizationProfile | null;
  currentUser?: User | null;
}

const Reports: React.FC<ReportsProps> = ({ 
    animals, incidents = [], siteLogs = [], timeLogs = [], users = [], orgProfile, currentUser 
}) => {
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('DAILY_LOG');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const currentSchema = REPORT_SCHEMAS[selectedSchemaId];

  // Data Processing Logic
  const tableData = useMemo(() => {
      let rows: any[] = [];

      // Filter Helper
      const inDateRange = (date: string) => {
          if (!date) return false;
          const d = date.split('T')[0];
          return d >= startDate && d <= endDate;
      };

      if (selectedSchemaId === 'DAILY_LOG') {
          rows = animals.flatMap(animal => 
              (animal.logs || []).filter(l => inDateRange(l.date)).map(l => ({
                  time: new Date(l.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                  subject: animal.name,
                  type: l.type,
                  value: l.type === LogType.WEIGHT && l.weightGrams ? `${l.weightGrams}g` : l.value,
                  initials: l.userInitials
              }))
          );
      } 
      else if (selectedSchemaId === 'STOCK_LIST') {
          rows = animals.filter(a => !a.archived).map(a => ({
              id: a.ringNumber || a.microchip || '-',
              name: a.name,
              latin: a.latinName || '-',
              sex: a.sex || '?',
              age: a.dob ? `${new Date().getFullYear() - new Date(a.dob).getFullYear()}y` : '-',
              origin: a.origin || 'Unknown',
              arrival: a.arrivalDate ? new Date(a.arrivalDate).toLocaleDateString() : '-'
          }));
      }
      else if (selectedSchemaId === 'INCIDENTS') {
          rows = incidents.filter(i => inDateRange(i.date)).map(i => ({
              date: new Date(i.date).toLocaleDateString(),
              location: i.location,
              category: i.type,
              description: i.description,
              action: i.severity,
              initials: i.reportedBy
          }));
      }
      // ... (Rest of existing data logic remains the same)
      else if (selectedSchemaId === 'MAINTENANCE') {
          rows = siteLogs.filter(l => inDateRange(l.date)).map(l => ({
              date: new Date(l.date).toLocaleDateString(),
              asset: l.location,
              task: l.title,
              materials: l.description,
              staff: l.loggedBy,
              status: l.status
          }));
      }
      else if (selectedSchemaId === 'MOVEMENTS') {
          rows = animals.flatMap(a => (a.logs || []).filter(l => l.type === LogType.MOVEMENT && inDateRange(l.date)).map(l => ({
              date: new Date(l.date).toLocaleDateString(),
              subject: a.name,
              type: l.movementType,
              vector: `${l.movementSource || '?'} -> ${l.movementDestination || '?'}`,
              auth: l.userInitials
          })));
      }
      else if (selectedSchemaId === 'WEIGHTS') {
          rows = animals.flatMap(a => {
              const weightLogs = (a.logs || []).filter(l => l.type === LogType.WEIGHT).sort((x,y) => x.timestamp - y.timestamp);
              return weightLogs.filter(l => inDateRange(l.date)).map((l, idx) => {
                  const prev = weightLogs[idx-1];
                  const currWeight = l.weightGrams || parseFloat(l.value) || 0;
                  const prevWeight = prev ? (prev.weightGrams || parseFloat(prev.value) || 0) : 0;
                  const diff = prev ? (currWeight - prevWeight) : 0;
                  return {
                      date: new Date(l.date).toLocaleDateString(),
                      subject: a.name,
                      prev: prev ? `${prevWeight}g` : '-',
                      curr: `${currWeight}g`,
                      diff: diff > 0 ? `+${diff}g` : `${diff}g`,
                      initials: l.userInitials
                  };
              });
          });
      }
      else if (selectedSchemaId === 'CLINICAL') {
          rows = animals.flatMap(a => (a.logs || []).filter(l => l.type === LogType.HEALTH && inDateRange(l.date)).map(l => ({
              date: new Date(l.date).toLocaleDateString(),
              subject: a.name,
              symptom: l.value,
              treatment: l.notes || '-',
              vet: l.prescribedBy || '-',
              follow: l.condition
          })));
      }

      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          rows = rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lower)));
      }

      return rows;
  }, [selectedSchemaId, animals, incidents, siteLogs, startDate, endDate, searchTerm]);

  const handleExportDocx = async () => {
      switch (selectedSchemaId) {
          case 'STOCK_LIST':
              await DocumentService.generateStockList(animals.filter(a => !a.archived), orgProfile || null);
              break;
          case 'DAILY_LOG':
              await DocumentService.generateDailyLog(tableData, orgProfile || null, `${startDate} to ${endDate}`);
              break;
          case 'INCIDENTS':
              await DocumentService.generateIncidentReport(incidents.filter(i => i.date >= startDate && i.date <= endDate), orgProfile || null);
              break;
          default:
              alert("Export for this report type is under construction.");
      }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b-2 border-slate-200 print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                    <FileText className="text-slate-600" size={28} /> Statutory Reporting
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Generate official ledgers and operational summaries.</p>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative group min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LayoutList size={16} className="text-slate-400"/>
                    </div>
                    <select 
                        value={selectedSchemaId} 
                        onChange={(e) => setSelectedSchemaId(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:border-emerald-500 transition-all shadow-sm uppercase tracking-tight"
                    >
                        {Object.values(REPORT_SCHEMAS).map(schema => (
                            <option key={schema.id} value={schema.id}>{schema.title}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown size={16} className="text-slate-400"/>
                    </div>
                </div>

                {selectedSchemaId !== 'STOCK_LIST' && (
                    <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                        <Calendar size={16} className="text-slate-400"/>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 w-24"/>
                        <span className="text-slate-300 font-bold">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 w-24"/>
                    </div>
                )}

                <button onClick={handleExportDocx} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                    <Download size={16}/> Export Word
                </button>

                <button onClick={handlePrint} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                    <Printer size={16}/> Print
                </button>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] print:shadow-none print:border-none">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-start bg-slate-50/30 print:bg-white print:border-b-4 print:border-black">
                <div className="flex gap-4 items-center">
                    {orgProfile?.logoUrl && <img src={orgProfile.logoUrl} className="h-12 w-auto object-contain mix-blend-multiply" alt="Logo"/>}
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{orgProfile?.name || 'Institutional Report'}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{currentSchema.title}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Date</p>
                    <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    {selectedSchemaId !== 'STOCK_LIST' && (
                        <p className="text-[10px] text-slate-500 font-medium mt-1">Period: {startDate} to {endDate}</p>
                    )}
                </div>
            </div>

            <div className="p-4 border-b border-slate-100 print:hidden bg-white">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Filter report data..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-slate-400 transition-all"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b-2 border-slate-200 print:bg-white print:border-black">
                        <tr>
                            {currentSchema.columns.map((col, idx) => (
                                <th 
                                    key={idx} 
                                    style={{ width: col.width }}
                                    className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black print:text-[8px]"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                        {tableData.length > 0 ? tableData.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition-colors print:hover:bg-white break-inside-avoid">
                                {currentSchema.columns.map((col, cIdx) => (
                                    <td key={cIdx} className="px-6 py-3 text-xs font-medium text-slate-700 print:text-black print:text-[10px] align-top">
                                        {row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={currentSchema.columns.length} className="px-6 py-24 text-center text-slate-400 flex flex-col items-center justify-center">
                                    <Table2 size={48} className="opacity-20 mb-4"/>
                                    <p className="text-xs font-black uppercase tracking-widest">No Records Found</p>
                                    <p className="text-[10px] mt-1">Try adjusting the date range or filters.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right print:bg-white print:border-t-2 print:border-black">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Entries: <span className="text-slate-900">{tableData.length}</span></p>
                <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-widest print:hidden">Generated by KOA Manager</p>
            </div>
        </div>
    </div>
  );
};

export default Reports;
