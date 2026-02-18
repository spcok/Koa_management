
import React, { useState, useEffect, useCallback } from 'react';
import { Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Incident, FirstAidLogEntry, OrganizationProfile, Contact, SortOption, TimeLogEntry, UserPermissions } from './types.ts';
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
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS } from './constants.ts';
import { batchGetSpeciesData } from './services/geminiService.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<string>('dashboard');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [siteLogs, setSiteLogs] = useState<SiteLogEntry[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLogEntry[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
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

  const performAutoSync = useCallback(async (currentAnimals: Animal[]) => {
    if (currentAnimals.length === 0) return;
    const lastSyncStr = await dataService.fetchSettingsKey('last_iucn_sync', null);
    const lastSync = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - lastSync > thirtyDaysMs) {
      const updated = [...currentAnimals];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < updated.length; i += CHUNK_SIZE) {
        const chunk = updated.slice(i, i + CHUNK_SIZE);
        const speciesList = chunk.map(a => a.species);
        try {
            const results = await batchGetSpeciesData(speciesList);
            for (let j = 0; j < chunk.length; j++) {
                const idx = i + j;
                const data = results[updated[idx].species];
                if (data) { 
                    updated[idx] = { 
                        ...updated[idx], 
                        latinName: data.latin || updated[idx].latinName, 
                        redListStatus: data.status || updated[idx].redListStatus 
                    }; 
                }
            }
        } catch (e) {}
        if (i + CHUNK_SIZE < updated.length) { await new Promise(r => setTimeout(r, 5000)); }
      }
      await dataService.saveAnimalsBulk(updated);
      await dataService.saveSettingsKey('last_iucn_sync', new Date().toISOString());
      setAnimals(updated);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedAnimals, fetchedTasks, fetchedUsers, fetchedSiteLogs, fetchedIncidents, fetchedFirstAid, fetchedFood, fetchedMethods, fetchedLocs, fetchedContacts, fetchedProfile, fetchedTimeLogs, savedSort, savedLocked] = await Promise.all([
          dataService.fetchAnimals(), dataService.fetchTasks(), dataService.fetchUsers(), dataService.fetchSiteLogs(), dataService.fetchIncidents(), dataService.fetchFirstAidLogs(), dataService.fetchFoodOptions(), dataService.fetchFeedMethods(), dataService.fetchLocations(), dataService.fetchContacts(), dataService.fetchOrgProfile(), dataService.fetchTimeLogs(),
          dataService.fetchSettingsKey('dashboard_sort', 'alpha-asc'),
          dataService.fetchSettingsKey('dashboard_locked', true)
        ]);
        setAnimals(fetchedAnimals); setTasks(fetchedTasks); setUsers(fetchedUsers); setSiteLogs(fetchedSiteLogs); setIncidents(fetchedIncidents); setFirstAidLogs(fetchedFirstAid); setTimeLogs(fetchedTimeLogs);
        setSortOption(savedSort as SortOption);
        setIsOrderLocked(!!savedLocked);
        if (fetchedFood) setFoodOptions(fetchedFood);
        if (fetchedMethods) setFeedMethods(fetchedMethods);
        if (fetchedLocs) setLocations(fetchedLocs);
        if (fetchedContacts) setContacts(fetchedContacts);
        if (fetchedProfile) setOrgProfile(fetchedProfile);
        performAutoSync(fetchedAnimals);
      } catch (error) { setIsOffline(true); }
    };
    fetchData();
  }, [performAutoSync]);

  const handleLogin = (user: User) => { setCurrentUser(user); setView('dashboard'); };
  const handleLogout = () => { setCurrentUser(null); setActiveShift(null); setView('dashboard'); };
  const selectAnimalAndNavigate = (animal: Animal) => { setSelectedAnimal(animal); setView('animal_profile'); };
  
  const handleUpdateSortOption = (option: SortOption) => {
    setSortOption(option);
    dataService.saveSettingsKey('dashboard_sort', option);
  };

  const handleToggleLock = (locked: boolean) => {
    setIsOrderLocked(locked);
    dataService.saveSettingsKey('dashboard_locked', locked);
  };

  const handleUpdateAnimal = async (animal: Animal) => { setAnimals(prev => prev.map(a => a.id === animal.id ? animal : a)); if (selectedAnimal && selectedAnimal.id === animal.id) setSelectedAnimal(animal); try { await dataService.saveAnimal(animal); } catch (e) { console.error(e); } };
  const handleAddAnimal = async (animal: Animal) => { setAnimals(prev => [...prev, animal]); try { await dataService.saveAnimal(animal); } catch (e) { console.error(e); } };
  const handleDeleteAnimal = async () => { if (selectedAnimal) { const id = selectedAnimal.id; setAnimals(prev => prev.filter(a => a.id !== id)); setView('dashboard'); setSelectedAnimal(null); try { await dataService.deleteAnimal(id); } catch (e) { console.error(e); } } };
  const handleAddTask = async (task: Task) => { setTasks(prev => [...prev, task]); await dataService.saveTasks([task]); };
  const handleUpdateTask = async (task: Task) => { setTasks(prev => prev.map(t => t.id === task.id ? task : t)); await dataService.saveTasks([task]); };
  const handleDeleteTask = async (id: string) => { setTasks(prev => prev.filter(t => t.id !== id)); await dataService.deleteTask(id); };
  const handleAddSiteLog = async (log: SiteLogEntry) => { setSiteLogs(prev => [...prev, log]); await dataService.saveSiteLog(log); };
  const handleDeleteSiteLog = async (id: string) => { setSiteLogs(prev => prev.filter(l => l.id !== id)); await dataService.deleteSiteLog(id); };
  const handleAddIncident = async (incident: Incident) => { setIncidents(prev => [...prev, incident]); await dataService.saveIncident(incident); };
  const handleUpdateIncident = async (incident: Incident) => { setIncidents(prev => prev.map(i => i.id === incident.id ? incident : i)); await dataService.saveIncident(incident); };
  const handleDeleteIncident = async (id: string) => { setIncidents(prev => prev.filter(i => i.id !== id)); await dataService.deleteIncident(id); };
  const handleAddFirstAid = async (log: FirstAidLogEntry) => { setFirstAidLogs(prev => [...prev, log]); await dataService.saveFirstAidLog(log); };
  const handleDeleteFirstAid = async (id: string) => { setFirstAidLogs(prev => prev.filter(l => l.id !== id)); await dataService.deleteFirstAidLog(id); };
  const handleUpdateUsers = async (updatedUsers: User[]) => { setUsers(updatedUsers); await dataService.saveUsers(updatedUsers); };
  const handleImport = async (importedAnimals: Animal[]) => { setAnimals(importedAnimals); await dataService.importAnimals(importedAnimals); };
  const handleReorderAnimals = (reorderedSubset: Animal[]) => { const updated = reorderedSubset.map((a, idx) => ({ ...a, order: idx })); setAnimals(prev => { const map = new Map(updated.map(a => [a.id, a])); return prev.map(a => map.has(a.id) ? map.get(a.id)! : a); }); dataService.saveAnimalsBulk(updated); };
  const handleUpdateFoodOptions = async (options: Record<AnimalCategory, string[]>) => { setFoodOptions(options); await dataService.saveFoodOptions(options); };
  const handleUpdateFeedMethods = async (methods: Record<AnimalCategory, string[]>) => { setFeedMethods(methods); await dataService.saveFeedMethods(methods); };
  const handleUpdateLocations = async (locs: string[]) => { setLocations(locs); await dataService.saveLocations(locs); };
  const handleUpdateContacts = async (cons: Contact[]) => { setContacts(cons); await dataService.saveContacts(cons); };
  const handleUpdateOrgProfile = async (profile: OrganizationProfile) => { setOrgProfile(profile); await dataService.saveOrgProfile(profile); };
  const handleClockIn = async () => { if (!currentUser || activeShift) return; const newShift: TimeLogEntry = { id: `shift_${Date.now()}`, userId: currentUser.id, userName: currentUser.name, startTime: Date.now(), date: new Date().toISOString().split('T')[0], status: 'Active' }; setActiveShift(newShift); setTimeLogs(prev => [newShift, ...prev]); await dataService.saveTimeLog(newShift); };
  const handleClockOut = async () => { if (!currentUser || !activeShift) return; const now = Date.now(); const diffMins = Math.floor((now - activeShift.startTime) / 60000); const completedShift: TimeLogEntry = { ...activeShift, endTime: now, durationMinutes: diffMins, status: 'Completed' }; setActiveShift(null); setTimeLogs(prev => prev.map(l => l.id === activeShift.id ? completedShift : l)); await dataService.saveTimeLog(completedShift); };
  const handleDeleteTimeLog = async (id: string) => { setTimeLogs(prev => prev.filter(l => l.id !== id)); await dataService.deleteTimeLog(id); };

  // FIX: LoginScreen now uses context, so no props are needed.
  if (!currentUser) return <LoginScreen />;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const p: UserPermissions = { dashboard: true, dailyLog: true, tasks: true, medical: isAdmin, movements: isAdmin, safety: isAdmin, maintenance: true, settings: isAdmin, flightRecords: true, feedingSchedule: isAdmin, attendance: isAdmin, attendanceManager: isAdmin, missingRecords: isAdmin, reports: isAdmin, ...(currentUser.permissions || {}) };

  return (
    <div style={{ fontSize: `${fontScale}%` }}>
      {/* FIX: Removed props from components that now use context. This fixes TypeScript errors, but the components will only work if this App component is wrapped in an AppProvider. */}
      <Layout activeView={view} onNavigate={setView} currentUser={currentUser} onLogout={handleLogout} isOffline={isOffline} fontScale={fontScale} setFontScale={setFontScale} activeShift={activeShift} onClockIn={handleClockIn} onClockOut={handleClockOut} orgProfile={orgProfile}>
        {view === 'dashboard' && p.dashboard && <Dashboard onSelectAnimal={selectAnimalAndNavigate} activeTab={activeCategory} setActiveTab={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'timesheets' && p.attendance && <TimeSheets />}
        {view === 'animal_profile' && selectedAnimal && <AnimalProfile animal={selectedAnimal} onBack={() => setView('dashboard')} />}
        {view === 'daily' && p.dailyLog && <DailyLog activeCategory={activeCategory} setActiveCategory={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'tasks' && p.tasks && <Tasks />}
        {view === 'flight_records' && p.flightRecords && <FlightRecords />}
        {view === 'schedule' && p.feedingSchedule && <Schedule />}
        {view === 'weather' && <WeatherView />}
        {view === 'health' && p.medical && <Health onSelectAnimal={selectAnimalAndNavigate} />}
        {view === 'movements' && p.movements && <Movements />}
        {view === 'drills' && p.safety && <SafetyDrills />}
        {view === 'incidents' && p.safety && <Incidents />}
        {view === 'first_aid' && (currentUser.role === UserRole.ADMIN || p.safety) && <FirstAid />}
        {view === 'maintenance' && p.maintenance && <SiteMaintenance />}
        {view === 'missing_records' && p.missingRecords && <MissingRecords />}
        {view === 'reports' && p.reports && <Reports />}
        {view === 'settings' && p.settings && <Settings onLaunchBenchmark={() => setView('benchmark')} />}
        {view === 'help' && <HelpCenter />}
      </Layout>
    </div>
  );
};
export default App;
