const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, 'apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GOOGLE_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
    console.error("No API Key found in apps/web/.env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct listModels on genAI instance in node sdk sometimes?
        // Wait, the SDK has GoogleGenerativeAI class.
        // There is no listModels method on the client instance in some versions?
        // Actually, checking docs: it might accept a manager or we try to just fetch model info?
        // Wait, the error message suggested: "Call ListModels to see the list..."
        // That refers to the REST API.

        // I'll try to use a model I suspect exists: 'gemini-pro'
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello?");
        console.log("gemini-pro works: ", result.response.text());

    } catch (error) {
        console.error("gemini-pro failed:", error.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello?");
        console.log("gemini-1.5-flash works: ", result.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash failed:", error.message);
    }
}

listModels();
