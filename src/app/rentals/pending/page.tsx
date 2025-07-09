"use client";

import * as React from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

function normalizeHeader(header: string, idx: number, allHeaders: string[]) {
  let id = (header || "")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9가-힣_ ]/g, "")
    .trim()
    .replace(/ /g, "_")
    .toLowerCase();
  if (!id) id = `col_${idx + 1}`;
  let count = 1;
  let baseId = id;
  while (allHeaders.indexOf(id) < idx) {
    id = `${baseId}_${count++}`;
  }
  return id;
}

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

const COLUMN_WIDTHS: Record<string, string> = {
  타임스탬프: "w-40",
  이름: "w-32",
  픽업일: "w-24",
  픽업시간: "w-24",
  여권사진: "w-24",
  반납일: "w-24",
  반납시간: "w-24",
  예약사이트: "w-32",
  예약번호: "w-36",
  "(0)": "w-4",
  대여품목: "w-32",
  이메일: "w-48",
  없음: "w-4",
  "(1)": "w-4",
  특별요청: "w-12",
  메신저: "w-24",
  "메신저ID(1)": "w-24",
  "메신저ID(2)": "w-24",
  "메신저ID(3)": "w-24",
  동의: "w-14",
  픽업터미널: "w-32",
  반납터미널: "w-32",
};

export default function RentalsPendingPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || "";
  const sheetName = process.env.GOOGLE_SHEET_NAME || "";

  const columns = React.useMemo(() => {
    return [
      {
        id: "select",
        header: () => (
          <input type="checkbox" className="accent-primary" disabled />
        ),
        cell: () => <input type="checkbox" className="accent-primary" />,
        customWidth: "w-8",
      },
      ...KOREAN_HEADERS.map((header) => ({
        id: header,
        accessorKey: header,
        header,
        customWidth: COLUMN_WIDTHS[header] || "w-24",
        cell: (info: any) => {
          const value = info.getValue();
          if (typeof value === "string" && value.startsWith("https://")) {
            return (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-ellipsis overflow-hidden"
              >
                {value}
              </a>
            );
          }
          return value;
        },
      })),
    ];
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetch(
      `/api/rentals/pending?page=${pagination.pageIndex + 1}&pageSize=${
        pagination.pageSize
      }`
    )
      .then((res) => res.json())
      .then((json) => {
        setData(json.data || []);
        setTotal(json.total || 0);
        setLoading(false);
      });
  }, [pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="w-full mx-auto py-8 overflow-auto">
      <p>
        {keyJson}
        <br />
        {spreadsheetId}
        <br />
        {sheetName}
      </p>
      <h1 className="text-2xl font-bold mb-4">예약 대기 목록</h1>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <span className="text-blue-600 font-semibold text-sm animate-pulse">
            로딩 중...
          </span>
        </div>
      ) : (
        <div className="rounded-lg border bg-background max-w-[calc(100vw-20rem)] max-h-[calc(100vh-12rem)] overflow-auto mx-auto">
          <Table className="text-xs w-full table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={(header.column.columnDef as any).customWidth}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          (cell.column.columnDef as any).customWidth +
                          " text-ellipsis overflow-hidden"
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="첫 페이지"
              >
                {"<<"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="이전 페이지"
              >
                {"<"}
              </Button>
              <span className="px-2">
                {table.getState().pagination.pageIndex + 1} /{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="다음 페이지"
              >
                {">"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="마지막 페이지"
              >
                {">>"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span>페이지 크기:</span>
              <select
                className="border rounded px-2 py-1"
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                aria-label="페이지 크기 선택"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
