import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get("to") as string;
    const subject = formData.get("subject") as string;
    const content = formData.get("content") as string;
    const transferId = formData.get("transferId") as string;
    const templateType = formData.get("templateType") as string;
    const reservationId = formData.get("reservationId") as string;

    // 드롭박스 정보 (데이터 전송 완료 메일용)
    const dropboxUsername = formData.get("dropboxUsername") as string;
    const dropboxPassword = formData.get("dropboxPassword") as string;
    const accessInstructions = formData.get("accessInstructions") as string;

    // 짐보관 예약 확정 메일인 경우 템플릿 생성
    let finalSubject = subject;
    let finalContent = content;

    if (templateType === "storage-confirmation" && reservationId) {
      const supabase = await createClient();

      // 예약 정보 조회
      const { data: reservation, error: fetchError } = await supabase
        .from("storage_reservations")
        .select("*")
        .eq("reservation_id", reservationId)
        .single();

      if (!fetchError && reservation) {
        // 데이터베이스 템플릿을 사용하지 않고 직접 템플릿 생성
        const emailTemplate = generateStorageConfirmationTemplate(reservation);
        finalSubject = emailTemplate.subject;
        finalContent = emailTemplate.html;

        // 이메일 발송 기록 저장
        await supabase
          .from("storage_reservations")
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
            customer_email: to,
          })
          .eq("reservation_id", reservationId);
      }
    } else if (templateType === "general-email") {
      const supabase = await createClient();

      // 일반 이메일 템플릿 조회
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("template_key", "general-email")
        .eq("is_active", true)
        .single();

      if (!templateError && template) {
        // 일반 템플릿에 내용 적용
        finalSubject = subject || template.subject_template;
        finalContent = template.html_template.replace(
          /\{\{content\}\}/g,
          content
        );
      }
    } else if (templateType === "data-transfer-completion" && reservationId) {
      const supabase = await createClient();

      // 렌탈 예약 정보 조회 (reservation_id 필드로 조회)
      const { data: rental, error: rentalError } = await supabase
        .from("rental_reservations")
        .select("*")
        .eq("reservation_id", reservationId)
        .single();

      if (!rentalError && rental) {
        // 데이터베이스 템플릿을 사용하지 않고 직접 HTML 생성
        const dropboxCredentials =
          dropboxUsername && dropboxPassword
            ? {
                username: dropboxUsername,
                password: dropboxPassword,
                accessInstructions: accessInstructions || "",
              }
            : undefined;

        console.log("Data transfer email generation:", {
          rentalId: rental.reservation_id,
          hasDropboxCredentials: !!dropboxCredentials,
          dropboxUsername: dropboxUsername ? "provided" : "missing",
          dropboxPassword: dropboxPassword ? "provided" : "missing",
        });

        finalSubject = "포할리데이 - 데이터 전송 완료 안내";
        finalContent = generateDefaultDataTransferTemplate(
          rental,
          dropboxCredentials
        );
      }
    }

    // 첨부파일 처리
    const attachments: { filename: string; content: Buffer }[] = [];
    const entries = Array.from(formData.entries());

    for (const [key, value] of entries) {
      if (key.startsWith("attachment_") && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        attachments.push({
          filename: value.name,
          content: buffer,
        });
      }
    }

    // 환경 변수 검증
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.error("SMTP configuration missing");
      return NextResponse.json(
        { success: false, error: "SMTP 설정이 없습니다." },
        { status: 500 }
      );
    }

    // Nodemailer transporter 생성
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 이메일 옵션
    const mailOptions = {
      from: `"포할리데이" <${process.env.SMTP_USER}>`,
      to: to,
      subject: finalSubject,
      text: finalContent.replace(/<[^>]*>/g, ""), // HTML 태그 제거하여 text 버전 생성
      html:
        templateType === "storage-confirmation" ||
        templateType === "data-transfer-completion"
          ? finalContent
          : finalContent.replace(/\n/g, "<br>"),
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })),
    };

    // 이메일 전송
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent:", info.messageId);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      transferId: transferId,
    });
  } catch (error) {
    console.error("Error sending email:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 데이터베이스 템플릿 처리 함수
function processEmailTemplate(template: any, reservation: any) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const locationLabels: Record<string, string> = {
    T1: "제1터미널",
    T2: "제2터미널",
    office: "사무실",
  };

  // 템플릿 변수 매핑
  const templateVariables: Record<string, any> = {
    reservation_id: reservation.reservation_id,
    customer_name: reservation.customer_name,
    phone_number: reservation.phone_number,
    items_description: reservation.items_description,
    quantity: reservation.quantity,
    tag_number: reservation.tag_number || "",
    drop_off_date_formatted: formatDate(reservation.drop_off_date),
    drop_off_time: reservation.drop_off_time,
    drop_off_location_label: locationLabels[reservation.drop_off_location],
    pickup_date_formatted: formatDate(reservation.pickup_date),
    pickup_time: reservation.pickup_time,
    pickup_location_label: locationLabels[reservation.pickup_location],
    notes: reservation.notes || "",
  };

  // 제목 템플릿 처리
  let processedSubject = template.subject_template;
  Object.keys(templateVariables).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    processedSubject = processedSubject.replace(regex, templateVariables[key]);
  });

  // HTML 템플릿 처리
  let processedHtml = template.html_template;
  Object.keys(templateVariables).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    processedHtml = processedHtml.replace(regex, templateVariables[key]);
  });

  // 조건부 블록 처리 ({{#if tag_number}} ... {{/if}})
  if (reservation.tag_number) {
    processedHtml = processedHtml.replace(
      /\{\{#if tag_number\}\}([\s\S]*?)\{\{\/if\}\}/g,
      "$1"
    );
  } else {
    processedHtml = processedHtml.replace(
      /\{\{#if tag_number\}\}([\s\S]*?)\{\{\/if\}\}/g,
      ""
    );
  }

  if (reservation.notes) {
    processedHtml = processedHtml.replace(
      /\{\{#if notes\}\}([\s\S]*?)\{\{\/if\}\}/g,
      "$1"
    );
  } else {
    processedHtml = processedHtml.replace(
      /\{\{#if notes\}\}([\s\S]*?)\{\{\/if\}\}/g,
      ""
    );
  }

  return {
    subject: processedSubject,
    html: processedHtml,
  };
}

// 데이터 전송 완료 이메일 템플릿 생성 (직접 HTML 생성)
function generateDefaultDataTransferTemplate(
  rental: any,
  dropboxCredentials?: {
    username: string;
    password: string;
    accessInstructions?: string;
  }
) {
  const deviceInfo =
    rental.device_tag_name || rental.device_category || "기기 정보 없음";
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return `<!DOCTYPE html>
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
      <p>안녕하세요, <strong>${rental.renter_name || "고객"}</strong>님</p>
      <p>포할리데이를 이용해주셔서 감사합니다.</p>
      <p>요청하신 <strong>데이터 전송이 완료</strong>되어 안내드립니다.</p>
      
      <div class="info-box">
        <h3>📋 예약 정보</h3>
        <div class="info-row">
          <div class="info-label">대여자명</div>
          <div class="info-value"><strong>${
            rental.renter_name || "-"
          }</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">연락처</div>
          <div class="info-value">${rental.renter_phone || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">이메일</div>
          <div class="info-value">${rental.renter_email || "-"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">기기</div>
          <div class="info-value"><strong>${deviceInfo}</strong></div>
        </div>
        ${
          rental.return_date
            ? `
        <div class="info-row">
          <div class="info-label">반납일</div>
          <div class="info-value">${formatDate(rental.return_date)}</div>
        </div>`
            : ""
        }
      </div>

      <div class="download-section">
        <h3>📥 데이터 다운로드</h3>
        <p><strong>아래 드롭박스 계정으로 로그인하여 데이터를 다운로드</strong> 받으실 수 있습니다.</p>
      </div>

      ${
        dropboxCredentials
          ? `
      <div class="login-section">
        <h3>🔐 드롭박스 로그인 정보</h3>
        
        <div class="login-info">
          <div class="info-row">
            <div class="info-label">아이디:</div>
            <div class="info-value credentials">${
              dropboxCredentials.username
            }</div>
          </div>
        </div>
        
        <div class="login-info">
          <div class="info-row">
            <div class="info-label">비밀번호:</div>
            <div class="info-value credentials">${
              dropboxCredentials.password
            }</div>
          </div>
        </div>

        ${
          dropboxCredentials.accessInstructions
            ? `
        <div class="login-info">
          <div class="info-row">
            <div class="info-label">접속 안내:</div>
            <div class="info-value">${dropboxCredentials.accessInstructions}</div>
          </div>
        </div>`
            : ""
        }

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
      </div>`
          : `
      <div class="highlight">
        <p><strong>드롭박스 로그인 정보는 별도로 안내됩니다.</strong></p>
      </div>`
      }

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

      ${
        rental.description
          ? `
      <div class="info-box">
        <h3>💡 추가 안내사항</h3>
        <p>${rental.description}</p>
      </div>`
          : ""
      }

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
</html>`;
}

// 짐보관 확정 메일 템플릿 생성 함수
function generateStorageConfirmationTemplate(reservation: any) {
  return {
    subject: `[FORHOLIDAY] Your reservation has been confirmed - ${reservation.reservation_id}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <p><strong>Hello. This is FORHOLIDAY in Incheon Airport.</strong></p>
          <p><strong>Thank you for booking our service.</strong></p>
          <p>Your reservation has been confirmed. Thank you.</p>
          <br>
          <p>Please refer to the link below for information on pickup, return procedures, and usage instructions.</p>
          <p><a href="https://www.notion.so/USER-GUIDE-feff9a5d2cae4f5a8bfd2119bdc94a90?pvs=21" target="_blank"><strong>FORHOLIDAY USER GUIDE (notion.site)</strong></a></p>
          <br>
          <p>You can contact us via the messengers below :</p>
          <p>Kakao : forholiday</p>
          <p>WhatsApp: +82 10 5241 5257</p>
          <p>LINE <strong>official: @558hovam</strong></p>
          <p>LINE: ukuk101</p>
        </div>
      </body>
      </html>
    `,
  };
}
