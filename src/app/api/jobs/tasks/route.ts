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

    // 1. Get all active daily and weekly assignments
    const { data: assignments, error } = await supabaseAdmin
        .from('task_assignments')
        .select(`
            *,
            task_templates!inner(title, recurrence, target_value)
        `)
        .eq('active', true)
        .in('task_templates.recurrence', ['daily', 'weekly'])

    if (error) throw error

    const occurrences = []
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    for (const assign of assignments) {
        if (assign.task_templates.recurrence === 'daily') {
            for (const day of weekDays) {
                occurrences.push({
                    assignment_id: assign.id,
                    title: assign.task_templates.title,
                    date: format(day, 'yyyy-MM-dd'),
                    target_value: assign.task_templates.target_value,
                    staff_id: assign.staff_id,
                    store_id: assign.store_id,
                    status: 'PENDENTE'
                })
            }
        } else if (assign.task_templates.recurrence === 'weekly') {
            occurrences.push({
                assignment_id: assign.id,
                title: assign.task_templates.title,
                date: format(weekStart, 'yyyy-MM-dd'), // Weekly tasks attributed to start of week
                target_value: assign.task_templates.target_value,
                staff_id: assign.staff_id,
                store_id: assign.store_id,
                status: 'PENDENTE'
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
            task_templates!inner(title, recurrence, target_value)
        `)
        .eq('active', true)
        .eq('task_templates.recurrence', 'monthly')

    if (error) throw error

    const occurrences = assignments.map(assign => ({
        assignment_id: assign.id,
        title: assign.task_templates.title,
        date: format(monthStart, 'yyyy-MM-dd'),
        target_value: assign.task_templates.target_value,
        staff_id: assign.staff_id,
        store_id: assign.store_id,
        status: 'PENDENTE'
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

    // Get all staff members who have tasks
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
        const rate = (done / total) * 100

        // Bonus logic: "cumprir integralmente as metas diárias da semana e metas mensais dentro do mês"
        // Simplified for weekly score: all weekly tasks done.
        const metBonus = done === total && total > 0
        const bonusValue = metBonus ? 100 : 0

        scores.push({
            staff_id: staffId,
            store_id: storeId,
            week_start_date: weekStartStr,
            execution_rate: rate,
            tasks_done: done,
            tasks_postponed: postponed,
            tasks_delayed: delayed,
            met_bonus: metBonus,
            bonus_value: bonusValue
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
