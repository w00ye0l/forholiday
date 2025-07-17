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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

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
  "대여품목", // J
  "이메일", // K
  "메신저", // M
  "메신저ID", // N
  "동의", // O
  "픽업터미널", // P
  "반납터미널", // Q
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
  대여품목: "w-32",
  이메일: "w-48",
  메신저: "w-24",
  메신저ID: "w-24",
  동의: "w-20",
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
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(
    new Set()
  );
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [confirmedReservationIds, setConfirmedReservationIds] = React.useState<
    Set<string>
  >(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [canceledReservationIds, setCanceledReservationIds] = React.useState<
    Set<string>
  >(new Set());

  // 고유 식별자 생성 함수
  const generateReservationId = React.useCallback((reservation: any) => {
    const timestamp = reservation["타임스탬프"];
    const bookingNumber = String(reservation["예약번호"]);
    return `${timestamp}|${bookingNumber}`;
  }, []);

  const handleSelectAll = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(new Set(data.map((_, index) => index)));
      } else {
        setSelectedRows(new Set());
      }
    },
    [data]
  );

  const handleRowSelect = React.useCallback(
    (index: number, checked: boolean) => {
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(index);
        } else {
          newSet.delete(index);
        }
        return newSet;
      });
    },
    []
  );

  const handleConfirmClick = React.useCallback(() => {
    if (selectedRows.size === 0) return;
    setShowConfirmDialog(true);
  }, [selectedRows.size]);

  const handleCancelClick = React.useCallback(() => {
    if (selectedRows.size === 0) return;
    setShowCancelDialog(true);
  }, [selectedRows.size]);

  const getSelectedConfirmedCount = React.useCallback(() => {
    return Array.from(selectedRows).filter((index) =>
      confirmedReservationIds.has(generateReservationId(data[index]))
    ).length;
  }, [selectedRows, confirmedReservationIds, data, generateReservationId]);

  const handleConfirmReservations = React.useCallback(async () => {
    if (selectedRows.size === 0) return;

    setIsConfirming(true);
    setShowConfirmDialog(false);

    try {
      const selectedData = Array.from(selectedRows).map((index) => data[index]);

      // 새로운 API 엔드포인트로 예약 확정 요청
      const response = await fetch("/api/pending-reservations/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reservations: selectedData }),
      });

      if (!response.ok) {
        throw new Error("예약 확정 요청 실패");
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message);

        // 확정된 예약들을 상태에 추가 (고유 식별자 사용)
        const newConfirmedReservationIds = selectedData.map((item) =>
          generateReservationId(item)
        );
        setConfirmedReservationIds(
          (prev) =>
            new Set([...Array.from(prev), ...newConfirmedReservationIds])
        );
        setSelectedRows(new Set());

        // 데이터 새로고침
        const refreshResponse = await fetch(
          `/api/rentals/pending?page=${pagination.pageIndex + 1}&pageSize=${
            pagination.pageSize
          }`
        );
        const refreshData = await refreshResponse.json();
        setData(refreshData.data || []);
        setTotal(refreshData.total || 0);

        // 상태 정보도 새로고침
        const refreshedData = refreshData.data || [];
        if (refreshedData.length > 0) {
          const reservationData = refreshedData.map((item: any) => ({
            reservationId: generateReservationId(item),
            bookingNumber: String(item["예약번호"]),
            timestamp: item["타임스탬프"],
          }));

          try {
            const reservationKeys = reservationData.map(
              (r: any) => r.reservationId
            );
            const statusResponse = await fetch(
              `/api/pending-reservations/status?reservation_keys=${encodeURIComponent(
                JSON.stringify(reservationKeys)
              )}`
            );
            const statusResult = await statusResponse.json();

            if (statusResult.success) {
              const confirmedIds = new Set<string>(
                statusResult.confirmed_reservation_keys || []
              );
              const canceledIds = new Set<string>(
                statusResult.canceled_reservation_keys || []
              );

              setConfirmedReservationIds(confirmedIds);
              setCanceledReservationIds(canceledIds);
            }
          } catch (error) {
            console.error("상태 새로고침 오류:", error);
          }
        }
      } else {
        alert("예약 확정에 실패했습니다.");
      }
    } catch (error) {
      console.error("예약 확정 오류:", error);
      alert("예약 확정 중 오류가 발생했습니다.");
    } finally {
      setIsConfirming(false);
    }
  }, [selectedRows, data, pagination]);

  const handleCancelReservations = React.useCallback(async () => {
    if (selectedRows.size === 0) return;

    setIsCanceling(true);
    setShowCancelDialog(false);

    try {
      const selectedData = Array.from(selectedRows).map((index) => data[index]);
      const reservationKeys = selectedData.map((item) =>
        generateReservationId(item)
      );

      const response = await fetch("/api/pending-reservations/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationKeys,
          reservationData: selectedData,
        }),
      });

      if (!response.ok) {
        throw new Error("예약 취소 요청 실패");
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message);

        // 취소된 예약들을 확정 상태에서 제거하고 취소 상태에 추가
        const canceledReservationIds = selectedData
          .filter((_, index) => result.results[index]?.success)
          .map((item) => generateReservationId(item));

        setConfirmedReservationIds((prev) => {
          const newSet = new Set(prev);
          canceledReservationIds.forEach((id: string) => newSet.delete(id));
          return newSet;
        });

        setCanceledReservationIds((prev) => {
          const newSet = new Set(prev);
          canceledReservationIds.forEach((id: string) => newSet.add(id));
          return newSet;
        });
        setSelectedRows(new Set());

        // 데이터 새로고침 없이 현재 페이지 유지
      } else {
        alert("예약 취소에 실패했습니다.");
      }
    } catch (error) {
      console.error("예약 취소 오류:", error);
      alert("예약 취소 중 오류가 발생했습니다.");
    } finally {
      setIsCanceling(false);
    }
  }, [selectedRows, data]);

  const columns = React.useMemo(() => {
    return [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            className="accent-primary"
            checked={selectedRows.size > 0 && selectedRows.size === data.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        ),
        cell: (info: any) => {
          const rowIndex = info.row.index;
          return (
            <input
              type="checkbox"
              className="accent-primary"
              checked={selectedRows.has(rowIndex)}
              onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
            />
          );
        },
        customWidth: "w-8",
      },
      ...KOREAN_HEADERS.filter((header) => header !== "동의").map((header) => ({
        id: header,
        accessorKey: header,
        header,
        customWidth: COLUMN_WIDTHS[header] || "w-24",
        cell: (info: any) => {
          const value = info.getValue();
          const rowData = info.row.original;
          const reservationId = generateReservationId(rowData);
          const isConfirmed = confirmedReservationIds.has(reservationId);
          const isCanceled = canceledReservationIds.has(reservationId);

          // 디버깅용 로그 (개발 환경에서만)
          // if (process.env.NODE_ENV === 'development' && header === "예약번호") {
          //   console.log(`예약 ${reservationId}: 확정=${isConfirmed}, 취소=${isCanceled}`);
          // }

          if (typeof value === "string" && value.startsWith("https://")) {
            return (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-blue-600 underline text-ellipsis overflow-hidden ${
                  isConfirmed ? "opacity-75" : ""
                } ${isCanceled ? "opacity-50 text-gray-500" : ""}`}
                style={
                  isCanceled ? { textDecoration: "line-through" } : undefined
                }
              >
                {value}
              </a>
            );
          }
          return (
            <span
              className={`${isConfirmed ? "font-medium" : ""} ${
                isCanceled ? "opacity-50 text-gray-500" : ""
              }`}
              style={
                isCanceled ? { textDecoration: "line-through" } : undefined
              }
            >
              {value}
              {isConfirmed && header === "예약번호" && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  확정됨
                </span>
              )}
              {isCanceled && header === "예약번호" && (
                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  취소됨
                </span>
              )}
            </span>
          );
        },
      })),
    ];
  }, [
    selectedRows,
    data,
    handleSelectAll,
    handleRowSelect,
    confirmedReservationIds,
    canceledReservationIds,
    generateReservationId,
  ]);

  React.useEffect(() => {
    setLoading(true);
    fetch(
      `/api/rentals/pending?page=${pagination.pageIndex + 1}&pageSize=${
        pagination.pageSize
      }`
    )
      .then((res) => res.json())
      .then(async (json) => {
        const newData = json.data || [];
        setData(newData);
        setTotal(json.total || 0);
        setLoading(false);
        setSelectedRows(new Set()); // 페이지 변경 시 선택 초기화

        // 현재 페이지의 예약들과 고유 식별자 생성
        const reservationData = newData.map((item: any) => ({
          reservationId: generateReservationId(item),
          bookingNumber: String(item["예약번호"]),
          timestamp: item["타임스탬프"],
        }));

        if (reservationData.length > 0) {
          // 데이터베이스에서 확정된 예약 키들 조회
          try {
            const reservationKeys = reservationData.map(
              (r: any) => r.reservationId
            );
            const statusResponse = await fetch(
              `/api/pending-reservations/status?reservation_keys=${encodeURIComponent(
                JSON.stringify(reservationKeys)
              )}`
            );
            const statusResult = await statusResponse.json();

            if (statusResult.success) {
              // 예약 키로 직접 매핑
              const confirmedIds = new Set<string>(
                statusResult.confirmed_reservation_keys || []
              );
              const canceledIds = new Set<string>(
                statusResult.canceled_reservation_keys || []
              );

              setConfirmedReservationIds(confirmedIds);
              setCanceledReservationIds(canceledIds);
            }
          } catch (error) {
            console.error("확정 상태 조회 오류:", error);
          }
        }
      })
      .catch((error) => {
        console.error("데이터 로딩 오류:", error);
        setLoading(false);
      });
  }, [pagination.pageIndex, pagination.pageSize, generateReservationId]);

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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">예약 대기 목록</h1>
        <div className="flex items-center gap-4">
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedRows.size}개 선택됨
              {getSelectedConfirmedCount() > 0 && (
                <span className="ml-2 text-green-600">
                  ({getSelectedConfirmedCount()}개 확정됨)
                </span>
              )}
            </span>
          )}
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={handleCancelClick}
                disabled={selectedRows.size === 0 || isCanceling}
                variant="destructive"
                className="mr-2"
              >
                {isCanceling ? "처리 중..." : "예약 취소"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>예약 취소 확인</DialogTitle>
                <DialogDescription>
                  선택한 {selectedRows.size}개의 예약을 취소하시겠습니까?
                  <br />
                  {getSelectedConfirmedCount() > 0 && (
                    <>
                      확정된 예약 {getSelectedConfirmedCount()}개는 렌탈
                      예약에서 제거되며,{" "}
                    </>
                  )}
                  이 작업은 되돌릴 수 없습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {Array.from(selectedRows).map((index) => {
                    const reservation = data[index];
                    const reservationId = generateReservationId(reservation);
                    const isConfirmed =
                      confirmedReservationIds.has(reservationId);
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded ${
                          isConfirmed ? "bg-red-50" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {reservation["이름"]}
                            {isConfirmed && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                확정됨
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {reservation["대여품목"]} |{" "}
                            {reservation["예약번호"]}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reservation["픽업일"]} {reservation["픽업시간"]} ~{" "}
                            {reservation["반납일"]} {reservation["반납시간"]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCanceling}
                >
                  취소
                </Button>
                <Button
                  onClick={handleCancelReservations}
                  disabled={isCanceling}
                  variant="destructive"
                >
                  {isCanceling ? "처리 중..." : "취소 확정"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={handleConfirmClick}
                disabled={selectedRows.size === 0 || isConfirming}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isConfirming ? "처리 중..." : "예약 확정"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>예약 확정 확인</DialogTitle>
                <DialogDescription>
                  선택한 {selectedRows.size}개의 예약을 확정하시겠습니까?
                  <br />
                  확정된 예약은 실제 렌탈 예약으로 등록되며, 이 작업은 되돌릴 수
                  없습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {Array.from(selectedRows).map((index) => {
                    const reservation = data[index];
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {reservation["이름"]}
                          </div>
                          <div className="text-sm text-gray-600">
                            {reservation["대여품목"]} |{" "}
                            {reservation["예약번호"]}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reservation["픽업일"]} {reservation["픽업시간"]} ~{" "}
                            {reservation["반납일"]} {reservation["반납시간"]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isConfirming}
                >
                  취소
                </Button>
                <Button
                  onClick={handleConfirmReservations}
                  disabled={isConfirming}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isConfirming ? "처리 중..." : "확정"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <span className="text-blue-600 font-semibold text-sm animate-pulse">
            로딩 중...
          </span>
        </div>
      ) : (
        <div className="rounded-lg border bg-background max-w-[calc(100vw-20rem)] max-h-[calc(100vh-13rem)] overflow-auto mx-auto">
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
                  <TableRow
                    key={row.id}
                    className={
                      canceledReservationIds.has(
                        generateReservationId(row.original)
                      )
                        ? "bg-red-50 border-red-200"
                        : confirmedReservationIds.has(
                            generateReservationId(row.original)
                          )
                        ? "bg-green-50 border-green-200"
                        : ""
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          (cell.column.columnDef as any).customWidth +
                          " text-ellipsis overflow-hidden" +
                          (canceledReservationIds.has(
                            generateReservationId(row.original)
                          )
                            ? " text-red-800"
                            : confirmedReservationIds.has(
                                generateReservationId(row.original)
                              )
                            ? " text-green-800"
                            : "")
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
