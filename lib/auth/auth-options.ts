import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

const toNullableNumber = (value: unknown) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "string" && value.trim() === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
};

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = String(credentials?.email ?? "").trim().toLowerCase();
                const password = String(credentials?.password ?? "");

                if (!email || !password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                    include: { branch: true },
                });

                if (!user || !user.isActive) {
                    return null;
                }

                const isValidPassword = verifyPassword(password, user.password);
                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: String(user.id),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    branchId: user.branchId ?? null,
                    branchName: user.branch?.name ?? null,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.isActive = user.isActive;
                token.branchId = user.branchId ?? null;
                token.branchName = user.branchName ?? null;
            }

            const userId = toNullableNumber(token.sub);
            if (userId !== null) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: userId },
                    include: { branch: true },
                });

                if (!dbUser) {
                    token.role = undefined;
                    token.isActive = false;
                    token.branchId = null;
                    token.branchName = null;
                    return token;
                }

                token.name = dbUser.name;
                token.email = dbUser.email;
                token.role = dbUser.role;
                token.isActive = dbUser.isActive;
                token.branchId = dbUser.branchId ?? null;
                token.branchName = dbUser.branch?.name ?? null;
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = String(token.sub ?? "");
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.role = token.role;
                session.user.isActive = Boolean(token.isActive);
                session.user.branchId = toNullableNumber(token.branchId);
                session.user.branchName = typeof token.branchName === "string" ? token.branchName : null;
            }

            return session;
        },
    },
};
