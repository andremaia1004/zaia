
-- Dashboard Optimization: Consolidated Metrics RPC
-- This function calculates ALL dashboard metrics in a single database pass,
-- significantly reducing latency and data transfer.

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_store_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_scheduled INT;
    v_attended INT;
    v_missed INT;
    v_sales INT;
    v_revenue NUMERIC;
    v_total_tasks INT;
    v_completed_tasks INT;
    v_ranking JSON;
BEGIN
    -- 1. Appointment Metrics
    SELECT 
        COUNT(*) FILTER (WHERE status = 'AGENDADO'),
        COUNT(*) FILTER (WHERE status = 'COMPARECEU'),
        COUNT(*) FILTER (WHERE status = 'FALTOU'),
        COUNT(*) FILTER (WHERE result = 'COMPROU'),
        COALESCE(SUM(value) FILTER (WHERE result = 'COMPROU'), 0)
    INTO v_scheduled, v_attended, v_missed, v_sales, v_revenue
    FROM appointments
    WHERE store_id = p_store_id
    AND date >= p_start_date
    AND date <= p_end_date;

    -- 2. Task Metrics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'FEITA')
    INTO v_total_tasks, v_completed_tasks
    FROM task_occurrences
    WHERE store_id = p_store_id
    AND date >= p_start_date
    AND date <= p_end_date;

    -- 3. Top Ranking (XP)
    SELECT json_agg(rank_item)
    INTO v_ranking
    FROM (
        SELECT 
            p.id,
            p.name,
            SUM(t.xp_reward) as score
        FROM task_occurrences t
        JOIN profiles p ON t.staff_id = p.id
        WHERE t.store_id = p_store_id
        AND t.status = 'FEITA'
        AND t.date >= p_start_date
        AND t.date <= p_end_date
        GROUP BY p.id, p.name
        ORDER BY score DESC
        LIMIT 3
    ) rank_item;

    -- 4. Combine into single JSON
    result := json_build_object(
        'metrics', json_build_object(
            'scheduled', v_scheduled,
            'attended', v_attended,
            'missed', v_missed,
            'sales', v_sales,
            'revenue', v_revenue,
            'totalTasks', v_total_tasks,
            'completedTasks', v_completed_tasks
        ),
        'ranking', COALESCE(v_ranking, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
