import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no db imports)
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isPublicApi = nextUrl.pathname.startsWith("/api/cron");

      // Allow auth API routes and public APIs
      if (isApiAuth || isPublicApi) {
        return true;
      }

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Redirect non-logged-in users to login
      if (!isLoggedIn && !isAuthPage) {
        return false; // This redirects to signIn page
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
