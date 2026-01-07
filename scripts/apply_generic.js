
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
});

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Usage: node apply.js <file>');
    process.exit(1);
}

const sql = fs.readFileSync(path.resolve(process.cwd(), sqlFile), 'utf-8');

async function apply() {
    try {
        await client.connect();
        console.log(`Applying ${sqlFile}...`);
        await client.query(sql);
        console.log('✅ SQL Applied Successfully!');
    } catch (err) {
        console.error('❌ SQL Application Failed:', err);
    } finally {
        await client.end();
    }
}

apply();
