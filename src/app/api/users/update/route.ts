import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // 현재 사용자 확인
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: '인증되지 않았습니다' }, { status: 401 })
    }

    // 서비스 클라이언트로 현재 사용자 프로필 가져오기 (RLS 우회)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: currentProfile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()
    
    console.log('현재 사용자 프로필 조회 결과:', { currentProfile, profileError });
    
    if (profileError) {
      console.error('현재 사용자 프로필 조회 에러:', profileError);
      return NextResponse.json({ error: '프로필을 가져올 수 없습니다' }, { status: 500 })
    }

    if (!currentProfile) {
      console.error('현재 사용자 프로필이 존재하지 않습니다');
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.log('현재 사용자 권한:', currentProfile.role);

    // 관리자 또는 최고관리자 권한 확인
    if (currentProfile.role !== 'admin' && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // 요청 본문에서 업데이트할 사용자 정보 가져오기
    const { userId, username, full_name, role } = await request.json()
    
    console.log('수정 요청 데이터:', { userId, username, full_name, role });
    
    // 디버깅: 모든 사용자 ID 조회
    const { data: allProfiles } = await serviceSupabase
      .from('profiles')
      .select('id, username')
      .limit(10);
    console.log('데이터베이스의 사용자 ID들:', allProfiles);
    
    if (!userId || !username || !full_name || !role) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다' }, { status: 400 })
    }

    // 수정할 사용자의 현재 프로필 가져오기 (서비스 클라이언트 사용)
    const { data: targetProfile, error: targetError } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    console.log('대상 사용자 조회 결과:', { targetProfile, targetError, userId });
    
    if (targetError) {
      console.error('대상 사용자 조회 실패:', targetError);
      return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 체크: 최고관리자는 최고관리자만 수정 가능
    if (targetProfile.role === 'super_admin' && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: '최고관리자는 수정할 수 없습니다' }, { status: 403 })
    }

    // 권한 체크: 관리자는 최고관리자로 승격시킬 수 없음
    if (role === 'super_admin' && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: '최고관리자로 승격시킬 권한이 없습니다' }, { status: 403 })
    }

    // 사용자 프로필 업데이트 (서비스 클라이언트 사용)
    const { data: updateResult, error: updateError } = await serviceSupabase
      .from('profiles')
      .update({
        username,
        full_name,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
    
    console.log('업데이트 결과:', updateResult);
    console.log('업데이트 에러:', updateError);
    
    if (updateError) {
      console.error('사용자 정보 업데이트 에러:', updateError);
      return NextResponse.json({ 
        error: '사용자 정보 수정 중 오류가 발생했습니다', 
        details: updateError.message 
      }, { status: 500 })
    }

    // 업데이트된 행이 없는 경우
    if (!updateResult || updateResult.length === 0) {
      console.error('업데이트된 행이 없습니다. RLS 정책 문제일 수 있습니다.');
      return NextResponse.json({ 
        error: '업데이트 권한이 없거나 대상 사용자를 찾을 수 없습니다' 
      }, { status: 403 })
    }

    return NextResponse.json({ message: '사용자 정보가 성공적으로 수정되었습니다' })
  } catch (error) {
    console.error('사용자 수정 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}