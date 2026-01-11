
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    try {
        const { data, error } = await supabase.from('profiles').select('id, name, role, store_id').limit(50);
        if (error) {
            fs.writeFileSync('debug_profiles.json', JSON.stringify({ error }, null, 2));
            return;
        }
        fs.writeFileSync('debug_profiles.json', JSON.stringify(data, null, 2));
    } catch (e) {
        fs.writeFileSync('debug_profiles.json', JSON.stringify({ error: e.message }, null, 2));
    }
}

check();
