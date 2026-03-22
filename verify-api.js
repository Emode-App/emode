const https = require('http');

const data = JSON.stringify({
    userImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop', // Male model placeholder
    productImage: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop', // Blazer
    category: 'topwear'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Testing /api/generate with Gemini integration...');

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:');
        console.log(body);

        if (res.statusCode === 200) {
            console.log('AI Verification Passed');
            const fs = require('fs');
            fs.writeFileSync('success_body.json', body);
        } else {
            console.error('AI Verification Failed');
            console.error('Status:', res.statusCode);
            const fs = require('fs');
            fs.writeFileSync('error_body.txt', body);
            console.error('Body written to error_body.txt');
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
