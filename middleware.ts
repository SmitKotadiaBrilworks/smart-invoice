import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TokenManager } from "@/lib/auth/token-manager";

// Protected routes that require authentication
const protectedRoutes = [
  /^\/dashboard(\/.*)?$/,
  /^\/invoices(\/.*)?$/,
  /^\/payments(\/.*)?$/,
  /^\/vendors(\/.*)?$/,
  /^\/profile(\/.*)?$/,
  /^\/settings(\/.*)?$/,
];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((regex) => regex.test(pathname));
}

function isAuthPage(pathname: string): boolean {
  return pathname.startsWith("/auth/");
}

function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || pathname === "/about" || pathname === "/contact";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  // Create response object
  let response = NextResponse.next();

  // Only read cookies (never set/clear in middleware)
  const accessToken = request.cookies.get("sb-auth-token")?.value;
  
  // Check if token is expired by decoding it
  let isAuthenticated = false;
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      isAuthenticated = payload.exp > currentTime;
    } catch {
      // If token is invalid, treat as not authenticated
      isAuthenticated = false;
    }
  }

  // Handle auth pages
  if (isAuthPage(pathname)) {
    // If user is already authenticated and trying to access auth pages, redirect to dashboard
    if (
      isAuthenticated &&
      (pathname.startsWith("/auth/signin") ||
        pathname.startsWith("/auth/signup"))
    ) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    // Allow access to auth pages for unauthenticated users
    return response;
  }

  // Handle public routes (landing page)
  if (isPublicRoute(pathname)) {
    // If authenticated, redirect to dashboard
    if (isAuthenticated) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    // Allow access to public routes
    return response;
  }

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      // Check if token is expired but refresh token exists
      const refreshToken = request.cookies.get("sb-refresh-token")?.value;
      if (refreshToken && accessToken) {
        // Token might be expired, try to refresh in the background
        // For now, redirect to sign-in and let the API handle refresh
        const signInUrl = new URL("/auth/signin", request.url);
        signInUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(signInUrl);
      }

      // No valid token, redirect to sign-in
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Return the response
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};

