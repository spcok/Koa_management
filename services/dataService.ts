
import { supabase } from './supabaseClient';
import { Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Contact, OrganisationProfile, Incident, FirstAidLogEntry, TimeLogEntry, GlobalDocument, AuditLogEntry, LocalBackupConfig, LocalBackupEntry, HolidayRequest, SystemPreferences } from '../types';
// Fix: Added DEFAULT_LOCAL_BACKUP_CONFIG to the imports from constants
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS, MOCK_ANIMALS, DEFAULT_SYSTEM_PREFERENCES, DEFAULT_EVENT_TYPES, DEFAULT_LOCAL_BACKUP_CONFIG } from '../constants';
import { RealtimeChannel } from '@supabase/supabase-js';

const DEFAULT_USERS: User[] = [
    { 
        id: 'u1', name: 'Duty Manager', initials: 'DM', role: UserRole.ADMIN, pin: '8888',
        jobPosition: 'Duty Manager',
        active: true,
        permissions: { 
            dashboard: true, dailyLog: true, tasks: true, medical: true, movements: true, 
            safety: true, maintenance: true, settings: true,
            flightRecords: true, feedingSchedule: true, attendance: true, attendanceManager: true, 
            holidayApprover: true, missingRecords: true, reports: true, rounds: true
        }
    },
    { 
        id: 'u2', name: 'Bird Team', initials: 'BT', role: UserRole.VOLUNTEER, pin: '1234',
        jobPosition: 'Keeper',
        active: true,
        permissions: { 
            dashboard: true, dailyLog: true, tasks: true, medical: false, movements: false, 
            safety: false, maintenance: true, settings: false,
            flightRecords: true, feedingSchedule: false, attendance: true, attendanceManager: false, 
            holidayApprover: false, missingRecords: false, reports: false, rounds: true
        }
    }
];

const CACHE_KEYS = {
    ANIMALS: 'koa_cache_animals',
    TASKS: 'koa_cache_tasks',
    USERS: 'koa_cache_users',
    SITE_LOGS: 'koa_cache_site_logs',
    INCIDENTS: 'koa_cache_incidents',
    FIRST_AID: 'koa_cache_first_aid',
    TIME_LOGS: 'koa_cache_time_logs',
    HOLIDAYS: 'koa_cache_holidays',
    SETTINGS: 'koa_cache_settings_prefix_'
};

const getLocal = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
};

const setLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn("Storage full or unavailable", e);
    }
};

const handleSupabaseError = (error: any, context: string) => {
    if (error?.code === 'PGRST204' || error?.code === 'PGRST205') {
        console.warn(`[Statutory Records] Table for ${context} is pending creation.`);
        return true; 
    }
    console.error(`[Supabase Critical] ${context}:`, error);
    return false;
};

