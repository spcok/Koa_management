
import React, { useState, use, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { dataService } from '../services/dataService';
import { 
  Animal, AnimalCategory, Task, User, SiteLogEntry, Incident, 
  FirstAidLogEntry, OrganisationProfile, Contact, SortOption, TimeLogEntry, 
  HolidayRequest, SystemPreferences, LogType 
} from '../types';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS, DEFAULT_SYSTEM_PREFERENCES, DEFAULT_EVENT_TYPES } from '../constants';
import { getFullWeather } from '../services/weatherService';

// --- Resource Loading ---
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
]).catch(err => {
    console.error("Critical Data Fetch Failure:", err);
    return Array(17).fill(null); 
});

const upsert = <T extends { id: string }>(items: T[], item: T): T[] => {
    const safeItems = items || [];
    const index = safeItems.findIndex((i) => i.id === item.id);
    if (index > -1) {
        const newItems = [...safeItems];
        newItems[index] = item;
        return newItems;
    }
    return [item, ...safeItems];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = use(initialDataPromise);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Robust initialization with guarded fallbacks
  const [animals, setAnimals] = useState<Animal[]>(initialData[0] || []);
  const [tasks, setTasks] = useState<Task[]>(initialData[1] || []);
  const [users, setUsers] = useState<User[]>(initialData[2] || []);
  const [siteLogs, setSiteLogs] = useState<SiteLogEntry[]>(initialData[3] || []);
  const [incidents, setIncidents] = useState<Incident[]>(initialData[4] || []);
  const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLogEntry[]>(initialData[5] || []);
  const [foodOptions, setFoodOptions] = useState(initialData[6] || DEFAULT_FOOD_OPTIONS);
  const [feedMethods, setFeedMethods] = useState(initialData[7] || DEFAULT_FEED_METHODS);
  const [locations, setLocations] = useState(initialData[8] || []);
  const [contacts, setContacts] = useState(initialData[9] || []);
  const [orgProfile, setOrgProfile] = useState<OrganisationProfile | null>(initialData[10] || null);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>(initialData[11] || []);
  const [holidayRequests, setHolidayRequests] = useState<HolidayRequest[]>(initialData[12] || []);
  const [sortOption, setSortOptionState] = useState<SortOption>(initialData[13] as SortOption || 'alpha-asc');
  const [isOrderLocked, setIsOrderLocked] = useState<boolean>(!!initialData[14]);
  const [systemPreferences, setSystemPreferences] = useState(initialData[15] || DEFAULT_SYSTEM_PREFERENCES);
  const [eventTypes, setEventTypes] = useState(initialData[16] || DEFAULT_EVENT_TYPES);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeShift, setActiveShift] = useState<TimeLogEntry | null>(null);

  // Connectivity Listeners
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

  // Weather Sync (ZLA Compliance)
  useEffect(() => {
    if (isOffline) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const checkWeatherSync = async () => {
        const owls = (animals || []).filter(a => a.category === AnimalCategory.OWLS);
        if (owls.length === 0) return;

        const lastSync = await dataService.fetchSettingsKey('owl_weather_sync_date', '');
        if (lastSync === todayStr) return;

        const weather = await getFullWeather();
        if (!weather) return;

        const targetTimePrefix = `${todayStr}T13:00`;
        const slot = weather.hourly.find(h => h.time.startsWith(targetTimePrefix));
        
        if (slot) {
            const updatedOwls = owls.map(owl => {
                const alreadyLogged = (owl.logs || []).some(l => l.date.startsWith(targetTimePrefix) && l.type === LogType.TEMPERATURE);
                if (alreadyLogged) return owl;
                return {
                    ...owl,
                    logs: [{
                        id: `weather_sync_${Date.now()}_${owl.id}`,
                        date: `${targetTimePrefix}:00`,
                        type: LogType.TEMPERATURE,
                        value: `${slot.temp}°C`,
                        temperature: slot.temp,
                        weatherDesc: slot.description,
                        notes: `Statutory 13:00 Telemetry Sync`,
                        userInitials: 'SYS',
                        timestamp: Date.now()
                    }, ...(owl.logs || [])]
                };
            });
            setAnimals(prev => {
                const map = new Map(updatedOwls.map(o => [o.id, o]));
                return prev.map(a => map.get(a.id) || a);
            });
            await dataService.saveAnimalsBulk(updatedOwls);
            await dataService.saveSettingsKey('owl_weather_sync_date', todayStr);
        }
    };
    const timer = setTimeout(checkWeatherSync, 10000);
    return () => clearTimeout(timer);
  }, [animals, isOffline]);

  useEffect(() => {
    if (currentUser && (timeLogs || []).length > 0) {
      const active = timeLogs.find(l => l.userId === currentUser.id && l.status === 'Active');
      setActiveShift(active || null);
    } else {
      setActiveShift(null);
    }
  }, [currentUser, timeLogs]);

  const login = (user: User) => setCurrentUser(user);
  const logout = () => {
    setCurrentUser(null);
    setActiveShift(null);
  };

  const setSortOption = (opt: SortOption) => {
    setSortOptionState(opt);
    dataService.saveSettingsKey('dashboard_sort', opt);
  };

  const toggleOrderLock = (locked: boolean) => {
    setIsOrderLocked(locked);
    dataService.saveSettingsKey('dashboard_locked', locked);
  };

  const updateAnimal = useCallback(async (animal: Animal) => {
    setAnimals(prev => (prev || []).map(a => a.id === animal.id ? animal : a));
    await dataService.saveAnimal(animal);
  }, []);

  const addAnimal = useCallback(async (animal: Animal) => {
    setAnimals(prev => [...(prev || []), animal]);
    await dataService.saveAnimal(animal);
  }, []);

  const deleteAnimal = useCallback(async (id: string) => {
    setAnimals(prev => (prev || []).filter(a => a.id !== id));
    await dataService.deleteAnimal(id);
  }, []);
  
  const reorderAnimals = useCallback(async (reordered: Animal[]) => {
    const updatedWithOrder = (reordered || []).map((a, idx) => ({ ...a, order: idx }));
    setAnimals(prev => {
        const map = new Map(updatedWithOrder.map(a => [a.id, a]));
        return (prev || []).map(a => map.get(a.id) || a);
    });
    await dataService.saveAnimalsBulk(updatedWithOrder);
  }, []);

  const addTask = useCallback(async (task: Task) => {
    setTasks(prev => upsert(prev, task));
    await dataService.saveTasks([task]);
  }, []);

  const addTasks = useCallback(async (newTasks: Task[]) => {
    setTasks(prev => [...(prev || []), ...newTasks]);
    await dataService.saveTasks(newTasks);
  }, []);

  const updateTask = useCallback(async (task: Task) => {
    setTasks(prev => (prev || []).map(t => t.id === task.id ? task : t));
    await dataService.saveTasks([task]);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => (prev || []).filter(t => t.id !== id));
    await dataService.deleteTask(id);
  }, []);

  const addSiteLog = useCallback(async (log: SiteLogEntry) => {
    setSiteLogs(prev => upsert(prev, log));
    await dataService.saveSiteLog(log);
  }, []);

  const deleteSiteLog = useCallback(async (id: string) => {
    setSiteLogs(prev => (prev || []).filter(l => l.id !== id));
    await dataService.deleteSiteLog(id);
  }, []);

  const addIncident = useCallback(async (inc: Incident) => {
    setIncidents(prev => upsert(prev, inc));
    await dataService.saveIncident(inc);
  }, []);
  
  const updateIncident = useCallback(async (inc: Incident) => {
    setIncidents(prev => (prev || []).map(i => i.id === inc.id ? inc : i));
    await dataService.saveIncident(inc);
  }, []);

  const deleteIncident = useCallback(async (id: string) => {
    setIncidents(prev => (prev || []).filter(i => i.id !== id));
    await dataService.deleteIncident(id);
  }, []);

  const addFirstAid = useCallback(async (log: FirstAidLogEntry) => {
    setFirstAidLogs(prev => upsert(prev, log));
    await dataService.saveFirstAidLog(log);
  }, []);

  const deleteFirstAid = useCallback(async (id: string) => {
    setFirstAidLogs(prev => (prev || []).filter(l => l.id !== id));
    await dataService.deleteFirstAidLog(id);
  }, []);

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

  const updateOrgProfile = useCallback(async (p: OrganisationProfile) => {
    setOrgProfile(p);
    await dataService.saveOrgProfile(p);
  }, []);

  const updateSystemPreferences = useCallback(async (p: SystemPreferences) => {
    setSystemPreferences(p);
    await dataService.saveSystemPreferences(p);
  }, []);

  const clockIn = useCallback(async () => {
    if (!currentUser || activeShift) return;
    const newShift: TimeLogEntry = { 
        id: `shift_${Date.now()}`, userId: currentUser.id, userName: currentUser.name, 
        startTime: Date.now(), date: new Date().toISOString().split('T')[0], status: 'Active' 
    };
    setActiveShift(newShift);
    setTimeLogs(prev => [newShift, ...(prev || [])]);
    await dataService.saveTimeLog(newShift);
  }, [currentUser, activeShift]);

  const clockOut = useCallback(async () => {
    if (!currentUser || !activeShift) return;
    const now = Date.now();
    const diffMins = Math.floor((now - activeShift.startTime) / 60000);
    const completed: TimeLogEntry = { ...activeShift, endTime: now, durationMinutes: diffMins, status: 'Completed' };
    setActiveShift(null);
    setTimeLogs(prev => (prev || []).map(l => l.id === activeShift.id ? completed : l));
    await dataService.saveTimeLog(completed);
  }, [currentUser, activeShift]);

  const deleteTimeLog = useCallback(async (id: string) => {
    setTimeLogs(prev => (prev || []).filter(l => l.id !== id));
    await dataService.deleteTimeLog(id);
  }, []);

  const addHoliday = useCallback(async (req: HolidayRequest) => {
    setHolidayRequests(prev => [req, ...(prev || [])]);
    await dataService.saveHolidayRequest(req);
  }, []);

  const updateHoliday = useCallback(async (req: HolidayRequest) => {
    setHolidayRequests(prev => (prev || []).map(r => r.id === req.id ? req : r));
    await dataService.saveHolidayRequest(req);
  }, []);

  const deleteHoliday = useCallback(async (id: string) => {
    setHolidayRequests(prev => (prev || []).filter(r => r.id !== id));
    await dataService.deleteHolidayRequest(id);
  }, []);

  const importAnimals = useCallback(async (imported: Animal[]) => {
    setAnimals(imported);
    await dataService.importAnimals(imported);
  }, []);

  const contextValue = {
    currentUser, users, animals, tasks, siteLogs, incidents, firstAidLogs, timeLogs,
    holidayRequests, foodOptions, feedMethods, eventTypes, locations, contacts,
    orgProfile, systemPreferences, sortOption, isOrderLocked, activeShift, isOffline,
    login, logout, setSortOption, toggleOrderLock, clockIn, clockOut,
    updateAnimal, addAnimal, deleteAnimal, reorderAnimals,
    addTask, addTasks, updateTask, deleteTask, addSiteLog, deleteSiteLog,
    addIncident, updateIncident, deleteIncident, addFirstAid, deleteFirstAid,
    updateUsers, updateFoodOptions, updateFeedMethods, updateEventTypes,
    updateLocations, updateContacts, updateOrgProfile, updateSystemPreferences,
    addHoliday, updateHoliday, deleteHoliday, deleteTimeLog, importAnimals
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
