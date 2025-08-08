-- Migration 32: Fix data transfer completion email template HTML formatting
-- 데이터 전송 완료 이메일 템플릿 HTML 포맷팅 수정

-- Delete existing template first
DELETE FROM public.email_templates WHERE template_key = 'data-transfer-completion';

-- Insert new template using dollar-quoted strings for proper HTML handling
INSERT INTO public.email_templates (template_key, template_name, subject_template, html_template, description, is_active) 
VALUES (
  'data-transfer-completion',
  '데이터 전송 완료 안내 메일 (드롭박스 포함)',
  '포할리데이 - 데이터 전송 완료 안내',
  $HTML$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 20px; 
      background-color: #f5f5f5;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #00af9f 0%, #00c4aa 100%);
      color: white; 
      padding: 30px 20px; 
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .content { 
      background-color: #fff; 
      padding: 30px;
    }
    .info-box { 
      background-color: #f8f9fa; 
      padding: 20px; 
      margin: 20px 0; 
      border-radius: 8px; 
      border-left: 4px solid #00af9f;
    }
    .info-box h3 {
      color: #00af9f; 
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .info-row { 
      display: flex; 
      padding: 8px 0; 
      border-bottom: 1px solid #eee;
      align-items: center;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label { 
      font-weight: bold; 
      width: 120px; 
      color: #666;
      flex-shrink: 0;
    }
    .info-value { 
      flex: 1; 
      color: #333;
    }
    .footer { 
      text-align: center; 
      padding: 30px 20px; 
      color: #666; 
      font-size: 14px;
      background-color: #f8f9fa;
      border-top: 1px solid #eee;
    }
    .highlight { 
      background-color: #e3f2fd; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
      border: 1px solid #2196f3;
    }
    .download-section { 
      background-color: #e8f5e8; 
      padding: 25px; 
      border-radius: 8px; 
      margin: 25px 0; 
      border: 2px solid #4caf50; 
      text-align: center;
    }
    .download-section h3 {
      color: #2e7d32; 
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 20px;
    }
    .download-button { 
      display: inline-block; 
      padding: 15px 30px; 
      background-color: #4caf50; 
      color: white; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 15px 0; 
      font-weight: bold;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    .download-button:hover {
      background-color: #45a049;
    }
    .login-section { 
      background-color: #fff3e0; 
      padding: 25px; 
      border-radius: 8px; 
      margin: 25px 0; 
      border: 2px solid #ff9800;
    }
    .login-section h3 {
      color: #e65100; 
      margin-top: 0; 
      text-align: center;
      margin-bottom: 20px;
      font-size: 20px;
    }
    .login-info { 
      background-color: white; 
      padding: 15px; 
      border-radius: 6px; 
      margin: 15px 0; 
      border: 1px solid #ff9800;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .credentials { 
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
      font-weight: bold; 
      color: #1976d2; 
      font-size: 16px;
      background-color: #f5f5f5;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    .usage-guide {
      background-color: #e3f2fd; 
      padding: 15px; 
      border-radius: 6px; 
      margin-top: 15px;
      border-left: 4px solid #2196f3;
    }
    .usage-guide p {
      margin: 0; 
      font-size: 14px; 
      color: #1976d2;
      line-height: 1.5;
    }
    ul {
      margin: 10px 0; 
      padding-left: 20px;
    }
    li {
      margin: 5px 0;
    }
    .warning {
      color: #d32f2f;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📱 데이터 전송 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>{{renter_name}}</strong>님</p>
      <p>포할리데이를 이용해주셔서 감사합니다.</p>
      <p>요청하신 <strong>데이터 전송이 완료</strong>되어 안내드립니다.</p>
      
      <div class="info-box">
        <h3>📋 예약 정보</h3>
        <div class="info-row">
          <div class="info-label">대여자명</div>
          <div class="info-value"><strong>{{renter_name}}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">연락처</div>
          <div class="info-value">{{renter_phone}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">이메일</div>
          <div class="info-value">{{renter_email}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">기기</div>
          <div class="info-value"><strong>{{device_info}}</strong></div>
        </div>
        {{#if return_date}}
        <div class="info-row">
          <div class="info-label">반납일</div>
          <div class="info-value">{{return_date}}</div>
        </div>
        {{/if}}
      </div>

      <div class="download-section">
        <h3>📥 데이터 다운로드</h3>
        <p><strong>아래 드롭박스 계정으로 로그인하여 데이터를 다운로드</strong> 받으실 수 있습니다.</p>
      </div>

      <div class="login-section">
        <h3>🔐 드롭박스 로그인 정보</h3>
        
        <div class="login-info">
          <div class="info-row">
            <div class="info-label">아이디:</div>
            <div class="info-value credentials">{{dropbox_username}}</div>
          </div>
        </div>
        
        <div class="login-info">
          <div class="info-row">
            <div class="info-label">비밀번호:</div>
            <div class="info-value credentials">{{dropbox_password}}</div>
          </div>
        </div>

        {{#if access_instructions}}
        <div class="login-info">
          <div class="info-row">
            <div class="info-label">접속 안내:</div>
            <div class="info-value">{{access_instructions}}</div>
          </div>
        </div>
        {{/if}}

        <p style="text-align: center; margin-top: 20px;">
          <a href="https://www.dropbox.com/login" class="download-button" target="_blank">
            🔗 드롭박스 로그인 페이지로 이동
          </a>
        </p>

        <div class="usage-guide">
          <p><strong>📌 이용 방법:</strong><br>
          1. 위 버튼을 클릭하여 드롭박스 로그인 페이지로 이동<br>
          2. 제공된 아이디와 비밀번호로 로그인<br>
          3. 업로드된 파일을 다운로드</p>
        </div>
      </div>

      <div class="highlight">
        <p><strong>⚠️ 중요 안내사항:</strong></p>
        <ul>
          <li>데이터는 <span class="warning">7일간만</span> 다운로드 가능합니다.</li>
          <li>7일 이후 데이터는 <strong>자동으로 삭제</strong>됩니다.</li>
          <li>로그인 정보는 <strong>보안을 위해 안전하게 보관</strong>해 주세요.</li>
          <li>다운로드 완료 후 <strong>반드시 로그아웃</strong> 해주세요.</li>
          <li>다운로드 중 문제가 발생하시면 <strong>즉시 연락</strong> 주세요.</li>
          <li>개인정보가 포함된 데이터이므로 <strong>타인과 공유하지 마세요</strong>.</li>
        </ul>
      </div>

      {{#if description}}
      <div class="info-box">
        <h3>💡 추가 안내사항</h3>
        <p>{{description}}</p>
      </div>
      {{/if}}

      <p style="margin-top: 30px;">문의사항이 있으시면 언제든 연락주세요.</p>
      <p><strong>감사합니다.</strong></p>
    </div>
    
    <div class="footer">
      <p><strong>포할리데이 팀</strong></p>
      <p>ForHoliday | 인천공항 장비대여 서비스</p>
      <p style="font-size: 12px; color: #999; margin-top: 15px;">
        이 메일은 발신 전용입니다. 회신은 처리되지 않습니다.
      </p>
    </div>
  </div>
</body>
</html>$HTML$,
  '데이터 전송 완료시 고객에게 발송되는 이메일 템플릿 (드롭박스 로그인 정보 포함)',
  true
);

-- Migration complete  
-- 마이그레이션 완료: HTML 포맷팅이 수정된 데이터 전송 완료 이메일 템플릿이 생성되었습니다.