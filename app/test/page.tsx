export default function TestPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-purple-600">✅ Server is Running!</h1>
                <p className="text-gray-600">Next.js server is working correctly.</p>
                <div className="mt-8 space-y-2">
                    <a
                        href="/"
                        className="block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                        Go to Dashboard
                    </a>
                    <a
                        href="/purchases"
                        className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Test Invoice Scanner
                    </a>
                </div>
            </div>
        </div>
    );
}
