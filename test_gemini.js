const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function test() {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.replace(/['"]/g, '').trim();
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelNames = ["gemini-pro-latest", "gemini-1.5-pro", "gemini-flash-latest", "gemini-1.5-flash"];
        for(const name of modelNames) {
            console.log(`Testing model: ${name}`);
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("Hello");
                console.log(name, "success:");
            } catch(e) {
                console.log(name, "failed:", e.message);
            }
        }
    } catch(e) {
        console.error(e);
    }
}

test();
