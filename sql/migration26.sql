-- Migration 26: Create email templates management table
-- 이메일 템플릿 관리를 위한 테이블 생성

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_key character varying(50) NOT NULL UNIQUE,
  template_name character varying(100) NOT NULL,
  subject_template text NOT NULL,
  html_template text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_template_key_key UNIQUE (template_key)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_template_key 
ON public.email_templates USING btree (template_key) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_email_templates_is_active 
ON public.email_templates USING btree (is_active) 
TABLESPACE pg_default;

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Insert default templates
INSERT INTO public.email_templates (template_key, template_name, subject_template, html_template, description) 
VALUES 
(
  'storage-confirmation',
  '짐보관 예약 확정 메일',
  '[ForHoliday] 짐보관 예약이 확정되었습니다 - {{reservation_id}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ''Malgun Gothic'', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #00af9f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
    .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #00af9f; }
    .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; width: 120px; color: #666; }
    .info-value { flex: 1; color: #333; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
    .highlight { background-color: #FFF3CD; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #FFC107; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>짐보관 예약 확정</h1>
    </div>
    <div class="content">
      <p>안녕하세요, {{customer_name}}님</p>
      <p>ForHoliday 짐보관 서비스를 이용해 주셔서 감사합니다.</p>
      <p>고객님의 짐보관 예약이 확정되었습니다.</p>
      
      <div class="info-box">
        <h3 style="color: #00af9f; margin-top: 0;">예약 정보</h3>
        <div class="info-row">
          <div class="info-label">예약번호</div>
          <div class="info-value"><strong>{{reservation_id}}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">고객명</div>
          <div class="info-value">{{customer_name}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">연락처</div>
          <div class="info-value">{{phone_number}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">물품</div>
          <div class="info-value">{{items_description}} ({{quantity}}개)</div>
        </div>
        {{#if tag_number}}
        <div class="info-row">
          <div class="info-label">태그번호</div>
          <div class="info-value">{{tag_number}}</div>
        </div>
        {{/if}}
      </div>

      <div class="info-box">
        <h3 style="color: #00af9f; margin-top: 0;">맡기기 정보</h3>
        <div class="info-row">
          <div class="info-label">날짜</div>
          <div class="info-value">{{drop_off_date_formatted}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">시간</div>
          <div class="info-value">{{drop_off_time}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">장소</div>
          <div class="info-value">{{drop_off_location_label}}</div>
        </div>
      </div>

      <div class="info-box">
        <h3 style="color: #00af9f; margin-top: 0;">찾기 정보</h3>
        <div class="info-row">
          <div class="info-label">날짜</div>
          <div class="info-value">{{pickup_date_formatted}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">시간</div>
          <div class="info-value">{{pickup_time}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">장소</div>
          <div class="info-value">{{pickup_location_label}}</div>
        </div>
      </div>

      {{#if notes}}
      <div class="highlight">
        <strong>참고사항:</strong><br>
        {{notes}}
      </div>
      {{/if}}

      <div class="highlight">
        <strong>중요 안내사항:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>예약번호와 신분증을 지참해 주세요.</li>
          <li>보관 시간을 준수해 주시기 바랍니다.</li>
          <li>귀중품은 별도로 보관해 주세요.</li>
          <li>변경 사항이 있으시면 미리 연락 주세요.</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>문의사항이 있으시면 언제든지 연락 주세요.</p>
      <p>ForHoliday | 인천공항 짐보관 서비스</p>
      <p style="font-size: 12px; color: #999;">
        이 메일은 발신 전용입니다. 회신은 처리되지 않습니다.
      </p>
    </div>
  </div>
</body>
</html>',
  '짐보관 예약 확정시 고객에게 발송되는 이메일 템플릿'
),
(
  'general-email',
  '일반 이메일',
  '{{subject}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ''Malgun Gothic'', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #fff; }
    .header { background-color: #00af9f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ForHoliday</h1>
    </div>
    <div class="content">
      {{content}}
    </div>
    <div class="footer">
      <p>ForHoliday | 인천공항 짐보관 서비스</p>
      <p style="font-size: 12px; color: #999;">
        이 메일은 발신 전용입니다. 회신은 처리되지 않습니다.
      </p>
    </div>
  </div>
</body>
</html>',
  '일반적인 이메일 발송에 사용되는 기본 템플릿'
);

-- Add comments for documentation
COMMENT ON TABLE public.email_templates IS '이메일 템플릿 관리 테이블';
COMMENT ON COLUMN public.email_templates.template_key IS '템플릿 식별 키 (예: storage-confirmation, general-email)';
COMMENT ON COLUMN public.email_templates.template_name IS '템플릿 표시 이름';
COMMENT ON COLUMN public.email_templates.subject_template IS '제목 템플릿 (변수 지원)';
COMMENT ON COLUMN public.email_templates.html_template IS 'HTML 본문 템플릿 (변수 지원)';
COMMENT ON COLUMN public.email_templates.description IS '템플릿 설명';
COMMENT ON COLUMN public.email_templates.is_active IS '활성화 상태';

-- Migration complete
-- 마이그레이션 완료: 이메일 템플릿 관리 시스템이 구축되었습니다.