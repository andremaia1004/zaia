import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays, eachDayOfInterval } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') // 'weekly' or 'monthly' or 'scoring'

        if (type === 'weekly') {
            return await generateWeeklyOccurrences()
        } else if (type === 'monthly') {
            return await generateMonthlyOccurrences()
        } else if (type === 'scoring') {
            return await calculatePreviousWeekScores()
        } else if (type === 'daily') {
            return await cleanupDailyTasks()
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    } catch (error: any) {
        console.error('Job error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

async function generateWeeklyOccurrences() {
    // 1. Get current time in Brazil
    const nowUtc = new Date()
    const nowBr = toZonedTime(nowUtc, TIMEZONE)

    // 2. Determine week boundaries in Brazil Time
    // We want the Start of the Week relative to Brazil time.
    // However, date-fns `startOfWeek` operates on the Date object's local time (or UTC if naive).
    // To generate "yyyy-MM-dd" correctly, we just need the "date part" of the Brazil time.

    // Let's rely on the fact that toZonedTime gives us a Date instance representing the time in that zone.
    // CAUTION: date-fns v4 / date-fns-tz v3 changes. 
    // Assuming standard usage: get the date string in SP, then parse it? 
    // Easier: Work with date STRINGS as primary truth for "days".

    const todayStr = format(nowBr, 'yyyy-MM-dd')
    const todayDate = new Date(todayStr + 'T00:00:00') // Local midnight representation of the Brazil Date

    const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(todayDate, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    // 3. Get all active daily, weekly and once assignments
    const { data: assignments, error } = await supabaseAdmin
        .from('task_assignments')
        .select(`
            *,
            task_templates!inner(title, recurrence, target_value, default_due_time, xp_reward)
        `)
        .eq('active', true)
        .in('task_templates.recurrence', ['daily', 'weekly', 'once'])

    if (error) throw error

    const occurrences: any[] = []

    for (const assign of assignments) {
        const template = assign.task_templates

        // Helper to create timestamp in Brazil time, then saved as ISO
        const getDueAtIso = (dateStr: string, timeStr: string | null) => {
            if (!timeStr) return null
            // Construct string "2026-01-01T10:00:00"
            const dateTimeStr = `${dateStr}T${timeStr}`
            // Treat this as Brazil time. 
            // Since we want to store absolute time in DB (timestamptz), we need to offset it?
            // Actually, `task_occurrences.due_at` is TIMESTAMPTZ. 
            // If we store "2026-01-01T10:00:00Z", it's 10AM UTC. 10AM BRT is 13PM UTC.
            // We should ideally calculate the correct ISO string for "10:00 BRT" on that day.
            // But for simplicity/robustness, if the server is UTC, `new Date("2026-01-01T10:00:00-03:00")` works.
            return new Date(`${dateTimeStr}-03:00`).toISOString() // Hardcoded BRT offset for simplicity or use date-fns-tz format
        }

        if (template.recurrence === 'daily') {
            for (const day of weekDays) {
                const dayStr = format(day, 'yyyy-MM-dd')
                const dueAt = getDueAtIso(dayStr, template.default_due_time)

                // Overdue logic: Check if Now (Brazil) > dueAt (Brazil)
                // Actually dueAt is ISO.
                const isOverdue = dueAt && new Date(dueAt) < nowUtc

                occurrences.push({
                    assignment_id: assign.id,
                    title: template.title,
                    date: dayStr,
                    due_at: dueAt,
                    target_value: template.target_value,
                    staff_id: assign.staff_id,
                    store_id: assign.store_id,
                    status: isOverdue ? 'ATRASA' : 'PENDENTE',
                    xp_reward: template.xp_reward || 10
                })
            }
        } else if (template.recurrence === 'weekly') {
            const weekStartStr = format(weekStart, 'yyyy-MM-dd')
            const dueAt = getDueAtIso(weekStartStr, template.default_due_time)
            const isOverdue = dueAt && new Date(dueAt) < nowUtc

            occurrences.push({
                assignment_id: assign.id,
                title: template.title,
                date: weekStartStr,
                due_at: dueAt,
                target_value: template.target_value,
                staff_id: assign.staff_id,
                store_id: assign.store_id,
                status: isOverdue ? 'ATRASA' : 'PENDENTE',
                xp_reward: template.xp_reward || 10
            })
        } else if (template.recurrence === 'once') {
            // "once" tasks: Create for "today" (or week start) if not exists
            // Better: Create for Today if generated daily, or Week Start if generated weekly.
            // Keeping logic aligned with Weekly job:
            const targetDateStr = format(weekStart, 'yyyy-MM-dd')
            const dueAt = getDueAtIso(targetDateStr, template.default_due_time)
            const isOverdue = dueAt && new Date(dueAt) < nowUtc

            occurrences.push({
                assignment_id: assign.id,
                title: template.title,
                date: targetDateStr,
                due_at: dueAt,
                target_value: template.target_value,
                staff_id: assign.staff_id,
                store_id: assign.store_id,
                status: isOverdue ? 'ATRASA' : 'PENDENTE',
                xp_reward: template.xp_reward || 10
            })
        }
    }

    if (occurrences.length > 0) {
        const { error: insertError } = await supabaseAdmin
            .from('task_occurrences')
            .upsert(occurrences, { onConflict: 'assignment_id,date' })

        if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, count: occurrences.length, timezone: TIMEZONE })
}

async function generateMonthlyOccurrences() {
    const today = new Date()
    const monthStart = startOfMonth(today)

    const { data: assignments, error } = await supabaseAdmin
        .from('task_assignments')
        .select(`
            *,
            task_templates!inner(title, recurrence, target_value, default_due_time, xp_reward)
        `)
        .eq('active', true)
        .eq('task_templates.recurrence', 'monthly')

    if (error) throw error

    const occurrences = assignments.map(assign => ({
        assignment_id: assign.id,
        title: assign.task_templates.title,
        date: format(monthStart, 'yyyy-MM-dd'),
        due_at: assign.task_templates.default_due_time ? `${format(monthStart, 'yyyy-MM-dd')}T${assign.task_templates.default_due_time}` : null,
        target_value: assign.task_templates.target_value,
        staff_id: assign.staff_id,
        store_id: assign.store_id,
        status: 'PENDENTE',
        xp_reward: assign.task_templates.xp_reward || 10
    }))

    if (occurrences.length > 0) {
        const { error: insertError } = await supabaseAdmin
            .from('task_occurrences')
            .upsert(occurrences, { onConflict: 'assignment_id,date' })

        if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, count: occurrences.length })
}

async function calculatePreviousWeekScores() {
    const lastWeek = addDays(new Date(), -7)
    const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    // 0. Update past-due PENDENTE tasks to ATRASA (Safety net)
    await cleanupDailyTasks()
    const { data: staffIds } = await supabaseAdmin
        .from('task_occurrences')
        .select('staff_id, store_id')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .not('staff_id', 'is', null)

    const uniqueStaff = Array.from(new Set((staffIds || []).map(s => `${s.staff_id}|${s.store_id}`)))

    const scores = []

    for (const staffKey of uniqueStaff) {
        const [staffId, storeId] = staffKey.split('|')

        const { data: tasks } = await supabaseAdmin
            .from('task_occurrences')
            .select('*')
            .eq('staff_id', staffId)
            .gte('date', weekStartStr)
            .lte('date', weekEndStr)

        if (!tasks || tasks.length === 0) continue

        const done = tasks.filter(t => t.status === 'FEITA').length
        const postponed = tasks.filter(t => t.status === 'ADIADA').length
        const delayed = tasks.filter(t => t.status === 'ATRASA').length
        const total = tasks.length
        const rate = total > 0 ? (done / total) * 100 : 0

        // XP Calculation: Sum of XP from completed tasks
        const exp = tasks
            .filter(t => t.status === 'FEITA')
            .reduce((sum, t) => sum + (t.xp_reward || 10), 0)

        // Previous bonus logic deprecated
        const metBonus = false
        const bonusValue = 0

        scores.push({
            staff_id: staffId,
            store_id: storeId,
            week_start_date: weekStartStr,
            execution_rate: rate,
            tasks_done: done,
            tasks_postponed: postponed,
            tasks_delayed: delayed,
            met_bonus: metBonus,
            bonus_value: bonusValue,
            total_xp: exp
        })
    }

    if (scores.length > 0) {
        const { error: insertError } = await supabaseAdmin
            .from('weekly_scores')
            .upsert(scores, { onConflict: 'staff_id,week_start_date' })

        if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, count: scores.length })
}

async function cleanupDailyTasks() {
    const now = new Date().toISOString()

    // Mark as ATRASA if due_at is passed and status is PENDENTE
    const { data, error } = await supabaseAdmin
        .from('task_occurrences')
        .update({ status: 'ATRASA' })
        .eq('status', 'PENDENTE')
        .lt('due_at', now)
        .not('due_at', 'is', null)
        .select()

    if (error) throw error

    return NextResponse.json({ success: true, updated: data?.length || 0 })
}
