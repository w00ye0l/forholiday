-- terminal_notes 테이블의 terminal_id 제약조건에 'inventory' 추가

-- 먼저 기존 제약조건 제거
ALTER TABLE public.terminal_notes 
DROP CONSTRAINT IF EXISTS terminal_notes_terminal_id_check;

-- 새로운 제약조건 추가 (inventory 포함)
ALTER TABLE public.terminal_notes 
ADD CONSTRAINT terminal_notes_terminal_id_check 
CHECK (terminal_id = ANY (ARRAY['T1'::text, 'T2'::text, 'inventory'::text]));

-- 재고 관리용 메모가 없으면 기본 데이터 추가
INSERT INTO public.terminal_notes (terminal_id, notes, updated_by)
SELECT 'inventory', '재고 관리 특이사항을 여기에 입력하세요.', 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM public.terminal_notes WHERE terminal_id = 'inventory'
);

-- 확인 쿼리
SELECT * FROM public.terminal_notes WHERE terminal_id = 'inventory';