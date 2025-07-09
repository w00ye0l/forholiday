import { NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

// 22개 한국어 헤더 예시 (실제 번역에 맞게 수정)
const KOREAN_HEADERS = [
  "타임스탬프", // A
  "이름", // B
  "픽업일", // C
  "픽업시간", // D
  "여권사진", // E
  "반납일", // F
  "반납시간", // G
  "예약사이트", // H
  "예약번호", // I
  "(0)", // J
  "대여품목", // K
  "이메일", // L
  "없음", // M
  "(1)", // N
  "특별요청", // O
  "메신저", // P
  "메신저ID(1)", // Q
  "메신저ID(2)", // R
  "메신저ID(3)", // S
  "동의", // T
  "픽업터미널", // U
  "반납터미널", // V
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const startRow = (page - 1) * pageSize + 2;
    const endRow = startRow + pageSize - 1;

    // 환경 변수 체크
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME;

    if (!keyJson) {
      return NextResponse.json(
        { error: "서비스 계정 키 환경변수가 없습니다." },
        { status: 500 }
      );
    }
    if (!spreadsheetId || !sheetName) {
      return NextResponse.json(
        { error: "시트 ID 또는 시트 이름 환경변수가 없습니다." },
        { status: 500 }
      );
    }

    // credentials 파싱 및 private_key 줄바꿈 처리
    let credentials;
    try {
      credentials = JSON.parse(keyJson);
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      }
    } catch (parseErr) {
      return NextResponse.json(
        { error: "서비스 계정 JSON 파싱 실패", detail: String(parseErr) },
        { status: 500 }
      );
    }

    // 인증 객체 생성
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // 전체 row count 구하기
    let total;
    try {
      const countRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      total = (countRes.data.values?.length || 1) - 1;
    } catch (countErr) {
      return NextResponse.json(
        { error: "시트 row 카운트 실패", detail: String(countErr) },
        { status: 500 }
      );
    }

    // 날짜/시간 열만 FORMATTED_VALUE로 fetch
    let aCol, cCol, dCol, fCol, gCol;
    try {
      const [aRes, cRes, dRes, fRes, gRes] = await Promise.all([
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A${startRow}:A${endRow}`,
          valueRenderOption: "FORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!C${startRow}:C${endRow}`,
          valueRenderOption: "FORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!D${startRow}:D${endRow}`,
          valueRenderOption: "FORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!F${startRow}:F${endRow}`,
          valueRenderOption: "FORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!G${startRow}:G${endRow}`,
          valueRenderOption: "FORMATTED_VALUE",
        }),
      ]);
      aCol = aRes.data.values || [];
      cCol = cRes.data.values || [];
      dCol = dRes.data.values || [];
      fCol = fRes.data.values || [];
      gCol = gRes.data.values || [];
    } catch (colErr) {
      return NextResponse.json(
        { error: "날짜/시간 열 읽기 실패", detail: String(colErr) },
        { status: 500 }
      );
    }

    // 전체 데이터 fetch (A~V, UNFORMATTED_VALUE)
    let rows;
    try {
      const range = `${sheetName}!A${startRow}:V${endRow}`;
      const dataRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      rows = dataRes.data.values || [];
    } catch (rowErr) {
      return NextResponse.json(
        { error: "데이터 fetch 실패", detail: String(rowErr) },
        { status: 500 }
      );
    }

    // row → object 변환 (A, C, D, F, G만 formatted로 덮어쓰기)
    const data = rows.map((row, idx) => {
      const obj = Object.fromEntries(
        KOREAN_HEADERS.map((key, i) => [key, row[i] ?? ""])
      );
      if (aCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[0]] = aCol[idx][0];
      if (cCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[2]] = cCol[idx][0];
      if (dCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[3]] = dCol[idx][0];
      if (fCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[5]] = fCol[idx][0];
      if (gCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[6]] = gCol[idx][0];
      return obj;
    });

    return NextResponse.json({ data, total });
  } catch (e) {
    console.error("Google Sheets API Error:", e);
    return NextResponse.json(
      {
        error: "구글 시트 데이터 불러오기 실패",
        detail: String(e),
      },
      { status: 500 }
    );
  }
}
