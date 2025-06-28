import { NextRequest, NextResponse } from "next/server";

// 텔레그램 봇 토큰과 채팅 ID (환경 변수로 설정)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 한국어 고정 텍스트
const serviceTypeTexts = {
  rentalReturn: "대여 - 반납",
  rentalPickup: "대여 - 수령",
  storageDropoff: "짐보관 - 맡기기",
  storagePickup: "짐보관 - 찾기",
};

const terminalTexts = {
  terminal1: "T1",
  terminal2: "T2",
};

const arrivalStatusTexts = {
  thirtyMinBefore: "도착 30분 전(예정)",
  tenMinBefore: "도착 10분 전(예정)",
  atCounter: "카운터 도착",
};

interface CheckinData {
  name: string;
  terminal: string;
  arrivalStatus: string;
  serviceType: string;
  tagName?: string;
}

function formatMessage(data: CheckinData) {
  const { name, terminal, arrivalStatus, serviceType, tagName } = data;

  // 한국어 고정 텍스트 변환
  const serviceTypeText =
    serviceTypeTexts[serviceType as keyof typeof serviceTypeTexts] ||
    serviceType;
  const terminalText =
    terminalTexts[terminal as keyof typeof terminalTexts] || terminal;
  const arrivalStatusText =
    arrivalStatusTexts[arrivalStatus as keyof typeof arrivalStatusTexts] ||
    arrivalStatus;

  const currentTime = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const tagInfo = tagName ? `\n🏷️ *태그 번호*: ${tagName}` : "";

  return `✈️ [${terminalText}/${serviceTypeText}]
👤 *고객명*: ${name}${tagInfo}
⏱️ *도착 상태*: ${arrivalStatusText}
⏰ *접수 시간*: ${currentTime}`;
}

export async function POST(request: NextRequest) {
  try {
    // 환경 변수 체크
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("텔레그램 환경 변수가 설정되지 않았습니다.");
      return NextResponse.json(
        { error: "텔레그램 설정이 누락되었습니다." },
        { status: 500 }
      );
    }

    const data = await request.json();

    // 필수 필드 검증
    const { name, terminal, arrivalStatus, serviceType, tagName } = data;
    if (!name || !terminal || !arrivalStatus || !serviceType) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 짐보관-찾기인 경우 태그 번호 필수
    if (serviceType === "storagePickup" && !tagName) {
      return NextResponse.json(
        { error: "짐보관 찾기의 경우 태그 번호가 필요합니다." },
        { status: 400 }
      );
    }

    // 텔레그램 메시지 포맷
    const message = formatMessage(data);

    // 텔레그램 API 호출
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.text();
      console.error("텔레그램 API 오류:", errorData);
      throw new Error("텔레그램 메시지 전송 실패");
    }

    console.log("도착 체크인 메시지 전송 성공:", {
      name,
      terminal,
      serviceType,
    });

    return NextResponse.json({
      success: true,
      message: "체크인이 성공적으로 전송되었습니다.",
    });
  } catch (error) {
    console.error("도착 체크인 처리 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
