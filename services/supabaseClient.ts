
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// Go to Supabase Dashboard -> Project Settings -> API
// Paste your Project URL and anon Key below.

const SUPABASE_URL = 'https://eetqpjxuksdzumqlpefk.supabase.co'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_gBrYeZM0aSPbmNckgBpQZw_t3tiRPnW'; // Replace with your 'anon' public key

if (SUPABASE_URL.includes('your-project-id')) {
    console.warn('⚠️ Supabase URL not configured. Please update services/supabaseClient.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
