
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
import DailyRounds from './components/DailyRounds.tsx';
import DiagnosticOverlay from './components/DiagnosticOverlay.tsx';
import React19Playground from './components/React19Playground.tsx';
import { useAppData } from './hooks/useAppData.ts';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const {
    currentUser, isInitializing, view, setView, selectedAnimal, animals, tasks, users,
    siteLogs, incidents, firstAidLogs, timeLogs, holidayRequests, foodOptions,
    feedMethods, eventTypes, locations, contacts, orgProfile, sortOption, isOrderLocked,
    activeCategory, setActiveCategory, viewDate, setViewDate, isOffline, fontScale, 
    setFontScale, activeShift, systemPreferences,
    handleLogin, handleLogout, selectAnimalAndNavigate, handleUpdateSortOption,
    handleToggleLock, handleUpdateAnimal, handleAddAnimal, handleDeleteAnimal,
    handleAddTask, handleAddTasks, handleUpdateTask, handleDeleteTask, handleAddSiteLog,
    handleDeleteSiteLog, handleAddIncident, handleUpdateIncident, handleDeleteIncident,
    handleAddFirstAid, handleDeleteFirstAid, handleUpdateUsers, handleImport,
    handleReorderAnimals, handleUpdateFoodOptions, handleUpdateFeedMethods, handleUpdateEventTypes,
    handleUpdateLocations, handleUpdateContacts, handleUpdateOrgProfile,
    handleClockIn, handleClockOut, handleDeleteTimeLog, handleAddHoliday,
    handleUpdateHoliday, handleDeleteHoliday, handleUpdateSystemPreferences
  } = useAppData();

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
  // Memoize permissions for performance
  const p: UserPermissions = { 
    dashboard: true, dailyLog: true, tasks: true, medical: isAdmin, movements: isAdmin, 
    safety: isAdmin, maintenance: true, settings: isAdmin, flightRecords: true, 
    feedingSchedule: isAdmin, attendance: isAdmin, attendanceManager: isAdmin, 
    holidayApprover: isAdmin, missingRecords: isAdmin, reports: isAdmin, rounds: true,
    ...(currentUser.permissions || {}) 
  };

  return (
    <div style={{ fontSize: `${fontScale}%` }}>
      <Layout activeView={view} onNavigate={setView} currentUser={currentUser} onLogout={handleLogout} isOffline={isOffline} fontScale={fontScale} setFontScale={setFontScale} activeShift={activeShift} onClockIn={handleClockIn} onClockOut={handleClockOut} orgProfile={orgProfile}>
        {view === 'dashboard' && p.dashboard && <Dashboard animals={animals} userRole={currentUser.role} onSelectAnimal={selectAnimalAndNavigate} onAddAnimal={handleAddAnimal} onUpdateAnimal={handleUpdateAnimal} onReorderAnimals={handleReorderAnimals} foodOptions={foodOptions} feedMethods={feedMethods} locations={locations} sortOption={sortOption} setSortOption={handleUpdateSortOption} isOrderLocked={isOrderLocked} onToggleLock={handleToggleLock} tasks={tasks} onUpdateTask={handleUpdateTask} activeTab={activeCategory} setActiveTab={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'timesheets' && p.attendance && <TimeSheets timeLogs={timeLogs} currentUser={currentUser} users={users} onDeleteLog={handleDeleteTimeLog} />}
        {view === 'holidays' && <HolidayRegistry requests={holidayRequests} currentUser={currentUser} onAddRequest={handleAddHoliday} onUpdateRequest={handleUpdateHoliday} onDeleteRequest={handleDeleteHoliday} />}
        {view === 'animal_profile' && selectedAnimal && <AnimalProfile animal={selectedAnimal} allAnimals={animals} onBack={() => setView('dashboard')} onUpdateAnimal={handleUpdateAnimal} onDeleteAnimal={handleDeleteAnimal} foodOptions={foodOptions} feedMethods={feedMethods} eventTypes={eventTypes} orgProfile={orgProfile} locations={locations} isAdmin={p.settings} onAddTask={handleAddTask} />}
        {view === 'daily' && p.dailyLog && <DailyLog animals={animals} onUpdateAnimal={handleUpdateAnimal} foodOptions={foodOptions} feedMethods={feedMethods} eventTypes={eventTypes} sortOption={sortOption} setSortOption={handleUpdateSortOption} currentUser={currentUser} activeCategory={activeCategory} setActiveCategory={setActiveCategory} viewDate={viewDate} setViewDate={setViewDate} />}
        {view === 'rounds' && p.rounds && <DailyRounds animals={animals} currentUser={currentUser} onAddSiteLog={handleAddSiteLog} onAddIncident={handleAddIncident} />}
        {view === 'tasks' && p.tasks && <Tasks tasks={tasks} animals={animals} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} users={users} currentUser={currentUser} onAddSiteLog={handleAddSiteLog} onUpdateAnimal={handleUpdateAnimal} />}
        {view === 'flight_records' && p.flightRecords && <FlightRecords animals={animals} />}
        {view === 'schedule' && p.feedingSchedule && <Schedule animals={animals} tasks={tasks} foodOptions={foodOptions} onAddTasks={handleAddTasks} onDeleteTask={handleDeleteTask} />}
        {view === 'weather' && <WeatherView />}
        {view === 'health' && p.medical && <Health animals={animals} onSelectAnimal={selectAnimalAndNavigate} onUpdateAnimal={handleUpdateAnimal} tasks={tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} users={users} currentUser={currentUser} orgProfile={orgProfile} />}
        {view === 'movements' && p.movements && <Movements animals={animals} onUpdateAnimal={handleUpdateAnimal} currentUser={currentUser} />}
        {view === 'drills' && p.safety && <SafetyDrills logs={siteLogs} timeLogs={timeLogs} users={users} onAddLog={handleAddSiteLog} onDeleteLog={handleDeleteTimeLog} currentUser={currentUser} />}
        {view === 'incidents' && p.safety && <Incidents incidents={incidents} animals={animals} currentUser={currentUser} onAddIncident={handleAddIncident} onUpdateIncident={handleUpdateIncident} onDeleteIncident={handleDeleteIncident} />}
        {view === 'first_aid' && (currentUser.role === UserRole.ADMIN || p.safety) && <FirstAid logs={firstAidLogs} currentUser={currentUser} onAddLog={handleAddFirstAid} onDeleteLog={handleDeleteFirstAid} />}
        {view === 'maintenance' && p.maintenance && <SiteMaintenance logs={siteLogs} currentUser={currentUser} onAddLog={handleAddSiteLog} onDeleteLog={handleDeleteTimeLog} />}
        {view === 'missing_records' && p.missingRecords && <MissingRecords animals={animals} />}
        {view === 'reports' && p.reports && <Reports animals={animals} users={users} orgProfile={orgProfile} currentUser={currentUser} incidents={incidents} siteLogs={siteLogs} timeLogs={timeLogs} />}
        {view === 'settings' && p.settings && <Settings animals={animals} onImport={handleImport} foodOptions={foodOptions} onUpdateFoodOptions={handleUpdateFoodOptions} feedMethods={feedMethods} onUpdateFeedMethods={handleUpdateFeedMethods} eventTypes={eventTypes} onUpdateEventTypes={handleUpdateEventTypes} users={users} onUpdateUsers={handleUpdateUsers} locations={locations} onUpdateLocations={handleUpdateLocations} contacts={contacts} onUpdateContacts={handleUpdateContacts} orgProfile={orgProfile} onUpdateOrgProfile={handleUpdateOrgProfile} onUpdateAnimal={handleUpdateAnimal} tasks={tasks} onDeleteTask={handleDeleteTask} systemPreferences={systemPreferences} onUpdateSystemPreferences={handleUpdateSystemPreferences} onLaunchBenchmark={() => setView('benchmark')} />}
        {view === 'help' && <HelpCenter currentUser={currentUser} />}
        {view === 'benchmark' && <React19Playground onBack={() => setView('settings')} />}
      </Layout>
      {(currentUser.role === UserRole.ADMIN || currentUser.permissions?.settings) && (
          <DiagnosticOverlay animals={animals} users={users} tasks={tasks} />
      )}
    </div>
  );
};
export default App;
