-- RPC Function to create a new Store and Admin user
-- This function is called AFTER the user is created in Supabase Auth (via signUp).
-- usage: await supabase.rpc('create_new_store', { store_name: 'Minha Loja' })

CREATE OR REPLACE FUNCTION create_new_store(store_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
DECLARE
    new_store_id UUID;
    user_id UUID;
    new_slug TEXT;
BEGIN
    -- Get the ID of the currently authenticated user
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Generate a simple slug from name (simplified)
    new_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9]+', '-', 'g'));

    -- Check if user already has a profile/store? 
    -- For now, allow multiple stores or just one. Let's assume one for simplicity of this wizard.

    -- 1. Create Store
    INSERT INTO stores (name, slug, owner_id)
    VALUES (store_name, new_slug || '-' || substr(md5(random()::text), 1, 4), user_id)
    RETURNING id INTO new_store_id;

    -- 2. Create Profile for this user linked to the store
    INSERT INTO profiles (id, role, store_id, name)
    VALUES (user_id, 'store_admin', new_store_id, 'Admin')
    ON CONFLICT (id) DO UPDATE 
    SET store_id = new_store_id, role = 'store_admin'; 
    -- If profile existed (e.g. from previous attempts), update it.

    RETURN jsonb_build_object('store_id', new_store_id, 'store_name', store_name);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_new_store TO authenticated;

-- RPC Function to fetch global admin metrics in a single round-trip
CREATE OR REPLACE FUNCTION get_admin_global_metrics(p_start_date DATE, p_end_date DATE)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH appointments AS (
    SELECT date, status, result, value, store_id
    FROM appointments
    WHERE date BETWEEN p_start_date AND p_end_date
),
tasks AS (
    SELECT status, xp_reward, staff_id, store_id
    FROM task_occurrences
    WHERE date BETWEEN p_start_date AND p_end_date
),
leads AS (
    SELECT status
    FROM leads
    WHERE created_at BETWEEN p_start_date AND (p_end_date + INTERVAL '1 day' - INTERVAL '1 second')
),
appointments_stats AS (
    SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'AGENDADO') AS scheduled,
        COUNT(*) FILTER (WHERE status = 'COMPARECEU') AS attended,
        COUNT(*) FILTER (WHERE status = 'FALTOU') AS missed,
        COUNT(*) FILTER (WHERE status = 'CANCELADO') AS cancelled,
        COALESCE(SUM(CASE WHEN result = 'COMPROU' THEN value ELSE 0 END), 0) AS revenue
    FROM appointments
),
revenue_trend AS (
    SELECT date, COALESCE(SUM(CASE WHEN result = 'COMPROU' THEN value ELSE 0 END), 0) AS revenue
    FROM appointments
    GROUP BY date
    ORDER BY date
),
task_stats AS (
    SELECT
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'FEITA') AS done_tasks
    FROM tasks
),
lead_stats AS (
    SELECT
        COUNT(*) AS total_leads,
        COUNT(*) FILTER (
            WHERE UPPER(status) IN ('AGENDADO', 'QUALIFICADO', 'COMPARECEU', 'COMPROU')
        ) AS converted_leads
    FROM leads
),
xp_ranking AS (
    SELECT
        staff_id,
        store_id,
        SUM(CASE WHEN status = 'FEITA' THEN COALESCE(xp_reward, 10) ELSE 0 END) AS xp
    FROM tasks
    WHERE staff_id IS NOT NULL
    GROUP BY staff_id, store_id
    ORDER BY xp DESC
    LIMIT 5
),
top_performers AS (
    SELECT
        xp_ranking.staff_id AS id,
        COALESCE(profiles.name, 'Desconhecido') AS name,
        COALESCE(stores.name, 'Loja') AS store_name,
        xp_ranking.xp
    FROM xp_ranking
    LEFT JOIN profiles ON profiles.id = xp_ranking.staff_id
    LEFT JOIN stores ON stores.id = xp_ranking.store_id
)
SELECT jsonb_build_object(
    'totalRevenue', (SELECT revenue FROM appointments_stats),
    'totalAppointments', (SELECT total FROM appointments_stats),
    'totalClients', (SELECT COUNT(*) FROM clients),
    'activeStores', (SELECT COUNT(*) FROM stores),
    'taskCompliance', CASE
        WHEN (SELECT total_tasks FROM task_stats) > 0
        THEN (SELECT done_tasks FROM task_stats)::numeric / (SELECT total_tasks FROM task_stats) * 100
        ELSE 0
    END,
    'leadConversion', CASE
        WHEN (SELECT total_leads FROM lead_stats) > 0
        THEN (SELECT converted_leads FROM lead_stats)::numeric / (SELECT total_leads FROM lead_stats) * 100
        ELSE 0
    END,
    'appointmentsByStatus', jsonb_build_object(
        'scheduled', (SELECT scheduled FROM appointments_stats),
        'attended', (SELECT attended FROM appointments_stats),
        'missed', (SELECT missed FROM appointments_stats),
        'cancelled', (SELECT cancelled FROM appointments_stats)
    ),
    'revenueTrend', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('date', date, 'revenue', revenue)) FROM revenue_trend),
        '[]'::jsonb
    ),
    'topPerformers', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'storeName', store_name, 'xp', xp)) FROM top_performers),
        '[]'::jsonb
    )
);
$$;

