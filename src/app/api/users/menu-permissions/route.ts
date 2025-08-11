import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/profile';
import { ALL_MENU_ITEMS, getDefaultPermissionsForRole } from '@/lib/constants/menu-permissions';

// 사용자의 메뉴 권한 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 프로필 확인
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUserProfile) {
      return NextResponse.json(
        { success: false, error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인: 자신의 권한 조회이거나 관리자인 경우만 허용
    const isOwnPermission = user.id === userId;
    const isAdmin = ['super_admin', 'admin'].includes(currentUserProfile.role);
    
    if (!isOwnPermission && !isAdmin) {
      return NextResponse.json(
        { success: false, error: '자신의 메뉴 권한만 조회할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 대상 사용자의 메뉴 권한 조회
    const { data: menuPermissions, error } = await supabase
      .from('menu_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('메뉴 권한 조회 에러:', error);
      return NextResponse.json(
        { success: false, error: '메뉴 권한 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 모든 메뉴에 대한 권한 정보 생성 (없는 권한은 기본값으로)
    const allPermissions = ALL_MENU_ITEMS.map(menuItem => {
      const existing = menuPermissions?.find(p => p.menu_key === menuItem.key);
      return {
        menu_key: menuItem.key,
        menu_label: menuItem.label,
        menu_description: menuItem.description,
        has_access: existing?.has_access || false,
      };
    });

    return NextResponse.json({
      success: true,
      data: allPermissions
    });

  } catch (error) {
    console.error('메뉴 권한 조회 에러:', error);
    return NextResponse.json(
      { success: false, error: '메뉴 권한 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자의 메뉴 권한 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 요청 데이터입니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 프로필 확인
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUserProfile || 
        !['super_admin', 'admin'].includes(currentUserProfile.role)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 대상 사용자의 역할 확인 (admin은 super_admin의 권한을 수정할 수 없음)
    const { data: targetUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!targetUserProfile) {
      return NextResponse.json(
        { success: false, error: '대상 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // admin은 super_admin의 권한을 수정할 수 없음 (다른 admin은 수정 가능)
    if (currentUserProfile.role === 'admin' && 
        targetUserProfile.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: '최고관리자의 권한은 수정할 수 없습니다.' },
        { status: 403 }
      );
    }

    // 서비스 롤 클라이언트 생성 (RLS 우회)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 기존 권한 삭제 후 새로운 권한 추가 (서비스 클라이언트 사용)
    const { error: deleteError } = await serviceSupabase
      .from('menu_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('기존 권한 삭제 에러:', deleteError);
      return NextResponse.json(
        { success: false, error: '권한 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 새로운 권한 삽입
    const newPermissions = permissions
      .filter((p: any) => p.has_access) // 접근 권한이 있는 메뉴만 저장
      .map((p: any) => ({
        user_id: userId,
        menu_key: p.menu_key,
        has_access: p.has_access,
        created_by: user.id,
        updated_by: user.id,
      }));

    if (newPermissions.length > 0) {
      const { error: insertError } = await serviceSupabase
        .from('menu_permissions')
        .insert(newPermissions);

      if (insertError) {
        console.error('새 권한 삽입 에러:', insertError);
        return NextResponse.json(
          { success: false, error: '권한 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '메뉴 권한이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('메뉴 권한 업데이트 에러:', error);
    return NextResponse.json(
      { success: false, error: '메뉴 권한 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 역할별 기본 권한으로 초기화
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: '사용자 ID와 역할이 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 프로필 확인
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUserProfile || 
        !['super_admin', 'admin'].includes(currentUserProfile.role)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 서비스 롤 클라이언트 생성 (RLS 우회)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 기존 권한 삭제 (서비스 클라이언트 사용)
    const { error: deleteError } = await serviceSupabase
      .from('menu_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('기존 권한 삭제 에러:', deleteError);
      return NextResponse.json(
        { success: false, error: '권한 초기화에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 역할별 기본 권한 생성
    const defaultPermissions = getDefaultPermissionsForRole(role as UserRole);
    const newPermissions = defaultPermissions
      .filter(p => p.has_access)
      .map(p => ({
        user_id: userId,
        menu_key: p.menu_key,
        has_access: p.has_access,
        created_by: user.id,
        updated_by: user.id,
      }));

    if (newPermissions.length > 0) {
      const { error: insertError } = await serviceSupabase
        .from('menu_permissions')
        .insert(newPermissions);

      if (insertError) {
        console.error('기본 권한 삽입 에러:', insertError);
        return NextResponse.json(
          { success: false, error: '권한 초기화에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '메뉴 권한이 기본값으로 초기화되었습니다.'
    });

  } catch (error) {
    console.error('메뉴 권한 초기화 에러:', error);
    return NextResponse.json(
      { success: false, error: '메뉴 권한 초기화에 실패했습니다.' },
      { status: 500 }
    );
  }
}