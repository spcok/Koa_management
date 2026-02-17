
import React, { useState, useMemo, useTransition } from 'react';
import { REPORT_SCHEMAS } from './reports/reportConfig';
import { Animal, LogType, Incident, SiteLogEntry, TimeLogEntry, OrganizationProfile, User, AnimalCategory } from '../types';
import { Download, LayoutList, ChevronRight, FileBarChart, Layers, Bird, Table2, Loader2 } from 'lucide-react';
import { DocumentService } from '../services/DocumentService';
import { formatWeightDisplay } from '../services/weightUtils';

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
  
  // React 19 Transition for Export Action
  const [isPending, startTransition] = useTransition();
  
  // New Filters
  const [selectedCategory, setSelectedCategory] = useState<AnimalCategory | 'ALL'>('ALL');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('ALL');

  const currentSchema = REPORT_SCHEMAS[selectedSchemaId];

  // Helper to format date range for the doc header (e.g., "13 FEB - 19 FEB")
  const getFormattedDateRange = () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
      
      if (startDate === endDate) return fmt(start);
      return `${fmt(start)} - ${fmt(end)}`;
  };

  // Shared date check helper
  const inDateRange = (date: string) => {
      if (!date) return false;
      const d = date.split('T')[0];
      return d >= startDate && d <= endDate;
  };

  // Dynamic Column Generation for Weekly Weights
  const reportColumns = useMemo(() => {
      if (selectedSchemaId === 'WEIGHTS') {
          const cols = [{ label: 'Subject', width: '16%', accessor: 'subject' }];
          // Calculate last 7 days ending on endDate
          const [y, m, d] = endDate.split('-').map(Number);
          const end = new Date(y, m - 1, d);
          
          for (let i = 6; i >= 0; i--) {
              const date = new Date(end);
              date.setDate(end.getDate() - i);
              
              const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
              const dayPart = String(date.getDate()).padStart(2, '0');
              const monthPart = String(date.getMonth() + 1).padStart(2, '0');
              const yearPart = date.getFullYear();
              const dateStr = `${dayPart}/${monthPart}/${yearPart}`;
              
              // Use ISO date string as accessor key
              const isoDate = `${yearPart}-${monthPart}-${dayPart}`;

              cols.push({
                  label: `${dayName} ${dateStr}`,
                  width: '12%',
                  accessor: isoDate
              });
          }
          return cols;
      }
      return currentSchema.columns;
  }, [selectedSchemaId, endDate, currentSchema]);

  // Data Processing Logic
  const tableData = useMemo(() => {
      let rows: any[] = [];

      const matchesFilters = (animal: Animal) => {
          if (selectedCategory !== 'ALL' && animal.category !== selectedCategory) return false;
          if (selectedAnimalId !== 'ALL' && animal.id !== selectedAnimalId) return false;
          return true;
      };

      // Filter animals list first
      const filteredAnimals = animals.filter(matchesFilters);

      if (selectedSchemaId === 'DAILY_LOG') {
          rows = filteredAnimals.flatMap(animal => 
              (animal.logs || []).filter(l => inDateRange(l.date)).map(l => {
                  const isWeight = l.type === LogType.WEIGHT;
                  const isFeed = l.type === LogType.FEED;
                  
                  // Format specific columns
                  let weightVal = '-';
                  if (isWeight) {
                      weightVal = l.weightGrams 
                        ? formatWeightDisplay(l.weightGrams, animal.weightUnit) 
                        : l.value;
                  }

                  let feedVal = '-';
                  if (isFeed) {
                      feedVal = l.value;
                  }

                  // Handle "Notes/Activity" column
                  let details = '-';
                  if (isWeight) {
                      details = l.notes || '-';
                  } else if (isFeed) {
                      details = l.notes || '-';
                  } else {
                      // For other logs (Health, Training, etc), show Type + Value
                      details = `${l.type}: ${l.value} ${l.notes ? `(${l.notes})` : ''}`;
                  }

                  return {
                      subject: animal.name,
                      time: new Date(l.date).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}),
                      weight: weightVal,
                      feed: feedVal,
                      value: details,
                      initials: l.userInitials
                  };
              })
          );
      } 
      else if (selectedSchemaId === 'ROUNDS') {
          // Filter Site Logs for entries that look like Rounds (based on ID or Title)
          rows = siteLogs
            .filter(l => inDateRange(l.date) && l.title && l.title.includes('Round:'))
            .map(l => {
                let data: any = {};
                try {
                    data = JSON.parse(l.description);
                } catch (e) {
                    data = { type: 'Unknown', section: 'Unknown', issuesFound: 0, totalChecked: 0 };
                }

                // Filter by category if selected
                if (selectedCategory !== 'ALL' && data.section !== selectedCategory) return null;

                return {
                    timestamp: `${new Date(l.date).toLocaleDateString('en-GB')} ${new Date(l.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`,
                    type: data.type || 'Standard',
                    section: data.section || 'General',
                    staff: data.signedBy || l.loggedBy,
                    completion: `${data.totalChecked} Checked`,
                    status: data.issuesFound > 0 ? `${data.issuesFound} ISSUES` : 'SECURE',
                    notes: data.notes || '-'
                };
            })
            .filter(Boolean);
      }
      else if (selectedSchemaId === 'ROUNDS_CHECKLIST') {
          // Generate array of dates in range
          const dates: string[] = [];
          const curr = new Date(startDate);
          const end = new Date(endDate);
          while (curr <= end) {
              dates.push(curr.toISOString().split('T')[0]);
              curr.setDate(curr.getDate() + 1);
          }

          rows = dates.flatMap(d => {
              // Get logs for this date
              const dayLogs = siteLogs.filter(l => l.date === d && l.title && l.title.includes('Round:'));
              
              // Get animals to list
              const dayAnimals = filteredAnimals.filter(a => !a.archived);

              return dayAnimals.map(animal => {
                  // Find relevant logs for this animal's section
                  const sectionLogs = dayLogs.filter(l => {
                      try {
                          const json = JSON.parse(l.description);
                          return json.section === animal.category;
                      } catch { return false; }
                  });

                  const amLog = sectionLogs.find(l => JSON.parse(l.description).type === 'Morning');
                  const pmLog = sectionLogs.find(l => JSON.parse(l.description).type === 'Evening');

                  const amData = amLog ? JSON.parse(amLog.description).details?.[animal.id] : null;
                  const pmData = pmLog ? JSON.parse(pmLog.description).details?.[animal.id] : null;

                  // Helpers for cell display
                  const getCheckMark = (data: any, key: string) => {
                      if (!data) return '-';
                      if (key === 'isAlive') return data.isAlive ? '✓' : 'X';
                      if (key === 'isWatered') return data.isWatered ? '✓' : '-';
                      if (key === 'isSecure') return (data.isSecure || data.securityIssue) ? '✓' : '-'; 
                      return '-';
                  };

                  // Comments aggregation
                  const notesParts = [];
                  if (amData?.healthIssue) notesParts.push(`AM Health: ${amData.healthIssue}`);
                  if (amData?.securityIssue) notesParts.push(`AM Sec: ${amData.securityIssue}`);
                  if (pmData?.healthIssue) notesParts.push(`PM Health: ${pmData.healthIssue}`);
                  if (pmData?.securityIssue) notesParts.push(`PM Sec: ${pmData.securityIssue}`);

                  return {
                      date: new Date(d).toLocaleDateString('en-GB', {day: 'numeric', month:'short'}),
                      animal: animal.name,
                      am_well: getCheckMark(amData, 'isAlive'),
                      am_water: getCheckMark(amData, 'isWatered'),
                      am_secure: getCheckMark(amData, 'isSecure'),
                      pm_well: getCheckMark(pmData, 'isAlive'),
                      pm_water: getCheckMark(pmData, 'isWatered'),
                      pm_secure: getCheckMark(pmData, 'isSecure'),
                      comments: notesParts.join('; ')
                  };
              });
          });
      }
      else if (selectedSchemaId === 'STOCK_LIST') {
          rows = filteredAnimals.filter(a => !a.archived).map(a => ({
              id: a.ringNumber || a.microchip || '-',
              name: a.name,
              latin: a.latinName || '-',
              sex: a.sex || '?',
              age: a.dob ? `${new Date().getFullYear() - new Date(a.dob).getFullYear()}y` : '-',
              origin: a.origin || 'Unknown',
              arrival: a.arrivalDate ? new Date(a.arrivalDate).toLocaleDateString('en-GB') : '-'
          }));
      }
      else if (selectedSchemaId === 'INCIDENTS') {
          let filteredIncidents = incidents.filter(i => inDateRange(i.date));
          if (selectedAnimalId !== 'ALL') {
              filteredIncidents = filteredIncidents.filter(i => i.animalId === selectedAnimalId);
          }
          rows = filteredIncidents.map(i => ({
              date: new Date(i.date).toLocaleDateString('en-GB'),
              location: i.location,
              category: i.type,
              description: i.description,
              action: i.severity,
              initials: i.reportedBy
          }));
      }
      else if (selectedSchemaId === 'MAINTENANCE') {
          rows = siteLogs.filter(l => inDateRange(l.date) && !l.title.includes('Round:')).map(l => ({
              date: new Date(l.date).toLocaleDateString('en-GB'),
              asset: l.location,
              task: l.title,
              materials: l.description,
              staff: l.loggedBy,
              status: l.status
          }));
      }
      else if (selectedSchemaId === 'MOVEMENTS') {
          rows = filteredAnimals.flatMap(a => (a.logs || []).filter(l => l.type === LogType.MOVEMENT && inDateRange(l.date)).map(l => ({
              date: new Date(l.date).toLocaleDateString('en-GB'),
              subject: a.name,
              type: l.movementType,
              vector: `${l.movementSource || '?'} -> ${l.movementDestination || '?'}`,
              auth: l.userInitials
          })));
      }
      else if (selectedSchemaId === 'WEIGHTS') {
          // Generate 7 days keys ending on endDate
          const keys: string[] = [];
          const [y, m, d] = endDate.split('-').map(Number);
          const end = new Date(y, m - 1, d);
          for (let i = 6; i >= 0; i--) {
              const date = new Date(end);
              date.setDate(end.getDate() - i);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              keys.push(`${year}-${month}-${day}`);
          }

          rows = filteredAnimals.map(a => {
              const row: any = { subject: a.name };
              keys.forEach(k => {
                  // Find logs for this specific date
                  const dayLogs = (a.logs || []).filter(l => l.type === LogType.WEIGHT && l.date.startsWith(k));
                  // Sort to get the latest entry if multiple exist
                  dayLogs.sort((x, y) => y.timestamp - x.timestamp);
                  
                  if (dayLogs.length > 0) {
                      const l = dayLogs[0];
                      row[k] = l.weightGrams 
                          ? formatWeightDisplay(l.weightGrams, a.weightUnit) 
                          : l.value;
                  } else {
                      row[k] = '-';
                  }
              });
              return row;
          });
      }
      else if (selectedSchemaId === 'CLINICAL') {
          rows = filteredAnimals.flatMap(a => (a.logs || []).filter(l => l.type === LogType.HEALTH && inDateRange(l.date)).map(l => ({
              date: new Date(l.date).toLocaleDateString('en-GB'),
              subject: a.name,
              symptom: l.value,
              treatment: l.notes || '-',
              vet: l.prescribedBy || '-',
              follow: l.condition
          })));
      }

      return rows;
  }, [selectedSchemaId, animals, incidents, siteLogs, startDate, endDate, selectedCategory, selectedAnimalId]);

  const handleExportDocx = () => {
      const dateRangeText = getFormattedDateRange();
      const reportTitle = currentSchema.title.toUpperCase();

      startTransition(async () => {
          try {
              switch (selectedSchemaId) {
                  case 'STOCK_LIST':
                      await DocumentService.generateStockList(
                          animals.filter(a => !a.archived && (selectedCategory === 'ALL' || a.category === selectedCategory)), 
                          orgProfile || null, 
                          currentUser
                      );
                      break;
                  case 'DAILY_LOG':
                      await DocumentService.generateDailyLog(tableData, orgProfile || null, dateRangeText, currentUser, reportTitle);
                      break;
                  case 'ROUNDS':
                      await DocumentService.generateRoundsLog(tableData, orgProfile || null, dateRangeText, currentUser, reportTitle);
                      break;
                  case 'ROUNDS_CHECKLIST':
                      await DocumentService.generateDailyRoundsChecklist(
                          siteLogs.filter(l => inDateRange(l.date) && l.title && l.title.includes('Round:')),
                          animals,
                          users,
                          orgProfile || null,
                          dateRangeText,
                          currentUser,
                          reportTitle
                      );
                      break;
                  case 'INCIDENTS':
                      await DocumentService.generateIncidentReport(
                          incidents.filter(i => inDateRange(i.date)), 
                          orgProfile || null, 
                          dateRangeText,
                          currentUser,
                          reportTitle
                      );
                      break;
                  default:
                      alert("Export for this report type is under construction.");
              }
          } catch (e) {
              console.error("Export failed", e);
              alert("Failed to generate document.");
          }
      });
  };

  const inputClass = "px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition-all uppercase tracking-wide";

  return (
    <div className="flex h-full max-h-[calc(100vh-4rem)] overflow-hidden bg-white animate-in fade-in duration-500">
        
        {/* LEFT SIDEBAR: Report Types */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <FileBarChart size={20} className="text-emerald-600" /> Reports
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select Report Type</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {Object.values(REPORT_SCHEMAS).map(schema => (
                    <button
                        key={schema.id}
                        onClick={() => setSelectedSchemaId(schema.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${
                            selectedSchemaId === schema.id 
                            ? 'bg-slate-900 text-white shadow-lg' 
                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                        }`}
                    >
                        <span className="text-xs font-bold uppercase tracking-wide">{schema.title}</span>
                        {selectedSchemaId === schema.id && <ChevronRight size={14} className="text-emerald-400"/>}
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50">
            
            {/* TOP BAR: Filters & Actions */}
            <div className="bg-white border-b border-slate-200 p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm z-10">
                
                <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
                    {/* Date Range - Only show if relevant (Weights uses endDate as anchor) */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 mr-2">
                        {selectedSchemaId !== 'WEIGHTS' && (
                            <>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 w-24 uppercase"/>
                                <span className="text-slate-300 font-bold">-</span>
                            </>
                        )}
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 w-24 uppercase"/>
                    </div>

                    {/* Section Filter */}
                    <div className="relative">
                        <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => { setSelectedCategory(e.target.value as any); setSelectedAnimalId('ALL'); }}
                            className={`${inputClass} pl-9 pr-8`}
                        >
                            <option value="ALL">All Sections</option>
                            {Object.values(AnimalCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    {/* Animal Filter */}
                    {selectedSchemaId !== 'ROUNDS' && selectedSchemaId !== 'ROUNDS_CHECKLIST' && (
                        <div className="relative">
                            <Bird size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            <select 
                                value={selectedAnimalId} 
                                onChange={(e) => setSelectedAnimalId(e.target.value)}
                                className={`${inputClass} pl-9 pr-8 max-w-[200px] truncate`}
                            >
                                <option value="ALL">All Animals</option>
                                {animals
                                    .filter(a => selectedCategory === 'ALL' || a.category === selectedCategory)
                                    .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleExportDocx} 
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95 transition-all whitespace-nowrap"
                >
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16}/>}
                    {isPending ? 'Generating...' : 'Export Word'}
                </button>
            </div>

            {/* REPORT PREVIEW TABLE */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{currentSchema.title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {orgProfile?.name || 'Kent Owl Academy'} • {selectedSchemaId === 'WEIGHTS' ? `Week Ending ${new Date(endDate).toLocaleDateString('en-GB')}` : getFormattedDateRange()}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                                {tableData.length} Records Found
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {reportColumns.map((col, idx) => (
                                        <th 
                                            key={idx} 
                                            style={{ width: col.width }}
                                            className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight"
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableData.length > 0 ? tableData.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                        {reportColumns.map((col, cIdx) => (
                                            <td 
                                                key={cIdx} 
                                                className={`px-4 py-3 text-xs font-medium text-slate-700 align-top ${col.accessor === 'subject' || col.accessor === 'comments' ? 'whitespace-normal break-words' : 'whitespace-nowrap'}`}
                                            >
                                                {row[col.accessor]}
                                            </td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={reportColumns.length} className="px-6 py-24 text-center text-slate-400 flex flex-col items-center justify-center">
                                            <Table2 size={48} className="opacity-20 mb-4"/>
                                            <p className="text-xs font-black uppercase tracking-widest">No Records Found</p>
                                            <p className="text-[10px] mt-1">Try adjusting the date range or filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Reports;
