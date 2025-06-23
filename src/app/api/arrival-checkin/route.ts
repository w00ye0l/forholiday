import { NextRequest, NextResponse } from "next/server";

// 텔레그램 봇 토큰과 채팅 ID (환경 변수로 설정)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 언어별 서비스 타입 번역
const serviceTypeTranslations = {
  ko: {
    rentalReturn: "대여 - 반납",
    rentalPickup: "대여 - 수령",
    storageDropoff: "짐보관 - 맡기기",
    storagePickup: "짐보관 - 찾기",
  },
  en: {
    rentalReturn: "Rental - Return",
    rentalPickup: "Rental - Pickup",
    storageDropoff: "Storage - Drop-off",
    storagePickup: "Storage - Pickup",
  },
  ja: {
    rentalReturn: "レンタル - 返却",
    rentalPickup: "レンタル - 受取",
    storageDropoff: "荷物保管 - 預ける",
    storagePickup: "荷物保管 - 受取",
  },
};

const terminalTranslations = {
  ko: {
    terminal1: "제 1터미널",
    terminal2: "제 2터미널",
  },
  en: {
    terminal1: "Terminal 1",
    terminal2: "Terminal 2",
  },
  ja: {
    terminal1: "第1ターミナル",
    terminal2: "第2ターミナル",
  },
};

const arrivalStatusTranslations = {
  ko: {
    thirtyMinBefore: "도착 30분 전(예정)",
    tenMinBefore: "도착 10분 전(예정)",
    atCounter: "카운터 도착",
  },
  en: {
    thirtyMinBefore: "30 minutes before arrival (scheduled)",
    tenMinBefore: "10 minutes before arrival (scheduled)",
    atCounter: "Arrived at counter",
  },
  ja: {
    thirtyMinBefore: "到着30分前（予定）",
    tenMinBefore: "到着10分前（予定）",
    atCounter: "カウンター到着",
  },
};

interface CheckinData {
  name: string;
  terminal: string;
  arrivalStatus: string;
  serviceType: string;
  language: string;
  tagName?: string;
}

function formatMessage(data: CheckinData) {
  const { name, terminal, arrivalStatus, serviceType, language, tagName } =
    data;

  // 안전한 타입 캐스팅을 위한 헬퍼 함수들
  const getServiceTypeText = () => {
    const langTranslations =
      serviceTypeTranslations[language as keyof typeof serviceTypeTranslations];
    if (langTranslations && serviceType in langTranslations) {
      return langTranslations[serviceType as keyof typeof langTranslations];
    }
    return serviceType;
  };

  const getTerminalText = () => {
    const langTranslations =
      terminalTranslations[language as keyof typeof terminalTranslations];
    if (langTranslations && terminal in langTranslations) {
      return langTranslations[terminal as keyof typeof langTranslations];
    }
    return terminal;
  };

  const getArrivalStatusText = () => {
    const langTranslations =
      arrivalStatusTranslations[
        language as keyof typeof arrivalStatusTranslations
      ];
    if (langTranslations && arrivalStatus in langTranslations) {
      return langTranslations[arrivalStatus as keyof typeof langTranslations];
    }
    return arrivalStatus;
  };

  const serviceTypeText = getServiceTypeText();
  const terminalText = getTerminalText();
  const arrivalStatusText = getArrivalStatusText();

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

  return `🔔 *도착 체크인 알림*

👤 *고객명*: ${name}
🏢 *터미널*: ${terminalText}
📋 *서비스*: ${serviceTypeText}${tagInfo}
⏱️ *도착 상태*: ${arrivalStatusText}
🌐 *언어*: ${language.toUpperCase()}
⏰ *접수 시간*: ${currentTime}

━━━━━━━━━━━━━━━━━━━━━
직원분들께서 준비해 주세요! 🚀`;
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
    const { name, terminal, arrivalStatus, serviceType, language, tagName } =
      data;
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
