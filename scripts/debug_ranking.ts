
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    try {
        const { data, error } = await supabase
            .from('task_occurrences')
            .select('*')
            .gte('date', '2026-01-01')
            .lte('date', '2026-01-31');

        if (error) {
            fs.writeFileSync('debug_ranking.json', JSON.stringify({ error }, null, 2));
            return;
        }

        const stats = {
            total: data.length,
            done: data.filter(t => t.status === 'FEITA').length,
            sample: data.slice(0, 2),
            hasXpReward: data.length > 0 ? 'xp_reward' in data[0] : 'unknown'
        };

        fs.writeFileSync('debug_ranking.json', JSON.stringify(stats, null, 2));
    } catch (e) {
        fs.writeFileSync('debug_ranking.json', JSON.stringify({ error: e.message }, null, 2));
    }
}

check();
