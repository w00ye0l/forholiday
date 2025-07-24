-- Migration 19: 도착 체크인 페이지 콘텐츠 관리 테이블 생성
-- 2024-12-23

-- 편집 가능한 콘텐츠 저장 테이블
CREATE TABLE arrival_checkin_content (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key varchar(255) NOT NULL UNIQUE,
  content jsonb NOT NULL, -- 다국어 객체 저장 {ko: "", en: "", ja: ""}
  content_type varchar(50) NOT NULL DEFAULT 'text', -- text, image, config
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 이미지 관리 테이블  
CREATE TABLE arrival_checkin_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key varchar(255) NOT NULL UNIQUE,
  image_url varchar(500) NOT NULL,
  alt_text jsonb, -- 다국어 alt 텍스트 {ko: "", en: "", ja: ""}
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS 정책 설정 (관리자만 수정 가능)
ALTER TABLE arrival_checkin_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrival_checkin_images ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (도착 체크인 페이지에서 사용)
CREATE POLICY "Everyone can read arrival_checkin_content" ON arrival_checkin_content
  FOR SELECT USING (true);

CREATE POLICY "Everyone can read arrival_checkin_images" ON arrival_checkin_images
  FOR SELECT USING (true);

-- 관리자 및 슈퍼 관리자만 생성/수정/삭제 가능
CREATE POLICY "Admin can manage arrival_checkin_content" ON arrival_checkin_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can manage arrival_checkin_images" ON arrival_checkin_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_arrival_checkin_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER arrival_checkin_content_updated_at
  BEFORE UPDATE ON arrival_checkin_content
  FOR each ROW EXECUTE FUNCTION update_arrival_checkin_content_updated_at();

CREATE TRIGGER arrival_checkin_images_updated_at
  BEFORE UPDATE ON arrival_checkin_images
  FOR each ROW EXECUTE FUNCTION update_arrival_checkin_content_updated_at();

-- 기본 콘텐츠 데이터 삽입
INSERT INTO arrival_checkin_content (key, content, content_type) VALUES
-- 페이지 제목 및 설명
('page_title', '{"ko": "도착 체크인", "en": "Arrival Check-in", "ja": "到着チェックイン"}', 'text'),
('page_description', '{"ko": "공항 도착 후, 이름과 터미널 위치를 입력해 주시면 직원이 빠르게 준비하여 찾아뵙겠습니다.", "en": "After arriving at the airport, please enter your name and terminal location. Our staff will quickly prepare and meet you.", "ja": "空港到着後、お名前とターミナル位置を入力していただければ、スタッフが迅速に準備してお会いいたします。"}', 'text'),
('foreigner_notice', '{"ko": "※ 외국인 고객님은 이름을 영문으로 기입해 주세요 ※", "en": "※ Foreign customers, please write your name in English ※", "ja": "※ 外国人のお客様はお名前を英語でご記入ください ※"}', 'text'),

-- 터미널 위치 정보
('terminal1_location', '{"ko": "제 1터미널: 3층 14번 출구 안쪽 만남의 장소", "en": "Terminal 1: 3F Exit 14, Inside Meeting Point", "ja": "第1ターミナル：3階14番出口内側待ち合わせ場所"}', 'text'),
('terminal2_location', '{"ko": "제 2터미널: 3층 9번 출구, J카운터 맞은편 수하물정리대", "en": "Terminal 2: 3F Exit 9, Baggage Arrangement Area opposite J Counter", "ja": "第2ターミナル：3階9番出口、Jカウンター向かい荷物整理台"}', 'text'),

-- 서비스 타입
('service_rental_return', '{"ko": "대여 - 반납", "en": "Rental - Return", "ja": "レンタル - 返却"}', 'text'),
('service_rental_pickup', '{"ko": "대여 - 수령", "en": "Rental - Pickup", "ja": "レンタル - 受取"}', 'text'),
('service_storage_dropoff', '{"ko": "짐보관 - 맡기기", "en": "Storage - Drop-off", "ja": "荷物保管 - 預ける"}', 'text'),
('service_storage_pickup', '{"ko": "짐보관 - 찾기", "en": "Storage - Pickup", "ja": "荷物保管 - 受取"}', 'text'),

-- 폼 필드 라벨
('label_name', '{"ko": "이름", "en": "Name", "ja": "お名前"}', 'text'),
('label_tag_name', '{"ko": "짐 태그 번호", "en": "Luggage Tag Number", "ja": "荷物タグ番号"}', 'text'),
('label_terminal', '{"ko": "터미널을 선택하세요", "en": "Please select terminal", "ja": "ターミナルを選択してください"}', 'text'),
('label_arrival_status', '{"ko": "도착 상태", "en": "Arrival Status", "ja": "到着状況"}', 'text'),

-- Placeholder 텍스트
('placeholder_name', '{"ko": "이름을 입력하세요", "en": "Please enter your name", "ja": "お名前を入力してください"}', 'text'),
('placeholder_tag_name', '{"ko": "짐 태그 번호를 입력하세요", "en": "Please enter luggage tag number", "ja": "荷物タグ番号を入力してください"}', 'text'),
('placeholder_arrival_status', '{"ko": "--- 도착 상태 ---", "en": "--- Select Arrival Status ---", "ja": "--- 到착状況 ---"}', 'text'),

-- 터미널 선택 옵션
('terminal1_name', '{"ko": "제 1터미널", "en": "Terminal 1", "ja": "第1ターミナル"}', 'text'),
('terminal2_name', '{"ko": "제 2터미널", "en": "Terminal 2", "ja": "第2ターミナル"}', 'text'),

-- 도착 상태 옵션
('arrival_thirty_min', '{"ko": "도착 30분 전(예정)", "en": "30 minutes before arrival (scheduled)", "ja": "到着30分前（予定）"}', 'text'),
('arrival_ten_min', '{"ko": "도착 10분 전(예정)", "en": "10 minutes before arrival (scheduled)", "ja": "到着10分前（予定）"}', 'text'),
('arrival_at_counter', '{"ko": "카운터 도착", "en": "Arrived at counter", "ja": "カウンター到着"}', 'text'),

-- 버튼 및 상태 메시지
('button_submit', '{"ko": "전송", "en": "Submit", "ja": "送信"}', 'text'),
('button_sending', '{"ko": "전송 중...", "en": "Sending...", "ja": "送信中..."}', 'text'),

-- 성공/오류 메시지
('message_success', '{"ko": "체크인이 완료되었습니다. 직원이 곧 찾아뵙겠습니다!", "en": "Check-in completed. Our staff will meet you soon!", "ja": "チェックインが完了しました。スタッフがすぐにお会いいたします！"}', 'text'),
('message_success_early', '{"ko": "체크인이 완료되었습니다. 직원이 찾아가겠습니다. 2~3분 걸릴 수 있습니다!", "en": "Check-in completed. Our staff will come to find you. It may take 2-3 minutes!", "ja": "チェックインが完了しました。スタッフがお探しいたします。2〜3分かかる場合があります！"}', 'text'),
('message_error', '{"ko": "전송에 실패했습니다. 다시 시도해주세요.", "en": "Failed to send. Please try again.", "ja": "送信に失敗しました。もう一度お試しください。"}', 'text'),
('message_confirm', '{"ko": "아직 도착 전이라면 전송 시 혼선이 발생할 수 있습니다. 계속 하시겠습니까?", "en": "If you haven''t arrived yet, sending now may cause confusion. Do you want to continue?", "ja": "まだ到着前の場合、送信時に混乱が生じる可能性があります。続行しますか？"}', 'text');

-- 기본 이미지 데이터 삽입
INSERT INTO arrival_checkin_images (key, image_url, alt_text, display_order) VALUES
('terminal1_image', '/images/terminal1.png', '{"ko": "제 1터미널 위치", "en": "Terminal 1 Location", "ja": "第1ターミナル位置"}', 1),
('terminal2_image', '/images/terminal2.png', '{"ko": "제 2터미널 위치", "en": "Terminal 2 Location", "ja": "第2ターミナル位置"}', 2);

-- 마이그레이션 로그 추가
INSERT INTO migration_log (version, description, executed_at) 
VALUES (19, '도착 체크인 페이지 콘텐츠 관리 테이블 생성', now())
ON CONFLICT (version) DO NOTHING;

-- 테이블 주석 추가
COMMENT ON TABLE arrival_checkin_content IS '도착 체크인 페이지 편집 가능한 콘텐츠 저장';
COMMENT ON TABLE arrival_checkin_images IS '도착 체크인 페이지 이미지 관리';
COMMENT ON COLUMN arrival_checkin_content.content IS '다국어 콘텐츠 JSON (ko, en, ja)';
COMMENT ON COLUMN arrival_checkin_content.content_type IS '콘텐츠 타입: text, image, config';
COMMENT ON COLUMN arrival_checkin_images.alt_text IS '다국어 alt 텍스트 JSON (ko, en, ja)';