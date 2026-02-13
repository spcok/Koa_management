
import React, { useState, useEffect, useCallback } from 'react';
import { Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Incident, FirstAidLogEntry, OrganizationProfile, Contact, SortOption, TimeLogEntry, UserPermissions } from './types';
import { dataService } from './services/dataService';
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
import HelpCenter from './components/HelpCenter';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS } from './constants';
import { batchGetSpeciesData } from './services/geminiService';

const SESSION_KEY = 'koa_session_v4';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const { user, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < (24 * 60 * 60 * 1000)) return user;
      }
    } catch (e) { console.error("Session hydration failed"); }
    return null;
  });

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
  const [fontScale, setFontScale] = useState(100);
  const [activeShift, setActiveShift] = useState<TimeLogEntry | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [a, t, u, sl, inc, fa, food, methods, locs, cons, prof, tl, sort, lock] = await Promise.all([
          dataService.fetchAnimals(), dataService.fetchTasks(), dataService.fetchUsers(), 
          dataService.fetchSiteLogs(), dataService.fetchIncidents(), dataService.fetchFirstAidLogs(), 
          dataService.fetchFoodOptions(), dataService.fetchFeedMethods(), dataService.fetchLocations(), 
          dataService.fetchContacts(), dataService.fetchOrgProfile(), dataService.fetchTimeLogs(),
          dataService.fetchSettingsKey('dashboard_sort', 'alpha-asc'),
          dataService.fetchSettingsKey('dashboard_locked', true)
        ]);
        setAnimals(a); setTasks(t); setUsers(u); setSiteLogs(sl); setIncidents(inc); 
        setFirstAidLogs(fa); setTimeLogs(tl); setSortOption(sort as SortOption); 
        setIsOrderLocked(!!lock);
        if (food) setFoodOptions(food); if (methods) setFeedMethods(methods); 
        if (locs) setLocations(locs); if (cons) setContacts(cons); if (prof) setOrgProfile(prof);
      } catch (e) { console.error("Initialization error", e); }
    };
    fetchData();
  }, []);

  const handleLogin = (user: User) => { 
    setCurrentUser(user); 
    setView('dashboard'); 
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, timestamp: Date.now() })); 
  };
  const handleLogout = () => { 
    setCurrentUser(null); 
    setActiveShift(null); 
    setView('dashboard'); 
    localStorage.removeItem(SESSION_KEY); 
  };
  
  const handleUpdateAnimal = async (animal: Animal) => { 
    setAnimals(prev => prev.map(a => a.id === animal.id ? animal : a)); 
    if (selectedAnimal?.id === animal.id) setSelectedAnimal(animal); 
    await dataService.saveAnimal(animal); 
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const p: UserPermissions = { 
    dashboard: true, dailyLog: true, tasks: true, medical: isAdmin, movements: isAdmin, 
    safety: true, maintenance: true, reports: true, settings: isAdmin, 
    flightRecords: true, feedingSchedule: true, attendance: true, 
    attendanceManager: isAdmin, missingRecords: isAdmin, 
    ...(currentUser?.permissions || {}) 
  };

  if (!currentUser) return <LoginScreen users={users} onLogin={handleLogin} orgProfile={orgProfile} />;

  return (
    <div style={{ fontSize: `${fontScale}%` }} className="min-h-screen">
      <Layout activeView={view} onNavigate={setView} currentUser={currentUser} onLogout={handleLogout} activeShift={activeShift} onClockIn={async () => { const s = { id: `shift_${Date.now()}`, userId: currentUser.id, userName: currentUser.name, startTime: Date.now(), date: viewDate, status: 'Active' as const }; setActiveShift(s); setTimeLogs(p => [s, ...p]); await dataService.saveTimeLog(s); }} onClockOut={async () => { if (!activeShift) return; const now = Date.now(); const diff = Math.floor((now - activeShift.startTime) / 60000); const s = { ...activeShift, endTime: now, durationMinutes: diff, status: 'Completed' as const }; setActiveShift(null); setTimeLogs(p => p.map(l => l.id === activeShift.id ? s : l)); await dataService.saveTimeLog(s); }} orgProfile={orgProfile} fontScale={fontScale} setFontScale={setFontScale} isOffline={isOffline}>
        {view === 'dashboard' && p.dashboard && <Dashboard animals={animals} userRole={currentUser.role} onSelectAnimal={a => { setSelectedAnimal(a); setView('animal_profile'); }} onAddAnimal={async a => { setAnimals(p => [...p, a]); await dataService.saveAnimal(a); }} onUpdateAnimal={handleUpdateAnimal} sortOption={sortOption} setSortOption={setSortOption} activeTab={activeCategory} setActiveTab={setActiveCategory} foodOptions={foodOptions} feedMethods={feedMethods} locations={locations} tasks={tasks} onUpdateTask={t => setTasks(p => p.map(o => o.id === t.id ? t : o))} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'animal_profile' && selectedAnimal && <AnimalProfile animal={selectedAnimal} onBack={() => setView('dashboard')} onUpdateAnimal={handleUpdateAnimal} onDeleteAnimal={async () => { const id = selectedAnimal.id; setAnimals(p => p.filter(a => a.id !== id)); setView('dashboard'); await dataService.deleteAnimal(id); }} foodOptions={foodOptions} feedMethods={feedMethods} isAdmin={isAdmin} locations={locations} orgProfile={orgProfile} />}
        {view === 'reports' && p.reports && <Reports animals={animals} orgProfile={orgProfile} users={users} currentUser={currentUser} />}
        {view === 'settings' && p.settings && <Settings animals={animals} onImport={async a => { setAnimals(a); await dataService.importAnimals(a); }} foodOptions={foodOptions} onUpdateFoodOptions={async o => { setFoodOptions(o); await dataService.saveFoodOptions(o); }} feedMethods={feedMethods} onUpdateFeedMethods={async m => { setFeedMethods(m); await dataService.saveFeedMethods(m); }} users={users} onUpdateUsers={async u => { setUsers(u); await dataService.saveUsers(u); }} locations={locations} onUpdateLocations={async l => { setLocations(l); await dataService.saveLocations(l); }} orgProfile={orgProfile} onUpdateOrgProfile={async p => { setOrgProfile(p); await dataService.saveOrgProfile(p); }} />}
        {view === 'daily' && p.dailyLog && <DailyLog animals={animals} onUpdateAnimal={handleUpdateAnimal} foodOptions={foodOptions} feedMethods={feedMethods} sortOption={sortOption} setSortOption={setSortOption} currentUser={currentUser} activeCategory={activeCategory} setActiveCategory={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'health' && p.medical && <Health animals={animals} onSelectAnimal={a => { setSelectedAnimal(a); setView('animal_profile'); }} onUpdateAnimal={handleUpdateAnimal} tasks={tasks} currentUser={currentUser} orgProfile={orgProfile} />}
        {view === 'weather' && <WeatherView />}
        {view === 'timesheets' && p.attendance && <TimeSheets timeLogs={timeLogs} currentUser={currentUser} users={users} onDeleteLog={async id => { setTimeLogs(p => p.filter(l => l.id !== id)); await dataService.deleteTimeLog(id); }} />}
        {view === 'tasks' && p.tasks && <Tasks tasks={tasks} animals={animals} onAddTask={async t => { setTasks(p => [...p, t]); await dataService.saveTasks([t]); }} onUpdateTask={async t => { setTasks(p => p.map(o => o.id === t.id ? t : o)); await dataService.saveTasks([t]); }} onDeleteTask={async id => { setTasks(p => p.filter(t => t.id !== id)); await dataService.deleteTask(id); }} users={users} currentUser={currentUser} onUpdateAnimal={handleUpdateAnimal} />}
      </Layout>
    </div>
  );
};
export default App;
