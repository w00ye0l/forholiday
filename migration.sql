-- 사용자 역할 enum
CREATE TYPE user_role AS ENUM (
  'super_admin',  -- 최고 관리자
  'admin',        -- 일반 관리자
  'staff',        -- 직원
  'user'          -- 일반 사용자
);

-- 프로필 테이블
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  role user_role DEFAULT 'user',
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE public.profiles;

-- 프로필 인덱스
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_username ON profiles(username);

-- 자동으로 프로필을 생성하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, username, full_name)
  VALUES (
    new.id,
    'user',
    COALESCE((new.raw_user_meta_data->>'username')::text, SPLIT_PART(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'full_name')::text, SPLIT_PART(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- auth.users에 변경이 있을 때마다 updated_at 업데이트
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- updated_at 트리거 추가
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- auth.users 테이블에 새 사용자가 생성될 때 트리거 실행
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 프로필 RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "프로필 조회는 모든 인증된 사용자 가능"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "자신의 프로필만 수정 가능"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
