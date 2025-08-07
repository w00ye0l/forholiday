// 이메일 템플릿 관련 타입 정의
export interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 편집 가능한 템플릿 컨텐츠 정의
export interface EditableTemplateContent {
  // 공통 필드
  greeting?: string;
  closing?: string;
  
  // storage-confirmation 전용 필드
  storage_important_notes?: string[];
  storage_footer_message?: string;
  
  // data-transfer-completion 전용 필드
  download_message?: string;
  download_link?: string;
  download_button_text?: string;
  attachment_info?: string;
  data_retention_days?: number;
  important_notes?: string[];
  additional_message?: string;
  
  // general-email 전용 필드
  custom_content?: string;
}

// 템플릿별 편집 가능 필드 매핑
export interface TemplateEditConfig {
  template_key: string;
  template_name: string;
  editable_fields: {
    field_key: keyof EditableTemplateContent;
    field_name: string;
    field_type: 'text' | 'textarea' | 'number' | 'array' | 'url';
    placeholder?: string;
    max_length?: number;
    required?: boolean;
  }[];
}

// 템플릿별 편집 설정
export const TEMPLATE_EDIT_CONFIGS: TemplateEditConfig[] = [
  {
    template_key: 'storage-confirmation',
    template_name: '짐보관 예약 확정 메일',
    editable_fields: [
      {
        field_key: 'greeting',
        field_name: '인사말',
        field_type: 'textarea',
        placeholder: 'ForHoliday 짐보관 서비스를 이용해 주셔서 감사합니다.',
        max_length: 200,
      },
      {
        field_key: 'storage_important_notes',
        field_name: '중요 안내사항',
        field_type: 'array',
        placeholder: '예: 예약번호와 신분증을 지참해 주세요.',
      },
      {
        field_key: 'storage_footer_message',
        field_name: '하단 메시지',
        field_type: 'textarea',
        placeholder: '문의사항이 있으시면 언제든지 연락 주세요.',
        max_length: 150,
      },
    ],
  },
  {
    template_key: 'data-transfer-completion',
    template_name: '데이터 전송 완료 안내 메일',
    editable_fields: [
      {
        field_key: 'greeting',
        field_name: '인사말',
        field_type: 'textarea',
        placeholder: '포할리데이를 이용해주셔서 감사합니다.',
        max_length: 200,
      },
      {
        field_key: 'download_message',
        field_name: '다운로드 안내 메시지',
        field_type: 'textarea',
        placeholder: '아래 링크를 통해 데이터를 다운로드 받으실 수 있습니다.',
        max_length: 300,
      },
      {
        field_key: 'download_link',
        field_name: '다운로드 링크',
        field_type: 'url',
        placeholder: 'https://download.example.com/{{reservation_id}}',
        required: false,
      },
      {
        field_key: 'download_button_text',
        field_name: '다운로드 버튼 텍스트',
        field_type: 'text',
        placeholder: '📥 데이터 다운로드',
        max_length: 50,
      },
      {
        field_key: 'attachment_info',
        field_name: '첨부파일 안내',
        field_type: 'textarea',
        placeholder: '[다운로드 링크는 첨부파일 또는 별도 안내를 통해 제공됩니다]',
        max_length: 200,
      },
      {
        field_key: 'data_retention_days',
        field_name: '데이터 보관 일수',
        field_type: 'number',
        placeholder: '7',
      },
      {
        field_key: 'important_notes',
        field_name: '중요 안내사항',
        field_type: 'array',
        placeholder: '예: 데이터는 7일간 다운로드 가능합니다.',
      },
      {
        field_key: 'additional_message',
        field_name: '추가 안내사항',
        field_type: 'textarea',
        placeholder: '문의사항이 있으시면 언제든 연락주세요.',
        max_length: 300,
      },
    ],
  },
  {
    template_key: 'general-email',
    template_name: '일반 이메일',
    editable_fields: [
      {
        field_key: 'custom_content',
        field_name: '이메일 내용',
        field_type: 'textarea',
        placeholder: '이메일 내용을 입력하세요...',
        required: true,
      },
    ],
  },
];