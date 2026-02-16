
import React, { useState, useEffect, useRef } from 'react';
import { 
  Animal, AnimalCategory, User, OrganizationProfile, Contact, UserRole, 
  GlobalDocument, DocumentType 
} from '../types';
import { 
  Settings as SettingsIcon, Users, Database, MapPin, 
  Phone, Utensils, Building2, Save, Upload, Download, 
  Trash2, Plus, X, Shield, AlertTriangle, FileText, CheckCircle2,
  RefreshCw, Lock, FolderOpen, ChevronRight, Link as LinkIcon
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { dataService } from '../services/dataService';
import { parseCSVToAnimals } from '../services/csvService';

interface SettingsProps {
  animals: Animal[];
  onImport: (animals: Animal[]) => void;
  foodOptions: Record<AnimalCategory, string[]>;
  onUpdateFoodOptions: (options: Record<AnimalCategory, string[]>) => void;
  feedMethods: Record<AnimalCategory, string[]>;
  onUpdateFeedMethods: (methods: Record<AnimalCategory, string[]>) => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  locations: string[];
  onUpdateLocations: (locs: string[]) => void;
  contacts: Contact[];
  onUpdateContacts: (cons: Contact[]) => void;
  orgProfile: OrganizationProfile | null;
  onUpdateOrgProfile: (profile: OrganizationProfile) => void;
  onUpdateAnimal: (animal: Animal) => void;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 800;
        const maxHeight = 800;
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const Settings: React.FC<SettingsProps> = ({
  animals, onImport, foodOptions, onUpdateFoodOptions,
  feedMethods, onUpdateFeedMethods, users, onUpdateUsers,
  locations, onUpdateLocations, contacts, onUpdateContacts,
  orgProfile, onUpdateOrgProfile, onUpdateAnimal
}) => {
  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'lists' | 'documents' | 'data'>('org');
  
  // Organization State
  const [orgForm, setOrgForm] = useState<OrganizationProfile>({
      name: '', address: '', licenseNumber: '', contactEmail: '', contactPhone: '', logoUrl: ''
  });

  // Users State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.VOLUNTEER, active: true, permissions: { dashboard: true, dailyLog: true, tasks: true, medical: false, movements: false, safety: false, maintenance: true, settings: false, flightRecords: true, feedingSchedule: false, attendance: true, attendanceManager: false, holidayApprover: false, missingRecords: false, reports: false } });

  // Lists State
  const [listCategory, setListCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [newItem, setNewItem] = useState('');

  // Documents State
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [docForm, setDocForm] = useState<Partial<GlobalDocument>>({});

  useEffect(() => {
      if (orgProfile) setOrgForm(orgProfile);
  }, [orgProfile]);

  useEffect(() => {
      const loadDocs = async () => {
          const docs = await dataService.fetchGlobalDocuments();
          setDocuments(docs);
      };
      if (activeTab === 'documents') loadDocs();
  }, [activeTab]);

  const handleOrgSave = () => {
      onUpdateOrgProfile(orgForm);
      alert('Organization profile updated.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const resized = await resizeImage(file);
              setOrgForm(prev => ({ ...prev, logoUrl: resized }));
          } catch (err) {
              console.error(err);
          }
      }
  };

  // User Management
  const handleSaveUser = () => {
      if (editingUser) {
          onUpdateUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
          setEditingUser(null);
      } else if (newUser.name && newUser.pin) {
          const user: User = {
              id: `u_${Date.now()}`,
              name: newUser.name,
              initials: newUser.initials || newUser.name.slice(0, 2).toUpperCase(),
              jobPosition: newUser.jobPosition || 'Volunteer',
              role: newUser.role || UserRole.VOLUNTEER,
              pin: newUser.pin,
              active: newUser.active ?? true,
              permissions: newUser.permissions as any
          };
          onUpdateUsers([...users, user]);
          setNewUser({ role: UserRole.VOLUNTEER, active: true, permissions: {} as any });
      }
  };

  const handleDeleteUser = (id: string) => {
      if (window.confirm('Delete user?')) {
          onUpdateUsers(users.filter(u => u.id !== id));
      }
  };

  // Lists Management
  const handleAddItem = (type: 'food' | 'method' | 'location' | 'contact') => {
      if (!newItem) return;
      if (type === 'food') {
          const current = foodOptions[listCategory] || [];
          onUpdateFoodOptions({ ...foodOptions, [listCategory]: [...current, newItem] });
      } else if (type === 'method') {
          const current = feedMethods[listCategory] || [];
          onUpdateFeedMethods({ ...feedMethods, [listCategory]: [...current, newItem] });
      } else if (type === 'location') {
          onUpdateLocations([...locations, newItem]);
      }
      setNewItem('');
  };

  const handleDeleteItem = (type: 'food' | 'method' | 'location', item: string) => {
      if (type === 'food') {
          const current = foodOptions[listCategory] || [];
          onUpdateFoodOptions({ ...foodOptions, [listCategory]: current.filter(i => i !== item) });
      } else if (type === 'method') {
          const current = feedMethods[listCategory] || [];
          onUpdateFeedMethods({ ...feedMethods, [listCategory]: current.filter(i => i !== item) });
      } else if (type === 'location') {
          onUpdateLocations(locations.filter(i => i !== item));
      }
  };

  // Documents Management
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // In a real app, upload to storage. Here we use base64 for demo.
          const reader = new FileReader();
          reader.onload = (ev) => {
              setDocForm(prev => ({ ...prev, url: ev.target?.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveDocument = async () => {
      if (!docForm.name || !docForm.url) return;
      const newDoc: GlobalDocument = {
          id: `doc_${Date.now()}`,
          name: docForm.name,
          category: (docForm.category as any) || 'Licensing',
          url: docForm.url,
          expiryDate: docForm.expiryDate,
          uploadDate: new Date().toISOString(),
          notes: docForm.notes
      };
      await dataService.saveGlobalDocument(newDoc);
      setDocuments(prev => [...prev, newDoc]);
      setDocForm({});
  };

  const handleDeleteDocument = async (id: string) => {
      if (window.confirm('Delete document?')) {
          await dataService.deleteGlobalDocument(id);
          setDocuments(prev => prev.filter(d => d.id !== id));
      }
  };

  // Data Management
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          if (file.name.endsWith('.json')) {
              backupService.importDatabase(text).then(success => {
                  if(success) alert('Database imported successfully. Please refresh.');
                  else alert('Import failed.');
              });
          } else {
              const imported = parseCSVToAnimals(text);
              onImport(imported);
              alert(`Imported ${imported.length} animals.`);
          }
      };
      reader.readAsText(file);
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-400";

  return (
    <div className="flex h-full max-h-[calc(100vh-4rem)] overflow-hidden bg-white animate-in fade-in duration-500">
        
        {/* LEFT SIDEBAR: Settings Menu */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <SettingsIcon size={20} className="text-emerald-600" /> Configuration
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">System Control Panel</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {[
                    { id: 'org', label: 'Organization Profile', icon: Building2 },
                    { id: 'users', label: 'Access Control', icon: Users },
                    { id: 'lists', label: 'Operational Lists', icon: Utensils },
                    { id: 'documents', label: 'Legal Vault', icon: FileText },
                    { id: 'data', label: 'Data Integrity', icon: Database },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${
                            activeTab === tab.id 
                            ? 'bg-slate-900 text-white shadow-lg' 
                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
                            <span className="text-xs font-bold uppercase tracking-wide">{tab.label}</span>
                        </div>
                        {activeTab === tab.id && <ChevronRight size={14} className="text-emerald-400"/>}
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-auto bg-slate-100/50 p-6 md:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 min-h-[600px]">
            
            {/* ORGANIZATION TAB */}
            {activeTab === 'org' && (
                <div className="max-w-2xl space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Building2 size={20} className="text-slate-400"/> Organization Details
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="relative group w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-200 overflow-hidden shrink-0">
                            {orgForm.logoUrl ? (
                                <img src={orgForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Building2 size={32} className="text-slate-300" />
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="text-white" size={24} />
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Organization Logo</h3>
                            <p className="text-xs text-slate-500 mt-1">Recommended: 500x500 PNG. Used on reports and signage.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Registered Name</label>
                            <input type="text" value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">License Number</label>
                            <input type="text" value={orgForm.licenseNumber} onChange={e => setOrgForm({...orgForm, licenseNumber: e.target.value})} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contact Phone</label>
                                <input type="text" value={orgForm.contactPhone} onChange={e => setOrgForm({...orgForm, contactPhone: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contact Email</label>
                                <input type="email" value={orgForm.contactEmail} onChange={e => setOrgForm({...orgForm, contactEmail: e.target.value})} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Address</label>
                            <textarea value={orgForm.address} onChange={e => setOrgForm({...orgForm, address: e.target.value})} className={`${inputClass} resize-none h-24`} />
                        </div>
                        
                        <button onClick={handleOrgSave} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20">
                            Save Profile
                        </button>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Users size={20} className="text-slate-400"/> Staff Registry
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map(u => (
                            <div key={u.id} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 flex flex-col gap-3 group hover:border-slate-300 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700">
                                            {u.initials}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{u.role}</p>
                                        </div>
                                    </div>
                                    {u.active ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                                </div>
                                <div className="flex gap-2 mt-auto pt-2">
                                    <button onClick={() => setEditingUser(u)} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-100 transition-colors">Edit</button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-white border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-6 max-w-2xl">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Plus size={18}/> {editingUser ? 'Edit User' : 'Add New User'}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    type="text" placeholder="Full Name" 
                                    value={editingUser ? editingUser.name : newUser.name || ''} 
                                    onChange={e => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})} 
                                    className={inputClass}
                                />
                                <input 
                                    type="text" placeholder="Initials" maxLength={3}
                                    value={editingUser ? editingUser.initials : newUser.initials || ''} 
                                    onChange={e => editingUser ? setEditingUser({...editingUser, initials: e.target.value.toUpperCase()}) : setNewUser({...newUser, initials: e.target.value.toUpperCase()})} 
                                    className={inputClass}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    value={editingUser ? editingUser.role : newUser.role} 
                                    onChange={e => editingUser ? setEditingUser({...editingUser, role: e.target.value as any}) : setNewUser({...newUser, role: e.target.value as any})} 
                                    className={inputClass}
                                >
                                    <option value={UserRole.VOLUNTEER}>Volunteer</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                </select>
                                <input 
                                    type="text" placeholder="PIN (4 digits)" maxLength={4}
                                    value={editingUser ? editingUser.pin : newUser.pin || ''} 
                                    onChange={e => editingUser ? setEditingUser({...editingUser, pin: e.target.value}) : setNewUser({...newUser, pin: e.target.value})} 
                                    className={inputClass}
                                />
                            </div>
                            <div className="flex gap-3">
                                {editingUser && <button onClick={() => setEditingUser(null)} className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-500 font-bold uppercase text-xs">Cancel</button>}
                                <button onClick={handleSaveUser} className="flex-1 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-black transition-all py-3">
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LISTS TAB */}
            {activeTab === 'lists' && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Utensils size={20} className="text-slate-400"/> Operational Lists
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {Object.values(AnimalCategory).map(cat => (
                            <button key={cat} onClick={() => setListCategory(cat)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${listCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Utensils size={16}/> Food Options</h3>
                            <div className="space-y-2 mb-4">
                                {(foodOptions[listCategory] || []).map(item => (
                                    <div key={item} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                        <span className="text-sm font-bold text-slate-700">{item}</span>
                                        <button onClick={() => handleDeleteItem('food', item)} className="text-slate-400 hover:text-rose-500"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Add food item..." value={newItem} onChange={e => setNewItem(e.target.value)} className={inputClass} />
                                <button onClick={() => handleAddItem('food')} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors"><Plus size={20}/></button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><RefreshCw size={16}/> Feeding Methods</h3>
                            <div className="space-y-2 mb-4">
                                {(feedMethods[listCategory] || []).map(item => (
                                    <div key={item} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                        <span className="text-sm font-bold text-slate-700">{item}</span>
                                        <button onClick={() => handleDeleteItem('method', item)} className="text-slate-400 hover:text-rose-500"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Add method..." value={newItem} onChange={e => setNewItem(e.target.value)} className={inputClass} />
                                <button onClick={() => handleAddItem('method')} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors"><Plus size={20}/></button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t-2 border-slate-100">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={16}/> Enclosure Locations</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {locations.map(loc => (
                                <div key={loc} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                    <span className="text-xs font-bold text-slate-700">{loc}</span>
                                    <button onClick={() => handleDeleteItem('location', loc)} className="text-slate-400 hover:text-rose-500"><X size={12}/></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 max-w-md">
                            <input type="text" placeholder="Add location..." value={newItem} onChange={e => setNewItem(e.target.value)} className={inputClass} />
                            <button onClick={() => handleAddItem('location')} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors"><Plus size={20}/></button>
                        </div>
                    </div>
                </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'documents' && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <FileText size={20} className="text-slate-400"/> Legal Vault
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map(doc => (
                            <div key={doc.id} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 group hover:border-slate-300 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-emerald-600">
                                        <FileText size={20}/>
                                    </div>
                                    <button onClick={() => handleDeleteDocument(doc.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm truncate">{doc.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{doc.category}</p>
                                {doc.expiryDate && (
                                    <p className={`text-[10px] font-bold flex items-center gap-1 ${new Date(doc.expiryDate) < new Date() ? 'text-rose-500' : 'text-slate-500'}`}>
                                        <AlertTriangle size={10}/> Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                                    </p>
                                )}
                                <a href={doc.url} download className="mt-3 block w-full py-2 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-colors">Download</a>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-6 max-w-2xl">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Upload size={18}/> Add Document</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Document Name" value={docForm.name || ''} onChange={e => setDocForm({...docForm, name: e.target.value})} className={inputClass} />
                            <div className="grid grid-cols-2 gap-4">
                                <select value={docForm.category || 'Licensing'} onChange={e => setDocForm({...docForm, category: e.target.value as any})} className={inputClass}>
                                    <option value="Licensing">Licensing</option>
                                    <option value="Insurance">Insurance</option>
                                    <option value="Protocol">Protocol</option>
                                    <option value="Safety">Safety</option>
                                </select>
                                <input type="date" placeholder="Expiry Date" value={docForm.expiryDate || ''} onChange={e => setDocForm({...docForm, expiryDate: e.target.value})} className={inputClass}/>
                            </div>
                            
                            {/* RESTORED URL INPUT + UPLOAD HELPER */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Document Source / URL</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                        <input 
                                            type="text" 
                                            placeholder="https://..." 
                                            value={docForm.url || ''} 
                                            onChange={e => setDocForm({...docForm, url: e.target.value})} 
                                            className={`${inputClass} pl-10`} 
                                        />
                                    </div>
                                    <label className="p-3 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700" title="Upload File to Generate URL">
                                        <Upload size={20}/>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleDocumentUpload} className="hidden" />
                                    </label>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 ml-1">Enter a URL or upload a file to generate a secure data link.</p>
                            </div>
                            
                            <button onClick={handleSaveDocument} disabled={!docForm.url || !docForm.name} className="w-full bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                Save Document
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Database size={20} className="text-slate-400"/> Data Management
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-colors">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2"><Download size={20}/> Backup Database</h3>
                            <p className="text-xs text-slate-500 mb-6">Download a complete JSON snapshot of all animals, logs, and settings.</p>
                            <button onClick={() => backupService.exportDatabase()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all w-full shadow-lg">
                                Export Full Backup
                            </button>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-colors">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2"><Upload size={20}/> Restore / Import</h3>
                            <p className="text-xs text-slate-500 mb-6">Restore from a backup JSON file or import animals via CSV.</p>
                            <input 
                                type="file" 
                                accept=".json,.csv" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                            <button onClick={handleImportClick} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all w-full">
                                Select File...
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18}/>
                        <div>
                            <h4 className="font-bold text-amber-800 text-sm">Data Safety Notice</h4>
                            <p className="text-xs text-amber-700 mt-1">Importing a full database backup will overwrite existing records. Ensure you have a recent backup before proceeding with a restore operation.</p>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    </div>
  );
};

export default Settings;
