
import React, { useState, useRef, useEffect } from 'react';
import { Animal, AnimalCategory, User, UserRole, Contact, OrganizationProfile, UserPermissions, HazardRating } from '../types';
import { Shield, Database, Save, UserPlus, Trash2, Edit2, X, ShieldCheck, Check, Briefcase, Lock, Fingerprint, Plus, Phone, Mail, Globe, Download, Upload, RefreshCw, MapPin, Utensils, ClipboardList } from 'lucide-react';
import { backupService } from '../services/backupService';
import { dataService } from '../services/dataService';

interface SettingsProps {
  animals: Animal[];
  onImport: (animals: Animal[]) => void;
  foodOptions: Record<AnimalCategory, string[]>;
  onUpdateFoodOptions: (options: Record<AnimalCategory, string[]>) => void;
  feedMethods: Record<AnimalCategory, string[]>;
  onUpdateFeedMethods: (methods: Record<AnimalCategory, string[]>) => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  locations?: string[];
  onUpdateLocations?: (locations: string[]) => void;
  contacts?: Contact[];
  onUpdateContacts?: (contacts: Contact[]) => void;
  orgProfile?: OrganizationProfile | null;
  onUpdateOrgProfile?: (profile: OrganizationProfile) => void;
  onUpdateAnimal?: (animal: Animal) => void;
}

const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    dashboard: true, dailyLog: true, tasks: true, medical: true, movements: true, safety: true, maintenance: true, reports: true, settings: true,
    flightRecords: true, feedingSchedule: true, attendance: true, attendanceManager: true, missingRecords: true
  },
  [UserRole.VOLUNTEER]: {
    dashboard: true, dailyLog: true, tasks: true, medical: false, movements: false, safety: false, maintenance: true, reports: false, settings: false,
    flightRecords: true, feedingSchedule: false, attendance: true, attendanceManager: false, missingRecords: false
  }
};

