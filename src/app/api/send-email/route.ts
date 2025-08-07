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
        // 데이터베이스에서 템플릿 조회
        const { data: template, error: templateError } = await supabase
          .from("email_templates")
          .select("*")
          .eq("template_key", "storage-confirmation")
          .eq("is_active", true)
          .single();

        if (!templateError && template) {
          // 데이터베이스 템플릿 사용
          const emailContent = processEmailTemplate(template, reservation);
          finalSubject = emailContent.subject;
          finalContent = emailContent.html;
        } else {
          // 폴백: 기본 템플릿 사용
          console.warn("Database template not found, using fallback template");
          const emailTemplate = generateStorageConfirmationTemplate(reservation);
          finalSubject = emailTemplate.subject;
          finalContent = emailTemplate.html;
        }

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
        finalContent = template.html_template.replace(/\{\{content\}\}/g, content);
      }
    } else if (templateType === "data-transfer-completion" && reservationId) {
      const supabase = await createClient();

      // 렌탈 예약 정보 조회
      const { data: rental, error: rentalError } = await supabase
        .from("rental_reservations")
        .select("*")
        .eq("id", reservationId)
        .single();

      if (!rentalError && rental) {
        // 데이터베이스에서 템플릿 조회
        const { data: template, error: templateError } = await supabase
          .from("email_templates")
          .select("*")
          .eq("template_key", "data-transfer-completion")
          .eq("is_active", true)
          .single();

        if (!templateError && template) {
          // 데이터베이스 템플릿 사용
          const dropboxCredentials = dropboxUsername && dropboxPassword ? {
            username: dropboxUsername,
            password: dropboxPassword,
            accessInstructions: accessInstructions
          } : undefined;
          
          const emailContent = processDataTransferTemplate(template, rental, dropboxCredentials);
          finalSubject = emailContent.subject;
          finalContent = emailContent.html;
        } else {
          // 폴백: 기본 템플릿 사용
          console.warn("Data transfer template not found, using fallback");
          finalSubject = "포할리데이 - 데이터 전송 완료 안내";
          finalContent = generateDefaultDataTransferTemplate(rental);
        }
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
        templateType === "storage-confirmation"
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
    processedHtml = processedHtml.replace(/\{\{#if tag_number\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    processedHtml = processedHtml.replace(/\{\{#if tag_number\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
  }

  if (reservation.notes) {
    processedHtml = processedHtml.replace(/\{\{#if notes\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    processedHtml = processedHtml.replace(/\{\{#if notes\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
  }

  return {
    subject: processedSubject,
    html: processedHtml,
  };
}

// 데이터 전송 템플릿 처리 함수
function processDataTransferTemplate(template: any, rental: any, dropboxCredentials?: { username: string; password: string; accessInstructions?: string }) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 기기 정보 조합
  const deviceInfo = rental.device_tag_name || rental.device_category || "기기 정보 없음";

  // 템플릿 변수 매핑
  const templateVariables: Record<string, any> = {
    renter_name: rental.renter_name || "고객",
    renter_phone: rental.renter_phone || "-",
    renter_email: rental.renter_email || "-",
    device_info: deviceInfo,
    return_date: formatDate(rental.return_date),
    description: rental.description || "",
    dropbox_username: dropboxCredentials?.username || "",
    dropbox_password: dropboxCredentials?.password || "",
    access_instructions: dropboxCredentials?.accessInstructions || "",
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

  // 조건부 블록 처리
  if (rental.return_date) {
    processedHtml = processedHtml.replace(/\{\{#if return_date\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    processedHtml = processedHtml.replace(/\{\{#if return_date\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
  }

  if (rental.description) {
    processedHtml = processedHtml.replace(/\{\{#if description\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    processedHtml = processedHtml.replace(/\{\{#if description\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
  }

  if (dropboxCredentials?.accessInstructions) {
    processedHtml = processedHtml.replace(/\{\{#if access_instructions\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  } else {
    processedHtml = processedHtml.replace(/\{\{#if access_instructions\}\}([\s\S]*?)\{\{\/if\}\}/g, '');
  }

  return {
    subject: processedSubject,
    html: processedHtml,
  };
}

// 데이터 전송 폴백 템플릿
function generateDefaultDataTransferTemplate(rental: any) {
  const deviceInfo = rental.device_tag_name || rental.device_category || "기기 정보 없음";
  
  return `
    <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #00af9f; color: white; padding: 20px; text-align: center;">
        <h1>데이터 전송 완료</h1>
      </div>
      <div style="padding: 30px; background-color: #f8f9fa;">
        <p>안녕하세요, ${rental.renter_name || '고객'}님</p>
        <p>포할리데이를 이용해주셔서 감사합니다.</p>
        <p>요청하신 데이터 전송이 완료되어 안내드립니다.</p>
        
        <div style="background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #00af9f;">
          <h3>예약 정보</h3>
          <p><strong>대여자명:</strong> ${rental.renter_name || '-'}</p>
          <p><strong>기기:</strong> ${deviceInfo}</p>
          ${rental.return_date ? `<p><strong>반납일:</strong> ${rental.return_date}</p>` : ''}
        </div>
        
        <div style="background-color: #E8F5E8; padding: 20px; border: 2px solid #4CAF50; text-align: center;">
          <h3>📥 데이터 다운로드</h3>
          <p>아래 링크를 통해 데이터를 다운로드 받으실 수 있습니다.</p>
          <p>[다운로드 링크는 첨부파일 또는 별도 안내를 통해 제공됩니다]</p>
        </div>
        
        <p>문의사항이 있으시면 언제든 연락주세요.</p>
        <p>감사합니다.</p>
        <p><strong>포할리데이 팀</strong></p>
      </div>
    </div>
  `;
}

// 폴백용 기본 템플릿 생성 함수
function generateStorageConfirmationTemplate(reservation: any) {
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

  return {
    subject: `[ForHoliday] 짐보관 예약이 확정되었습니다 - ${reservation.reservation_id}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
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
            <p>안녕하세요, ${reservation.customer_name}님</p>
            <p>ForHoliday 짐보관 서비스를 이용해 주셔서 감사합니다.</p>
            <p>고객님의 짐보관 예약이 확정되었습니다.</p>
            
            <div class="info-box">
              <h3 style="color: #00af9f; margin-top: 0;">예약 정보</h3>
              <div class="info-row">
                <div class="info-label">예약번호</div>
                <div class="info-value"><strong>${
                  reservation.reservation_id
                }</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">고객명</div>
                <div class="info-value">${reservation.customer_name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">연락처</div>
                <div class="info-value">${reservation.phone_number}</div>
              </div>
              <div class="info-row">
                <div class="info-label">물품</div>
                <div class="info-value">${reservation.items_description} (${
      reservation.quantity
    }개)</div>
              </div>
              ${
                reservation.tag_number
                  ? `
              <div class="info-row">
                <div class="info-label">태그번호</div>
                <div class="info-value">${reservation.tag_number}</div>
              </div>
              `
                  : ""
              }
            </div>

            <div class="info-box">
              <h3 style="color: #00af9f; margin-top: 0;">맡기기 정보</h3>
              <div class="info-row">
                <div class="info-label">날짜</div>
                <div class="info-value">${formatDate(
                  reservation.drop_off_date
                )}</div>
              </div>
              <div class="info-row">
                <div class="info-label">시간</div>
                <div class="info-value">${reservation.drop_off_time}</div>
              </div>
              <div class="info-row">
                <div class="info-label">장소</div>
                <div class="info-value">${
                  locationLabels[reservation.drop_off_location]
                }</div>
              </div>
            </div>

            <div class="info-box">
              <h3 style="color: #00af9f; margin-top: 0;">찾기 정보</h3>
              <div class="info-row">
                <div class="info-label">날짜</div>
                <div class="info-value">${formatDate(
                  reservation.pickup_date
                )}</div>
              </div>
              <div class="info-row">
                <div class="info-label">시간</div>
                <div class="info-value">${reservation.pickup_time}</div>
              </div>
              <div class="info-row">
                <div class="info-label">장소</div>
                <div class="info-value">${
                  locationLabels[reservation.pickup_location]
                }</div>
              </div>
            </div>

            ${
              reservation.notes
                ? `
            <div class="highlight">
              <strong>참고사항:</strong><br>
              ${reservation.notes}
            </div>
            `
                : ""
            }

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
      </html>
    `,
  };
}
