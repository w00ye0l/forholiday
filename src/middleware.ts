import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 세션 새로고침
  await supabase.auth.getSession();

  // 보호된 라우트에 대한 접근 제어
  const protectedRoutes = ["/dashboard", "/admin"];
  const publicRoutes = ["/login", "/register"];
  const path = req.nextUrl.pathname;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 로그인하지 않은 사용자가 보호된 라우트에 접근하려고 할 때
  if (!session && protectedRoutes.some((route) => path.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 이미 로그인한 사용자가 로그인/회원가입 페이지에 접근하려고 할 때
  if (session && publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
