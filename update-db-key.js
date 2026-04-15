const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateKey() {
    const newKey = "AIzaSyAOIzNUgWQ3WkecufpkutingRa7hujedcI";
    try {
        const settings = await prisma.settings.upsert({
            where: { id: 1 },
            update: { geminiApiKey: newKey },
            create: {
                id: 1,
                pharmacyName: "MediStock Pharmacy",
                ownerName: "Administrator",
                phone: "",
                email: "",
                address: "",
                geminiApiKey: newKey
            }
        });
        console.log("✅ Successfully updated Gemini API Key in Database Settings.");
    } catch (error) {
        console.error("❌ Failed to update Database Settings:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updateKey();
