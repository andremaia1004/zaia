import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays, eachDayOfInterval } from 'date-fns'

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
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    // 1. Get all active daily, weekly and once assignments
    const { data: assignments, error } = await supabaseAdmin
        .from('task_assignments')
        .select(`
            *,
            task_templates!inner(title, recurrence, target_value, default_due_time, xp_reward)
        `)
        .eq('active', true)
        .in('task_templates.recurrence', ['daily', 'weekly', 'once'])

    if (error) throw error

    // Helper to format due_at
    const withDueAt = (day: Date, time: string | null) => {
        if (!time) return null
        return `${format(day, 'yyyy-MM-dd')}T${time}`
    }

    const occurrences: any[] = []

    for (const assign of assignments) {
        const template = assign.task_templates
        if (template.recurrence === 'daily') {
            for (const day of weekDays) {
                const dueAt = withDueAt(day, template.default_due_time)
                const isOverdue = dueAt && new Date(dueAt) < new Date()
                occurrences.push({
                    assignment_id: assign.id,
                    title: template.title,
                    date: format(day, 'yyyy-MM-dd'),
                    due_at: dueAt,
                    target_value: template.target_value,
                    staff_id: assign.staff_id,
                    store_id: assign.store_id,
                    status: isOverdue ? 'ATRASA' : 'PENDENTE',
                    xp_reward: template.xp_reward || 10
                })
            }
        } else if (template.recurrence === 'weekly') {
            const dueAt = withDueAt(weekStart, template.default_due_time)
            const isOverdue = dueAt && new Date(dueAt) < new Date()
            occurrences.push({
                assignment_id: assign.id,
                title: template.title,
                date: format(weekStart, 'yyyy-MM-dd'),
                due_at: dueAt,
                target_value: template.target_value,
                staff_id: assign.staff_id,
                store_id: assign.store_id,
                status: isOverdue ? 'ATRASA' : 'PENDENTE',
                xp_reward: template.xp_reward || 10
            })
        } else if (template.recurrence === 'once') {
            // "once" tasks in weekly job are treated as "this week only" if not already created
            const dueAt = withDueAt(weekStart, template.default_due_time)
            const isOverdue = dueAt && new Date(dueAt) < new Date()
            occurrences.push({
                assignment_id: assign.id,
                title: template.title,
                date: format(weekStart, 'yyyy-MM-dd'),
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

    return NextResponse.json({ success: true, count: occurrences.length })
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
