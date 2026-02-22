-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    role TEXT NOT NULL,
    pin TEXT NOT NULL, -- In a real app, this should be hashed
    active BOOLEAN DEFAULT true,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Animals Table
CREATE TABLE IF NOT EXISTS animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    archived BOOLEAN DEFAULT false,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    due_date TIMESTAMPTZ,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Logs Table
CREATE TABLE IF NOT EXISTS site_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- First Aid Logs Table
CREATE TABLE IF NOT EXISTS first_aid_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TEXT NOT NULL,
    person_name TEXT NOT NULL,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Logs Table
CREATE TABLE IF NOT EXISTS time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holiday Requests Table
CREATE TABLE IF NOT EXISTS holiday_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    status TEXT NOT NULL,
    jsonb_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC Function for Secure Login
CREATE OR REPLACE FUNCTION authenticate_user(p_user_id UUID, p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'initials', initials,
        'role', role,
        'active', active,
        'jsonb_data', jsonb_data
    ) INTO v_user
    FROM users
    WHERE id = p_user_id AND pin = p_pin AND active = true;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Invalid credentials or inactive user';
    END IF;

    RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_aid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Example: Authenticated users can read all, but only admins can modify users)
-- Note: In a real Supabase setup, you'd use auth.uid(). Since this app uses a custom PIN login, 
-- we might need to rely on the application logic or pass the role in the headers. 
-- For simplicity, we'll allow anon/authenticated roles to read/write, but in production, 
-- you'd tie this to Supabase Auth.

CREATE POLICY "Allow read access to all users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all access to animals" ON animals FOR ALL USING (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all access to site_logs" ON site_logs FOR ALL USING (true);
CREATE POLICY "Allow all access to incidents" ON incidents FOR ALL USING (true);
CREATE POLICY "Allow all access to first_aid_logs" ON first_aid_logs FOR ALL USING (true);
CREATE POLICY "Allow all access to time_logs" ON time_logs FOR ALL USING (true);
CREATE POLICY "Allow all access to holiday_requests" ON holiday_requests FOR ALL USING (true);
CREATE POLICY "Allow all access to settings" ON settings FOR ALL USING (true);
