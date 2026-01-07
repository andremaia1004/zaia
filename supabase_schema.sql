-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFESSIONALS
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Optional link to Supabase Auth
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Optometrista', 'Consultor', 'Recepção', 'Admin'
    active BOOLEAN DEFAULT true,
    store_id TEXT, -- Multi-tenant support if needed later
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. CLIENTS
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE, -- Normalized BR format recommended
    observations TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. APPOINTMENTS
CREATE TYPE appointment_status AS ENUM ('AGENDADO', 'COMPARECEU', 'FALTOU', 'REMARCADO', 'CANCELADO');
CREATE TYPE sales_result AS ENUM ('NAO_DEFINIDO', 'COMPROU', 'NAO_COMPROU');

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL, -- Date only, no time
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
    status appointment_status DEFAULT 'AGENDADO',
    result sales_result DEFAULT 'NAO_DEFINIDO',
    origin TEXT, -- 'WhatsApp', 'Instagram', 'Indicação'
    notes TEXT,
    value NUMERIC(10, 2), -- Valor da venda (se houver)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for Appointments
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_professional_date ON appointments(professional_id, date);

-- 4. LEADS (Kanban Support)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Novo', -- Configurable: 'Novo', 'Em contato', 'Agendou', 'Compareceu', 'Comprou', 'Perdido'
    channel TEXT,
    interest TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS POLICIES (Simple Setup)
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read everything (simplified for small teams)
-- Refine this later for "Professional sees only theirs" if strictly needed.
CREATE POLICY "Enable read access for all tables" ON professionals FOR SELECT USING (true);
CREATE POLICY "Enable read access for all tables" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable read access for all tables" ON appointments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all tables" ON leads FOR SELECT USING (true);

-- Policy: Authenticated users can insert/update
CREATE POLICY "Enable insert for authenticated users" ON professionals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON professionals FOR UPDATE USING (true);

CREATE POLICY "Enable insert for authenticated users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON clients FOR UPDATE USING (true);

CREATE POLICY "Enable insert for authenticated users" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON appointments FOR UPDATE USING (true);

CREATE POLICY "Enable insert for authenticated users" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON leads FOR UPDATE USING (true);
