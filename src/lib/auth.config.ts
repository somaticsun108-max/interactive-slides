import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base Auth.js config (no Node-only imports like bcrypt).
 * Providers are added in src/lib/auth.ts; the middleware imports only this,
 * so adding e.g. Google later is: add the provider in auth.ts (+ its id to
 * the login page) and nothing else changes.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isProtected =
        path === "/" ||
        path.startsWith("/dashboard") ||
        path.startsWith("/deck") ||
        path.startsWith("/decks") ||
        path.startsWith("/present");
      const isAuthPage = path === "/login" || path === "/signup";

      if (isAuthPage) return isLoggedIn ? Response.redirect(new URL("/dashboard", nextUrl)) : true;
      if (isProtected) return isLoggedIn; // unauthenticated -> redirected to /login by NextAuth
      return true;
    },
  },
  providers: [], // real providers registered in src/lib/auth.ts (Node runtime)
} satisfies NextAuthConfig;
