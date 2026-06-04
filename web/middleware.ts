import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// PrismaClient cannot run in Edge Runtime, so we do a lightweight cookie check
// here. The real session validation happens in app/dashboard/layout.tsx via auth().
export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token")

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
