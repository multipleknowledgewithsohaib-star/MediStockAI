const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

/**
 * GEMINI AI TEST SCRIPT
 * This script verifies if your Gemini API key is active and which models are available.
 * 
 * IMPORTANT: 
 * We now only use the GEMINI_API_KEY from your .env file for security.
 * Ensure you have GEMINI_API_KEY defined in your .env file.
 */

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error("❌ ERROR: No GEMINI_API_KEY found in .env file.");
        console.log("Please add: GEMINI_API_KEY=your_key_here to your .env");
        return;
    }

    console.log("🔍 Authenticating with Gemini AI...");

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Connection Successful!");
            console.log("\nAvailable Models for your Key:");
            data.models.forEach(m => {
                const status = m.displayNames?.includes('Flash') ? "🚀 Recommended" : "";
                console.log(` - ${m.name.split('/').pop()} ${status}`);
            });
        } else {
            console.log("❌ Authentication Failed or Error in Response:");
            console.log(JSON.stringify(data, null, 2));
            
            if (data.error?.message?.includes('leaked')) {
                console.log("\n🛑 SECURITY ALERT: Your key is reported as LEAKED and has been disabled.");
            }
        }
    } catch (error) {
        console.error("❌ Network Fetch failed:", error.message);
    }
}

listModels();
