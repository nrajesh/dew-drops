import fs from 'fs';
import path from 'path';

// Manually parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const tables = [
    'profiles',
    'posts',
    'travel_locations',
    'gallery_images',
    'feature_toggles',
    'chatbot_knowledge'
];


async function exportData() {
    for (const table of tables) {
        console.log(`Exporting ${table}...`);
        try {
            const url = `${supabaseUrl}/rest/v1/${table}?select=*`;
            const res = await fetch(url, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            const data = await res.json();
            const filePath = path.join(process.cwd(), 'src/data', `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved ${data.length} rows to ${filePath}`);
        } catch (err) {
            console.error(`Error exporting ${table}:`, err.message);
        }
    }
}

exportData().catch(console.error);
