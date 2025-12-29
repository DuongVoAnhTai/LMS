import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  // Build plain headers object for responses
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  // Only echo origin (don't use '*' when using credentials)
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  } else {
    // fallback if you want to allow other origins in dev
    corsHeaders["Access-Control-Allow-Origin"] = origin || "*";
  }

  // If preflight request, respond immediately with 204 and CORS headers
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // For non-OPTIONS requests, continue and attach CORS headers to the response
  const res = NextResponse.next();
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
