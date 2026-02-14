import React, { useState, useEffect, useCallback } from 'react';
import { Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Incident, FirstAidLogEntry, OrganizationProfile, Contact, SortOption, TimeLogEntry, UserPermissions, CloudBackupConfig, AuditLogEntry } from './types';
import { dataService } from './services/dataService';
import { backupService } from './services/backupService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DailyLog from './components/DailyLog';
import Tasks from './components/Tasks';
import FlightRecords from './components/FlightRecords';
import Schedule from './components/Schedule';
import WeatherView from './components/WeatherView';
import Movements from './components/Movements';
import SafetyDrills from './components/SafetyDrills';
import Incidents from './components/Incidents';
import FirstAid from './components/FirstAid';
import Health from './components/Health';
import SiteMaintenance from './components/SiteMaintenance';
import MissingRecords from './components/MissingRecords';
import Reports from './components/Reports';
import Settings from './components/Settings';
import LoginScreen from './components/LoginScreen';
import AnimalProfile from './components/AnimalProfile';
import TimeSheets from './components/TimeSheets';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS } from './constants';
import { batchGetSpeciesData } from './services/geminiService';

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
  
  // SHARED OPERATIONAL STATE: Linked between Dashboard and Daily Log
  const [sortOption, setSortOption] = useState<SortOption>('alpha-asc');
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
        const [fetchedAnimals, fetchedTasks, fetchedUsers, fetchedSiteLogs, fetchedIncidents, fetchedFirstAid, fetchedFood, fetchedMethods, fetchedLocs, fetchedContacts, fetchedProfile, fetchedTimeLogs] = await Promise.all([
          dataService.fetchAnimals(), dataService.fetchTasks(), dataService.fetchUsers(), dataService.fetchSiteLogs(), dataService.fetchIncidents(), dataService.fetchFirstAidLogs(), dataService.fetchFoodOptions(), dataService.fetchFeedMethods(), dataService.fetchLocations(), dataService.fetchContacts(), dataService.fetchOrgProfile(), dataService.fetchTimeLogs()
        ]);
        setAnimals(fetchedAnimals); setTasks(fetchedTasks); setUsers(fetchedUsers); setSiteLogs(fetchedSiteLogs); setIncidents(fetchedIncidents); setFirstAidLogs(fetchedFirstAid); setTimeLogs(fetchedTimeLogs);
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

  if (!currentUser) return <LoginScreen users={users} onLogin={handleLogin} orgProfile={orgProfile} />;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const p: UserPermissions = { dashboard: true, dailyLog: true, tasks: true, medical: isAdmin, movements: isAdmin, safety: isAdmin, maintenance: true, reports: true, settings: isAdmin, flightRecords: true, feedingSchedule: isAdmin, attendance: isAdmin, attendanceManager: isAdmin, missingRecords: isAdmin, ...(currentUser.permissions || {}) };

  return (
    <div style={{ fontSize: `${fontScale}%` }}>
      <Layout activeView={view} onNavigate={setView} currentUser={currentUser} onLogout={handleLogout} isOffline={isOffline} fontScale={fontScale} setFontScale={setFontScale} activeShift={activeShift} onClockIn={handleClockIn} onClockOut={handleClockOut}>
        {view === 'dashboard' && p.dashboard && <Dashboard animals={animals} userRole={currentUser.role} onSelectAnimal={selectAnimalAndNavigate} onAddAnimal={handleAddAnimal} onUpdateAnimal={handleUpdateAnimal} onReorderAnimals={handleReorderAnimals} foodOptions={foodOptions} feedMethods={feedMethods} locations={locations} sortOption={sortOption} setSortOption={setSortOption} tasks={tasks} onUpdateTask={handleUpdateTask} activeTab={activeCategory} setActiveTab={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'timesheets' && p.attendance && <TimeSheets timeLogs={timeLogs} currentUser={currentUser} users={users} onDeleteLog={handleDeleteTimeLog} />}
        {view === 'animal_profile' && selectedAnimal && <AnimalProfile animal={selectedAnimal} onBack={() => setView('dashboard')} onUpdateAnimal={handleUpdateAnimal} onDeleteAnimal={handleDeleteAnimal} foodOptions={foodOptions} feedMethods={feedMethods} orgProfile={orgProfile} locations={locations} isAdmin={p.settings} />}
        {view === 'daily' && p.dailyLog && <DailyLog animals={animals} onUpdateAnimal={handleUpdateAnimal} foodOptions={foodOptions} feedMethods={feedMethods} sortOption={sortOption} setSortOption={setSortOption} currentUser={currentUser} activeCategory={activeCategory} setActiveCategory={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
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
        {view === 'reports' && p.reports && <Reports animals={animals} orgProfile={orgProfile} users={users} currentUser={currentUser} />}
        {view === 'settings' && p.settings && <Settings animals={animals} onImport={handleImport} foodOptions={foodOptions} onUpdateFoodOptions={handleUpdateFoodOptions} feedMethods={feedMethods} onUpdateFeedMethods={handleUpdateFeedMethods} users={users} onUpdateUsers={handleUpdateUsers} locations={locations} onUpdateLocations={handleUpdateLocations} contacts={contacts} onUpdateContacts={handleUpdateContacts} orgProfile={orgProfile} onUpdateOrgProfile={handleUpdateOrgProfile} onUpdateAnimal={handleUpdateAnimal} />}
      </Layout>
    </div>
  );
};
export default App;