import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const dynamic = "force-dynamic";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
        }),
        CredentialsProvider({
            name: "Demo Login",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "demo" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Temporary bypass for testing
                if (credentials?.username === "admin" && credentials?.password === "admin") {
                    return { id: "1", name: "Sohaib Baig", email: "admin@irsoftware.com" };
                }
                return null;
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET || "a-very-secret-string-for-dev",
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
