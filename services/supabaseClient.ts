
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// These keys are safe for client-side use in Supabase.
// In a real production build, use process.env.VITE_SUPABASE_URL

const SUPABASE_URL = 'https://eetqpjxuksdzumqlpefk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gBrYeZM0aSPbmNckgBpQZw_t3tiRPnW';

if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-id')) {
    console.error('CRITICAL: Supabase URL is not configured. Database operations will fail.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
