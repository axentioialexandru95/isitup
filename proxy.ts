import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

const protectedRoutes = ["/dashboard", "/settings", "/sites"];
const authRoutes = ["/login", "/register"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // Get session
  const session = await auth();

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
