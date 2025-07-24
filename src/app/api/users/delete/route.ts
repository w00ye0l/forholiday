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

    // 사용자 프로필 삭제 (auth.users는 cascade로 삭제됨)
    const { error: deleteError } = await serviceSupabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (deleteError) {
      return NextResponse.json({ error: '사용자 삭제 중 오류가 발생했습니다' }, { status: 500 })
    }

    return NextResponse.json({ message: '사용자가 성공적으로 삭제되었습니다' })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}