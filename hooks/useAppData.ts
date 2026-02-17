
import { useState, useEffect, useCallback } from 'react';
import { 
  Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Incident, 
  FirstAidLogEntry, OrganizationProfile, Contact, SortOption, TimeLogEntry, 
  HolidayRequest, SystemPreferences
} from '../types';
import { dataService } from '../services/dataService';
import { batchGetSpeciesData } from '../services/geminiService';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS, DEFAULT_SYSTEM_PREFERENCES, DEFAULT_EVENT_TYPES } from '../constants';

export const useAppData = () => {
  // --- STATE DEFINITIONS ---
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
  const [eventTypes, setEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [locations, setLocations] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);
  const [systemPreferences, setSystemPreferences] = useState<SystemPreferences>(DEFAULT_SYSTEM_PREFERENCES);
  
  const [sortOption, setSortOption] = useState<SortOption>('alpha-asc');
  const [isOrderLocked, setIsOrderLocked] = useState(true);
  const [activeCategory, setActiveCategory] = useState<AnimalCategory>(AnimalCategory.OWLS);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isOffline, setIsOffline] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [activeShift, setActiveShift] = useState<TimeLogEntry | null>(null);

  // --- RECOVERY LOGIC ---
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

  // --- AUTO SYNC LOGIC ---
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

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
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

        const unwrap = <T>(result: PromiseSettledResult<T>, fallback: T): T => {
            if (result.status === 'fulfilled') return result.value;
            console.warn('Data fetch failed for one resource:', result.reason);
            return fallback;
        };

        const fetchedAnimals = unwrap(results[0], []);
        
        if (results[0].status === 'rejected') setIsOffline(true);

        setAnimals(fetchedAnimals);
        setTasks(unwrap(results[1], []));
        setUsers(unwrap(results[2], []));
        setSiteLogs(unwrap(results[3], []));
        setIncidents(unwrap(results[4], []));
        setFirstAidLogs(unwrap(results[5], []));
        setFoodOptions(unwrap(results[6], DEFAULT_FOOD_OPTIONS));
        setFeedMethods(unwrap(results[7], DEFAULT_FEED_METHODS));
        setLocations(unwrap(results[8], []));
        setContacts(unwrap(results[9], []));
        setOrgProfile(unwrap(results[10], null));
        setTimeLogs(unwrap(results[11], []));
        setHolidayRequests(unwrap(results[12], []));
        setSortOption(unwrap(results[13], 'alpha-asc') as SortOption);
        setIsOrderLocked(unwrap(results[14], true));
        setSystemPreferences(unwrap(results[15], DEFAULT_SYSTEM_PREFERENCES));
        setEventTypes(unwrap(results[16], DEFAULT_EVENT_TYPES));

        performAutoSync(fetchedAnimals);

      } catch (error) { 
        console.error("Catastrophic initialization error", error);
        setIsOffline(true); 
      } finally {
        setIsInitializing(false);
      }
    };
    fetchData();
  }, [performAutoSync]);

  // --- INACTIVITY TIMER ---
  useEffect(() => {
    if (!currentUser) return;
    const timeoutMinutes = systemPreferences.sessionTimeoutMinutes || 5;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const logoutUser = () => {
        handleLogout();
        alert("Session expired due to inactivity.");
    };

    const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(logoutUser, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
        clearTimeout(timer);
        events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, systemPreferences.sessionTimeoutMinutes]);

  // --- HANDLERS ---

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

  // Robust Animal Update with Rollback
  const handleUpdateAnimal = useCallback(async (animal: Animal) => { 
    const previousAnimals = [...animals];
    const previousSelected = selectedAnimal;

    // Optimistic update
    setAnimals(prev => prev.map(a => a.id === animal.id ? animal : a)); 
    if (selectedAnimal?.id === animal.id) setSelectedAnimal(animal); 
    
    try { 
        await dataService.saveAnimal(animal); 
    } catch (e) { 
        console.error("Failed to save animal update:", e);
        // Rollback on failure
        setAnimals(previousAnimals);
        if (previousSelected?.id === animal.id) setSelectedAnimal(previousSelected);
        alert("Failed to save changes. Please check your connection.");
    } 
  }, [animals, selectedAnimal]);

  const handleAddAnimal = useCallback(async (animal: Animal) => { 
      const previousAnimals = [...animals];
      setAnimals(prev => [...prev, animal]); 
      try { 
          await dataService.saveAnimal(animal); 
      } catch (e) { 
          console.error("Failed to add animal:", e);
          setAnimals(previousAnimals);
          alert("Failed to add animal. Please check your connection.");
      } 
  }, [animals]);
  
  const handleDeleteAnimal = useCallback(async () => { 
      if (selectedAnimal) { 
          const id = selectedAnimal.id; 
          const previousAnimals = [...animals];
          
          setAnimals(prev => prev.filter(a => a.id !== id)); 
          setView('dashboard'); 
          setSelectedAnimal(null); 
          
          try { 
              await dataService.deleteAnimal(id); 
          } catch (e) { 
              console.error("Failed to delete animal:", e);
              // Rollback
              setAnimals(previousAnimals);
              setSelectedAnimal(selectedAnimal);
              setView('animal_profile');
              alert("Failed to delete record. System state restored.");
          } 
      } 
  }, [selectedAnimal, animals]);
  
  const handleAddTask = useCallback(async (task: Task) => { setTasks(prev => [...prev, task]); await dataService.saveTasks([task]); }, []);
  
  const handleAddTasks = useCallback(async (newTasks: Task[]) => { setTasks(prev => [...prev, ...newTasks]); await dataService.saveTasks(newTasks); }, []);

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

  const handleUpdateEventTypes = useCallback(async (types: string[]) => { setEventTypes(types); await dataService.saveEventTypes(types); }, []);
  
  const handleUpdateLocations = useCallback(async (locs: string[]) => { setLocations(locs); await dataService.saveLocations(locs); }, []);
  
  const handleUpdateContacts = useCallback(async (cons: Contact[]) => { setContacts(cons); await dataService.saveContacts(cons); }, []);
  
  const handleUpdateOrgProfile = useCallback(async (profile: OrganizationProfile) => { setOrgProfile(profile); await dataService.saveOrgProfile(profile); }, []);
  
  const handleUpdateSystemPreferences = useCallback(async (prefs: SystemPreferences) => { setSystemPreferences(prefs); await dataService.saveSystemPreferences(prefs); }, []);

  const handleClockIn = useCallback(async () => { 
    if (!currentUser || activeShift) return; 
    const newShift: TimeLogEntry = { id: `shift_${Date.now()}`, userId: currentUser.id, userName: currentUser.name, startTime: Date.now(), date: new Date().toISOString().split('T')[0], status: 'Active' }; 
    setActiveShift(newShift); 
    setTimeLogs(prev => [newShift, ...prev]); 
    try {
        await dataService.saveTimeLog(newShift); 
    } catch (e) {
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

  return {
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
  };
};
