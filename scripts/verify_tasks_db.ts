import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTables() {
    const tables = ['task_templates', 'task_assignments', 'task_occurrences', 'weekly_scores']

    console.log('Verificando tabelas do módulo de tarefas...')

    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .select('id')
            .limit(1)

        if (error) {
            console.log(`❌ Tabela "${table}" não encontrada ou sem acesso. Erro: ${error.message}`)
        } else {
            console.log(`✅ Tabela "${table}" verificada com sucesso.`)
        }
    }
}

verifyTables()
