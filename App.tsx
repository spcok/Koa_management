
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Incident, FirstAidLogEntry, OrganizationProfile, Contact, SortOption, TimeLogEntry, UserPermissions, HolidayRequest } from './types.ts';
import { dataService } from './services/dataService.ts';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import DailyLog from './components/DailyLog.tsx';
import Tasks from './components/Tasks.tsx';
import FlightRecords from './components/FlightRecords.tsx';
import Schedule from './components/Schedule.tsx';
import WeatherView from './components/WeatherView.tsx';
import Movements from './components/Movements.tsx';
import SafetyDrills from './components/SafetyDrills.tsx';
import Incidents from './components/Incidents.tsx';
import FirstAid from './components/FirstAid.tsx';
import Health from './components/Health.tsx';
import SiteMaintenance from './components/SiteMaintenance.tsx';
import MissingRecords from './components/MissingRecords.tsx';
import Settings from './components/Settings.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import AnimalProfile from './components/AnimalProfile.tsx';
import TimeSheets from './components/TimeSheets.tsx';
import HelpCenter from './components/HelpCenter.tsx';
import Reports from './components/Reports.tsx';
import HolidayRegistry from './components/HolidayRegistry.tsx';
import DiagnosticOverlay from './components/DiagnosticOverlay.tsx'; // IMPORTED
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS } from './constants.ts';
import { batchGetSpeciesData } from './services/geminiService.ts';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [view, setView] = useState<string>('dashboard');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [siteLogs, setSiteLogs] = useState<SiteLogEntry[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLogEntry[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [holidayRequests, setHolidayRequests] = useState<HolidayRequest[]>([]);
  const [foodOptions, setFoodOptions] = useState<Record<AnimalCategory, string[]>>(DEFAULT_FOOD_OPTIONS);
  const [feedMethods, setFeedMethods] = useState<Record<AnimalCategory, string[]>>(DEFAULT_FEED_METHODS);
  const [locations, setLocations] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);
  
  const [sortOption, setSortOption] = useState<SortOption>('alpha-asc');
  const [isOrderLocked, setIsOrderLocked] = useState(true);
  const [activeCategory, setActiveCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isOffline, setIsOffline] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [activeShift, setActiveShift] = useState<TimeLogEntry | null>(null);

  // Recovery logic for Start Shift button
  useEffect(() => {
    if (currentUser && timeLogs.length > 0) {
      const active = timeLogs.find(l => l.userId === currentUser.id && l.status === 'Active');
      if (active) {
        setActiveShift(active);
      } else {
        setActiveShift(null);
      }
    }
  }, [currentUser, timeLogs]);

  const performAutoSync = useCallback(async (currentAnimals: Animal[]) => {
    if (currentAnimals.length === 0) return;
    const lastSyncStr = await dataService.fetchSettingsKey('last_iucn_sync', null);
    const lastSync = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    if (Date.now() - lastSync > thirtyDaysMs) {
      const updates: Record<string, Partial<Animal>> = {};
      let hasUpdates = false;
      const CHUNK_SIZE = 10;

      for (let i = 0; i < currentAnimals.length; i += CHUNK_SIZE) {
        const chunk = currentAnimals.slice(i, i + CHUNK_SIZE);
        const speciesList = chunk.map(a => a.species);
        try {
            const results = await batchGetSpeciesData(speciesList);
            for (const animal of chunk) {
                const data = results[animal.species];
                if (data) { 
                    if (animal.latinName !== data.latin || animal.redListStatus !== data.status) {
                        updates[animal.id] = { 
                            latinName: data.latin || animal.latinName, 
                            redListStatus: data.status || animal.redListStatus 
                        };
                        hasUpdates = true;
                    }
                }
            }
        } catch (e) {
            console.error("Auto-sync chunk error", e);
        }
        if (i + CHUNK_SIZE < currentAnimals.length) { await new Promise(r => setTimeout(r, 5000)); }
      }

      if (hasUpdates) {
          setAnimals(prev => {
              const next = prev.map(a => updates[a.id] ? { ...a, ...updates[a.id] } : a);
              setTimeout(() => dataService.saveAnimalsBulk(next).catch(console.error), 0);
              return next;
          });
      }
      
      await dataService.saveSettingsKey('last_iucn_sync', new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedAnimals, fetchedTasks, fetchedUsers, fetchedSiteLogs, fetchedIncidents, fetchedFirstAid, fetchedFood, fetchedMethods, fetchedLocs, fetchedContacts, fetchedProfile, fetchedTimeLogs, fetchedHolidays, savedSort, savedLocked] = await Promise.all([
          dataService.fetchAnimals(), dataService.fetchTasks(), dataService.fetchUsers(), dataService.fetchSiteLogs(), dataService.fetchIncidents(), dataService.fetchFirstAidLogs(), dataService.fetchFoodOptions(), dataService.fetchFeedMethods(), dataService.fetchLocations(), dataService.fetchContacts(), dataService.fetchOrgProfile(), dataService.fetchTimeLogs(), dataService.fetchHolidayRequests(),
          dataService.fetchSettingsKey('dashboard_sort', 'alpha-asc'),
          dataService.fetchSettingsKey('dashboard_locked', true)
        ]);
        setAnimals(fetchedAnimals); setTasks(fetchedTasks); setUsers(fetchedUsers); setSiteLogs(fetchedSiteLogs); setIncidents(fetchedIncidents); setFirstAidLogs(fetchedFirstAid); setTimeLogs(fetchedTimeLogs); setHolidayRequests(fetchedHolidays);
        setSortOption(savedSort as SortOption);
        setIsOrderLocked(!!savedLocked);
        if (fetchedFood) setFoodOptions(fetchedFood);
        if (fetchedMethods) setFeedMethods(fetchedMethods);
        if (fetchedLocs) setLocations(fetchedLocs);
        if (fetchedContacts) setContacts(fetchedContacts);
        if (fetchedProfile) setOrgProfile(fetchedProfile);
        performAutoSync(fetchedAnimals);
      } catch (error) { 
        setIsOffline(true); 
      } finally {
        setIsInitializing(false);
      }
    };
    fetchData();
  }, [performAutoSync]);

  const handleLogin = useCallback((user: User) => { setCurrentUser(user); setView('dashboard'); }, []);
  const handleLogout = useCallback(() => { setCurrentUser(null); setActiveShift(null); setView('dashboard'); }, []);
  const selectAnimalAndNavigate = useCallback((animal: Animal) => { setSelectedAnimal(animal); setView('animal_profile'); }, []);
  
  const handleUpdateSortOption = useCallback((option: SortOption) => {
    setSortOption(option);
    dataService.saveSettingsKey('dashboard_sort', option);
  }, []);

  const handleToggleLock = useCallback((locked: boolean) => {
    setIsOrderLocked(locked);
    dataService.saveSettingsKey('dashboard_locked', locked);
  }, []);

  const handleUpdateAnimal = useCallback(async (animal: Animal) => { 
    setAnimals(prev => prev.map(a => a.id === animal.id ? animal : a)); 
    if (selectedAnimal?.id === animal.id) setSelectedAnimal(animal); 
    try { await dataService.saveAnimal(animal); } catch (e) { console.error(e); } 
  }, [selectedAnimal?.id]);

  const handleAddAnimal = useCallback(async (animal: Animal) => { setAnimals(prev => [...prev, animal]); try { await dataService.saveAnimal(animal); } catch (e) { console.error(e); } }, []);
  const handleDeleteAnimal = useCallback(async () => { if (selectedAnimal) { const id = selectedAnimal.id; setAnimals(prev => prev.filter(a => a.id !== id)); setView('dashboard'); setSelectedAnimal(null); try { await dataService.deleteAnimal(id); } catch (e) { console.error(e); } } }, [selectedAnimal]);
  const handleAddTask = useCallback(async (task: Task) => { setTasks(prev => [...prev, task]); await dataService.saveTasks([task]); }, []);
  const handleUpdateTask = useCallback(async (task: Task) => { setTasks(prev => prev.map(t => t.id === task.id ? task : t)); await dataService.saveTasks([task]); }, []);
  const handleDeleteTask = useCallback(async (id: string) => { setTasks(prev => prev.filter(t => t.id !== id)); await dataService.deleteTask(id); }, []);
  const handleAddSiteLog = useCallback(async (log: SiteLogEntry) => { setSiteLogs(prev => [...prev, log]); await dataService.saveSiteLog(log); }, []);
  const handleDeleteSiteLog = useCallback(async (id: string) => { setSiteLogs(prev => prev.filter(l => l.id !== id)); await dataService.deleteSiteLog(id); }, []);
  const handleAddIncident = useCallback(async (incident: Incident) => { setIncidents(prev => [...prev, incident]); await dataService.saveIncident(incident); }, []);
  const handleUpdateIncident = useCallback(async (incident: Incident) => { setIncidents(prev => prev.map(i => i.id === incident.id ? incident : i)); await dataService.saveIncident(incident); }, []);
  const handleDeleteIncident = useCallback(async (id: string) => { setIncidents(prev => prev.filter(i => i.id !== id)); await dataService.deleteIncident(id); }, []);
  const handleAddFirstAid = useCallback(async (log: FirstAidLogEntry) => { setFirstAidLogs(prev => [...prev, log]); await dataService.saveFirstAidLog(log); }, []);
  const handleDeleteFirstAid = useCallback(async (id: string) => { setFirstAidLogs(prev => prev.filter(l => l.id !== id)); await dataService.deleteFirstAidLog(id); }, []);
  const handleUpdateUsers = useCallback(async (updatedUsers: User[]) => { setUsers(updatedUsers); await dataService.saveUsers(updatedUsers); }, []);
  const handleImport = useCallback(async (importedAnimals: Animal[]) => { setAnimals(importedAnimals); await dataService.importAnimals(importedAnimals); }, []);
  const handleReorderAnimals = useCallback((reorderedSubset: Animal[]) => { const updated = reorderedSubset.map((a, idx) => ({ ...a, order: idx })); setAnimals(prev => { const map = new Map(updated.map(a => [a.id, a])); return prev.map(a => map.has(a.id) ? map.get(a.id)! : a); }); dataService.saveAnimalsBulk(updated); }, []);
  const handleUpdateFoodOptions = useCallback(async (options: Record<AnimalCategory, string[]>) => { setFoodOptions(options); await dataService.saveFoodOptions(options); }, []);
  const handleUpdateFeedMethods = useCallback(async (methods: Record<AnimalCategory, string[]>) => { setFeedMethods(methods); await dataService.saveFeedMethods(methods); }, []);
  const handleUpdateLocations = useCallback(async (locs: string[]) => { setLocations(locs); await dataService.saveLocations(locs); }, []);
  const handleUpdateContacts = useCallback(async (cons: Contact[]) => { setContacts(cons); await dataService.saveContacts(cons); }, []);
  const handleUpdateOrgProfile = useCallback(async (profile: OrganizationProfile) => { setOrgProfile(profile); await dataService.saveOrgProfile(profile); }, []);
  
  const handleClockIn = useCallback(async () => { 
    if (!currentUser || activeShift) return; 
    const newShift: TimeLogEntry = { id: `shift_${Date.now()}`, userId: currentUser.id, userName: currentUser.name, startTime: Date.now(), date: new Date().toISOString().split('T')[0], status: 'Active' }; 
    setActiveShift(newShift); 
    setTimeLogs(prev => [newShift, ...prev]); 
    try {
        await dataService.saveTimeLog(newShift); 
    } catch (e) {
        // Rollback state if network fails
        console.error("Clock In Failed", e);
        setActiveShift(null);
        setTimeLogs(prev => prev.filter(l => l.id !== newShift.id));
        alert("Failed to clock in. Please check your connection and try again.");
    }
  }, [currentUser, activeShift]);

  const handleClockOut = useCallback(async () => { 
    if (!currentUser || !activeShift) return; 
    const now = Date.now(); 
    const diffMins = Math.floor((now - activeShift.startTime) / 60000); 
    const completedShift: TimeLogEntry = { ...activeShift, endTime: now, durationMinutes: diffMins, status: 'Completed' }; 
    
    // Optimistic Update
    setActiveShift(null); 
    setTimeLogs(prev => prev.map(l => l.id === activeShift.id ? completedShift : l)); 
    
    try {
        await dataService.saveTimeLog(completedShift); 
    } catch (e) {
        // Rollback
        console.error("Clock Out Failed", e);
        setActiveShift(activeShift);
        setTimeLogs(prev => prev.map(l => l.id === activeShift.id ? activeShift : l));
        alert("Failed to clock out. Please check your connection and try again.");
    }
  }, [currentUser, activeShift]);

  const handleDeleteTimeLog = useCallback(async (id: string) => { setTimeLogs(prev => prev.filter(l => l.id !== id)); await dataService.deleteTimeLog(id); }, []);

  const handleAddHoliday = useCallback(async (req: HolidayRequest) => { setHolidayRequests(prev => [req, ...prev]); await dataService.saveHolidayRequest(req); }, []);
  const handleUpdateHoliday = useCallback(async (req: HolidayRequest) => { setHolidayRequests(prev => prev.map(r => r.id === req.id ? req : r)); await dataService.saveHolidayRequest(req); }, []);
  const handleDeleteHoliday = useCallback(async (id: string) => { setHolidayRequests(prev => prev.filter(r => r.id !== id)); await dataService.deleteHolidayRequest(id); }, []);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
          <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Initializing Secure Environment...</p>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen users={users} onLogin={handleLogin} orgProfile={orgProfile} />;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  // Memoize permissions
  const p: UserPermissions = { 
    dashboard: true, dailyLog: true, tasks: true, medical: isAdmin, movements: isAdmin, 
    safety: isAdmin, maintenance: true, settings: isAdmin, flightRecords: true, 
    feedingSchedule: isAdmin, attendance: isAdmin, attendanceManager: isAdmin, 
    holidayApprover: isAdmin, missingRecords: isAdmin, reports: isAdmin, 
    ...(currentUser.permissions || {}) 
  };

  return (
    <div style={{ fontSize: `${fontScale}%` }}>
      <Layout activeView={view} onNavigate={setView} currentUser={currentUser} onLogout={handleLogout} isOffline={isOffline} fontScale={fontScale} setFontScale={setFontScale} activeShift={activeShift} onClockIn={handleClockIn} onClockOut={handleClockOut} orgProfile={orgProfile}>
        {view === 'dashboard' && p.dashboard && <Dashboard animals={animals} userRole={currentUser.role} onSelectAnimal={selectAnimalAndNavigate} onAddAnimal={handleAddAnimal} onUpdateAnimal={handleUpdateAnimal} onReorderAnimals={handleReorderAnimals} foodOptions={foodOptions} feedMethods={feedMethods} locations={locations} sortOption={sortOption} setSortOption={handleUpdateSortOption} isOrderLocked={isOrderLocked} onToggleLock={handleToggleLock} tasks={tasks} onUpdateTask={handleUpdateTask} activeTab={activeCategory} setActiveTab={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'timesheets' && p.attendance && <TimeSheets timeLogs={timeLogs} currentUser={currentUser} users={users} onDeleteLog={handleDeleteTimeLog} />}
        {view === 'holidays' && <HolidayRegistry requests={holidayRequests} currentUser={currentUser} onAddRequest={handleAddHoliday} onUpdateRequest={handleUpdateHoliday} onDeleteRequest={handleDeleteHoliday} />}
        {view === 'animal_profile' && selectedAnimal && <AnimalProfile animal={selectedAnimal} onBack={() => setView('dashboard')} onUpdateAnimal={handleUpdateAnimal} onDeleteAnimal={handleDeleteAnimal} foodOptions={foodOptions} feedMethods={feedMethods} orgProfile={orgProfile} locations={locations} isAdmin={p.settings} />}
        {view === 'daily' && p.dailyLog && <DailyLog animals={animals} onUpdateAnimal={handleUpdateAnimal} foodOptions={foodOptions} feedMethods={feedMethods} sortOption={sortOption} setSortOption={handleUpdateSortOption} currentUser={currentUser} activeCategory={activeCategory} setActiveCategory={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'tasks' && p.tasks && <Tasks tasks={tasks} animals={animals} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} users={users} currentUser={currentUser} onAddSiteLog={handleAddSiteLog} onUpdateAnimal={handleUpdateAnimal} />}
        {view === 'flight_records' && p.flightRecords && <FlightRecords animals={animals} />}
        {view === 'schedule' && p.feedingSchedule && <Schedule animals={animals} tasks={tasks} foodOptions={foodOptions} onAddTasks={async (newTasks) => { setTasks(prev => [...prev, ...newTasks]); await dataService.saveTasks(newTasks); }} onDeleteTask={handleDeleteTask} />}
        {view === 'weather' && <WeatherView />}
        {view === 'health' && p.medical && <Health animals={animals} onSelectAnimal={selectAnimalAndNavigate} onUpdateAnimal={handleUpdateAnimal} tasks={tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} users={users} currentUser={currentUser} orgProfile={orgProfile} />}
        {view === 'movements' && p.movements && <Movements animals={animals} onUpdateAnimal={handleUpdateAnimal} currentUser={currentUser} />}
        {view === 'drills' && p.safety && <SafetyDrills logs={siteLogs} timeLogs={timeLogs} users={users} onAddLog={handleAddSiteLog} onDeleteLog={handleDeleteTimeLog} currentUser={currentUser} />}
        {view === 'incidents' && p.safety && <Incidents incidents={incidents} animals={animals} currentUser={currentUser} onAddIncident={handleAddIncident} onUpdateIncident={handleUpdateIncident} onDeleteIncident={handleDeleteIncident} />}
        {view === 'first_aid' && (currentUser.role === UserRole.ADMIN || p.safety) && <FirstAid logs={firstAidLogs} currentUser={currentUser} onAddLog={handleAddFirstAid} onDeleteLog={handleDeleteFirstAid} />}
        {view === 'maintenance' && p.maintenance && <SiteMaintenance logs={siteLogs} currentUser={currentUser} onAddLog={handleAddSiteLog} onDeleteLog={handleDeleteTimeLog} />}
        {view === 'missing_records' && p.missingRecords && <MissingRecords animals={animals} />}
        {view === 'reports' && p.reports && <Reports animals={animals} users={users} orgProfile={orgProfile} currentUser={currentUser} incidents={incidents} siteLogs={siteLogs} timeLogs={timeLogs} />}
        {view === 'settings' && p.settings && <Settings animals={animals} onImport={handleImport} foodOptions={foodOptions} onUpdateFoodOptions={handleUpdateFoodOptions} feedMethods={feedMethods} onUpdateFeedMethods={handleUpdateFeedMethods} users={users} onUpdateUsers={handleUpdateUsers} locations={locations} onUpdateLocations={handleUpdateLocations} contacts={contacts} onUpdateContacts={handleUpdateContacts} orgProfile={orgProfile} onUpdateOrgProfile={handleUpdateOrgProfile} onUpdateAnimal={handleUpdateAnimal} />}
        {view === 'help' && <HelpCenter currentUser={currentUser} />}
      </Layout>
      {(currentUser.role === UserRole.ADMIN || currentUser.permissions?.settings) && (
          <DiagnosticOverlay animals={animals} users={users} />
      )}
    </div>
  );
};
export default App;
