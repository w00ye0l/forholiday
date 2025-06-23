-- 터미널 특이사항 테이블 생성
CREATE TABLE IF NOT EXISTS terminal_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  terminal_id TEXT NOT NULL CHECK (terminal_id IN ('T1', 'T2')),
  notes TEXT NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by TEXT, -- 작성자 정보 (선택사항)
  UNIQUE(terminal_id)
);

-- 터미널 특이사항 RLS 정책
ALTER TABLE terminal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "터미널 특이사항 조회는 모든 인증된 사용자 가능"
  ON terminal_notes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "터미널 특이사항 수정은 모든 인증된 사용자 가능"
  ON terminal_notes FOR ALL
  USING (auth.role() = 'authenticated');

-- 인덱스 생성
CREATE INDEX idx_terminal_notes_terminal_id ON terminal_notes(terminal_id); 