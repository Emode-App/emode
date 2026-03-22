const fs = require('fs');
const path = require('path');
const https = require('https');

// Read key
const envPath = path.join(__dirname, 'apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GOOGLE_API_KEY=(.+)/);
const apiKey = match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
console.log(`Using Key: ${apiKey.substring(0, 5)}...`);

if (!apiKey) {
    console.error("No API Key");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

const req = https.request(url, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        try {
            const json = JSON.parse(body);
            if (json.models) {
                console.log("Available Gemini Models:");
                json.models
                    .filter(m => m.name.includes('gemini'))
                    .forEach(m => console.log(m.name));
            } else {
                console.log("No models found?", body);
            }
        } catch (e) {
            console.log('BODY:', body);
        }
    });
});

req.on('error', e => console.error(e));
req.end();
