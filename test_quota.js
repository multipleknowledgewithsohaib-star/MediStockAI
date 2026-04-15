const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function test() {
    const apiKey = process.env.GEMINI_API_KEY.replace(/['"]/g, "").trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    try {
        const result = await model.generateContent("Hello, are you online?");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
