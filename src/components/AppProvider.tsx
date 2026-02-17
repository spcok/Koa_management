
import React, { useState, use, useEffect, useMemo, useOptimistic, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { dataService } from '../services/dataService';
import { 
  Animal, AnimalCategory, Task, User, SiteLogEntry, Incident, 
  FirstAidLogEntry, OrganizationProfile, Contact, SortOption, TimeLogEntry, 
  HolidayRequest, SystemPreferences 
} from '../types';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS, DEFAULT_SYSTEM_PREFERENCES, DEFAULT_EVENT_TYPES } from '../constants';

// --- Resource Loading ---
// Initiate fetch immediately upon module load to prevent waterfalls
const initialDataPromise = Promise.all([
  dataService.fetchAnimals(),       // 0
  dataService.fetchTasks(),         // 1
  dataService.fetchUsers(),         // 2
  dataService.fetchSiteLogs(),      // 3
  dataService.fetchIncidents(),     // 4
  dataService.fetchFirstAidLogs(),  // 5
  dataService.fetchFoodOptions(),   // 6
  dataService.fetchFeedMethods(),   // 7
  dataService.fetchLocations(),     // 8
  dataService.fetchContacts(),      // 9
  dataService.fetchOrgProfile(),    // 10
  dataService.fetchTimeLogs(),      // 11
  dataService.fetchHolidayRequests(),// 12
  dataService.fetchSettingsKey('dashboard_sort', 'alpha-asc'), // 13
  dataService.fetchSettingsKey('dashboard_locked', true),       // 14
  dataService.fetchSystemPreferences(), // 15
  dataService.fetchEventTypes()     // 16
]);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Suspend here until data is ready
  const initialData = use(initialDataPromise);

  // --- STATE ---
  const [animals, setAnimals] = useState<Animal[]>(initialData[0]);
  const [tasks, setTasks] = useState<Task[]>(initialData[1]);
  const [users, setUsers] = useState<User[]>(initialData[2]);
  const [siteLogs, setSiteLogs] = useState<SiteLogEntry[]>(initialData[3]);
  const [incidents, setIncidents] = useState<Incident[]>(initialData[4]);
  const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLogEntry[]>(initialData[5]);
  const [foodOptions, setFoodOptions] = useState(initialData[6] || DEFAULT_FOOD_OPTIONS);
  const [feedMethods, setFeedMethods] = useState(initialData[7] || DEFAULT_FEED_METHODS);
  const [locations, setLocations] = useState(initialData[8]);
  const [contacts, setContacts] = useState(initialData[9]);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(initialData[10]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>(initialData[11]);
  const [holidayRequests, setHolidayRequests] = useState<HolidayRequest[]>(initialData[12]);
  const [sortOption, setSortOptionState] = useState<SortOption>(initialData[13] as SortOption);
  const [isOrderLocked, setIsOrderLocked] = useState<boolean>(!!initialData[14]);
  const [systemPreferences, setSystemPreferences] = useState(initialData[15] || DEFAULT_SYSTEM_PREFERENCES);
  const [eventTypes, setEventTypes] = useState(initialData[16] || DEFAULT_EVENT_TYPES);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeShift, setActiveShift] = useState<TimeLogEntry | null>(null);

  // --- OPTIMISTIC UPDATES ---
  // We can wrap key states with useOptimistic if we want granular control in the provider,
  // but typically components use it locally. Here we manage the source of truth.

  // --- ACTIONS ---
  
  useEffect(() => {
    if (currentUser && timeLogs.length > 0) {
      const active = timeLogs.find(l => l.userId === currentUser.id && l.status === 'Active');
      setActiveShift(active || null);
    }
  }, [currentUser, timeLogs]);

  const login = useCallback((user: User) => setCurrentUser(user), []);
  const logout = useCallback(() => { setCurrentUser(null); setActiveShift(null); }, []);

  const setSortOption = useCallback((opt: SortOption) => {
    setSortOptionState(opt);
    dataService.saveSettingsKey('dashboard_sort', opt);
  }, []);

  const toggleOrderLock = useCallback((locked: boolean) => {
    setIsOrderLocked(locked);
    dataService.saveSettingsKey('dashboard_locked', locked);
  }, []);

  // Animal Actions
  const updateAnimal = useCallback(async (animal: Animal) => {
    setAnimals(prev => prev.map(a => a.id === animal.id ? animal : a));
    try { await dataService.saveAnimal(animal); } catch (e) { console.error(e); }
  }, []);

  const addAnimal = useCallback(async (animal: Animal) => {
    setAnimals(prev => [...prev, animal]);
    try { await dataService.saveAnimal(animal); } catch (e) { console.error(e); }
  }, []);

  const deleteAnimal = useCallback(async (id: string) => {
    setAnimals(prev => prev.filter(a => a.id !== id));
    try { await dataService.deleteAnimal(id); } catch (e) { console.error(e); }
  }, []);

  const reorderAnimals = useCallback((reordered: Animal[]) => {
    setAnimals(prev => {
        const map = new Map(reordered.map(a => [a.id, a]));
        return prev.map(a => map.has(a.id) ? map.get(a.id)! : a);
    });
    dataService.saveAnimalsBulk(reordered);
  }, []);

  // Task Actions
  const addTask = useCallback(async (task: Task) => {
    setTasks(prev => [...prev, task]);
    await dataService.saveTasks([task]);
  }, []);

  const updateTask = useCallback(async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    await dataService.saveTasks([task]);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await dataService.deleteTask(id);
  }, []);

  // Logs & Incidents
  const addSiteLog = useCallback(async (log: SiteLogEntry) => {
    setSiteLogs(prev => [...prev, log]);
    await dataService.saveSiteLog(log);
  }, []);

  const deleteSiteLog = useCallback(async (id: string) => {
    setSiteLogs(prev => prev.filter(l => l.id !== id));
    await dataService.deleteSiteLog(id);
  }, []);

  const addIncident = useCallback(async (inc: Incident) => {
    setIncidents(prev => [...prev, inc]);
    await dataService.saveIncident(inc);
  }, []);

  const updateIncident = useCallback(async (inc: Incident) => {
    setIncidents(prev => prev.map(i => i.id === inc.id ? inc : i));
    await dataService.saveIncident(inc);
  }, []);

  const deleteIncident = useCallback(async (id: string) => {
    setIncidents(prev => prev.filter(i => i.id !== id));
    await dataService.deleteIncident(id);
  }, []);

  const addFirstAid = useCallback(async (log: FirstAidLogEntry) => {
    setFirstAidLogs(prev => [...prev, log]);
    await dataService.saveFirstAidLog(log);
  }, []);

  const deleteFirstAid = useCallback(async (id: string) => {
    setFirstAidLogs(prev => prev.filter(l => l.id !== id));
    await dataService.deleteFirstAidLog(id);
  }, []);

  // System & Users
  const updateUsers = useCallback(async (u: User[]) => {
    setUsers(u);
    await dataService.saveUsers(u);
  }, []);

  const updateFoodOptions = useCallback(async (opts: Record<AnimalCategory, string[]>) => {
    setFoodOptions(opts);
    await dataService.saveFoodOptions(opts);
  }, []);

  const updateFeedMethods = useCallback(async (methods: Record<AnimalCategory, string[]>) => {
    setFeedMethods(methods);
    await dataService.saveFeedMethods(methods);
  }, []);

  const updateEventTypes = useCallback(async (types: string[]) => {
    setEventTypes(types);
    await dataService.saveEventTypes(types);
  }, []);

  const updateLocations = useCallback(async (locs: string[]) => {
    setLocations(locs);
    await dataService.saveLocations(locs);
  }, []);

  const updateContacts = useCallback(async (cons: Contact[]) => {
    setContacts(cons);
    await dataService.saveContacts(cons);
  }, []);

  const updateOrgProfile = useCallback(async (p: OrganizationProfile) => {
    setOrgProfile(p);
    await dataService.saveOrgProfile(p);
  }, []);

  const updateSystemPreferences = useCallback(async (p: SystemPreferences) => {
    setSystemPreferences(p);
    await dataService.saveSystemPreferences(p);
  }, []);

  // Time & Holidays
  const clockIn = useCallback(async () => {
    if (!currentUser || activeShift) return;
    const newShift: TimeLogEntry = { 
        id: `shift_${Date.now()}`, 
        userId: currentUser.id, 
        userName: currentUser.name, 
        startTime: Date.now(), 
        date: new Date().toISOString().split('T')[0], 
        status: 'Active' 
    };
    setActiveShift(newShift);
    setTimeLogs(prev => [newShift, ...prev]);
    await dataService.saveTimeLog(newShift);
  }, [currentUser, activeShift]);

  const clockOut = useCallback(async () => {
    if (!currentUser || !activeShift) return;
    const now = Date.now();
    const diffMins = Math.floor((now - activeShift.startTime) / 60000);
    const completed: TimeLogEntry = { ...activeShift, endTime: now, durationMinutes: diffMins, status: 'Completed' };
    setActiveShift(null);
    setTimeLogs(prev => prev.map(l => l.id === activeShift.id ? completed : l));
    await dataService.saveTimeLog(completed);
  }, [currentUser, activeShift]);

  const deleteTimeLog = useCallback(async (id: string) => {
    setTimeLogs(prev => prev.filter(l => l.id !== id));
    await dataService.deleteTimeLog(id);
  }, []);

  const addHoliday = useCallback(async (req: HolidayRequest) => {
    setHolidayRequests(prev => [req, ...prev]);
    await dataService.saveHolidayRequest(req);
  }, []);

  const updateHoliday = useCallback(async (req: HolidayRequest) => {
    setHolidayRequests(prev => prev.map(r => r.id === req.id ? req : r));
    await dataService.saveHolidayRequest(req);
  }, []);

  const deleteHoliday = useCallback(async (id: string) => {
    setHolidayRequests(prev => prev.filter(r => r.id !== id));
    await dataService.deleteHolidayRequest(id);
  }, []);

  const importAnimals = useCallback(async (imported: Animal[]) => {
    setAnimals(imported);
    await dataService.importAnimals(imported);
  }, []);

  const value = useMemo(() => ({
    currentUser, users, animals, tasks, siteLogs, incidents, firstAidLogs,
    timeLogs, holidayRequests, foodOptions, feedMethods, eventTypes, locations,
    contacts, orgProfile, systemPreferences, sortOption, isOrderLocked, activeShift,
    login, logout, setSortOption, toggleOrderLock, clockIn, clockOut,
    updateAnimal, addAnimal, deleteAnimal, reorderAnimals,
    addTask, updateTask, deleteTask, addSiteLog, deleteSiteLog,
    addIncident, updateIncident, deleteIncident, addFirstAid, deleteFirstAid,
    updateUsers, updateFoodOptions, updateFeedMethods, updateEventTypes,
    updateLocations, updateContacts, updateOrgProfile, updateSystemPreferences,
    addHoliday, updateHoliday, deleteHoliday, deleteTimeLog, importAnimals
  }), [
    currentUser, users, animals, tasks, siteLogs, incidents, firstAidLogs,
    timeLogs, holidayRequests, foodOptions, feedMethods, eventTypes, locations,
    contacts, orgProfile, systemPreferences, sortOption, isOrderLocked, activeShift
  ]);

  return (
    <AppContext value={value}>
      {children}
    </AppContext>
  );
};
