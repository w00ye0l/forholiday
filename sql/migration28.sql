-- Migration 28: Add Dropbox credentials to data transfer completion email template
-- 데이터 전송 완료 이메일 템플릿에 드롭박스 계정 정보 추가

-- Update data transfer completion template with Dropbox login information
UPDATE public.email_templates 
SET html_template = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ''Malgun Gothic'', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #fff; }
    .header { background-color: #00af9f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
    .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #00af9f; }
    .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-label { font-weight: bold; width: 120px; color: #666; }
    .info-value { flex: 1; color: #333; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
    .highlight { background-color: #E3F2FD; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #2196F3; }
    .download-section { background-color: #E8F5E8; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50; text-align: center; }
    .download-button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
    .login-section { background-color: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #FF9800; }
    .login-info { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #FF9800; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>데이터 전송 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, {{renter_name}}님</p>
      <p>포할리데이를 이용해주셔서 감사합니다.</p>
      <p>요청하신 데이터 전송이 완료되어 안내드립니다.</p>
      
      <div class="info-box">
        <h3 style="color: #00af9f; margin-top: 0;">예약 정보</h3>
        <div class="info-row">
          <div class="info-label">대여자명</div>
          <div class="info-value">{{renter_name}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">연락처</div>
          <div class="info-value">{{renter_phone}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">기기</div>
          <div class="info-value">{{device_info}}</div>
        </div>
        {{#if return_date}}
        <div class="info-row">
          <div class="info-label">반납일</div>
          <div class="info-value">{{return_date}}</div>
        </div>
        {{/if}}
      </div>

      <div class="download-section">
        <h3 style="color: #2E7D32; margin-top: 0;">📥 데이터 다운로드</h3>
        <p>아래 드롭박스 계정으로 로그인하여 데이터를 다운로드 받으실 수 있습니다.</p>
      </div>

      <div class="login-section">
        <h3 style="color: #E65100; margin-top: 0; text-align: center;">🔐 드롭박스 로그인 정보</h3>
        
        <div class="login-info">
          <div class="info-row" style="border-bottom: none;">
            <div class="info-label">아이디:</div>
            <div class="info-value" style="font-family: monospace; font-weight: bold; color: #1976D2;">{{dropbox_username}}</div>
          </div>
        </div>
        
        <div class="login-info">
          <div class="info-row" style="border-bottom: none;">
            <div class="info-label">비밀번호:</div>
            <div class="info-value" style="font-family: monospace; font-weight: bold; color: #1976D2;">{{dropbox_password}}</div>
          </div>
        </div>

        {{#if access_instructions}}
        <div class="login-info">
          <div class="info-row" style="border-bottom: none;">
            <div class="info-label">접속 안내:</div>
            <div class="info-value">{{access_instructions}}</div>
          </div>
        </div>
        {{/if}}

        <p style="text-align: center; margin-top: 15px;">
          <a href="https://www.dropbox.com/login" class="download-button" target="_blank">
            🔗 드롭박스 로그인 페이지 이동
          </a>
        </p>
      </div>

      <div class="highlight">
        <strong>⚠️ 중요 안내사항:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>데이터는 <strong>7일간</strong> 다운로드 가능합니다.</li>
          <li>7일 이후 데이터는 자동으로 삭제됩니다.</li>
          <li>로그인 정보는 보안을 위해 안전하게 보관해 주세요.</li>
          <li>다운로드 완료 후 즉시 로그아웃 해주세요.</li>
          <li>다운로드 중 문제가 발생하시면 즉시 연락 주세요.</li>
        </ul>
      </div>

      {{#if description}}
      <div class="info-box">
        <h3 style="color: #00af9f; margin-top: 0;">추가 안내사항</h3>
        <p>{{description}}</p>
      </div>
      {{/if}}

      <p>문의사항이 있으시면 언제든 연락주세요.</p>
      <p>감사합니다.</p>
    </div>
    
    <div class="footer">
      <p><strong>포할리데이 팀</strong></p>
      <p>ForHoliday | 인천공항 장비대여 서비스</p>
      <p style="font-size: 12px; color: #999;">
        이 메일은 발신 전용입니다. 회신은 처리되지 않습니다.
      </p>
    </div>
  </div>
</body>
</html>'
WHERE template_key = 'data-transfer-completion';

-- Migration complete
-- 마이그레이션 완료: 데이터 전송 완료 이메일 템플릿에 드롭박스 로그인 정보가 추가되었습니다.