GRANT EXECUTE ON FUNCTION get_admin_global_metrics TO authenticated;

-- RPC Function to fetch store performance in a single query
CREATE OR REPLACE FUNCTION get_store_performance(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    revenue NUMERIC,
    appointments BIGINT,
    conversion_rate NUMERIC,
    ticket NUMERIC,
    missed BIGINT,
    missed_rate NUMERIC,
    cancelled BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH store_apps AS (
    SELECT
        stores.id,
        stores.name,
        stores.slug,
        appointments.status,
        appointments.result,
        appointments.value
    FROM stores
    LEFT JOIN appointments
        ON appointments.store_id = stores.id
        AND appointments.date BETWEEN p_start_date AND p_end_date
)
SELECT
    id,
    name,
    slug,
    COALESCE(SUM(CASE WHEN result = 'COMPROU' THEN value ELSE 0 END), 0) AS revenue,
    COUNT(status) AS appointments,
    CASE
        WHEN COUNT(*) FILTER (WHERE status = 'COMPARECEU') > 0
        THEN (COUNT(*) FILTER (WHERE result = 'COMPROU')::numeric / COUNT(*) FILTER (WHERE status = 'COMPARECEU')) * 100
        ELSE 0
    END AS conversion_rate,
    CASE
        WHEN COUNT(*) FILTER (WHERE result = 'COMPROU') > 0
        THEN COALESCE(SUM(CASE WHEN result = 'COMPROU' THEN value ELSE 0 END), 0) / COUNT(*) FILTER (WHERE result = 'COMPROU')
        ELSE 0
    END AS ticket,
    COUNT(*) FILTER (WHERE status = 'FALTOU') AS missed,
    CASE
        WHEN COUNT(*) FILTER (WHERE status = 'COMPARECEU') + COUNT(*) FILTER (WHERE status = 'FALTOU') > 0
        THEN (COUNT(*) FILTER (WHERE status = 'FALTOU')::numeric
            / (COUNT(*) FILTER (WHERE status = 'COMPARECEU') + COUNT(*) FILTER (WHERE status = 'FALTOU'))) * 100
        ELSE 0
    END AS missed_rate,
    COUNT(*) FILTER (WHERE status = 'CANCELADO') AS cancelled
FROM store_apps
GROUP BY id, name, slug
ORDER BY revenue DESC;
$$;

GRANT EXECUTE ON FUNCTION get_store_performance TO authenticated;

-- RPC Function to fetch monthly task ranking
CREATE OR REPLACE FUNCTION get_task_ranking(p_start_date DATE, p_end_date DATE, p_store_id UUID DEFAULT NULL)
RETURNS TABLE (
    staff_id UUID,
    store_id UUID,
    total_xp NUMERIC,
    tasks_total BIGINT,
    tasks_done BIGINT,
    tasks_postponed BIGINT,
    tasks_delayed BIGINT,
    execution_rate NUMERIC,
    staff_name TEXT,
    store_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH filtered_occurrences AS (
    SELECT
        staff_id,
        store_id,
        status,
        COALESCE(xp_reward, 10) AS xp_reward
    FROM task_occurrences
    WHERE date BETWEEN p_start_date AND p_end_date
        AND staff_id IS NOT NULL
        AND (p_store_id IS NULL OR store_id = p_store_id)
),
agg AS (
    SELECT
        staff_id,
        store_id,
        COUNT(*) AS tasks_total,
        COUNT(*) FILTER (WHERE status = 'FEITA') AS tasks_done,
        COUNT(*) FILTER (WHERE status = 'ADIADA') AS tasks_postponed,
        COUNT(*) FILTER (WHERE status = 'ATRASA') AS tasks_delayed,
        SUM(CASE WHEN status = 'FEITA' THEN xp_reward ELSE 0 END) AS total_xp
    FROM filtered_occurrences
    GROUP BY staff_id, store_id
)
SELECT
    agg.staff_id,
    agg.store_id,
    agg.total_xp,
    agg.tasks_total,
    agg.tasks_done,
    agg.tasks_postponed,
    agg.tasks_delayed,
    CASE
        WHEN agg.tasks_total > 0
        THEN (agg.tasks_done::numeric / agg.tasks_total) * 100
        ELSE 0
    END AS execution_rate,
    COALESCE(profiles.name, 'Desconhecido') AS staff_name,
    COALESCE(stores.name, '-') AS store_name
FROM agg
LEFT JOIN profiles ON profiles.id = agg.staff_id
LEFT JOIN stores ON stores.id = agg.store_id
ORDER BY total_xp DESC, execution_rate DESC;
$$;

GRANT EXECUTE ON FUNCTION get_task_ranking TO authenticated;
