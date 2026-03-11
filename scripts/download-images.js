import fs from 'fs';
import path from 'path';
import https from 'https';

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

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function downloadImages() {
    console.log('Fetching gallery image metadata...');
    try {
        const url = `${supabaseUrl}/rest/v1/gallery_images?select=image_url,file_name`;
        const res = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const images = await res.json();

        const uploadDir = path.join(process.cwd(), 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        for (const image of images) {
            if (!image.image_url) continue;

            // Flatten the file name if it contains subdirectories
            let fileName = image.file_name || path.basename(image.image_url.split('?')[0]);
            fileName = fileName.replace(/\//g, '_');

            const filePath = path.join(uploadDir, fileName);

            if (fs.existsSync(filePath)) {
                console.log(`Skipping ${fileName}, already exists.`);
                continue;
            }

            console.log(`Downloading ${fileName}...`);
            try {
                await downloadFile(image.image_url, filePath);
            } catch (err) {
                console.error(`Failed to download ${fileName}:`, err.message);
            }
        }
    } catch (err) {
        console.error('Error in downloadImages:', err.message);
    }
}

downloadImages().catch(console.error);
