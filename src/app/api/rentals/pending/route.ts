import { NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { createClient } from "@/lib/supabase/server";

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
  "대여품목", // J
  "이메일", // K
  "메신저", // M
  "메신저ID", // N
  "동의", // O
  "픽업터미널", // P
  "반납터미널", // Q
];

export async function GET(req: Request) {
  try {
    // 인증 체크
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

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
    let totalRows;
    try {
      const countRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      totalRows = countRes.data.values?.length || 1;
      total = totalRows - 1; // 헤더 제외
    } catch (countErr) {
      return NextResponse.json(
        { error: "시트 row 카운트 실패", detail: String(countErr) },
        { status: 500 }
      );
    }

    // 역순으로 페이지네이션을 위한 범위 계산
    const startFromBottom = (page - 1) * pageSize;
    const endFromBottom = startFromBottom + pageSize - 1;
    const startRow = Math.max(2, totalRows - endFromBottom);
    const endRow = totalRows - startFromBottom;

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

    // 필요한 열만 fetch (A-K, M-Q, L열 제외)
    let rows;
    try {
      const ranges = [
        `${sheetName}!A${startRow}:K${endRow}`,
        `${sheetName}!M${startRow}:Q${endRow}`,
      ];

      const dataResponses = await Promise.all(
        ranges.map((range) =>
          sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: "UNFORMATTED_VALUE",
          })
        )
      );

      // 데이터 재조립 (L열 제외)
      const maxLength = Math.max(
        ...dataResponses.map((res) => res.data.values?.length || 0)
      );
      rows = [];

      for (let i = 0; i < maxLength; i++) {
        const row = [];
        // A-K (0-10)
        const firstRange = dataResponses[0].data.values?.[i] || [];
        row.push(...firstRange.slice(0, 11));
        // M-Q (11-15)
        const secondRange = dataResponses[1].data.values?.[i] || [];
        row.push(...secondRange.slice(0, 5));

        rows.push(row);
      }
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

    // 데이터를 역순으로 정렬 (최신 데이터가 먼저 오도록)
    data.reverse();

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
