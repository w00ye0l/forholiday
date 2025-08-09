"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchIcon, CalendarIcon, RefreshCwIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { DEVICE_CATEGORY_LABELS, DeviceCategory } from "@/types/device";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

// 한국어 헤더 (픽업일시, 반납일시 통합)
const KOREAN_HEADERS = [
  "타임스탬프", // A
  "이름", // B
  "픽업일시", // C+D 통합
  "여권사진", // E
  "반납일시", // F+G 통합
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
  타임스탬프: "w-28 min-w-[112px]",
  이름: "w-32 min-w-[128px]",
  픽업일시: "w-28 min-w-[112px]",
  여권사진: "w-24 min-w-[96px]",
  반납일시: "w-28 min-w-[112px]",
  예약사이트: "w-32 min-w-[128px]",
  예약번호: "w-36 min-w-[144px]",
  대여품목: "w-24 min-w-[96px]",
  이메일: "w-48 min-w-[192px]",
  메신저: "w-24 min-w-[96px]",
  메신저ID: "w-24 min-w-[96px]",
  동의: "w-20 min-w-[80px]",
  픽업터미널: "w-28 min-w-[112px]",
  반납터미널: "w-28 min-w-[112px]",
};

export default function RentalsPendingPage() {
  const { state } = useSidebar();
  const [data, setData] = React.useState<any[]>([]);
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

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [selectedSite, setSelectedSite] = React.useState("all");
  const [selectedCategory, setSelectedCategory] = React.useState("all");

  // 카테고리 매핑 함수 - Google Sheets 데이터를 표준 카테고리로 변환
  const mapCategoryToStandard = React.useCallback(
    (rawCategory: string): string => {
      if (!rawCategory) return rawCategory;

      const categoryUpper = rawCategory.toUpperCase().trim();

      // 직접 매칭
      if (categoryUpper in DEVICE_CATEGORY_LABELS) {
        return DEVICE_CATEGORY_LABELS[categoryUpper as DeviceCategory];
      }

      // 패턴 매칭
      if (categoryUpper.includes("GP13")) return DEVICE_CATEGORY_LABELS.GP13;
      if (categoryUpper.includes("GP12")) return DEVICE_CATEGORY_LABELS.GP12;
      if (categoryUpper.includes("GP11")) return DEVICE_CATEGORY_LABELS.GP11;
      if (categoryUpper.includes("GP10")) return DEVICE_CATEGORY_LABELS.GP10;
      if (categoryUpper.includes("POCKET") || categoryUpper.includes("포켓"))
        return DEVICE_CATEGORY_LABELS.POCKET3;
      if (categoryUpper.includes("ACTION") || categoryUpper.includes("액션"))
        return DEVICE_CATEGORY_LABELS.ACTION5;
      if (categoryUpper.includes("S23")) return DEVICE_CATEGORY_LABELS.S23;
      if (categoryUpper.includes("S24")) return DEVICE_CATEGORY_LABELS.S24;
      if (categoryUpper.includes("S25")) return DEVICE_CATEGORY_LABELS.S25;
      if (categoryUpper.includes("PS5")) return DEVICE_CATEGORY_LABELS.PS5;
      if (categoryUpper.includes("GLAMPAM") || categoryUpper.includes("글램팜"))
        return DEVICE_CATEGORY_LABELS.GLAMPAM;
      if (categoryUpper.includes("AIRWRAP") || categoryUpper.includes("에어랩"))
        return DEVICE_CATEGORY_LABELS.AIRWRAP;
      if (
        categoryUpper.includes("INSTA360") ||
        categoryUpper.includes("인스타")
      )
        return DEVICE_CATEGORY_LABELS.INSTA360;
      if (
        categoryUpper.includes("STROLLER") ||
        categoryUpper.includes("유모차")
      )
        return DEVICE_CATEGORY_LABELS.STROLLER;
      if (
        categoryUpper.includes("MINIEVO") ||
        categoryUpper.includes("미니에보")
      )
        return DEVICE_CATEGORY_LABELS.MINIEVO;
      if (
        categoryUpper.includes("OJM360") ||
        categoryUpper.includes("오즈모360")
      )
        return DEVICE_CATEGORY_LABELS.OJM360;
      // 매칭되지 않으면 기타로 분류
      return DEVICE_CATEGORY_LABELS.ETC;
    },
    []
  );

  // 검색어 하이라이트 함수
  const highlightText = React.useCallback(
    (text: string, searchTerm: string): React.ReactNode => {
      if (!searchTerm.trim()) return text;

      const regex = new RegExp(
        `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    []
  );

  // 고유 식별자 생성 함수
  const generateReservationId = React.useCallback((reservation: any) => {
    const timestamp = reservation["타임스탬프"];
    const bookingNumber = String(reservation["예약번호"]);
    return `${timestamp}|${bookingNumber}`;
  }, []);

  const handleSelectAll = React.useCallback(
    (checked: boolean, currentData: any[]) => {
      if (checked) {
        setSelectedRows(new Set(currentData.map((_, index) => index)));
      } else {
        setSelectedRows(new Set());
      }
    },
    []
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

  // 필터링된 데이터
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      // 검색어 필터 (이름, 예약번호, 이메일)
      const matchesSearch =
        !searchTerm ||
        item["이름"]
          ?.toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item["예약번호"]
          ?.toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item["이메일"]
          ?.toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // 예약 사이트 필터
      const matchesSite =
        selectedSite === "all" || item["예약사이트"] === selectedSite;

      // 대여품목 필터 - 표준화된 카테고리로 비교
      const standardizedCategory = mapCategoryToStandard(item["대여품목"]);
      const matchesCategory =
        selectedCategory === "all" || standardizedCategory === selectedCategory;

      // 날짜 필터 (픽업일 기준)
      const matchesDateRange =
        !dateRange?.from ||
        !dateRange?.to ||
        (() => {
          const pickupDate = item["픽업일"];
          if (!pickupDate) return false;

          try {
            // 한국어 날짜 형식을 표준 날짜 형식으로 변환
            const normalizedDate = pickupDate
              .replace(/\./g, "")
              .trim()
              .split(" ");
            if (normalizedDate.length < 3) return false;

            const year = normalizedDate[0];
            const month = normalizedDate[1];
            const day = normalizedDate[2];

            if (!year || !month || !day) return false;

            const dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(
              2,
              "0"
            )}`;

            const fromStr = format(dateRange.from, "yyyy-MM-dd");
            const toStr = format(dateRange.to, "yyyy-MM-dd");

            return dateStr >= fromStr && dateStr <= toStr;
          } catch (error) {
            console.warn("날짜 파싱 오류:", pickupDate, error);
            return false;
          }
        })();

      return (
        matchesSearch && matchesSite && matchesCategory && matchesDateRange
      );
    });
  }, [
    data,
    searchTerm,
    selectedSite,
    selectedCategory,
    dateRange,
    mapCategoryToStandard,
  ]);

  const getSelectedConfirmedCount = React.useCallback(() => {
    return Array.from(selectedRows).filter((index) =>
      confirmedReservationIds.has(generateReservationId(filteredData[index]))
    ).length;
  }, [
    selectedRows,
    confirmedReservationIds,
    filteredData,
    generateReservationId,
  ]);

  // 고유 값들 추출 (필터 옵션용)
  const uniqueSites = React.useMemo(() => {
    const sites = Array.from(
      new Set(data.map((item) => item["예약사이트"]))
    ).filter(Boolean);
    return sites.sort();
  }, [data]);

  const uniqueCategories = React.useMemo(() => {
    const categories = Array.from(
      new Set(data.map((item) => mapCategoryToStandard(item["대여품목"])))
    ).filter(Boolean);
    return categories.sort();
  }, [data, mapCategoryToStandard]);

  // 필터 초기화
  const handleResetFilters = React.useCallback(() => {
    setSearchTerm("");
    setDateRange(undefined);
    setSelectedSite("all");
    setSelectedCategory("all");
    setSelectedRows(new Set());
  }, []);

  // 필터 변경 시 선택 초기화
  React.useEffect(() => {
    setSelectedRows(new Set());
  }, [searchTerm, dateRange, selectedSite, selectedCategory]);

  const handleConfirmReservations = React.useCallback(async () => {
    if (selectedRows.size === 0) return;

    setIsConfirming(true);
    setShowConfirmDialog(false);

    try {
      const selectedData = Array.from(selectedRows).map(
        (index) => filteredData[index]
      );

      console.log("확정 요청 데이터:", selectedData);

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
      console.log("확정 API 응답:", result);

      if (result.success) {
        alert(result.message);

        // 성공한 예약 번호들을 수집
        const successfulBookingNumbers = result.results
          .filter((r: any) => r.success)
          .map((r: any) => String(r.booking_number));

        // 성공한 예약들의 ID 생성
        const confirmedReservationIds = selectedData
          .filter((item) =>
            successfulBookingNumbers.includes(String(item["예약번호"]))
          )
          .map((item) => generateReservationId(item));

        setCanceledReservationIds((prev) => {
          const newSet = new Set(prev);
          confirmedReservationIds.forEach((id: string) => newSet.delete(id));
          return newSet;
        });

        setConfirmedReservationIds((prev) => {
          const newSet = new Set(prev);
          confirmedReservationIds.forEach((id: string) => newSet.add(id));
          return newSet;
        });
        setSelectedRows(new Set());
      } else {
        alert("예약 확정에 실패했습니다.");
      }
    } catch (error) {
      console.error("예약 확정 오류:", error);
      alert("예약 확정 중 오류가 발생했습니다.");
    } finally {
      setIsConfirming(false);
    }
  }, [selectedRows, filteredData, generateReservationId]);

  const handleCancelReservations = React.useCallback(async () => {
    if (selectedRows.size === 0) return;

    setIsCanceling(true);
    setShowCancelDialog(false);

    try {
      const selectedData = Array.from(selectedRows).map(
        (index) => filteredData[index]
      );
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

        // 확정된 예약이 취소된 경우, 기존 예약 목록에서도 업데이트되도록 알림
        const hasConfirmedCancellations = result.results.some(
          (r: any) => r.success && r.was_confirmed
        );

        if (hasConfirmedCancellations) {
          // 전역 이벤트 발생하여 다른 페이지에서 데이터 새로고침 필요함을 알림
          window.dispatchEvent(new CustomEvent("reservationCanceled"));
        }
      } else {
        alert("예약 취소에 실패했습니다.");
      }
    } catch (error) {
      console.error("예약 취소 오류:", error);
      alert("예약 취소 중 오류가 발생했습니다.");
    } finally {
      setIsCanceling(false);
    }
  }, [selectedRows, filteredData, generateReservationId]);

  const columns = React.useMemo(() => {
    return [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            className="accent-primary w-4 h-4"
            checked={
              selectedRows.size > 0 && selectedRows.size === filteredData.length
            }
            onChange={(e) => handleSelectAll(e.target.checked, filteredData)}
          />
        ),
        cell: (info: any) => {
          const rowIndex = info.row.index;
          return (
            <input
              type="checkbox"
              className="accent-primary w-4 h-4"
              checked={selectedRows.has(rowIndex)}
              onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
            />
          );
        },
        customWidth: "w-12 min-w-[48px]",
      },
      ...KOREAN_HEADERS.filter((header) => header !== "동의").map((header) => ({
        id: header,
        accessorKey: header,
        header,
        customWidth: COLUMN_WIDTHS[header] || "w-24 min-w-[96px]",
        cell: (info: any) => {
          const value = info.getValue();
          const rowData = info.row.original;
          const reservationId = generateReservationId(rowData);
          const isConfirmed = confirmedReservationIds.has(reservationId);
          const isCanceled = canceledReservationIds.has(reservationId);

          // 검색 가능한 필드들에 하이라이트 적용
          const searchableFields = ["이름", "예약번호", "이메일"];
          const shouldHighlight =
            searchableFields.includes(header) && searchTerm;

          // 타임스탬프 두 줄 표시
          if (header === "타임스탬프") {
            const timestamp = value?.toString() || "";
            // 오전/오후를 기준으로 분리
            const parts = timestamp.split(/(오전|오후)/);
            let datepart = "";
            let timepart = "";

            if (parts.length >= 3) {
              datepart = parts[0].trim();
              timepart = (parts[1] + " " + parts[2]).trim();
            } else {
              datepart = timestamp;
            }

            return (
              <div
                className={`${isConfirmed ? "font-medium" : ""} ${
                  isCanceled ? "opacity-50 text-gray-500" : ""
                }`}
                style={
                  isCanceled ? { textDecoration: "line-through" } : undefined
                }
              >
                <div className="text-sm">{datepart}</div>
                <div className="text-xs text-gray-600">{timepart}</div>
              </div>
            );
          }

          // 픽업일시 통합 표시 (두 줄)
          if (header === "픽업일시") {
            const pickupDate = rowData["픽업일"];
            const pickupTime = rowData["픽업시간"];
            return (
              <div
                className={`${isConfirmed ? "font-medium" : ""} ${
                  isCanceled ? "opacity-50 text-gray-500" : ""
                }`}
                style={
                  isCanceled ? { textDecoration: "line-through" } : undefined
                }
              >
                <div className="text-sm">{pickupDate || ""}</div>
                <div className="text-xs text-gray-600">{pickupTime || ""}</div>
              </div>
            );
          }

          // 반납일시 통합 표시 (두 줄)
          if (header === "반납일시") {
            const returnDate = rowData["반납일"];
            const returnTime = rowData["반납시간"];
            return (
              <div
                className={`${isConfirmed ? "font-medium" : ""} ${
                  isCanceled ? "opacity-50 text-gray-500" : ""
                }`}
                style={
                  isCanceled ? { textDecoration: "line-through" } : undefined
                }
              >
                <div className="text-sm">{returnDate || ""}</div>
                <div className="text-xs text-gray-600">{returnTime || ""}</div>
              </div>
            );
          }

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
                {shouldHighlight ? highlightText(value, searchTerm) : value}
              </a>
            );
          }

          // 대여품목 필드인 경우 표준화된 카테고리로 표시
          let displayValue: React.ReactNode = value;
          if (header === "대여품목" && value) {
            const standardizedCategory = mapCategoryToStandard(
              value.toString()
            );
            displayValue = shouldHighlight
              ? highlightText(standardizedCategory, searchTerm)
              : standardizedCategory;
          } else if (shouldHighlight && value) {
            displayValue = highlightText(value.toString(), searchTerm);
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
              {displayValue}
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
    filteredData,
    handleSelectAll,
    handleRowSelect,
    confirmedReservationIds,
    canceledReservationIds,
    generateReservationId,
    searchTerm,
    highlightText,
    mapCategoryToStandard,
  ]);

  React.useEffect(() => {
    setLoading(true);
    // 전체 데이터 로드
    fetch(`/api/rentals/pending?all=true`)
      .then((res) => res.json())
      .then(async (json) => {
        const newData = json.data || [];
        setData(newData);
        setLoading(false);
        setSelectedRows(new Set()); // 데이터 변경 시 선택 초기화

        // 데이터베이스에서 모든 예약 상태 조회
        try {
          const statusResponse = await fetch(
            `/api/pending-reservations/status`
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
          console.error(
            "에러 상세:",
            error instanceof Error ? error.message : String(error)
          );
        }
      })
      .catch((error) => {
        console.error("데이터 로딩 오류:", error);
        setLoading(false);
      });
  }, [generateReservationId]); // 전체 데이터 로드이므로 페이지네이션 의존성 제거

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false, // 클라이언트 사이드 페이지네이션
    state: { pagination },
    onPaginationChange: setPagination,
  });

  // 사이드바 상태에 따른 컨테이너 너비 계산
  const getContainerWidth = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "w-full"; // 모바일에서는 전체 너비
    }
    if (state === "expanded") {
      return "w-[calc(100vw-20rem)]"; // 사이드바가 열려있을 때
    } else {
      return "w-[calc(100vw-5rem)]"; // 사이드바가 닫혀있을 때
    }
  };

  return (
    <div
      className={cn("h-full flex flex-col py-4 md:py-6", getContainerWidth())}
    >
      {/* 헤더와 액션 버튼 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <h1 className="text-xl md:text-2xl font-bold">예약 대기 목록</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-600 self-center">
              {selectedRows.size}개 선택됨
              {getSelectedConfirmedCount() > 0 && (
                <span className="ml-2 text-green-600">
                  ({getSelectedConfirmedCount()}개 확정됨)
                </span>
              )}
            </span>
          )}
          <div className="flex gap-2">
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleCancelClick}
                  disabled={selectedRows.size === 0 || isCanceling}
                  variant="destructive"
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
                  {isCanceling ? "처리 중..." : "예약 취소"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg">
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
                      const reservation = filteredData[index];
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
                              {reservation["픽업일"]} {reservation["픽업시간"]}{" "}
                              ~ {reservation["반납일"]}{" "}
                              {reservation["반납시간"]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(false)}
                    disabled={isCanceling}
                    className="w-full sm:w-auto"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleCancelReservations}
                    disabled={isCanceling}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    {isCanceling ? "처리 중..." : "취소 확정"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={handleConfirmClick}
                  disabled={selectedRows.size === 0 || isConfirming}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-initial"
                >
                  {isConfirming ? "처리 중..." : "예약 확정"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>예약 확정 확인</DialogTitle>
                  <DialogDescription>
                    선택한 {selectedRows.size}개의 예약을 확정하시겠습니까?
                    <br />
                    확정된 예약은 실제 렌탈 예약으로 등록되며, 이 작업은 되돌릴
                    수 없습니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {Array.from(selectedRows).map((index) => {
                      const reservation = filteredData[index];
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
                              {reservation["픽업일"]} {reservation["픽업시간"]}{" "}
                              ~ {reservation["반납일"]}{" "}
                              {reservation["반납시간"]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isConfirming}
                    className="w-full sm:w-auto"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleConfirmReservations}
                    disabled={isConfirming}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                  >
                    {isConfirming ? "처리 중..." : "확정"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 UI */}
      <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200 space-y-3">
        {/* 첫 번째 줄: 검색과 날짜 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {/* 검색 */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="이름, 예약번호, 이메일..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>

          {/* 날짜 범위 필터 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-9",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "MM/dd")} ~ ${format(
                        dateRange.to,
                        "MM/dd"
                      )}`
                    : "픽업 기간"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={ko}
              />
            </PopoverContent>
          </Popover>

          {/* 초기화 버튼 */}
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="flex items-center gap-2 h-9"
          >
            <RefreshCwIcon className="w-4 h-4" />
            <span className="hidden sm:inline">초기화</span>
          </Button>
        </div>

        {/* 두 번째 줄: 선택 필터 */}
        <div className="grid grid-cols-2 gap-2">
          {/* 예약 사이트 필터 */}
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="예약 사이트" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 사이트</SelectItem>
              {uniqueSites.map((site) => (
                <SelectItem key={site} value={site}>
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 대여품목 필터 */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="대여품목" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 품목</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 필터 결과 표시 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium text-blue-600">
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MM.dd")} ~ ${format(
                    dateRange.to,
                    "MM.dd"
                  )}`
                : "전체 기간"}
            </span>
            <span className="ml-2">
              총 {filteredData.length}개 ({data.length}개 중)
            </span>
          </div>

          {/* 적용된 필터 표시 */}
          {(searchTerm ||
            dateRange?.from ||
            selectedSite !== "all" ||
            selectedCategory !== "all") && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-blue-600 text-xs">필터:</span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  검색: {searchTerm}
                </Badge>
              )}
              {selectedSite !== "all" && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {selectedSite}
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {selectedCategory}
                </Badge>
              )}
            </div>
          )}
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
        <>
          {/* 테이블 컨테이너 - PC에서는 딱 맞게, 모바일에서는 가로 스크롤 */}
          <div className="flex-1 rounded-lg border bg-background flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="min-w-fit md:w-full">
                <Table className="text-xs">
                  <TableHeader className="sticky top-0 bg-white z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={cn(
                              (header.column.columnDef as any).customWidth,
                              "sticky top-0 bg-white"
                            )}
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
                              ? "bg-red-50 border-red-200 hover:bg-red-100"
                              : confirmedReservationIds.has(
                                  generateReservationId(row.original)
                                )
                              ? "bg-green-50 border-green-200 hover:bg-green-100"
                              : "hover:bg-gray-50"
                          }
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                (cell.column.columnDef as any).customWidth,
                                canceledReservationIds.has(
                                  generateReservationId(row.original)
                                )
                                  ? "text-red-800"
                                  : confirmedReservationIds.has(
                                      generateReservationId(row.original)
                                    )
                                  ? "text-green-800"
                                  : ""
                              )}
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
                        <TableCell
                          colSpan={columns.length}
                          className="text-center"
                        >
                          데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* 페이지네이션 - 테이블 밖으로 분리 */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 bg-white p-3 rounded-lg border">
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
              <span className="px-2 text-sm">
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
              <span className="text-sm">페이지 크기:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
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
        </>
      )}
    </div>
  );
}
