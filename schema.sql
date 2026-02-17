
-- Table: site_logs
-- Usage: Stores Daily Rounds, Maintenance Logs, and Safety Drills
-- The application stores the detailed checklist data inside the 'json' column.

CREATE TABLE IF NOT EXISTS public.site_logs (
    id text NOT NULL PRIMARY KEY,
    json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (Recommended)
ALTER TABLE public.site_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all access (Adjust if you need stricter public/private rules)
CREATE POLICY "Enable all access for authenticated users" ON public.site_logs
    FOR ALL USING (true) 
    WITH CHECK (true);
