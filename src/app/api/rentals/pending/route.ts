import { NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import fs from "fs";
import path from "path";

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

    // 1. 환경변수에서 서비스 계정 JSON 읽어 임시 파일로 저장
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!keyJson) {
      return NextResponse.json(
        { error: "서비스 계정 키 환경변수가 없습니다." },
        { status: 500 }
      );
    }
    const keyPath = path.join("/tmp", "google-service-account.json");
    // JSON 파싱 후 private_key의 \n을 실제 줄바꿈으로 변환
    const parsed = JSON.parse(keyJson);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    fs.writeFileSync(keyPath, JSON.stringify(parsed, null, 2));

    const auth = new GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEET_NAME!;

    // 전체 row count 구하기 (A열 전체)
    const countRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });
    const total = (countRes.data.values?.length || 1) - 1;

    // 1. 시간/날짜 열만 FORMATTED_VALUE로 fetch (A, C, D, F, G)
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
    const aCol = aRes.data.values || [];
    const cCol = cRes.data.values || [];
    const dCol = dRes.data.values || [];
    const fCol = fRes.data.values || [];
    const gCol = gRes.data.values || [];

    // 2. 전체 데이터(원본값) fetch (A~V, UNFORMATTED_VALUE)
    const range = `${sheetName}!A${startRow}:V${endRow}`;
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = dataRes.data.values || [];

    // 3. row → object 변환 (A, C, D, F, G만 formatted로 덮어쓰기)
    const data = rows.map((row: any[], idx: number) => {
      const obj = Object.fromEntries(
        KOREAN_HEADERS.map((key, i) => [key, row[i] ?? ""])
      );
      if (aCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[0]] = aCol[idx][0]; // A
      if (cCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[2]] = cCol[idx][0]; // C
      if (dCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[3]] = dCol[idx][0]; // D
      if (fCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[5]] = fCol[idx][0]; // F
      if (gCol[idx]?.[0] !== undefined) obj[KOREAN_HEADERS[6]] = gCol[idx][0]; // G
      return obj;
    });

    return NextResponse.json({ data, total });
  } catch (e) {
    return NextResponse.json(
      { error: "구글 시트 데이터 불러오기 실패" },
      { status: 500 }
    );
  }
}
