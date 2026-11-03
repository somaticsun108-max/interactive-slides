import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Route protection. Uses the edge-safe config (JWT decode only, no DB/bcrypt),
 * so it can run in the middleware runtime. Unauthenticated requests to
 * protected routes are redirected to /login with a callbackUrl.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/", "/dashboard/:path*", "/deck/:path*", "/present/:path*", "/login", "/signup"],
};
