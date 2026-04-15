const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function deepTestModels() {
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAOIzNUgWQ3WkecufpkutingRa7hujedcI";
    console.log("🔍 Deep Testing Model Availability...");

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.models) {
            console.log("❌ Error listing models:", JSON.stringify(data, null, 2));
            return;
        }

        const visionModels = data.models.filter(m => 
            m.supportedMethods && 
            m.supportedMethods.includes("generateContent") && 
            (m.name.includes("flash") || m.name.includes("pro"))
        );

        if (visionModels.length === 0) {
            console.log("❌ CRITICAL: No models found that support 'generateContent'.");
            return;
        }

        console.log(`✅ Found ${visionModels.length} compatible models. Testing first one...`);
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const targetModel = visionModels[0].name.split('/').pop();
        console.log(`🧪 Testing model: ${targetModel}...`);

        try {
            const model = genAI.getGenerativeModel({ model: targetModel });
            const testResult = await model.generateContent("Say 'System Online'");
            console.log("🎉 TEST SUCCESS:", testResult.response.text());
        } catch (e) {
            console.error(`❌ Test failed for ${targetModel}:`, e.message);
            if (e.message.includes("quota")) {
                console.log("🛑 THIS KEY HAS ZERO QUOTA (Limit: 0). The user must check their billing/activation state.");
            }
        }
    } catch (error) {
        console.error("❌ Deep Test failed:", error.message);
    }
}

deepTestModels();
