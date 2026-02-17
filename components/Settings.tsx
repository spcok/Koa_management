
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Animal, AnimalCategory, User, OrganizationProfile, Contact, UserRole, 
  GlobalDocument, Task, UserPermissions, SystemPreferences, LocalBackupEntry 
} from '../types';
import { 
  Settings as SettingsIcon, Users, Database, MapPin, 
  Phone, Utensils, Building2, Upload, Download, 
  Trash2, Plus, X, AlertTriangle, FileText, CheckCircle2,
  RefreshCw, ChevronRight, Link as LinkIcon, Activity, ShieldCheck, AlertCircle, Globe, Lock, Edit2, PenTool, Eraser,
  Monitor, History, RotateCcw, Loader2, HardDrive, Archive, ServerCrash, Wrench, FlaskConical, Search, Filter, Calendar, FileImage, Ticket
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { dataService } from '../services/dataService';
import { diagnosticsService, DiagnosticIssue } from '../services/diagnosticsService';

interface SettingsProps {
  animals: Animal[];
  onImport: (animals: Animal[]) => void;
  foodOptions: Record<AnimalCategory, string[]>;
  onUpdateFoodOptions: (options: Record<AnimalCategory, string[]>) => void;
  feedMethods: Record<AnimalCategory, string[]>;
  onUpdateFeedMethods: (methods: Record<AnimalCategory, string[]>) => void;
  eventTypes?: string[];
  onUpdateEventTypes?: (types: string[]) => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  locations: string[];
  onUpdateLocations: (locs: string[]) => void;
  contacts: Contact[];
  onUpdateContacts: (cons: Contact[]) => void;
  orgProfile: OrganizationProfile | null;
  onUpdateOrgProfile: (profile: OrganizationProfile) => void;
  onUpdateAnimal: (animal: Animal) => void;
  tasks?: Task[];
  onDeleteTask?: (id: string) => void;
  systemPreferences?: SystemPreferences;
  onUpdateSystemPreferences?: (prefs: SystemPreferences) => void;
  onLaunchBenchmark?: () => void;
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
  feedMethods, onUpdateFeedMethods, eventTypes = [], onUpdateEventTypes,
  users, onUpdateUsers,
  locations, onUpdateLocations, contacts, onUpdateContacts,
  orgProfile, onUpdateOrgProfile, onUpdateAnimal, tasks = [], onDeleteTask,
  systemPreferences, onUpdateSystemPreferences, onLaunchBenchmark
}) => {
  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'directory' | 'lists' | 'documents' | 'diagnostics' | 'system'>('org');
  
  // Organization State
  const [orgForm, setOrgForm] = useState<OrganizationProfile>({
      name: '', address: '', licenseNumber: '', contactEmail: '', contactPhone: '', logoUrl: '', websiteUrl: '', adoptionUrl: ''
  });

  // Users State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ 
      role: UserRole.VOLUNTEER, 
      active: true, 
      permissions: { 
          dashboard: true, dailyLog: true, tasks: true, medical: false, movements: false, 
          safety: false, maintenance: true, settings: false, flightRecords: true, 
          feedingSchedule: false, attendance: true, attendanceManager: false, 
          holidayApprover: false, missingRecords: false, reports: false, rounds: false
      } 
  });

  // Signature Pad State
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Lists State
  const [listCategory, setListCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [newItem, setNewItem] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [newEvent, setNewEvent] = useState('');

  // Contacts State
  const [contactForm, setContactForm] = useState<Partial<Contact>>({});

  // Documents State
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [docForm, setDocForm] = useState<Partial<GlobalDocument>>({});
  const [docSearch, setDocSearch] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('ALL');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Diagnostics & Backup State
  const [diagnosticIssues, setDiagnosticIssues] = useState<DiagnosticIssue[]>([]);
  const [restorePoints, setRestorePoints] = useState<LocalBackupEntry[]>([]);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);

  // Stats for Storage
  const storageStats = useMemo(() => {
      const totalAnimals = animals.length;
      const totalLogs = animals.reduce((acc, a) => acc + (a.logs?.length || 0), 0);
      const totalTasks = tasks.length;
      const dbSizeEst = JSON.stringify(animals).length + JSON.stringify(tasks).length + JSON.stringify(users).length;
      const dbSizeMB = (dbSizeEst / (1024 * 1024)).toFixed(2);
      
      const orphanedTasks = tasks.filter(t => t.animalId && !animals.find(a => a.id === t.animalId)).length;
      
      return { totalAnimals, totalLogs, totalTasks, dbSizeMB, orphanedTasks };
  }, [animals, tasks, users]);

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

  useEffect(() => {
      if (activeTab === 'diagnostics') {
          // Run Diagnostics
          const issues = diagnosticsService.runDatabaseHealthCheck(animals, tasks, users);
          setDiagnosticIssues(issues);
          
          // Load Restore Points
          const loadBackups = async () => {
              const backups = await dataService.fetchLocalBackups();
              setRestorePoints(backups.sort((a, b) => b.timestamp - a.timestamp));
          };
          loadBackups();
      }
  }, [activeTab, animals, tasks, users]);

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

  // --- Signature Drawing Logic ---
  const getSignatureCoordinates = (event: any) => {
      if (!signatureCanvasRef.current) return { x: 0, y: 0 };
      const canvas = signatureCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      let clientX = event.clientX;
      let clientY = event.clientY;
      
      if (event.touches && event.touches.length > 0) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
      }
      
      return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
      };
  };

  const startSignatureDrawing = (e: any) => {
      setIsDrawing(true);
      const { x, y } = getSignatureCoordinates(e);
      const ctx = signatureCanvasRef.current?.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#000000';
      }
  };

  const drawSignature = (e: any) => {
      if (!isDrawing) return;
      if (e.type === 'touchmove') e.preventDefault();
      const { x, y } = getSignatureCoordinates(e);
      const ctx = signatureCanvasRef.current?.getContext('2d');
      if (ctx) {
          ctx.lineTo(x, y);
          ctx.stroke();
      }
  };

  const stopSignatureDrawing = () => {
      setIsDrawing(false);
      const ctx = signatureCanvasRef.current?.getContext('2d');
      if (ctx) ctx.closePath();
  };

  const clearSignature = () => {
      const canvas = signatureCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
  };

  const saveSignature = () => {
      const canvas = signatureCanvasRef.current;
      if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          if (editingUser) {
              setEditingUser({ ...editingUser, signature: dataUrl });
          } else {
              setNewUser({ ...newUser, signature: dataUrl });
          }
          setIsDrawingSignature(false);
      }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const resized = await resizeImage(file);
              if (editingUser) {
                  setEditingUser(prev => prev ? ({ ...prev, signature: resized }) : null);
              } else {
                  setNewUser(prev => ({ ...prev, signature: resized }));
              }
          } catch (err) {
              console.error("Signature upload failed", err);
          }
      }
  };

  // User Management
  const handleAddUserClick = () => {
      setEditingUser(null);
      setNewUser({ 
          role: UserRole.VOLUNTEER, 
          active: true, 
          permissions: { 
              dashboard: true, dailyLog: true, tasks: true, medical: false, movements: false, 
              safety: false, maintenance: true, settings: false, flightRecords: true, 
              feedingSchedule: false, attendance: true, attendanceManager: false, 
              holidayApprover: false, missingRecords: false, reports: false, rounds: true
          } 
      });
      setIsDrawingSignature(false);
      setIsUserModalOpen(true);
  };

  const handleEditUserClick = (u: User) => {
      setEditingUser(u);
      setIsDrawingSignature(false);
      setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
      if (editingUser) {
          const updatedUsers = users.map(u => u.id === editingUser.id ? editingUser : u);
          onUpdateUsers(updatedUsers);
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
              permissions: newUser.permissions as UserPermissions,
              signature: newUser.signature
          };
          onUpdateUsers([...users, user]);
      }
      setIsUserModalOpen(false);
  };

  const togglePermission = (key: keyof UserPermissions) => {
      if (editingUser) {
          const currentPermissions = editingUser.permissions || {} as UserPermissions;
          setEditingUser({
              ...editingUser,
              permissions: { ...currentPermissions, [key]: !currentPermissions[key] }
          });
      } else {
          const currentPermissions = newUser.permissions || {} as UserPermissions;
          setNewUser({
              ...newUser,
              permissions: { ...currentPermissions, [key]: !currentPermissions[key] }
          });
      }
  };

  const handleDeleteUser = (id: string) => {
      if (window.confirm('Delete user?')) {
          onUpdateUsers(users.filter(u => u.id !== id));
      }
  };

  // Contacts Management
  const handleSaveContact = () => {
      if (contactForm.name && contactForm.role && contactForm.phone) {
          const newContact: Contact = {
              id: `c_${Date.now()}`,
              name: contactForm.name,
              role: contactForm.role,
              phone: contactForm.phone,
              email: contactForm.email,
              address: contactForm.address,
              notes: contactForm.notes
          };
          onUpdateContacts([...contacts, newContact]);
          setContactForm({});
      }
  };

  const handleDeleteContact = (id: string) => {
      onUpdateContacts(contacts.filter(c => c.id !== id));
  };

  // Restore Points Management
  const handleCreateSnapshot = async () => {
      setIsProcessingBackup(true);
      try {
          const snap = await backupService.createLocalSnapshot();
          if (snap) {
              setRestorePoints(prev => [snap, ...prev]);
              alert("System snapshot created successfully.");
          } else {
              alert("Failed to create snapshot.");
          }
      } catch (e) { console.error(e); }
      setIsProcessingBackup(false);
  };

  const handleRestoreSnapshot = async (snap: LocalBackupEntry) => {
      if (window.confirm(`WARNING: Restore from ${new Date(snap.timestamp).toLocaleString()}? This will OVERWRITE current data.`)) {
          setIsProcessingBackup(true);
          const success = await backupService.restoreFromSnapshot(snap);
          if (success) {
              alert("System restored. The application will now reload.");
              window.location.reload();
          } else {
              alert("Restore failed. Data may be unchanged.");
          }
          setIsProcessingBackup(false);
      }
  };

  const handleDeleteSnapshot = async (id: string) => {
      if (window.confirm("Delete this restore point?")) {
          await dataService.deleteLocalBackup(id);
          setRestorePoints(prev => prev.filter(p => p.id !== id));
      }
  };

  // Maintenance Actions
  const handlePruneOrphans = () => {
      if (!onDeleteTask) return;
      const orphans = tasks.filter(t => t.animalId && !animals.find(a => a.id === t.animalId));
      if (orphans.length === 0) {
          alert("No orphaned tasks found.");
          return;
      }
      if (window.confirm(`Found ${orphans.length} tasks referencing missing animals. Delete them?`)) {
          orphans.forEach(t => onDeleteTask(t.id));
          alert("Orphans removed.");
      }
  };

  const handleTrimHistory = () => {
      if (window.confirm("This will remove all husbandry logs older than 6 years from all animals. Proceed?")) {
          const cutoff = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - 6);
          
          let count = 0;
          animals.forEach(animal => {
              const oldLogs = (animal.logs || []).filter(l => new Date(l.date) < cutoff);
              if (oldLogs.length > 0) {
                  count += oldLogs.length;
                  const keptLogs = (animal.logs || []).filter(l => new Date(l.date) >= cutoff);
                  onUpdateAnimal({ ...animal, logs: keptLogs });
              }
          });
          alert(`Maintenance Complete. Pruned ${count} old records.`);
      }
  };

  const inputClass = "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-400";

  return (
    <div className="flex h-full max-h-[calc(100vh-4rem)] overflow-hidden bg-white animate-in fade-in duration-500">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <SettingsIcon size={24} className="text-slate-600" /> Settings
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">System Configuration</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {[
                    { id: 'org', label: 'Organization', icon: Building2 },
                    { id: 'users', label: 'Access Control', icon: Users },
                    { id: 'directory', label: 'Directory', icon: Phone },
                    { id: 'lists', label: 'Operational Lists', icon: Utensils },
                    { id: 'documents', label: 'Documents', icon: FileText },
                    { id: 'diagnostics', label: 'System Health', icon: Activity },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                            activeTab === item.id 
                            ? 'bg-slate-900 text-white shadow-lg' 
                            : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                    >
                        <item.icon size={18} />
                        <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
                        {activeTab === item.id && <ChevronRight size={14} className="ml-auto text-emerald-400"/>}
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-auto p-8 bg-slate-100/50">
            
            {activeTab === 'org' && (
                <div className="max-w-3xl space-y-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight border-b border-slate-200 pb-2">Organization Profile</h3>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center relative group overflow-hidden">
                                {orgForm.logoUrl ? (
                                    <img src={orgForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Upload size={24} className="text-slate-400" />
                                )}
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <span className="text-[8px] font-black text-white uppercase">Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Institution Name</label>
                                <input type="text" value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})} className={inputClass} placeholder="e.g. Kent Owl Academy"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">License Number</label>
                                <input type="text" value={orgForm.licenseNumber} onChange={e => setOrgForm({...orgForm, licenseNumber: e.target.value})} className={inputClass}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Contact Phone</label>
                                <input type="text" value={orgForm.contactPhone} onChange={e => setOrgForm({...orgForm, contactPhone: e.target.value})} className={inputClass}/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Address</label>
                            <textarea rows={3} value={orgForm.address} onChange={e => setOrgForm({...orgForm, address: e.target.value})} className={`${inputClass} resize-none`}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Website URL</label>
                                <input type="text" value={orgForm.websiteUrl} onChange={e => setOrgForm({...orgForm, websiteUrl: e.target.value})} className={inputClass} placeholder="https://"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Adoption Page URL</label>
                                <input type="text" value={orgForm.adoptionUrl} onChange={e => setOrgForm({...orgForm, adoptionUrl: e.target.value})} className={inputClass} placeholder="For QR codes"/>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button onClick={handleOrgSave} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="max-w-5xl space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">User Registry</h3>
                        <button onClick={handleAddUserClick} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all">
                            <Plus size={14}/> Add User
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map(user => (
                            <div key={user.id} onClick={() => handleEditUserClick(user)} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-xs ${user.role === 'Admin' ? 'bg-slate-800' : 'bg-emerald-600'}`}>
                                        {user.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                                    </div>
                                    {user.active ? <CheckCircle2 size={16} className="text-emerald-500"/> : <X size={16} className="text-slate-300"/>}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-mono text-slate-400">PIN: ****</span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Edit Profile</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'lists' && (
                <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Operational Lists</h3>
                            <p className="text-slate-500 text-xs font-medium mt-1">Configure dropdown options for daily logs.</p>
                        </div>
                        <div className="flex gap-2">
                            {Object.values(AnimalCategory).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setListCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                        listCategory === cat 
                                        ? 'bg-slate-800 text-white border-slate-800' 
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Food Options */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Food Items ({listCategory})</h4>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Add item..." 
                                    value={newItem}
                                    onChange={e => setNewItem(e.target.value)}
                                    className={inputClass}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newItem) {
                                            const current = foodOptions[listCategory] || [];
                                            if (!current.includes(newItem)) {
                                                onUpdateFoodOptions({ ...foodOptions, [listCategory]: [...current, newItem] });
                                                setNewItem('');
                                            }
                                        }
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        if (newItem) {
                                            const current = foodOptions[listCategory] || [];
                                            if (!current.includes(newItem)) {
                                                onUpdateFoodOptions({ ...foodOptions, [listCategory]: [...current, newItem] });
                                                setNewItem('');
                                            }
                                        }
                                    }}
                                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"
                                >
                                    <Plus size={20}/>
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {(foodOptions[listCategory] || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-200 transition-colors">
                                        <span className="text-sm font-bold text-slate-700">{item}</span>
                                        <button 
                                            onClick={() => {
                                                const updated = foodOptions[listCategory].filter(i => i !== item);
                                                onUpdateFoodOptions({ ...foodOptions, [listCategory]: updated });
                                            }}
                                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Feed Methods */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Feeding Methods ({listCategory})</h4>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Add method..." 
                                    value={newMethod}
                                    onChange={e => setNewMethod(e.target.value)}
                                    className={inputClass}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newMethod) {
                                            const current = feedMethods[listCategory] || [];
                                            if (!current.includes(newMethod)) {
                                                onUpdateFeedMethods({ ...feedMethods, [listCategory]: [...current, newMethod] });
                                                setNewMethod('');
                                            }
                                        }
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        if (newMethod) {
                                            const current = feedMethods[listCategory] || [];
                                            if (!current.includes(newMethod)) {
                                                onUpdateFeedMethods({ ...feedMethods, [listCategory]: [...current, newMethod] });
                                                setNewMethod('');
                                            }
                                        }
                                    }}
                                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"
                                >
                                    <Plus size={20}/>
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {(feedMethods[listCategory] || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-200 transition-colors">
                                        <span className="text-sm font-bold text-slate-700">{item}</span>
                                        <button 
                                            onClick={() => {
                                                const updated = feedMethods[listCategory].filter(i => i !== item);
                                                onUpdateFeedMethods({ ...feedMethods, [listCategory]: updated });
                                            }}
                                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Event Types - New Section */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Ticket size={14}/> Event Types (Education & Displays)
                            </h4>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="Add event type (e.g. School Visit, Flying Display)..." 
                                    value={newEvent}
                                    onChange={e => setNewEvent(e.target.value)}
                                    className={inputClass}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newEvent) {
                                            if (!eventTypes.includes(newEvent) && onUpdateEventTypes) {
                                                onUpdateEventTypes([...eventTypes, newEvent]);
                                                setNewEvent('');
                                            }
                                        }
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        if (newEvent && onUpdateEventTypes) {
                                            if (!eventTypes.includes(newEvent)) {
                                                onUpdateEventTypes([...eventTypes, newEvent]);
                                                setNewEvent('');
                                            }
                                        }
                                    }}
                                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 px-6"
                                    disabled={!onUpdateEventTypes}
                                >
                                    <Plus size={20}/>
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {eventTypes.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-200 transition-colors">
                                        <span className="text-sm font-bold text-slate-700">{item}</span>
                                        <button 
                                            onClick={() => {
                                                if (onUpdateEventTypes) {
                                                    const updated = eventTypes.filter(i => i !== item);
                                                    onUpdateEventTypes(updated);
                                                }
                                            }}
                                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="max-w-5xl space-y-6 animate-in slide-in-from-right-4 duration-300">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Digital Filing Cabinet</h3>
                            <p className="text-slate-500 text-xs font-medium mt-1">Central repository for licenses, insurance, and protocols.</p>
                        </div>
                        <button 
                            onClick={() => setIsUploadOpen(!isUploadOpen)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isUploadOpen ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white shadow-lg hover:bg-black'}`}
                        >
                            {isUploadOpen ? <X size={14}/> : <Plus size={14}/>}
                            {isUploadOpen ? 'Cancel Upload' : 'Upload New'}
                        </button>
                     </div>

                     {/* Upload Area */}
                     {isUploadOpen && (
                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">New Document Entry</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <input type="text" placeholder="Document Title" value={docForm.name || ''} onChange={e => setDocForm({...docForm, name: e.target.value})} className={inputClass} />
                                <select value={docForm.category} onChange={e => setDocForm({...docForm, category: e.target.value as any})} className={inputClass}>
                                    <option value="">Category...</option>
                                    <option value="Licensing">Licensing</option>
                                    <option value="Insurance">Insurance</option>
                                    <option value="Protocol">Protocol</option>
                                    <option value="Safety">Safety</option>
                                </select>
                                <input type="date" value={docForm.expiryDate || ''} onChange={e => setDocForm({...docForm, expiryDate: e.target.value})} className={inputClass} title="Expiry Date" />
                                <label className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg cursor-pointer transition-all h-full">
                                    <Upload size={16}/> {docForm.url ? 'File Selected' : 'Choose File'}
                                    <input type="file" className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if(file) {
                                            const url = await resizeImage(file); 
                                            setDocForm({...docForm, url: url});
                                        }
                                    }}/>
                                </label>
                            </div>
                            <button 
                                onClick={async () => {
                                    if(docForm.name && docForm.category && docForm.url) {
                                        const newDoc: GlobalDocument = {
                                            id: `doc_${Date.now()}`,
                                            name: docForm.name,
                                            category: docForm.category,
                                            url: docForm.url,
                                            uploadDate: new Date().toISOString(),
                                            expiryDate: docForm.expiryDate
                                        };
                                        await dataService.saveGlobalDocument(newDoc);
                                        setDocuments([...documents, newDoc]);
                                        setDocForm({});
                                        setIsUploadOpen(false);
                                    }
                                }}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                            >
                                Commit to Cabinet
                            </button>
                        </div>
                     )}

                     {/* Filter Bar */}
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['ALL', 'Licensing', 'Insurance', 'Protocol', 'Safety'].map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setDocCategoryFilter(cat)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                                    docCategoryFilter === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                        <div className="ml-auto relative w-full md:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            <input 
                                type="text" 
                                placeholder="Search records..." 
                                value={docSearch}
                                onChange={(e) => setDocSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition-all"
                            />
                        </div>
                     </div>

                     {/* Document List */}
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {documents.filter(doc => {
                                const matchCat = docCategoryFilter === 'ALL' || doc.category === docCategoryFilter;
                                const matchSearch = doc.name.toLowerCase().includes(docSearch.toLowerCase());
                                return matchCat && matchSearch;
                            })
                            .sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
                            .map(doc => {
                                const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null;
                                const now = new Date();
                                const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                
                                let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                let statusText = 'Valid';
                                
                                if (expiry) {
                                    if (daysUntilExpiry! < 0) {
                                        statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
                                        statusText = 'Expired';
                                    } else if (daysUntilExpiry! < 30) {
                                        statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                                        statusText = 'Expiring Soon';
                                    }
                                }

                                return (
                                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200">
                                                {doc.url.startsWith('data:image') ? <FileImage size={20}/> : <FileText size={20}/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{doc.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{doc.category}</span>
                                                    {doc.expiryDate && (
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${statusColor}`}>
                                                            {statusText} ({new Date(doc.expiryDate).toLocaleDateString()})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a 
                                                href={doc.url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all"
                                                title="View Document"
                                            >
                                                <LinkIcon size={16}/>
                                            </a>
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm('Permanently delete this document?')) {
                                                        await dataService.deleteGlobalDocument(doc.id);
                                                        setDocuments(documents.filter(d => d.id !== doc.id));
                                                    }
                                                }}
                                                className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {documents.length === 0 && (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                    <Archive size={48} className="opacity-20 mb-2"/>
                                    <p className="text-xs font-black uppercase tracking-widest">Cabinet Empty</p>
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            )}

            {/* ... Other tabs ... */}
        </div>
        {/* ... Modals ... */}
    </div>
  );
};

export default Settings;
