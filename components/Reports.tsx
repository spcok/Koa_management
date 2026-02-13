
import React, { useState, useMemo } from 'react';
import { Animal, AnimalCategory, LogType, OrganizationProfile, User, HealthRecordType } from '../types';
import { Printer, FileText, Loader2, Sparkles, UserCheck, ShieldCheck, ClipboardCheck, BarChart3, AlertCircle } from 'lucide-react';
import { generateSectionSummary } from '../services/geminiService';
import { formatWeightDisplay } from '../services/weightUtils';
import ReactMarkdown from 'react-markdown';

interface ReportsProps {
  animals: Animal[];
  orgProfile?: OrganizationProfile | null;
  users?: User[];
  currentUser: User;
}

type ReportType = 'DAILY_SUMMARY' | 'STOCK_LIST' | 'ANNUAL_INVENTORY' | 'AI_SUMMARY';

const Reports: React.FC<ReportsProps> = ({ 
    animals, orgProfile, users = [], currentUser 
}) => {
  const [reportType, setReportType] = useState<ReportType>('DAILY_SUMMARY');
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]; // Jan 1st
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<AnimalCategory | 'ALL'>('ALL');
  const [authorizedById, setAuthorizedById] = useState<string>(currentUser.id);
  const [aiSummary, setAiSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statutoryNotes, setStatutoryNotes] = useState('');

  const authorizedUser = useMemo(() => users.find(u => u.id === authorizedById), [users, authorizedById]);

  const handlePrint = () => window.print();

  const handleGenerateAiSummary = async () => {
    if (selectedCategory === 'ALL') return;
    setIsGenerating(true);
    const sectionAnimals = animals.filter(a => a.category === selectedCategory);
    const text = await generateSectionSummary(selectedCategory, sectionAnimals);
    setAiSummary(text);
    setIsGenerating(false);
  };

  const filteredAnimals = useMemo(() => {
    return selectedCategory === 'ALL' ? animals : animals.filter(a => a.category === selectedCategory);
  }, [animals, selectedCategory]);

  const getDatesInRange = (start: string, end: string) => {
      const arr = [];
      const dt = new Date(start);
      const endDt = new Date(end);
      while (dt <= endDt) {
          arr.push(new Date(dt).toISOString().split('T')[0]);
          dt.setDate(dt.getDate() + 1);
      }
      return arr;
  };

  const dailyLedgerData = useMemo(() => {
      if (reportType !== 'DAILY_SUMMARY') return [];
      const dates = getDatesInRange(startDate, endDate);
      return dates.map(date => {
          const sections = Object.values(AnimalCategory).map(cat => {
              const animalsInCat = filteredAnimals.filter(a => a.category === cat && !a.archived);
              if (animalsInCat.length === 0) return null;
              const rows = animalsInCat.map(animal => {
                  const dayLogs = (animal.logs || []).filter(l => l.date.startsWith(date));
                  const weight = dayLogs.find(l => l.type === LogType.WEIGHT);
                  const feed = dayLogs.find(l => l.type === LogType.FEED);
                  const health = dayLogs.find(l => l.type === LogType.HEALTH);
                  return {
                      name: animal.name,
                      weight: weight ? formatWeightDisplay(weight.weightGrams, animal.weightUnit) : '-',
                      bcs: health?.bcs || '-',
                      feed: feed?.value || '-',
                      cast: feed?.hasCast !== undefined ? (feed.hasCast ? 'YES' : 'NO') : '-',
                      initials: (feed || weight || health)?.userInitials || '-'
                  };
              });
              return { category: cat, rows };
          }).filter(Boolean);
          return { date, sections };
      });
  }, [filteredAnimals, startDate, endDate, reportType]);

  // Section 9 Statutory Logic
  const annualInventoryData = useMemo(() => {
      if (reportType !== 'ANNUAL_INVENTORY') return [];
      
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();

      // Group by species
      const speciesGroups = new Map<string, {
          commonName: string,
          latinName: string,
          opening: number,
          births: number,
          acquisitions: number,
          deaths: number,
          dispositions: number,
          closing: number
      }>();

      filteredAnimals.forEach(a => {
          const key = a.species;
          if (!speciesGroups.has(key)) {
              speciesGroups.set(key, {
                  commonName: a.species,
                  latinName: a.latinName || '',
                  opening: 0, births: 0, acquisitions: 0, deaths: 0, dispositions: 0, closing: 0
              });
          }
          const stats = speciesGroups.get(key)!;

          const arrivalDate = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
          
          // Determine if animal was present at the start of period
          // Note: In a real system, we'd check if it was archived BEFORE the start date
          const logs = a.logs || [];
          const deceasedLog = logs.find(l => l.healthType === HealthRecordType.OTHER && l.value.includes('DECEASED'));
          const deathDate = deceasedLog ? new Date(deceasedLog.date).getTime() : Infinity;

          const wasPresentAtStart = arrivalDate < startMs && deathDate >= startMs;
          const isPresentAtEnd = arrivalDate <= endMs && deathDate > endMs;

          if (wasPresentAtStart) stats.opening++;
          if (isPresentAtEnd) stats.closing++;

          // Movement Analysis
          logs.forEach(l => {
              const lMs = l.timestamp;
              if (lMs >= startMs && lMs <= endMs) {
                  if (l.type === LogType.MOVEMENT) {
                      if (l.movementType === 'Acquisition') stats.acquisitions++;
                      if (l.movementType === 'Disposition') stats.dispositions++;
                  }
                  if (l.healthType === HealthRecordType.INCOMING) {
                      // Logic for differentiating births vs imports could go here
                      stats.acquisitions++;
                  }
                  if (l.value.includes('DECEASED')) {
                      stats.deaths++;
                  }
              }
          });
      });

      return Array.from(speciesGroups.values()).sort((a, b) => a.commonName.localeCompare(b.commonName));
  }, [filteredAnimals, startDate, endDate, reportType]);

  const ReportHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="border-b-4 border-slate-900 pb-4 mb-8 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-3 mb-2">
                {orgProfile?.logoUrl ? (
                    <img src={orgProfile.logoUrl} className="h-12 w-auto object-contain" alt="Logo" />
                ) : (
                    <div className="h-12 w-12 bg-slate-900 text-white flex items-center justify-center font-black rounded-lg">K</div>
                )}
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{title}</h1>
            </div>
            <p className="text-emerald-600 font-bold text-xs uppercase tracking-[0.2em]">{orgProfile?.name || 'Kent Owl Academy'} • Institutional Registry</p>
            {orgProfile?.licenseNumber && (
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">ZLA License: {orgProfile.licenseNumber} • Auth: {orgProfile.issuingAuthority}</p>
            )}
        </div>
        <div className="text-right">
            <div className="bg-slate-900 text-white px-4 py-1.5 rounded font-black text-sm uppercase tracking-widest">{subtitle}</div>
            <p className="text-[8px] font-black text-slate-400 mt-2 uppercase tracking-widest">Statutory Compliance Documentation • Sec 9 (ZLA)</p>
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 uppercase tracking-tight">
             <FileText size={28} /> Statutory Reports
           </h1>
           <p className="text-slate-500 text-sm font-medium">Generate official ledgers for curatorial audit.</p>
        </div>
        <button onClick={handlePrint} className="bg-emerald-600 text-white px-10 py-4 rounded-xl hover:bg-emerald-700 transition-all font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center gap-3">
            <Printer size={20} /> Print Official Record
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-300 no-print space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statutory Module</label>
                  <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'DAILY_SUMMARY', label: 'Husbandry Ledger', icon: ClipboardCheck },
                        { id: 'STOCK_LIST', label: 'Active Subject List', icon: FileText },
                        { id: 'ANNUAL_INVENTORY', label: 'Sec 9 Annual Audit', icon: BarChart3 },
                        { id: 'AI_SUMMARY', label: 'Curatorial Review', icon: Sparkles }
                      ].map(r => (
                        <button key={r.id} onClick={() => setReportType(r.id as any)} className={`px-4 py-3 text-left rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-3 ${reportType === r.id ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}>
                            <r.icon size={14}/> {r.label}
                        </button>
                      ))}
                  </div>
              </div>

              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Audit Period</label>
                      <div className="flex gap-2">
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs font-bold" />
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs font-bold" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Collection Filter</label>
                      <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as any)} className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs font-bold">
                          <option value="ALL">Entire Collection</option>
                          {Object.values(AnimalCategory).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                  <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Authorized Signatory</label>
                      <select 
                        value={authorizedById} 
                        onChange={(e) => setAuthorizedById(e.target.value)} 
                        className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs font-bold"
                      >
                          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.initials})</option>)}
                      </select>
                  </div>
              </div>
          </div>
          
          {reportType === 'ANNUAL_INVENTORY' && (
              <div className="animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Statutory Auditor Notes (Optional context for movement discrepancies)</label>
                  <textarea 
                    value={statutoryNotes} 
                    onChange={e => setStatutoryNotes(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-xl text-xs font-bold h-24 resize-none"
                    placeholder="Provide notes on births, disposals or transfers during this period..."
                  />
              </div>
          )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 min-h-[800px] overflow-hidden print:shadow-none print:border-none print:w-full">
            {reportType === 'DAILY_SUMMARY' && (
                <div className="divide-y-[6px] divide-slate-900">
                    {dailyLedgerData.map(day => (
                        <div key={day.date} className="p-10 break-after-page print:p-8">
                            <ReportHeader title="Statutory Husbandry Ledger" subtitle={new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} />
                            
                            {day.sections.map((sec: any) => (
                                <div key={sec.category} className="mb-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <h3 className="bg-slate-900 text-white px-4 py-1 font-black text-[11px] uppercase tracking-[0.3em]">{sec.category} SECTION</h3>
                                        <div className="h-[2px] bg-slate-200 flex-1"></div>
                                    </div>
                                    
                                    <table className="w-full border-collapse border-2 border-slate-900 text-[10px] shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
                                        <thead className="bg-slate-100 font-black uppercase border-b-2 border-slate-900">
                                            <tr>
                                                <th className="p-3 border-r-2 border-slate-900 text-left w-[20%]">Subject Identity</th>
                                                <th className="p-3 border-r-2 border-slate-900 text-center w-[12%]">Live Wt</th>
                                                <th className="p-3 border-r-2 border-slate-900 text-center w-[8%]">BCS</th>
                                                <th className="p-3 border-r-2 border-slate-900 text-left">Diet Intake / Observations</th>
                                                <th className="p-3 border-r-2 border-slate-900 text-center w-[8%]">Cast</th>
                                                <th className="p-3 text-center w-[6%]">Auth</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sec.rows.map((row: any, idx: number) => (
                                                <tr key={idx} className="border-b border-slate-300 hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 border-r-2 border-slate-900 font-black uppercase tracking-tight">{row.name}</td>
                                                    <td className="p-3 border-r-2 border-slate-900 text-center font-bold text-slate-700">{row.weight}</td>
                                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black">{row.bcs}</td>
                                                    <td className="p-3 border-r-2 border-slate-900 font-medium italic text-slate-500 leading-relaxed">{row.feed}</td>
                                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black text-emerald-700">{row.cast}</td>
                                                    <td className="p-3 text-center font-mono font-black text-slate-300 text-[9px]">{row.initials}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                            
                            {/* Verification Footer */}
                            <div className="mt-16 grid grid-cols-2 gap-16 pt-12 border-t-4 border-slate-900 break-inside-avoid">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duty Officer Verification</p>
                                    <div className="h-24 border-2 border-slate-200 bg-slate-50 flex items-center justify-center rounded-xl relative overflow-hidden">
                                        {authorizedUser?.signature ? (
                                            <img src={authorizedUser.signature} className="h-full object-contain mix-blend-multiply opacity-90 p-2" alt="Signature" />
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Digital Auth Required</span>
                                        )}
                                        <div className="absolute bottom-2 left-2 text-[8px] font-black text-slate-200 uppercase">OFFICIAL SEAL</div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{authorizedUser?.name || 'Authorized Signatory'}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statutory Auditor / Curator</p>
                                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                                        <ShieldCheck size={40} className="text-slate-100" />
                                    </div>
                                    <div className="border-t-2 border-slate-900 pt-2 flex justify-between">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Senior Curator</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Auth Ref: 2026-X</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {reportType === 'STOCK_LIST' && (
                <div className="p-10 print:p-8">
                    <ReportHeader title="Institutional Subject List" subtitle={new Date().toLocaleDateString('en-GB').toUpperCase()} />
                    <table className="w-full border-collapse border-4 border-slate-900 text-xs shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                        <thead className="bg-slate-900 text-white font-black uppercase">
                            <tr>
                                <th className="p-4 border-r border-white/20 text-left">Taxon & Identity (ID/Ring)</th>
                                <th className="p-4 border-r border-white/20 text-left">Status & Sex</th>
                                <th className="p-4 border-r border-white/20 text-left">Arrival & Provenance</th>
                                <th className="p-4 border-r border-white/20 text-left">Primary Housing</th>
                                <th className="p-4 text-center">Registry Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-300">
                            {filteredAnimals.map(a => (
                                <tr key={a.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 border-r-2 border-slate-900">
                                        <div className="font-black text-sm uppercase tracking-tight">{a.name}</div>
                                        <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">{a.species}</div>
                                        <div className="text-[9px] text-slate-400 font-mono mt-1">ID: {a.ringNumber || a.microchip || 'UNRINGED'}</div>
                                    </td>
                                    <td className="p-4 border-r-2 border-slate-900">
                                        <div className="font-bold text-slate-700 uppercase">{a.sex}</div>
                                        <div className="text-[9px] text-slate-400 italic mt-1">{a.latinName}</div>
                                    </td>
                                    <td className="p-4 border-r-2 border-slate-900">
                                        <div className="font-bold uppercase text-slate-800">{a.arrivalDate ? new Date(a.arrivalDate).toLocaleDateString('en-GB') : 'PRE-REGISTRY'}</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">{a.origin || 'Source Protected'}</div>
                                    </td>
                                    <td className="p-4 border-r-2 border-slate-900 font-black uppercase text-slate-600 tracking-widest">{a.location}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border-2 ${a.archived ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                            {a.archived ? 'Disposition' : 'Active'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div className="mt-20 flex justify-between items-end border-t-4 border-slate-900 pt-8 break-inside-avoid">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 border-4 border-slate-900 rounded-full flex items-center justify-center">
                                {authorizedUser?.signature ? (
                                    <img src={authorizedUser.signature} className="h-full object-contain p-4 mix-blend-multiply" alt="Seal" />
                                ) : (
                                    <UserCheck size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div>
                                <p className="text-[12px] font-black uppercase tracking-[0.2em]">{authorizedUser?.name || 'Authorized Officer'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Seal Applied</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Registry Authentication</p>
                            <div className="text-xl font-black font-mono text-slate-900 tracking-tighter">KOA-AUDIT-{new Date().getFullYear()}-{animals.length}</div>
                        </div>
                    </div>
                </div>
            )}

            {reportType === 'ANNUAL_INVENTORY' && (
                <div className="p-10 print:p-8">
                    <ReportHeader title="Section 9 Annual Stock Audit" subtitle={`${new Date(startDate).getFullYear()} COMPLIANCE`} />
                    
                    <div className="bg-slate-50 border-l-4 border-slate-900 p-4 mb-8 text-xs font-bold text-slate-700 leading-relaxed italic">
                        "Pursuant to the Zoo Licensing Act 1981 Section 9, this document provides the formal summary of animal stock transitions within the period of {new Date(startDate).toLocaleDateString('en-GB')} to {new Date(endDate).toLocaleDateString('en-GB')}."
                    </div>

                    <table className="w-full border-collapse border-4 border-slate-900 text-[10px] shadow-[8px_8px_0px_rgba(0,0,0,0.05)]">
                        <thead className="bg-slate-900 text-white font-black uppercase">
                            <tr>
                                <th rowSpan={2} className="p-3 border-r border-white/20 text-left">Taxon (Common / Scientific)</th>
                                <th rowSpan={2} className="p-3 border-r border-white/20 text-center w-20">Opening Stock</th>
                                <th colSpan={2} className="p-2 border-b border-r border-white/20 text-center bg-emerald-800/40">Increases</th>
                                <th colSpan={2} className="p-2 border-b border-r border-white/20 text-center bg-rose-800/40">Decreases</th>
                                <th rowSpan={2} className="p-3 text-center w-20">Closing Stock</th>
                            </tr>
                            <tr className="bg-slate-800 text-[8px]">
                                <th className="p-2 border-r border-white/10 text-center uppercase tracking-widest">Births / Hatch</th>
                                <th className="p-2 border-r border-white/10 text-center uppercase tracking-widest">Acq. / Trans. In</th>
                                <th className="p-2 border-r border-white/10 text-center uppercase tracking-widest">Deaths</th>
                                <th className="p-2 border-r border-white/10 text-center uppercase tracking-widest">Disp. / Trans. Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-300">
                            {annualInventoryData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 border-r-2 border-slate-900">
                                        <div className="font-black text-slate-900 uppercase tracking-tight">{item.commonName}</div>
                                        <div className="text-[9px] text-slate-400 italic mt-0.5">{item.latinName}</div>
                                    </td>
                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black text-slate-500 bg-slate-50/50">{item.opening}</td>
                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black text-emerald-600">{item.births || '-'}</td>
                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black text-emerald-700 bg-emerald-50/20">{item.acquisitions || '-'}</td>
                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black text-rose-600">{item.deaths || '-'}</td>
                                    <td className="p-3 border-r-2 border-slate-900 text-center font-black text-rose-700 bg-rose-50/20">{item.dispositions || '-'}</td>
                                    <td className="p-3 text-center font-black text-slate-900 bg-slate-100/50">{item.closing}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-4 border-slate-900 font-black">
                            <tr>
                                <td className="p-3 border-r-2 border-slate-900 uppercase tracking-widest">TOTAL COLLECTION</td>
                                <td className="p-3 border-r-2 border-slate-900 text-center">{annualInventoryData.reduce((acc, c) => acc + c.opening, 0)}</td>
                                <td className="p-3 border-r-2 border-slate-900 text-center text-emerald-600">{annualInventoryData.reduce((acc, c) => acc + c.births, 0) || '-'}</td>
                                <td className="p-3 border-r-2 border-slate-900 text-center text-emerald-700">{annualInventoryData.reduce((acc, c) => acc + c.acquisitions, 0) || '-'}</td>
                                <td className="p-3 border-r-2 border-slate-900 text-center text-rose-600">{annualInventoryData.reduce((acc, c) => acc + c.deaths, 0) || '-'}</td>
                                <td className="p-3 border-r-2 border-slate-900 text-center text-rose-700">{annualInventoryData.reduce((acc, c) => acc + c.dispositions, 0) || '-'}</td>
                                <td className="p-3 text-center text-lg">{annualInventoryData.reduce((acc, c) => acc + c.closing, 0)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {statutoryNotes && (
                        <div className="mt-10 p-6 border-2 border-slate-200 rounded-2xl bg-slate-50 break-inside-avoid">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Statutory Auditor Narrative</h4>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{statutoryNotes}"</p>
                        </div>
                    )}

                    <div className="mt-16 grid grid-cols-2 gap-16 pt-12 border-t-4 border-slate-900 break-inside-avoid">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Verifying Officer (Curator)</p>
                            <div className="h-24 border-2 border-slate-200 bg-slate-50 flex items-center justify-center rounded-xl relative overflow-hidden">
                                {authorizedUser?.signature ? (
                                    <img src={authorizedUser.signature} className="h-full object-contain mix-blend-multiply opacity-90 p-2" alt="Signature" />
                                ) : (
                                    <UserCheck size={32} className="text-slate-200" />
                                )}
                            </div>
                            <div className="flex justify-between items-end">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{authorizedUser?.name || 'Authorized Signatory'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Registry Stamp & Ref</p>
                            <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                                <div className="text-center opacity-10">
                                    <ShieldCheck size={40} className="mx-auto mb-1" />
                                    <p className="text-[8px] font-black uppercase">Official KOA Seal</p>
                                </div>
                            </div>
                            <div className="border-t-2 border-slate-900 pt-2 flex justify-between">
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Audit Reference</p>
                                <p className="text-[11px] font-black font-mono">KOA-{new Date().getFullYear()}-INV</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reportType === 'AI_SUMMARY' && (
                <div className="p-10 space-y-8">
                    <div className="flex justify-between items-center no-print">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Curatorial Intelligence Review</h2>
                            <p className="text-slate-500 text-sm">Synthesize a narrative summary of section performance.</p>
                        </div>
                        <button onClick={handleGenerateAiSummary} disabled={isGenerating || selectedCategory === 'ALL'} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50">
                            {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} Synthesize Analytics
                        </button>
                    </div>
                    
                    {aiSummary ? (
                        <div className="prose prose-slate max-w-none bg-slate-50 p-12 rounded-[2.5rem] border-4 border-slate-900 shadow-[12px_12px_0px_rgba(0,0,0,0.05)]">
                            <ReactMarkdown>{aiSummary}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="py-48 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                             <div className="max-w-md mx-auto space-y-4">
                                <ShieldCheck size={64} className="mx-auto text-slate-200" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Select a Section to begin synthesis</p>
                             </div>
                        </div>
                    )}
                </div>
            )}
      </div>
    </div>
  );
};

export default Reports;
