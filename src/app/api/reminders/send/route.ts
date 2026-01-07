import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { addDays, format } from 'date-fns'

// For Deployment: protecting the route
// const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
    // 1. Authorization check (Optional for simulation/localhost, critical for prod)
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 })
    // }

    // 2. Define "Tomorrow"
    const today = new Date()
    const tomorrow = addDays(today, 1)
    const formattedDate = format(tomorrow, 'yyyy-MM-dd')

    // 3. Fetch Appointments
    const supabase = createClient()

    // We need server-side client with admin privileges if RLS blocks us
    // But for this "Simulation" using the client-side/anon key might fail if RLS is strict.
    // However, usually cron jobs use a Service Role Key.
    // Since we are "simulating" via browser, we will rely on key or just standard access if logged in?
    // Actually, API routes in Next.js run on server. We should ideally use Service Role here.
    // But we don't have it in .env.local usually visible. 
    // Let's try regular client. If it fails, we know we need more permissions.
    // NOTE: For the simulation to work from browser (GET), we assume public or simple access.

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id,
            date,
            reminder_sent,
            client:clients(name, email, phone),
            professional:professionals(name)
        `)
        .eq('date', formattedDate)
        .eq('status', 'AGENDADO')
    // .eq('reminder_sent', false) // Optionally filter, but maybe we want to force send for test?

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
        return NextResponse.json({ message: 'No appointments found for tomorrow.' })
    }

    const logs = []

    // 4. Process Loop
    for (const appt of appointments) {
        const client = appt.client as any
        const professional = appt.professional as any // Fix for TS array inference

        // Skip if already sent (unless we force it, let's respect the flag)
        if (appt.reminder_sent) {
            logs.push(`Skipped: ${client.name} (Already sent)`)
            continue
        }

        if (client && client.email) {
            // --- SIMULATION ---
            // Handle both array (if inferred wrong) or object
            const profName = Array.isArray(professional) ? professional[0]?.name : professional?.name
            const logEntry = `[MOCK EMAIL] To: ${client.email} | Subject: Lembrete de Consulta | Body: Olá ${client.name}, seu agendamento com ${profName} é amanhã (${format(tomorrow, 'dd/MM')}).`
            console.log(logEntry)
            logs.push(logEntry)

            // 5. Update Flag
            // (In real mode, we await result of email send)
            await supabase
                .from('appointments')
                .update({ reminder_sent: true })
                .eq('id', appt.id)

        } else {
            logs.push(`Skipped: ${client?.name || 'Unknown'} (No email)`)
        }
    }

    return NextResponse.json({
        success: true,
        processed: appointments.length,
        logs
    })
}