export const dataService = {
    subscribeToAnimals: (onUpdate: (eventType: string, animal: Animal | string) => void): RealtimeChannel => {
        return supabase
            .channel('animals-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'animals' }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    onUpdate('DELETE', payload.old.id);
                } else {
                    onUpdate(payload.eventType, payload.new.json as Animal);
                }
            })
            .subscribe();
    },

    fetchAnimals: async (): Promise<Animal[]> => {
        try {
            const { data, error } = await supabase.from('animals').select('json');
            if (error) throw error;
            const animals = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.ANIMALS, animals);
            return animals;
        } catch (e) {
            handleSupabaseError(e, 'fetchAnimals');
            return getLocal(CACHE_KEYS.ANIMALS, MOCK_ANIMALS);
        }
    },

    saveAnimal: async (animal: Animal): Promise<void> => {
        // Optimistic local update of cache is handled by caller/AppProvider, 
        // but we ensure this call is resilient
        const { error } = await supabase.from('animals').upsert({ id: animal.id, json: animal });
        if (error) handleSupabaseError(error, 'saveAnimal');
    },

    saveAnimalsBulk: async (animals: Animal[]): Promise<void> => {
        const rows = animals.map(a => ({ id: a.id, json: a }));
        const { error } = await supabase.from('animals').upsert(rows);
        if (error) handleSupabaseError(error, 'saveAnimalsBulk');
    },

    deleteAnimal: async (id: string): Promise<void> => {
        const { error } = await supabase.from('animals').delete().eq('id', id);
        if (error) handleSupabaseError(error, 'deleteAnimal');
    },

    fetchUsers: async (): Promise<User[]> => {
        try {
            const { data, error } = await supabase.from('users').select('json');
            if (error) throw error;
            const users = data && data.length > 0 ? data.map((row: any) => row.json) : DEFAULT_USERS;
            setLocal(CACHE_KEYS.USERS, users);
            return users;
        } catch (e) {
            handleSupabaseError(e, 'fetchUsers');
            return getLocal(CACHE_KEYS.USERS, DEFAULT_USERS);
        }
    },

    saveUsers: async (users: User[]): Promise<void> => {
        const rows = users.map(u => ({ id: u.id, json: u }));
        const { error } = await supabase.from('users').upsert(rows);
        if (error) throw error;
    },

    importAnimals: async (animals: Animal[]): Promise<void> => {
        await dataService.saveAnimalsBulk(animals);
    },

    fetchTasks: async (): Promise<Task[]> => {
        try {
            const { data, error } = await supabase.from('tasks').select('json');
            if (error) throw error;
            const tasks = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.TASKS, tasks);
            return tasks;
        } catch (e) {
            handleSupabaseError(e, 'fetchTasks');
            return getLocal(CACHE_KEYS.TASKS, []);
        }
    },

    saveTasks: async (tasks: Task[]): Promise<void> => {
        const rows = tasks.map(t => ({ id: t.id, json: t }));
        const { error } = await supabase.from('tasks').upsert(rows);
        if (error) throw error;
    },
    
    deleteTask: async (id: string): Promise<void> => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
    },

    fetchSiteLogs: async (): Promise<SiteLogEntry[]> => {
        try {
            const { data, error } = await supabase.from('site_logs').select('json');
            if (error) throw error;
            const logs = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.SITE_LOGS, logs);
            return logs;
        } catch (e) {
            handleSupabaseError(e, 'fetchSiteLogs');
            return getLocal(CACHE_KEYS.SITE_LOGS, []);
        }
    },

    saveSiteLog: async (log: SiteLogEntry): Promise<void> => {
        const { error } = await supabase.from('site_logs').upsert({ id: log.id, json: log });
        if (error) throw error;
        
        // Update local cache
        const currentLogs = getLocal<SiteLogEntry[]>(CACHE_KEYS.SITE_LOGS, []);
        const index = currentLogs.findIndex(l => l.id === log.id);
        if (index > -1) {
            currentLogs[index] = log;
        } else {
            currentLogs.unshift(log);
        }
        setLocal(CACHE_KEYS.SITE_LOGS, currentLogs);
    },

    deleteSiteLog: async (id: string): Promise<void> => {
        const { error } = await supabase.from('site_logs').delete().eq('id', id);
        if (error) throw error;
    },

    fetchIncidents: async (): Promise<Incident[]> => {
        try {
            const { data, error } = await supabase.from('incidents').select('json');
            if (error) throw error;
            const incidents = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.INCIDENTS, incidents);
            return incidents;
        } catch (e) {
            handleSupabaseError(e, 'fetchIncidents');
            return getLocal(CACHE_KEYS.INCIDENTS, []);
        }
    },

    saveIncident: async (incident: Incident): Promise<void> => {
        const { error } = await supabase.from('incidents').upsert({ id: incident.id, json: incident });
        if (error) throw error;
    },

    deleteIncident: async (id: string): Promise<void> => {
        const { error } = await supabase.from('incidents').delete().eq('id', id);
        if (error) throw error;
    },

    fetchFirstAidLogs: async (): Promise<FirstAidLogEntry[]> => {
        try {
            const { data, error } = await supabase.from('first_aid_logs').select('json');
            if (error) throw error;
            const logs = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.FIRST_AID, logs);
            return logs;
        } catch (e) {
            handleSupabaseError(e, 'fetchFirstAidLogs');
            return getLocal(CACHE_KEYS.FIRST_AID, []);
        }
    },

    saveFirstAidLog: async (log: FirstAidLogEntry): Promise<void> => {
        const { error } = await supabase.from('first_aid_logs').upsert({ id: log.id, json: log });
        if (error) throw error;
    },

    deleteFirstAidLog: async (id: string): Promise<void> => {
        const { error } = await supabase.from('first_aid_logs').delete().eq('id', id);
        if (error) throw error;
    },

    fetchTimeLogs: async (): Promise<TimeLogEntry[]> => {
        try {
            const { data, error } = await supabase.from('time_logs').select('json');
            if (error) throw error;
            const logs = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.TIME_LOGS, logs);
            return logs;
        } catch (e) {
            handleSupabaseError(e, 'fetchTimeLogs');
            return getLocal(CACHE_KEYS.TIME_LOGS, []);
        }
    },

    saveTimeLog: async (log: TimeLogEntry): Promise<void> => {
        const { error } = await supabase.from('time_logs').upsert({ id: log.id, json: log });
        if (error) throw error;
    },

    deleteTimeLog: async (id: string): Promise<void> => {
        const { error } = await supabase.from('time_logs').delete().eq('id', id);
        if (error) throw error;
    },

    fetchHolidayRequests: async (): Promise<HolidayRequest[]> => {
        try {
            const { data, error } = await supabase.from('holiday_requests').select('json');
            if (error) throw error;
            const logs = (data || []).map((row: any) => row.json);
            setLocal(CACHE_KEYS.HOLIDAYS, logs);
            return logs;
        } catch (e) {
            handleSupabaseError(e, 'fetchHolidayRequests');
            return getLocal(CACHE_KEYS.HOLIDAYS, []);
        }
    },

    saveHolidayRequest: async (req: HolidayRequest): Promise<void> => {
        const { error } = await supabase.from('holiday_requests').upsert({ id: req.id, json: req });
        if (error) throw error;
    },

    deleteHolidayRequest: async (id: string): Promise<void> => {
        const { error } = await supabase.from('holiday_requests').delete().eq('id', id);
        if (error) throw error;
    },

    fetchGlobalDocuments: async (): Promise<GlobalDocument[]> => {
        const { data, error } = await supabase.from('global_documents').select('json');
        if (error) { handleSupabaseError(error, 'fetchGlobalDocuments'); return []; }
        return (data || []).map((row: any) => row.json);
    },

    saveGlobalDocument: async (doc: GlobalDocument): Promise<void> => {
        const { error } = await supabase.from('global_documents').upsert({ id: doc.id, json: doc });
        if (error) throw error;
    },

    deleteGlobalDocument: async (id: string): Promise<void> => {
        const { error } = await supabase.from('global_documents').delete().eq('id', id);
        if (error) throw error;
    },

    fetchAuditLogs: async (): Promise<AuditLogEntry[]> => {
        const { data, error } = await supabase.from('audit_logs').select('json');
        if (error) { handleSupabaseError(error, 'fetchAuditLogs'); return []; }
        return (data || []).map((row: any) => row.json);
    },

    saveAuditLog: async (entry: AuditLogEntry): Promise<void> => {
        const { error } = await supabase.from('audit_logs').upsert({ id: entry.id, json: entry });
        if (error) throw error;
    },

    fetchLocalBackups: async (): Promise<LocalBackupEntry[]> => {
        const { data, error } = await supabase.from('local_backups').select('json');
        if (error) { handleSupabaseError(error, 'fetchLocalBackups'); return []; }
        return (data || []).map((row: any) => row.json).sort((a, b) => b.timestamp - a.timestamp);
    },

    saveLocalBackup: async (entry: LocalBackupEntry): Promise<void> => {
        const { error } = await supabase.from('local_backups').upsert({ id: entry.id, json: entry });
        if (error) throw error;
    },

    deleteLocalBackup: async (id: string): Promise<void> => {
        const { error } = await supabase.from('local_backups').delete().eq('id', id);
        if (error) throw error;
    },

    fetchSettingsKey: async (key: string, defaultValue: any): Promise<any> => {
        try {
            const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
            if (error && error.code !== 'PGRST116') throw error;
            const value = data ? data.value : defaultValue;
            setLocal(`${CACHE_KEYS.SETTINGS}${key}`, value);
            return value;
        } catch (e) {
            handleSupabaseError(e, `fetchSettings:${key}`);
            return getLocal(`${CACHE_KEYS.SETTINGS}${key}`, defaultValue);
        }
    },

    saveSettingsKey: async (key: string, value: any): Promise<void> => {
        const { error } = await supabase.from('settings').upsert({ key, value });
        if (error) throw error;
    },

    fetchFoodOptions: async () => dataService.fetchSettingsKey('food_options', DEFAULT_FOOD_OPTIONS),
    saveFoodOptions: async (val: any) => dataService.saveSettingsKey('food_options', val),

    fetchFeedMethods: async () => dataService.fetchSettingsKey('feed_methods', DEFAULT_FEED_METHODS),
    saveFeedMethods: async (val: any) => dataService.saveSettingsKey('feed_methods', val),

    fetchEventTypes: async () => dataService.fetchSettingsKey('event_types', DEFAULT_EVENT_TYPES),
    saveEventTypes: async (val: string[]) => dataService.saveSettingsKey('event_types', val),

    fetchLocations: async () => dataService.fetchSettingsKey('locations', []),
    saveLocations: async (val: string[]) => dataService.saveSettingsKey('locations', val),

    fetchContacts: async () => dataService.fetchSettingsKey('contacts', []),
    saveContacts: async (val: Contact[]) => dataService.saveSettingsKey('contacts', val),

    fetchOrgProfile: async () => dataService.fetchSettingsKey('org_profile', null),
    saveOrgProfile: async (val: OrganisationProfile) => dataService.saveSettingsKey('org_profile', val),

    fetchLocalBackupConfig: async (): Promise<LocalBackupConfig> => dataService.fetchSettingsKey('local_backup_config', DEFAULT_LOCAL_BACKUP_CONFIG),
    saveLocalBackupConfig: async (val: LocalBackupConfig) => dataService.saveSettingsKey('local_backup_config', val),

    fetchSystemPreferences: async (): Promise<SystemPreferences> => dataService.fetchSettingsKey('system_preferences', DEFAULT_SYSTEM_PREFERENCES),
    saveSystemPreferences: async (val: SystemPreferences) => dataService.saveSettingsKey('system_preferences', val),
};
