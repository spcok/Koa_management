
import { supabase } from './supabaseClient';
import { Animal, AnimalCategory, Task, User, UserRole, SiteLogEntry, Contact, OrganizationProfile, Incident, FirstAidLogEntry, TimeLogEntry } from '../types';
import { DEFAULT_FOOD_OPTIONS, DEFAULT_FEED_METHODS, MOCK_ANIMALS } from '../constants';

const DEFAULT_USERS: User[] = [
    { 
        id: 'u1', name: 'Duty Manager', initials: 'DM', role: UserRole.ADMIN, pin: '8888',
        jobPosition: 'Duty Manager', active: true,
        permissions: { 
            dashboard: true, dailyLog: true, tasks: true, medical: true, movements: true, 
            safety: true, maintenance: true, reports: true, settings: true,
            flightRecords: true, feedingSchedule: true, attendance: true, attendanceManager: true, missingRecords: true
        }
    }
];

export const dataService = {
    fetchAnimals: async (): Promise<Animal[]> => {
        const { data, error } = await supabase.from('animals').select('json');
        if (error) return MOCK_ANIMALS;
        return data && data.length > 0 ? data.map((row: any) => row.json) : MOCK_ANIMALS;
    },
    saveAnimal: async (animal: Animal) => supabase.from('animals').upsert({ id: animal.id, json: animal }),
    saveAnimalsBulk: async (animals: Animal[]) => supabase.from('animals').upsert(animals.map(a => ({ id: a.id, json: a }))),
    deleteAnimal: async (id: string) => supabase.from('animals').delete().eq('id', id),
    fetchUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('users').select('json');
        if (error) return DEFAULT_USERS;
        return data && data.length > 0 ? data.map((row: any) => row.json) : DEFAULT_USERS;
    },
    saveUsers: async (users: User[]) => supabase.from('users').upsert(users.map(u => ({ id: u.id, json: u }))),
    fetchTasks: async () => { const { data } = await supabase.from('tasks').select('json'); return (data || []).map(r => r.json); },
    saveTasks: async (tasks: Task[]) => supabase.from('tasks').upsert(tasks.map(t => ({ id: t.id, json: t }))),
    deleteTask: async (id: string) => supabase.from('tasks').delete().eq('id', id),
    fetchTimeLogs: async () => { const { data } = await supabase.from('time_logs').select('json'); return (data || []).map(r => r.json); },
    saveTimeLog: async (log: TimeLogEntry) => supabase.from('time_logs').upsert({ id: log.id, json: log }),
    deleteTimeLog: async (id: string) => supabase.from('time_logs').delete().eq('id', id),
    fetchSettingsKey: async (key: string, defaultValue: any) => {
        const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
        if (error) return defaultValue;
        return data ? data.value : defaultValue;
    },
    saveSettingsKey: async (key: string, value: any) => supabase.from('settings').upsert({ key, value }),
    fetchFoodOptions: async () => dataService.fetchSettingsKey('food_options', DEFAULT_FOOD_OPTIONS),
    saveFoodOptions: async (val: any) => dataService.saveSettingsKey('food_options', val),
    fetchFeedMethods: async () => dataService.fetchSettingsKey('feed_methods', DEFAULT_FEED_METHODS),
    saveFeedMethods: async (val: any) => dataService.saveSettingsKey('feed_methods', val),
    fetchLocations: async () => dataService.fetchSettingsKey('locations', []),
    saveLocations: async (val: string[]) => dataService.saveSettingsKey('locations', val),
    fetchContacts: async () => dataService.fetchSettingsKey('contacts', []),
    saveContacts: async (val: Contact[]) => dataService.saveSettingsKey('contacts', val),
    fetchOrgProfile: async () => dataService.fetchSettingsKey('org_profile', null),
    saveOrgProfile: async (val: OrganizationProfile) => dataService.saveSettingsKey('org_profile', val),
    fetchSiteLogs: async () => { const { data } = await supabase.from('site_logs').select('json'); return (data || []).map(r => r.json); },
    saveSiteLog: async (l: any) => supabase.from('site_logs').upsert({ id: l.id, json: l }),
    deleteSiteLog: async (id: string) => supabase.from('site_logs').delete().eq('id', id),
    fetchIncidents: async () => { const { data } = await supabase.from('incidents').select('json'); return (data || []).map(r => r.json); },
    saveIncident: async (i: any) => supabase.from('incidents').upsert({ id: i.id, json: i }),
    deleteIncident: async (id: string) => supabase.from('incidents').delete().eq('id', id),
    fetchFirstAidLogs: async () => { const { data } = await supabase.from('first_aid_logs').select('json'); return (data || []).map(r => r.json); },
    saveFirstAidLog: async (l: any) => supabase.from('first_aid_logs').upsert({ id: l.id, json: l }),
    deleteFirstAidLog: async (id: string) => supabase.from('first_aid_logs').delete().eq('id', id),
    importAnimals: async (a: Animal[]) => dataService.saveAnimalsBulk(a)
};
