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
