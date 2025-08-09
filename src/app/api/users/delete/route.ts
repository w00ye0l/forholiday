import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
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
    
    if (profileError) {
      return NextResponse.json({ error: '프로필을 가져올 수 없습니다' }, { status: 500 })
    }

    // 관리자 또는 최고관리자 권한 확인
    if (currentProfile.role !== 'admin' && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // 요청 본문에서 삭제할 사용자 ID 가져오기
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 })
    }

    // 자기 자신은 삭제할 수 없음
    if (userId === currentUser.id) {
      return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다' }, { status: 400 })
    }

    // 삭제할 사용자의 프로필 가져오기
    const { data: targetProfile, error: targetError } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (targetError) {
      return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 최고관리자는 최고관리자만 삭제 가능
    if (targetProfile.role === 'super_admin' && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: '최고관리자는 삭제할 수 없습니다' }, { status: 403 })
    }

    // 삭제할 사용자 정보를 백업 (롤백용)
    const { data: backupProfile } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // 1. 먼저 profiles 테이블과 관련 데이터 삭제 (CASCADE 때문에)
    console.log('프로필 및 관련 데이터 삭제 시작...')
    
    // 1-1. 메뉴 권한 먼저 삭제
    const { error: menuError } = await serviceSupabase
      .from('menu_permissions')
      .delete()
      .eq('user_id', userId)
    
    if (menuError) {
      console.error('메뉴 권한 삭제 오류:', menuError)
    }

    // 1-2. 프로필 삭제
    const { error: profileDeleteError } = await serviceSupabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileDeleteError) {
      console.error('프로필 삭제 오류:', profileDeleteError)
      return NextResponse.json({ 
        error: '사용자 프로필 삭제 중 오류가 발생했습니다: ' + profileDeleteError.message 
      }, { status: 500 })
    }

    // 2. Supabase Authentication에서 사용자 삭제 (마지막에 실행)
    console.log('Authentication 사용자 삭제 시작...')
    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('Authentication 사용자 삭제 오류:', authDeleteError)
      
      // Authentication 삭제 실패 시 프로필 복구 시도
      if (backupProfile) {
        console.log('Authentication 삭제 실패로 인한 프로필 복구 시도...')
        const { error: restoreError } = await serviceSupabase
          .from('profiles')
          .insert(backupProfile)
        
        if (restoreError) {
          console.error('프로필 복구 실패:', restoreError)
        }
      }
      
      return NextResponse.json({ 
        error: 'Authentication 사용자 삭제 중 오류가 발생했습니다: ' + authDeleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ message: '사용자가 성공적으로 삭제되었습니다' })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}