import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MenuKey } from "@/types/profile";

// URL 경로와 메뉴 키 매핑
const pathToMenuKey: Record<string, MenuKey> = {
  '/': 'dashboard',
  '/users': 'users',
  '/rentals': 'rentals',
  '/rentals/pending': 'rentals_pending',
  '/rentals/new': 'rentals',
  '/rentals/out': 'rentals_pickup',
  '/rentals/return': 'rentals_return',
  '/rentals/data-transfer': 'rentals',
  '/storage': 'storage',
  '/storage/new': 'storage_pending',
  '/storage/incoming': 'storage_stored',
  '/storage/outgoing': 'storage_pickup',
  '/devices': 'devices',
  '/inventory': 'devices',
  '/admin/arrival-checkin': 'arrival_checkin_admin',
};

// 메뉴 권한 확인 함수
async function checkMenuPermission(
  supabase: any,
  userId: string,
  pathname: string
): Promise<boolean> {
  // 경로에서 메뉴 키 추출
  const menuKey = pathToMenuKey[pathname];
  if (!menuKey) {
    // 매핑되지 않은 경로는 대시보드 권한으로 체크
    return checkMenuPermission(supabase, userId, '/');
  }

  try {
    const { data: permission } = await supabase
      .from('menu_permissions')
      .select('has_access')
      .eq('user_id', userId)
      .eq('menu_key', menuKey)
      .single();

    return permission?.has_access || false;
  } catch (error) {
    console.error('메뉴 권한 확인 에러:', error);
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인이 필요 없는 페이지들
  const publicPaths = ["/auth", "/check-reservation", "/arrival-checkin"];

  // API 경로는 별도로 체크 (공개 API들)
  const publicApiPaths = ["/api/arrival-checkin"];

  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  const isPublicApiPath = publicApiPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath && !isPublicApiPath) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    // user is logged in, redirect away from auth pages
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 로그인한 사용자의 메뉴 권한 검증
  if (user && !isPublicPath && !isPublicApiPath) {
    // API 경로는 권한 검증을 별도로 수행하므로 제외
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      const hasPermission = await checkMenuPermission(
        supabase,
        user.id,
        request.nextUrl.pathname
      );

      if (!hasPermission) {
        // 권한이 없으면 대시보드로 리다이렉트
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
