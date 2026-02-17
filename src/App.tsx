
import React, { useState, Suspense } from 'react';
import { UserRole, UserPermissions, Animal } from './types';
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
import Settings from './components/Settings';
import LoginScreen from './components/LoginScreen';
import AnimalProfile from './components/AnimalProfile';
import TimeSheets from './components/TimeSheets';
import HelpCenter from './components/HelpCenter';
import Reports from './components/Reports';
import HolidayRegistry from './components/HolidayRegistry';
import DailyRounds from './components/DailyRounds';
import DiagnosticOverlay from './components/DiagnosticOverlay';
import React19Playground from './components/React19Playground';
import { useAppData } from './hooks/useAppData';
import { Loader2 } from 'lucide-react';
import { AppProvider } from './components/AppProvider';

// AppContent is the main UI component that consumes the context.
// It only renders after AppProvider has successfully fetched all data.
const AppContent: React.FC = () => {
  const {
    currentUser, animals, tasks, users,
    siteLogs, incidents, firstAidLogs, timeLogs, holidayRequests, foodOptions,
    feedMethods, eventTypes, locations, contacts, orgProfile, sortOption, isOrderLocked,
    activeShift, systemPreferences,
    login, logout, setSortOption,
    toggleOrderLock, updateAnimal, addAnimal, deleteAnimal,
    addTask, addHoliday, updateHoliday, deleteHoliday,
    updateTask, deleteTask, addSiteLog, deleteSiteLog,
    addIncident, updateIncident, deleteIncident,
    addFirstAid, deleteFirstAid, updateUsers, importAnimals,
    reorderAnimals, updateFoodOptions, updateFeedMethods, updateEventTypes,
    updateLocations, updateContacts, updateOrgProfile,
    clockIn, clockOut, deleteTimeLog, updateSystemPreferences
  } = useAppData();

  const [view, setView] = useState<string>('dashboard');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [activeCategory, setActiveCategory] = useState<any>('Owls');
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [fontScale, setFontScale] = useState(100);

  const selectAnimalAndNavigate = (animal: Animal) => {
    setSelectedAnimal(animal);
    setView('animal_profile');
  };

  if (!currentUser) return <LoginScreen users={users} onLogin={login} orgProfile={orgProfile} />;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const p: UserPermissions = { 
    dashboard: true, dailyLog: true, tasks: true, medical: isAdmin, movements: isAdmin, 
    safety: isAdmin, maintenance: true, settings: isAdmin, flightRecords: true, 
    feedingSchedule: isAdmin, attendance: true, attendanceManager: isAdmin, 
    holidayApprover: isAdmin, missingRecords: isAdmin, reports: isAdmin, rounds: true,
    ...(currentUser.permissions || {}) 
  };

  return (
    <div style={{ fontSize: `${fontScale}%` }}>
      <Layout activeView={view} onNavigate={setView} currentUser={currentUser} onLogout={logout} activeShift={activeShift} onClockIn={clockIn} onClockOut={clockOut} orgProfile={orgProfile}>
        {view === 'dashboard' && p.dashboard && <Dashboard animals={animals} userRole={currentUser.role} onSelectAnimal={selectAnimalAndNavigate} onAddAnimal={addAnimal} onUpdateAnimal={updateAnimal} onReorderAnimals={reorderAnimals} foodOptions={foodOptions} feedMethods={feedMethods} locations={locations} sortOption={sortOption} setSortOption={setSortOption} isOrderLocked={isOrderLocked} onToggleLock={toggleOrderLock} tasks={tasks} onUpdateTask={updateTask} activeTab={activeCategory} setActiveTab={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'timesheets' && p.attendance && <TimeSheets timeLogs={timeLogs} currentUser={currentUser} users={users} onDeleteLog={deleteTimeLog} />}
        {view === 'holidays' && <HolidayRegistry requests={holidayRequests} currentUser={currentUser} onAddRequest={addHoliday} onUpdateRequest={updateHoliday} onDeleteRequest={deleteHoliday} />}
        {view === 'animal_profile' && selectedAnimal && <AnimalProfile animal={selectedAnimal} allAnimals={animals} onBack={() => setView('dashboard')} onUpdateAnimal={updateAnimal} onDeleteAnimal={() => { deleteAnimal(selectedAnimal.id); setView('dashboard'); }} foodOptions={foodOptions} feedMethods={feedMethods} eventTypes={eventTypes} orgProfile={orgProfile} locations={locations} isAdmin={p.settings} onAddTask={addTask} />}
        {view === 'daily' && p.dailyLog && <DailyLog animals={animals} onUpdateAnimal={updateAnimal} foodOptions={foodOptions} feedMethods={feedMethods} eventTypes={eventTypes} sortOption={sortOption} setSortOption={setSortOption} currentUser={currentUser} activeCategory={activeCategory} setActiveCategory={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'rounds' && p.rounds && <DailyRounds animals={animals} currentUser={currentUser} onAddSiteLog={addSiteLog} onAddIncident={addIncident} />}
        {view === 'tasks' && p.tasks && <Tasks tasks={tasks} animals={animals} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} users={users} currentUser={currentUser} onAddSiteLog={addSiteLog} onUpdateAnimal={updateAnimal} />}
        {view === 'flight_records' && p.flightRecords && <FlightRecords animals={animals} />}
        {view === 'schedule' && p.feedingSchedule && <Schedule animals={animals} tasks={tasks} foodOptions={foodOptions} onAddTasks={(ts) => ts.forEach(addTask)} onDeleteTask={deleteTask} />}
        {view === 'weather' && <WeatherView />}
        {view === 'health' && p.medical && <Health animals={animals} onSelectAnimal={selectAnimalAndNavigate} onUpdateAnimal={updateAnimal} tasks={tasks} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} users={users} currentUser={currentUser} orgProfile={orgProfile} />}
        {view === 'movements' && p.movements && <Movements animals={animals} onUpdateAnimal={updateAnimal} currentUser={currentUser} />}
        {view === 'drills' && p.safety && <SafetyDrills logs={siteLogs} timeLogs={timeLogs} users={users} onAddLog={addSiteLog} onDeleteLog={deleteSiteLog} currentUser={currentUser} />}
        {view === 'incidents' && p.safety && <Incidents incidents={incidents} animals={animals} currentUser={currentUser} onAddIncident={addIncident} onUpdateIncident={updateIncident} onDeleteIncident={deleteIncident} />}
        {view === 'first_aid' && (currentUser.role === UserRole.ADMIN || p.safety) && <FirstAid logs={firstAidLogs} currentUser={currentUser} onAddLog={addFirstAid} onDeleteLog={deleteFirstAid} />}
        {view === 'maintenance' && p.maintenance && <SiteMaintenance logs={siteLogs} currentUser={currentUser} onAddLog={addSiteLog} onDeleteLog={deleteSiteLog} />}
        {view === 'missing_records' && p.missingRecords && <MissingRecords animals={animals} />}
        {view === 'reports' && p.reports && <Reports animals={animals} users={users} orgProfile={orgProfile} currentUser={currentUser} incidents={incidents} siteLogs={siteLogs} timeLogs={timeLogs} />}
        {view === 'settings' && p.settings && <Settings animals={animals} onImport={importAnimals} foodOptions={foodOptions} onUpdateFoodOptions={updateFoodOptions} feedMethods={feedMethods} onUpdateFeedMethods={updateFeedMethods} eventTypes={eventTypes} onUpdateEventTypes={updateEventTypes} users={users} onUpdateUsers={updateUsers} locations={locations} onUpdateLocations={updateLocations} contacts={contacts} onUpdateContacts={updateContacts} orgProfile={orgProfile} onUpdateOrgProfile={updateOrgProfile} onUpdateAnimal={updateAnimal} tasks={tasks} onDeleteTask={deleteTask} systemPreferences={systemPreferences} onUpdateSystemPreferences={updateSystemPreferences} onLaunchBenchmark={() => setView('benchmark')} />}
        {view === 'help' && <HelpCenter currentUser={currentUser} />}
        {view === 'benchmark' && <React19Playground onBack={() => setView('settings')} />}
      </Layout>
      {(currentUser.role === UserRole.ADMIN || currentUser.permissions?.settings) && (
          <DiagnosticOverlay animals={animals} users={users} tasks={tasks} />
      )}
    </div>
  );
};

/**
 * The main App component wraps the application with a Suspense boundary
 * to handle asynchronous data fetching in the AppProvider.
 */
const App: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
          <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Initializing Secure Environment...</p>
      </div>
    }>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Suspense>
  );
};

export default App;