const Settings: React.FC<SettingsProps> = ({ 
    animals, onImport, foodOptions, onUpdateFoodOptions, feedMethods, onUpdateFeedMethods, 
    users, onUpdateUsers, locations = [], onUpdateLocations, 
    contacts = [], onUpdateContacts, orgProfile, onUpdateOrgProfile 
}) => {
  const [activeTab, setActiveTab] = useState('users');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User Form State
  const [userFormName, setUserFormName] = useState('');
  const [userFormJob, setUserFormJob] = useState('');
  const [userFormInitials, setUserFormInitials] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>(UserRole.VOLUNTEER);
  const [userFormPin, setUserFormPin] = useState('');
  const [userFormActive, setUserFormActive] = useState(true);
  const [userFormSignature, setUserFormSignature] = useState('');
  const [userFormPerms, setUserFormPerms] = useState<UserPermissions>(DEFAULT_PERMISSIONS[UserRole.VOLUNTEER]);
  
  const [isCapturingSignature, setIsCapturingSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // General List Management State
  const [newItem, setNewItem] = useState('');
  const [activeListCategory, setActiveListCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);

  useEffect(() => {
    if (editingUser) {
        setUserFormName(editingUser.name);
        setUserFormJob(editingUser.jobPosition || '');
        setUserFormInitials(editingUser.initials);
        setUserFormRole(editingUser.role);
        setUserFormPin(editingUser.pin);
        setUserFormActive(editingUser.active ?? true);
        setUserFormSignature(editingUser.signature || '');
        setUserFormPerms(editingUser.permissions || DEFAULT_PERMISSIONS[editingUser.role]);
    } else {
        setUserFormName('');
        setUserFormJob('');
        setUserFormInitials('');
        setUserFormRole(UserRole.VOLUNTEER);
        setUserFormPin('');
        setUserFormActive(true);
        setUserFormSignature('');
        setUserFormPerms(DEFAULT_PERMISSIONS[UserRole.VOLUNTEER]);
    }
  }, [editingUser, isAddingUser]);

  useEffect(() => {
      if (isCapturingSignature && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              const dpr = window.devicePixelRatio || 1;
              const rect = canvas.getBoundingClientRect();
              canvas.width = rect.width * dpr;
              canvas.height = rect.height * dpr;
              ctx.scale(dpr, dpr);
              ctx.lineWidth = 3;
              ctx.lineCap = 'round';
              ctx.strokeStyle = '#0f172a';
          }
      }
  }, [isCapturingSignature]);

  const startDrawing = (e: any) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
    if (ctx) {
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      const newUser: User = {
          id: editingUser ? editingUser.id : `u_${Date.now()}`,
          name: userFormName, jobPosition: userFormJob, initials: userFormInitials.toUpperCase(),
          role: userFormRole, pin: userFormPin, active: userFormActive, signature: userFormSignature, permissions: userFormPerms
      };
      onUpdateUsers(editingUser ? users.map(u => u.id === editingUser.id ? newUser : u) : [...users, newUser]);
      setIsAddingUser(false);
      setEditingUser(null);
  };

  const handleExport = async () => {
      await backupService.exportDatabase();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!window.confirm("CRITICAL: Importing a database will overwrite current local records. Ensure you have a backup. Proceed?")) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const success = await backupService.importDatabase(event.target?.result as string);
          if (success) {
              alert("Import successful. Reloading application...");
              window.location.reload();
          } else {
              alert("Import failed. Invalid file format.");
          }
      };
      reader.readAsText(file);
  };

  const addItemToList = (listType: 'food' | 'methods' | 'locations') => {
      if (!newItem) return;
      if (listType === 'food') {
          const updated = { ...foodOptions, [activeListCategory]: [...foodOptions[activeListCategory], newItem] };
          onUpdateFoodOptions(updated);
      } else if (listType === 'methods') {
          const updated = { ...feedMethods, [activeListCategory]: [...feedMethods[activeListCategory], newItem] };
          onUpdateFeedMethods(updated);
      } else if (listType === 'locations' && onUpdateLocations) {
          onUpdateLocations([...locations, newItem]);
      }
      setNewItem('');
  };

  const removeItemFromList = (listType: 'food' | 'methods' | 'locations', item: string, category?: AnimalCategory) => {
      if (listType === 'food' && category) {
          const updated = { ...foodOptions, [category]: foodOptions[category].filter(i => i !== item) };
          onUpdateFoodOptions(updated);
      } else if (listType === 'methods' && category) {
          const updated = { ...feedMethods, [category]: feedMethods[category].filter(i => i !== item) };
          onUpdateFeedMethods(updated);
      } else if (listType === 'locations' && onUpdateLocations) {
          onUpdateLocations(locations.filter(i => i !== item));
      }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 focus:outline-none transition-all";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1";

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <ShieldCheck className="text-emerald-600" size={28} /> Administration
          </h1>
          <p className="text-slate-500 text-sm font-medium">Institutional Master Control & Governance</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 overflow-hidden min-h-[700px] flex flex-col lg:flex-row">
          {/* Navigation Sidebar */}
          <div className="w-full lg:w-72 bg-slate-50 border-r-2 border-slate-200 flex flex-row lg:flex-col overflow-x-auto shrink-0 scrollbar-hide">
              {[
                  { id: 'users', icon: Shield, label: 'Access Control' },
                  { id: 'config', icon: Briefcase, label: 'Operations' },
                  { id: 'lists', icon: ClipboardList, label: 'Global Lists' },
                  { id: 'data', icon: Database, label: 'Integrity' },
              ].map(tab => (
                  <button 
                    key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 lg:flex-none p-5 flex items-center gap-4 transition-all border-b-4 lg:border-b-0 lg:border-l-4 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-emerald-700 border-emerald-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                  >
                      <tab.icon size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
              ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 lg:p-10 bg-white overflow-y-auto max-h-[85vh] scrollbar-thin">
              {activeTab === 'users' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-6">
                          <div>
                            <h3 className="font-bold text-slate-900 text-xl uppercase tracking-tight">Personnel Registry</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Authorized users and digital credentials.</p>
                          </div>
                          <button onClick={() => { setEditingUser(null); setIsAddingUser(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg"><UserPlus size={18} /> Add Staff</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {users.map(user => (
                              <div key={user.id} className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 transition-all flex flex-col justify-between group shadow-sm">
                                  <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-xs shadow-md">
                                              {user.initials}
                                          </div>
                                          <div>
                                              <h4 className="font-black text-slate-900 text-sm uppercase">{user.name}</h4>
                                              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{user.jobPosition}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-slate-200">{user.role}</span>
                                                  {user.signature && <span className="text-[8px] font-black text-blue-600 flex items-center gap-1"><Check size={8}/> SIGNED</span>}
                                                  {!user.active && <span className="text-[8px] font-black text-rose-600 flex items-center gap-1">SUSPENDED</span>}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingUser(user); setIsAddingUser(true); }} className="p-2 text-slate-400 hover:text-emerald-600 transition-all"><Edit2 size={16}/></button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'config' && (
                  <div className="space-y-8 animate-in fade-in">
                      <h3 className="font-bold text-slate-900 text-xl uppercase tracking-tight border-b-2 border-slate-100 pb-6">Organization Identity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-6">
                             <div><label className={labelClass}>Organization Name</label><input type="text" value={orgProfile?.name || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, name: e.target.value})} className={inputClass} /></div>
                             <div><label className={labelClass}>ZLA License Number</label><input type="text" value={orgProfile?.licenseNumber || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, licenseNumber: e.target.value})} className={inputClass} /></div>
                             <div><label className={labelClass}>Issuing Authority</label><input type="text" value={orgProfile?.issuingAuthority || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, issuingAuthority: e.target.value})} className={inputClass} /></div>
                             <div><label className={labelClass}>License Expiry</label><input type="date" value={orgProfile?.licenseExpiryDate || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, licenseExpiryDate: e.target.value})} className={inputClass} /></div>
                           </div>
                           <div className="space-y-6">
                             <div><label className={labelClass}>Public Website URL</label><input type="text" value={orgProfile?.websiteUrl || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, websiteUrl: e.target.value})} className={inputClass} placeholder="https://..." /></div>
                             <div><label className={labelClass}>Adoption / Support URL</label><input type="text" value={orgProfile?.adoptionUrl || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, adoptionUrl: e.target.value})} className={inputClass} placeholder="https://..." /></div>
                             <div><label className={labelClass}>Logo Data URL</label><textarea rows={4} value={orgProfile?.logoUrl || ''} onChange={e => onUpdateOrgProfile?.({...orgProfile!, logoUrl: e.target.value})} className={`${inputClass} resize-none text-[10px] font-mono`} placeholder="data:image/..." /></div>
                           </div>
                      </div>
                  </div>
              )}

              {activeTab === 'lists' && (
                <div className="space-y-8 animate-in fade-in">
                    <h3 className="font-bold text-slate-900 text-xl uppercase tracking-tight border-b-2 border-slate-100 pb-6">Global List Management</h3>
                    
                    {/* Food Items */}
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <Utensils className="text-orange-500" size={20}/>
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Standard Diet Options</h4>
                        </div>
                        <div className="flex gap-2 overflow-x-auto mb-6 scrollbar-hide">
                            {Object.values(AnimalCategory).map(cat => (
                                <button key={cat} onClick={() => setActiveListCategory(cat)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${activeListCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={labelClass}>Add Item</label>
                                <div className="flex gap-2">
                                    <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} className={inputClass} placeholder="e.g. Quail" />
                                    <button onClick={() => addItemToList('food')} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-all shadow-md"><Plus size={20}/></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 content-start">
                                {foodOptions[activeListCategory].map(item => (
                                    <div key={item} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700 shadow-sm">
                                        {item}
                                        <button onClick={() => removeItemFromList('food', item, activeListCategory)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Locations */}
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <MapPin className="text-blue-500" size={20}/>
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Enclosure Locations</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={labelClass}>Add Enclosure ID</label>
                                <div className="flex gap-2">
                                    <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} className={inputClass} placeholder="e.g. Aviary 10" />
                                    <button onClick={() => addItemToList('locations')} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-all shadow-md"><Plus size={20}/></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 content-start">
                                {locations.map(loc => (
                                    <div key={loc} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700 shadow-sm">
                                        {loc}
                                        <button onClick={() => removeItemFromList('locations', loc)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {activeTab === 'data' && (
                  <div className="space-y-8 animate-in fade-in">
                      <h3 className="font-bold text-slate-900 text-xl uppercase tracking-tight border-b-2 border-slate-100 pb-6">System Integrity & Portability</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 space-y-4">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-inner"><Download size={24}/></div>
                              <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Full Database Export</h4>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"Downloads a structured JSON archive of all animals, logs, users, and organization data for manual off-site backup."</p>
                              <button onClick={handleExport} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
                                  <Download size={16}/> Generate Secure Export
                              </button>
                          </div>

                          <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 space-y-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-inner"><Upload size={24}/></div>
                              <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Institutional Data Restore</h4>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"Restores database from a KOA JSON archive. WARNING: This process is destructive and will overwrite existing data."</p>
                              <label className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer">
                                  <Upload size={16}/> Select Restore File
                                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                              </label>
                          </div>
                      </div>

                      <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 space-y-4">
                          <div className="flex items-center gap-2 text-rose-800 font-black text-[10px] uppercase tracking-[0.2em] mb-2"><ShieldCheck size={16}/> Clinical Integrity Sync</div>
                          <p className="text-xs text-rose-700 font-medium">Synchronize taxonomic data and IUCN statuses across the collection using the AI Diagnostic Engine. This is normally performed monthly automatically.</p>
                          <button onClick={() => window.location.reload()} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-rose-700 transition-all shadow-md">
                              <RefreshCw size={14}/> Force Collection Sync
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {isAddingUser && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-0 flex flex-col border-4 border-white/20 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                  <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{editingUser ? 'Update Personnel' : 'New Personnel'}</h2>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Personnel Registry Entry</p>
                      </div>
                      <button onClick={() => setIsAddingUser(false)} className="text-slate-300 hover:text-slate-900"><X size={32}/></button>
                  </div>
                  <form onSubmit={handleSaveUser} className="p-8 space-y-6 overflow-y-auto scrollbar-thin">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Full Legal Name</label><input type="text" required value={userFormName} onChange={e => setUserFormName(e.target.value)} className={inputClass} placeholder="Staff Name"/></div>
                          <div><label className={labelClass}>Auth Initials</label><input type="text" required maxLength={3} value={userFormInitials} onChange={e => setUserFormInitials(e.target.value.toUpperCase())} className={inputClass} placeholder="XX"/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Official Job Title</label><input type="text" value={userFormJob} onChange={e => setUserFormJob(e.target.value)} className={inputClass} placeholder="e.g. Senior Keeper"/></div>
                          <div><label className={labelClass}>Secure Access PIN (4-Digit)</label><input type="password" required maxLength={4} value={userFormPin} onChange={e => setUserFormPin(e.target.value)} className={inputClass} placeholder="****"/></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>System Access Role</label>
                              <select value={userFormRole} onChange={e => {
                                  const role = e.target.value as UserRole;
                                  setUserFormRole(role);
                                  setUserFormPerms(DEFAULT_PERMISSIONS[role]);
                              }} className={inputClass}>
                                  <option value={UserRole.ADMIN}>Administrator (Curator)</option>
                                  <option value={UserRole.VOLUNTEER}>Volunteer / Staff</option>
                              </select>
                          </div>
                          <div>
                              <label className={labelClass}>Account Status</label>
                              <select value={userFormActive ? 'active' : 'suspended'} onChange={e => setUserFormActive(e.target.value === 'active')} className={inputClass}>
                                  <option value="active">Operational (Active)</option>
                                  <option value="suspended">Suspended (No Access)</option>
                              </select>
                          </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 shadow-inner">
                          <label className={labelClass}>Digital Authorization Seal</label>
                          {userFormSignature ? (
                              <div className="relative border-2 border-slate-200 rounded-2xl p-4 bg-white flex items-center justify-center group">
                                  <img src={userFormSignature} alt="Signature" className="h-24 object-contain mix-blend-multiply opacity-90" />
                                  <button type="button" onClick={() => setUserFormSignature('')} className="absolute top-4 right-4 bg-rose-50 text-rose-500 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><Trash2 size={16}/></button>
                              </div>
                          ) : (
                              <div className="space-y-2">
                                  {isCapturingSignature ? (
                                      <div className="border-2 border-slate-300 rounded-3xl bg-white overflow-hidden shadow-lg animate-in zoom-in-95">
                                          <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => (isDrawing.current = false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => (isDrawing.current = false)} className="w-full h-40 touch-none cursor-crosshair"/>
                                          <div className="flex border-t-2 divide-x-2">
                                              <button type="button" onClick={() => setIsCapturingSignature(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 tracking-widest">Cancel</button>
                                              <button type="button" onClick={() => setUserFormSignature(canvasRef.current!.toDataURL())} className="flex-1 py-3 text-xs font-black uppercase text-emerald-600 bg-emerald-50 hover:bg-emerald-100 tracking-widest">Seal Authorization</button>
                                          </div>
                                      </div>
                                  ) : (
                                      <button type="button" onClick={() => setIsCapturingSignature(true)} className="w-full py-10 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 text-xs font-black uppercase tracking-[0.2em] hover:border-emerald-500 hover:text-emerald-500 transition-all flex flex-col items-center gap-2 group bg-slate-50/50">
                                          <Edit2 size={24} className="group-hover:animate-bounce"/> Sign Digital Seal
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>

                      <div className="bg-slate-900 p-8 rounded-[2.5rem] space-y-6 shadow-2xl border-4 border-slate-800">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 border-b-2 border-white/5 pb-4 flex items-center gap-2"><Lock size={14}/> Operational Permissions Matrix</h4>
                          <div className="grid grid-cols-2 gap-3">
                              {Object.entries(userFormPerms).map(([key, val]) => (
                                  <button 
                                    key={key} type="button" 
                                    onClick={() => setUserFormPerms({...userFormPerms, [key]: !val})}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${val ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-slate-500 opacity-60 hover:opacity-100'}`}
                                  >
                                      <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{key}</span>
                                      {val ? <Check size={16} className="text-emerald-500"/> : <div className="w-4 h-4 rounded-full border border-white/20"/>}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:bg-emerald-700 transition-all shadow-2xl active:scale-[0.98]">Commit Personnel Record</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
