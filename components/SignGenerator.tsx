
import React, { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Animal, OrganizationProfile, AnimalCategory } from '../types';
import { X, Download, Info, Loader2, Globe, Edit2, Save, RefreshCw, Calendar, LayoutTemplate } from 'lucide-react';
import { generateSignageContent } from '../services/geminiService';
import { IUCNBadge } from './IUCNBadge';

interface SignGeneratorProps {
  animal: Animal;
  orgProfile: OrganizationProfile | null;
  onClose: () => void;
}

interface SignContent {
    diet: string[];
    habitat: string[];
    didYouKnow: string[];
    speciesStats: {
        lifespanWild: string;
        lifespanCaptivity: string;
        wingspan: string;
        weight: string;
    };
}

// Moved outside component to prevent re-render focus loss
const EditTextArea = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => (
    <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={`w-full bg-yellow-50 border border-yellow-200 rounded p-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-yellow-400 resize-none ${className}`}
    />
);

// Moved outside component to prevent re-render focus loss
const EditInput = ({ value, onChange, className = "" }: { value: string, onChange: (val: string) => void, className?: string }) => (
    <input 
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-yellow-50 border border-yellow-200 rounded px-1 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-yellow-400 ${className}`}
    />
);

const SignGenerator: React.FC<SignGeneratorProps> = ({ animal, orgProfile, onClose }) => {
  const signRef = useRef<HTMLDivElement>(null);
  
  // Default to 'bottom' layout as requested for horizontal maps
  const [mapLayout, setMapLayout] = useState<'side' | 'bottom'>('bottom');
  
  const [content, setContent] = useState<SignContent>({
      diet: [], habitat: [], didYouKnow: [], speciesStats: { lifespanWild: '', lifespanCaptivity: '', wingspan: '', weight: '' }
  });
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  const fetchContent = async () => {
      setIsLoadingContent(true);
      const data = await generateSignageContent(animal.species);
      setContent(data);
      setIsLoadingContent(false);
  };

  useEffect(() => {
      fetchContent();
  }, []);

  const handleDownload = async () => {
    if (signRef.current) {
        setIsEditingText(false); // Ensure we aren't in edit mode during capture
        // Wait a frame for React to render non-edit view
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // High scale for print quality (A4 @ 300dpi approx)
        const canvas = await html2canvas(signRef.current, { scale: 3, useCORS: true, allowTaint: true });
        const link = document.createElement('a');
        link.download = `${animal.name}_Signage.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    }
  };

  const getAge = (dob: string) => {
      if (!dob) return 'Unknown';
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      if (age < 1) return '< 1 year';
      return `${age} years`;
  };

  const getArrivalYear = (date?: string) => {
      if (!date) return 'Unknown';
      return new Date(date).getFullYear();
  };

  // Logic to determine dynamic label for "Wingspan"
  const dynamicDimensionLabel = useMemo(() => {
      const s = animal.species.toLowerCase();
      const c = animal.category;
      
      if (s.includes('spider') || s.includes('tarantula') || s.includes('scorpion') || s.includes('millipede')) {
          return 'LEG SPAN';
      }
      
      if (
          c === AnimalCategory.MAMMALS || 
          c === AnimalCategory.EXOTICS || 
          s.includes('snake') || 
          s.includes('lizard') || 
          s.includes('frog') || 
          s.includes('toad') || 
          s.includes('monitor') || 
          s.includes('iguana')
      ) {
          return 'LENGTH';
      }

      return 'WINGSPAN';
  }, [animal.species, animal.category]);

  // Generate QR Code URL using a reliable public API to ensure cross-origin/CORS handling
  const adoptionUrl = orgProfile?.adoptionUrl || 'https://kentowlacademy.com';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(adoptionUrl)}&color=ffffff&bgcolor=10b981`;

  const handleListChange = (section: 'diet' | 'habitat' | 'didYouKnow', value: string) => {
      const items = value.split('\n').filter(line => line.trim() !== '');
      setContent(prev => ({ ...prev, [section]: items }));
  };

  const handleStatChange = (key: keyof SignContent['speciesStats'], value: string) => {
      setContent(prev => ({ ...prev, speciesStats: { ...prev.speciesStats, [key]: value } }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="flex flex-col gap-4 max-h-screen w-full max-w-6xl">
            {/* Control Bar */}
            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-lg gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Info className="text-emerald-600"/> Enclosure Signage Studio
                    </h2>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <button 
                        onClick={() => setMapLayout(prev => prev === 'side' ? 'bottom' : 'side')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest border border-slate-200"
                    >
                        <LayoutTemplate size={16}/>
                        Layout: {mapLayout === 'side' ? 'Side Map (Portrait)' : 'Bottom Map (Landscape)'}
                    </button>
                    <button 
                        onClick={fetchContent}
                        disabled={isLoadingContent}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold hover:bg-purple-200 transition-colors text-xs uppercase tracking-widest"
                    >
                        {isLoadingContent ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                        {isLoadingContent ? "Generating..." : "Regenerate Content"}
                    </button>
                    <button 
                        onClick={() => setIsEditingText(!isEditingText)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors text-xs uppercase tracking-widest border-2 ${isEditingText ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                    >
                        {isEditingText ? <Save size={16}/> : <Edit2 size={16}/>}
                        {isEditingText ? "Finish Editing" : "Edit Text"}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest"
                    >
                        <Download size={18}/> Download Print-Ready (.JPG)
                    </button>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 rounded-lg"><X size={20}/></button>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 overflow-auto flex justify-center bg-slate-800/50 rounded-xl p-8">
                {/* A4 Aspect Ratio Div: 595px x 842px (Scaled for viewing) */}
                <div 
                    ref={signRef}
                    className="bg-white relative shadow-2xl flex flex-col overflow-hidden"
                    style={{ 
                        width: '794px', // A4 Width at 96 DPI
                        height: '1123px', // A4 Height at 96 DPI
                        minWidth: '794px',
                        minHeight: '1123px'
                    }}
                >
                    {/* 1. Header Bar */}
                    <div className="h-28 bg-[#1e293b] flex items-center justify-between px-10 text-white shrink-0">
                        <h1 className="text-3xl font-black uppercase tracking-[0.2em]">{orgProfile?.name || 'KENT OWL ACADEMY'}</h1>
                        {orgProfile?.logoUrl ? (
                            <img src={orgProfile.logoUrl} alt="Logo" className="h-20 w-auto object-contain bg-white rounded-xl p-2 shadow-lg" />
                        ) : (
                            <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold text-2xl">KOA</div>
                        )}
                    </div>

                    {/* 2. Main Content Grid - Grows to take available space */}
                    {/* Shifted left by reducing left padding (pl-5 = 20px, was 32px). Shifted right column wider (col-span-8 vs 4). */}
                    <div className="flex-1 py-8 pl-5 pr-8 grid grid-cols-12 gap-6 overflow-hidden">
                        
                        {/* LEFT COLUMN */}
                        <div className={`col-span-4 flex flex-col ${mapLayout === 'bottom' ? 'gap-2' : 'gap-4'}`}>
                            {/* Portrait */}
                            <div className="aspect-[3/4] w-full rounded-[1.5rem] overflow-hidden border-4 border-[#1e293b] shadow-xl relative shrink-0">
                                <img src={animal.imageUrl} alt={animal.name} className="w-full h-full object-cover" crossOrigin="anonymous"/>
                            </div>

                            {/* Status Box */}
                            <div className="bg-[#1e293b] rounded-2xl p-4 flex items-center justify-between shadow-lg text-white shrink-0">
                                <span className="text-xs font-black uppercase tracking-[0.25em] pl-2">STATUS</span>
                                <div className="scale-90 origin-right">
                                    <IUCNBadge status={animal.redListStatus} size="lg" />
                                </div>
                            </div>

                            {/* CONDITIONAL LEFT CONTENT */}
                            {mapLayout === 'side' ? (
                                /* LAYOUT SIDE: MAP IN LEFT COLUMN (Original Style) */
                                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 shadow-sm flex flex-col items-center flex-1 min-h-0">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] w-full text-left mb-2 pl-1">NATIVE RANGE</h3>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 w-full bg-white relative flex items-center justify-center flex-1">
                                        {animal.distributionMapUrl ? (
                                            <img src={animal.distributionMapUrl} alt="Range Map" className="w-full h-full object-cover" crossOrigin="anonymous"/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Globe size={48} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* LAYOUT BOTTOM: STATS IN LEFT COLUMN (New Style) */
                                <>
                                    {/* Animal Stats - Vertical Stack */}
                                    <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0">
                                                <Info size={16}/>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">AGE</p>
                                                <p className="font-bold text-slate-800 text-sm">{getAge(animal.dob)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0">
                                                <Info size={16}/>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SEX</p>
                                                <p className="font-bold text-slate-800 text-sm">{animal.sex}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 shrink-0">
                                                <Calendar size={16}/>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ARRIVED</p>
                                                <p className="font-bold text-slate-800 text-sm">{getArrivalYear(animal.arrivalDate)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Species Stats - Single Column Stack to Fill Space - Added mb-6 for lift */}
                                    <div className="grid grid-cols-1 gap-2 bg-[#f0fdf4] p-3 rounded-xl border border-emerald-100 flex-1 min-h-0 content-start overflow-auto no-scrollbar mb-6">
                                        <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center">
                                            <p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WILD LIFESPAN</p>
                                            {isEditingText ? (
                                                <EditInput value={content.speciesStats.lifespanWild || ''} onChange={(v) => handleStatChange('lifespanWild', v)} />
                                            ) : (
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.lifespanWild || '-'}</p>
                                            )}
                                        </div>
                                        <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center">
                                            <p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">CAPTIVE LIFESPAN</p>
                                            {isEditingText ? (
                                                <EditInput value={content.speciesStats.lifespanCaptivity || ''} onChange={(v) => handleStatChange('lifespanCaptivity', v)} />
                                            ) : (
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.lifespanCaptivity || '-'}</p>
                                            )}
                                        </div>
                                        <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center">
                                            <p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">{dynamicDimensionLabel}</p>
                                            {isEditingText ? (
                                                <EditInput value={content.speciesStats.wingspan || ''} onChange={(v) => handleStatChange('wingspan', v)} />
                                            ) : (
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.wingspan || '-'}</p>
                                            )}
                                        </div>
                                        <div className="bg-white/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center">
                                            <p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WEIGHT</p>
                                            {isEditingText ? (
                                                <EditInput value={content.speciesStats.weight || ''} onChange={(v) => handleStatChange('weight', v)} />
                                            ) : (
                                                <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.weight || '-'}</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className={`col-span-8 flex flex-col h-full ${mapLayout === 'bottom' ? 'gap-3' : 'gap-6'}`}>
                            
                            {/* Header Info - Compacted */}
                            <div className="shrink-0">
                                <h2 className="text-[4rem] font-black text-[#1e293b] uppercase leading-[0.8] tracking-tight mb-2">{animal.name}</h2>
                                <h3 className="text-2xl font-bold text-[#10b981] uppercase tracking-wider">{animal.species}</h3>
                                <p className="text-lg text-slate-400 font-serif italic mt-1 mb-4">{animal.latinName}</p>
                                <div className="h-1.5 w-32 bg-[#10b981] mb-2 rounded-full"></div>

                                {/* CONDITIONAL HEADER CONTENT */}
                                {mapLayout === 'side' && (
                                    <>
                                        {/* Animal Stats - Row Layout (Only in Side Layout) */}
                                        <div className="flex gap-8 mb-6 mt-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                                                    <Info size={20}/>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AGE</p>
                                                    <p className="font-bold text-slate-800">{getAge(animal.dob)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                                                    <Info size={20}/>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SEX</p>
                                                    <p className="font-bold text-slate-800">{animal.sex}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
                                                    <Calendar size={20}/>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ARRIVED</p>
                                                    <p className="font-bold text-slate-800">{getArrivalYear(animal.arrivalDate)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Species Stats - Compact Grid Row (Only in Side Layout) */}
                                        <div className="grid grid-cols-4 gap-2 bg-[#f0fdf4] p-3 rounded-xl border border-emerald-100">
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WILD LIFESPAN</p>
                                                {isEditingText ? (
                                                    <EditInput value={content.speciesStats.lifespanWild || ''} onChange={(v) => handleStatChange('lifespanWild', v)} />
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.lifespanWild || '-'}</p>
                                                )}
                                            </div>
                                            <div className="text-center border-l border-emerald-200">
                                                <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">CAPTIVE LIFESPAN</p>
                                                {isEditingText ? (
                                                    <EditInput value={content.speciesStats.lifespanCaptivity || ''} onChange={(v) => handleStatChange('lifespanCaptivity', v)} />
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.lifespanCaptivity || '-'}</p>
                                                )}
                                            </div>
                                            <div className="text-center border-l border-emerald-200">
                                                <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">{dynamicDimensionLabel}</p>
                                                {isEditingText ? (
                                                    <EditInput value={content.speciesStats.wingspan || ''} onChange={(v) => handleStatChange('wingspan', v)} />
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.wingspan || '-'}</p>
                                                )}
                                            </div>
                                            <div className="text-center border-l border-emerald-200">
                                                <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">WEIGHT</p>
                                                {isEditingText ? (
                                                    <EditInput value={content.speciesStats.weight || ''} onChange={(v) => handleStatChange('weight', v)} />
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-800 leading-tight">{content.speciesStats.weight || '-'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Content Blocks - Auto Flex to Fill Remaining Space */}
                            <div className="flex flex-col gap-4 flex-1 min-h-0 justify-between overflow-hidden">
                                <div className="flex-1 min-h-0">
                                    <h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">DIET</h4>
                                    {isEditingText ? (
                                        <EditTextArea value={content.diet.join('\n')} onChange={v => handleListChange('diet', v)} className="h-full"/>
                                    ) : (
                                        <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">
                                            {/* Limit items in Bottom layout to avoid push */}
                                            {content.diet.length > 0 ? content.diet.slice(0, mapLayout === 'bottom' ? 2 : 3).map((item, i) => <li key={i}>{item}</li>) : <li>Generating diet info...</li>}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex-1 min-h-0">
                                    <h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">HABITAT</h4>
                                    {isEditingText ? (
                                        <EditTextArea value={content.habitat.join('\n')} onChange={v => handleListChange('habitat', v)} className="h-full"/>
                                    ) : (
                                        <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">
                                            {content.habitat.length > 0 ? content.habitat.slice(0, mapLayout === 'bottom' ? 2 : 3).map((item, i) => <li key={i}>{item}</li>) : <li>Generating habitat info...</li>}
                                        </ul>
                                    )}
                                </div>

                                {/* In Bottom Layout, we might need to compress this or show fewer items */}
                                {mapLayout === 'side' && (
                                    <div className="flex-1 min-h-0">
                                        <h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">DID YOU KNOW?</h4>
                                        {isEditingText ? (
                                            <EditTextArea value={content.didYouKnow.join('\n')} onChange={v => handleListChange('didYouKnow', v)} className="h-full"/>
                                        ) : (
                                            <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">
                                                {content.didYouKnow.length > 0 ? content.didYouKnow.slice(0, 2).map((item, i) => <li key={i}>{item}</li>) : <li>Gathering facts...</li>}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {mapLayout === 'bottom' && content.didYouKnow.length > 0 && (
                                     <div className="flex-1 min-h-0">
                                        <h4 className="text-xs font-black text-[#1e293b] uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">DID YOU KNOW?</h4>
                                        {isEditingText ? (
                                            <EditTextArea value={content.didYouKnow.join('\n')} onChange={v => handleListChange('didYouKnow', v)} className="h-full"/>
                                        ) : (
                                            <ul className="list-disc list-outside pl-5 text-[15px] text-slate-700 space-y-1.5 font-medium leading-relaxed marker:text-[#10b981]">
                                                {content.didYouKnow.slice(0, 1).map((item, i) => <li key={i}>{item}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* BOTTOM LAYOUT MAP - Added mb-6 for lift */}
                            {mapLayout === 'bottom' && (
                                <div className="h-72 bg-slate-50 rounded-2xl p-4 border-2 border-slate-200 shadow-sm shrink-0 flex flex-col mb-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] w-full text-left mb-2 pl-1">NATIVE RANGE</h3>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 w-full bg-white relative flex items-center justify-center flex-1">
                                        {animal.distributionMapUrl ? (
                                            <img src={animal.distributionMapUrl} alt="Range Map" className="w-full h-full object-contain" crossOrigin="anonymous"/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Globe size={48} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* 3. Footer / CTA - Adjusted for fit */}
                    <div className="h-32 bg-[#10b981] flex items-center justify-between px-10 text-white relative overflow-hidden shrink-0">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2.5px)', backgroundSize: '24px 24px' }}></div>
                        
                        <div className="relative z-10 max-w-[70%]">
                            <h2 className="text-3xl font-black uppercase italic tracking-wide mb-1 shadow-black drop-shadow-sm">ADOPT {animal.name} TODAY!</h2>
                            <p className="text-sm font-medium opacity-95 leading-snug">
                                Scan the code to adopt {animal.name}. Your support helps provide food, care, and enrichment for our collection.
                            </p>
                        </div>

                        <div className="relative z-10 bg-white p-2 rounded-xl shadow-2xl shrink-0">
                            <img src={qrCodeUrl} alt="Adoption QR" className="w-24 h-24" crossOrigin="anonymous"/>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default SignGenerator;
