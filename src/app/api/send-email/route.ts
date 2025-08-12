import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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
      const language = (formData.get("language") as string) || "en"; // 기본값: 영어

      // 렌탈 예약 정보 조회 (reservation_id 필드로 조회)
      const { data: rental, error: rentalError } = await supabase
        .from("rental_reservations")
        .select("*")
        .eq("reservation_id", reservationId)
        .single();

      if (!rentalError && rental) {
        console.log("Data transfer email generation:", {
          rentalId: rental.reservation_id,
          language: language,
          dropboxUsername: dropboxUsername ? "provided" : "missing",
          dropboxPassword: dropboxPassword ? "provided" : "missing",
        });

        const emailTemplate = generateDataTransferTemplate(
          language,
          dropboxUsername,
          dropboxPassword
        );
        finalSubject = emailTemplate.subject;
        finalContent = emailTemplate.html;
      }
    }

    // 첨부파일 처리
    const attachments: { filename: string; content: Buffer }[] = [];
    const entries = Array.from(formData.entries());

    // 일반 첨부파일 처리
    for (const [key, value] of entries) {
      if (key.startsWith("attachment_") && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        attachments.push({
          filename: value.name,
          content: buffer,
        });
      }
    }

    // 데이터 전송 완료 메일의 경우 PDF 가이드 파일 자동 첨부
    if (templateType === "data-transfer-completion") {
      try {
        const fs = require("fs");
        const path = require("path");
        const pdfPath = path.join(
          process.cwd(),
          "public",
          "files",
          "Guide(iOS, PC, Android).pdf"
        );

        if (fs.existsSync(pdfPath)) {
          const pdfBuffer = fs.readFileSync(pdfPath);
          attachments.push({
            filename: "Guide(iOS, PC, Android).pdf",
            content: pdfBuffer,
          });
        } else {
          console.warn("PDF guide file not found:", pdfPath);
        }
      } catch (error) {
        console.error("Error attaching PDF guide:", error);
      }
    }

    // 환경 변수 검증
    if (!process.env.RESEND_API_KEY) {
      console.error("Resend API key missing");
      return NextResponse.json(
        { success: false, error: "Resend API 키가 없습니다." },
        { status: 500 }
      );
    }

    // Resend 클라이언트 생성
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 이메일 옵션
    const emailOptions = {
      from: "Forholiday <onboarding@resend.dev>", // Resend 기본 도메인 사용
      reply_to: "forholidayg@gmail.com", // 답장 받을 실제 Gmail 주소
      to: [to],
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
      // 스팸 방지를 위한 헤더 추가
      headers: {
        "X-Entity-Ref-ID": `forholiday-${Date.now()}`, // 고유 ID로 스레드 방지
        "List-Unsubscribe": "<mailto:forholidayg@gmail.com>", // 구독 해제 링크
        "X-Priority": "3", // 일반 우선순위
        "X-Mailer": "FORHOLIDAY Email Service v1.0", // 메일러 식별
      },
    };

    // 이메일 전송
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("Email sent:", data?.id);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
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

// 데이터 전송 완료 이메일 템플릿 생성 함수 (언어별)
function generateDataTransferTemplate(
  language: string,
  username?: string,
  password?: string
) {
  if (language === "ja") {
    return {
      subject: "【FORHOLIDAY】 データダウンロードのご案内",
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
            <p>こんにちは、FORHOLIDAYです。</p>
            <p>この度はデータ転送サービスをご利用いただき、誠にありがとうございます。</p>
            <p>データのダウンロード方法についてご案内いたします。</p>
            <br>
            <p>添付のPDFファイルをご確認の上、記載された手順に従ってダウンロードを進めてください。</p>
            <br>
            <p>📌 ダウンロード可能期間は、<strong>本メール送信日から7日間</strong>です。</p>
            <p>期間を過ぎるとファイルは自動的に削除されますので、お早めに保存をお願いいたします。</p>
            <br>
            <p>今後ともFORHOLIDAYをよろしくお願いいたします。</p>
            <br>
            ${
              username
                ? `<p>🆔 <strong>ID：</strong> ${username}</p>`
                : "<p>🆔 <strong>ID：</strong></p>"
            }
            <p>🔐 <strong>パスワード：</strong> ${password || "Data1!"}</p>
            <br>
            <p>👉 <strong>IDとパスワードは、スペース（空白）を入れずに入力してください。</strong></p>
          </div>
        </body>
        </html>
      `,
    };
  } else {
    // 영어 (기본값)
    return {
      subject: "【FORHOLIDAY】 Data Download Instructions",
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
            <p>Hello, this is FORHOLIDAY.</p>
            <p>Thank you very much for using our data transfer service.</p>
            <p>We are providing you with instructions on how to download your data.</p>
            <br>
            <p>Please refer to the attached PDF file and follow the steps to proceed with the download.</p>
            <br>
            <p>📌 The download will be available for <strong>7 days</strong> from the date this email was sent.</p>
            <p>After that period, the files will be automatically deleted, so please save them as soon as possible.</p>
            <br>
            <p>We truly appreciate your continued support for FORHOLIDAY.</p>
            <br>
            ${
              username
                ? `<p>🆔 <strong>ID:</strong> ${username}</p>`
                : "<p>🆔 <strong>ID:</strong></p>"
            }
            <p>🔐 <strong>Password:</strong> ${password || "Data1!"}</p>
            <br>
            <p>👉 Please make sure to <strong>enter the ID and password without any spaces.</strong></p>
          </div>
        </body>
        </html>
      `,
    };
  }
}

// 짐보관 확정 메일 템플릿 생성 함수
function generateStorageConfirmationTemplate(reservation: any) {
  return {
    subject: `【FORHOLIDAY】 Your reservation has been confirmed - ${reservation.reservation_id}`,
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
