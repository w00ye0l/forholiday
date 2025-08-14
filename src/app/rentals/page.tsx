"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useKoreanInput } from "@/hooks/useKoreanInput";
import { Input } from "@/components/ui/input";
import { RentalList } from "@/components/rental/RentalList";
import { RentalStatistics } from "@/components/rental/RentalStatistics";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  RefreshCwIcon,
  ListIcon,
  BarChart3Icon,
  DownloadIcon,
  CalendarIcon,
  XIcon,
} from "lucide-react";
import {
  RentalReservation,
  STATUS_MAP,
  DISPLAY_STATUS_MAP,
  PICKUP_METHOD_PRIORITY,
  PICKUP_METHOD_LABELS,
} from "@/types/rental";
import {
  DeviceCategory,
  DEVICE_CATEGORY_LABELS,
} from "@/types/device";
import {
  exportToExcel,
  transformRentalDataForExcel,
  transformRentalStatsForExcel,
} from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";

type RentalWithDevice = RentalReservation & {
  devices: {
    id: string;
    tag_name: string;
    category: string;
    status: string;
  };
};

// statusMap은 이제 STATUS_MAP으로 대체됨

const ITEMS_PER_PAGE = 50;

export default function RentalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rentals, setRentals] = useState<RentalWithDevice[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalWithDevice[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  // 한글 검색 - 직접 구현
  const searchInput = useKoreanInput({
    delay: 200,
    enableChoseongSearch: false,
    onValueChange: () => setDateRange(undefined)
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPickupMethod, setSelectedPickupMethod] =
    useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page") || "1");
  });
  const [totalCount, setTotalCount] = useState(0);

  // 날짜 범위 필터 - 기본값 없음
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const supabase = createClient();

  // 페이지 변경 핸들러 - URL 업데이트
  const updatePage = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };


  // 서버 페이지네이션을 위한 API 호출
  const fetchRentals = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const hasFilters = hasActiveFilters();

      if (hasFilters) {
        // 필터가 있는 경우 필터링 API 사용
        const params = new URLSearchParams({
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        });

        // 필터 조건들 추가
        if (searchInput.debouncedValue.trim()) {
          params.append("search", searchInput.debouncedValue.trim());
        }
        if (dateRange?.from && dateRange?.to) {
          params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"));
          params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"));
        }
        if (selectedCategory !== "all") {
          params.append("category", selectedCategory);
        }
        if (selectedStatus !== "all") {
          params.append("status", selectedStatus);
        }
        if (selectedPickupMethod !== "all") {
          params.append("pickupMethod", selectedPickupMethod);
        }

        const response = await fetch(
          `/api/rentals/filtered?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(
            "서버에서 필터링된 데이터를 가져오는데 실패했습니다."
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "알 수 없는 오류가 발생했습니다.");
        }

        console.log(
          `필터링 API 응답: 페이지 ${result.pagination.page}, ${result.data.length}개 데이터, 필터링된 전체 ${result.pagination.total}개`
        );

        setRentals(result.data);
        setTotalCount(result.pagination.total);
        setFilteredRentals(result.data); // 필터링된 결과도 설정
      } else {
        // 필터가 없는 경우 기본 페이지네이션 API 사용
        const response = await fetch(
          `/api/rentals/paginated?page=${page}&limit=${ITEMS_PER_PAGE}`
        );

        if (!response.ok) {
          throw new Error("서버에서 데이터를 가져오는데 실패했습니다.");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "알 수 없는 오류가 발생했습니다.");
        }

        console.log(
          `기본 API 응답: 페이지 ${result.pagination.page}, ${result.data.length}개 데이터, 전체 ${result.pagination.total}개`
        );

        setRentals(result.data);
        setTotalCount(result.pagination.total);
        setFilteredRentals(result.data);
      }
    } catch (error) {
      console.error("예약 목록 조회 에러:", error);
      setError(
        error instanceof Error
          ? error.message
          : "예약 목록을 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // 페이지네이션 계산
  const hasActiveFilters = () => {
    return (
      searchInput.debouncedValue.trim() !== "" ||
      dateRange !== undefined ||
      selectedCategory !== "all" ||
      selectedStatus !== "all" ||
      selectedPickupMethod !== "all"
    );
  };

  // 이제 모든 경우에서 서버 페이지네이션 사용
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // 서버에서 이미 페이지네이션된 데이터를 그대로 사용
  const paginatedRentals = rentals;

  // 페이지 번호 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // 필터 변경 시 데이터 새로 가져오기
  useEffect(() => {
    if (!isInitialMount) {
      // 필터가 변경되면 1페이지에서 데이터 새로 가져오기
      fetchRentals(1);
    }
  }, [
    searchInput.debouncedValue,
    dateRange,
    selectedCategory,
    selectedStatus,
    selectedPickupMethod,
  ]);

  // 초기 마운트 여부 추적
  const [isInitialMount, setIsInitialMount] = useState(true);

  // 필터 변경 시에만 첫 페이지로 이동 (초기 마운트 제외)
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }

    if (currentPage !== 1) {
      updatePage(1);
    }
  }, [
    searchInput.debouncedValue,
    dateRange,
    selectedCategory,
    selectedStatus,
    selectedPickupMethod,
  ]);

  // 페이지 변경 시 데이터 가져오기
  useEffect(() => {
    if (!isInitialMount) {
      fetchRentals(currentPage);
    }
  }, [currentPage]);

  // 초기 로드
  useEffect(() => {
    fetchRentals(currentPage);
  }, []);

  // 예약 취소 이벤트 리스너 추가
  useEffect(() => {
    const handleReservationCanceled = () => {
      // 예약이 취소되었을 때 데이터 새로고침
      fetchRentals(currentPage);
    };

    window.addEventListener("reservationCanceled", handleReservationCanceled);

    return () => {
      window.removeEventListener(
        "reservationCanceled",
        handleReservationCanceled
      );
    };
  }, [currentPage]);

  const handleReset = () => {
    searchInput.clear();
    setDateRange(undefined);
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedPickupMethod("all");
  };

  // 엑셀 출력 핸들러
  const handleExportToExcel = async () => {
    try {
      setExporting(true);

      // 현재 필터링된 데이터를 엑셀 형식으로 변환
      const excelData = transformRentalDataForExcel(filteredRentals);

      // 검색 조건 생성
      const searchConditions = [];
      if (searchInput.debouncedValue.trim()) {
        searchConditions.push(`검색어: ${searchInput.debouncedValue}`);
      }
      if (dateRange?.from && dateRange?.to) {
        searchConditions.push(
          `기간-${format(dateRange.from, "yyyy-MM-dd", {
            locale: ko,
          })}~${format(dateRange.to, "yyyy-MM-dd", { locale: ko })}`
        );
      }
      if (selectedCategory !== "all") {
        searchConditions.push(`카테고리-${selectedCategory}`);
      }
      if (selectedStatus !== "all") {
        searchConditions.push(`상태-${selectedStatus}`);
      }

      const searchDescription =
        searchConditions.length > 0
          ? searchConditions.join(" | ")
          : "전체 데이터";

      // 통계 데이터 생성
      const statsData = transformRentalStatsForExcel(
        filteredRentals,
        searchDescription
      );

      // 엑셀 파일 생성 및 다운로드
      const result = exportToExcel(excelData, "예약목록", {
        sheetName: "예약 목록",
        includeStats: true,
        statsData: statsData,
      });

      if (result.success) {
        toast.success(`엑셀 파일이 다운로드되었습니다: ${result.filename}`);
      } else {
        toast.error(`엑셀 출력 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("엑셀 출력 에러:", error);
      toast.error("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  };

  // 전체 카테고리 목록 (타입에서 가져옴)
  const getAllCategories = () => {
    return Object.keys(DEVICE_CATEGORY_LABELS) as DeviceCategory[];
  };

  // 상태별 개수 계산 (필터링된 결과 기준)
  const getStatusCounts = () => {
    // 상태 필터를 제외한 다른 필터들만 적용된 결과
    let filtered = [...rentals];

    // 텍스트 검색은 이미 koreanSearch에서 처리됨

    // 날짜 범위 필터링 (수령일 기준)
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter((rental) => {
        return rental.pickup_date >= fromStr && rental.pickup_date <= toStr;
      });
    }

    // 카테고리 필터링
    if (selectedCategory !== "all") {
      filtered = filtered.filter((rental) => {
        return rental.devices.category === selectedCategory;
      });
    }

    // 수령 방법 필터링
    if (selectedPickupMethod !== "all") {
      filtered = filtered.filter((rental) => {
        return rental.pickup_method === selectedPickupMethod;
      });
    }

    // 필터링된 결과에서 상태별 건수 계산
    const counts = {
      all: filtered.length,
      pending: filtered.filter((r) => r.status === "pending").length,
      picked_up: filtered.filter((r) => r.status === "picked_up").length,
      not_picked_up: filtered.filter((r) => r.status === "not_picked_up")
        .length,
      returned: filtered.filter((r) => r.status === "returned").length,
      overdue: filtered.filter((r) => {
        // overdue는 계산된 상태이므로 실제 DB 상태를 확인
        const now = new Date();
        const returnDateTime = new Date(`${r.return_date} ${r.return_time}`);
        return returnDateTime < now && r.status === "picked_up";
      }).length,
      problem: filtered.filter((r) => r.status === "problem").length,
    };

    return counts;
  };

  const statusCounts = getStatusCounts();

  // 현재 필터링된 건수 표시용
  const getFilteredCount = () => {
    return filteredRentals.length;
  };

  // 고유한 수령 방법 목록 추출
  const getUniquePickupMethods = () => {
    const methods = rentals
      .map((rental) => rental.pickup_method)
      .filter((method) => method)
      .filter((method, index, arr) => arr.indexOf(method) === index)
      .sort((a, b) => PICKUP_METHOD_PRIORITY[a] - PICKUP_METHOD_PRIORITY[b]);
    return methods;
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">예약 목록</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-red-500 p-4 border border-red-300 rounded">
            {error}
          </div>
          <Button onClick={() => fetchRentals(currentPage)} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">예약 목록</h1>
        <p className="text-sm text-gray-500 mb-4">
          예약 목록을 확인하고 출고 통계를 분석할 수 있습니다.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListIcon className="w-4 h-4" />
            예약 목록
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3Icon className="w-4 h-4" />
            출고 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="space-y-6">
            {/* 검색 및 필터 */}
            <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 한글 검색 입력 */}
                <div className="relative">
                  <Input
                    placeholder="고객명, 전화번호, 예약번호, 기기명 검색"
                    {...searchInput.inputProps}
                    className="pl-3"
                  />
                </div>

                {/* 날짜 범위 필터 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`justify-start text-left font-normal ${
                        !dateRange && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from && dateRange?.to
                        ? `${format(dateRange.from, "yyyy-MM-dd", {
                            locale: ko,
                          })} ~ ${format(dateRange.to, "yyyy-MM-dd", {
                            locale: ko,
                          })}`
                        : "수령 기간 선택"}
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

                {/* 버튼 그룹 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex flex-1 items-center gap-2"
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                    초기화
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportToExcel}
                    disabled={exporting || filteredRentals.length === 0}
                    className="flex flex-1 items-center gap-2"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {exporting ? "출력 중..." : "엑셀 출력"}
                  </Button>
                </div>
              </div>

              {/* 카테고리, 수령방법 필터 */}
              <div className="grid grid-cols-2 gap-2">
                {/* 카테고리 필터 */}
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    {getAllCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {DEVICE_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 수령 방법 필터 */}
                <Select
                  value={selectedPickupMethod}
                  onValueChange={setSelectedPickupMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="수령 방법 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 수령방법</SelectItem>
                    {getUniquePickupMethods().map((method) => (
                      <SelectItem key={method} value={method}>
                        {PICKUP_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 상태별 필터 버튼 그룹 */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("all")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "all"
                      ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  전체: {statusCounts.all}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("pending")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "pending"
                      ? STATUS_MAP.pending.button
                      : STATUS_MAP.pending.badge
                  }`}
                >
                  {STATUS_MAP.pending.label}: {statusCounts.pending}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("picked_up")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "picked_up"
                      ? STATUS_MAP.picked_up.button
                      : STATUS_MAP.picked_up.badge
                  }`}
                >
                  {STATUS_MAP.picked_up.label}: {statusCounts.picked_up}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("not_picked_up")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "not_picked_up"
                      ? STATUS_MAP.not_picked_up.button
                      : STATUS_MAP.not_picked_up.badge
                  }`}
                >
                  {STATUS_MAP.not_picked_up.label}: {statusCounts.not_picked_up}
                  건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("returned")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "returned"
                      ? STATUS_MAP.returned.button
                      : STATUS_MAP.returned.badge
                  }`}
                >
                  {STATUS_MAP.returned.label}: {statusCounts.returned}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("overdue")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "overdue"
                      ? DISPLAY_STATUS_MAP.overdue.button
                      : DISPLAY_STATUS_MAP.overdue.badge
                  }`}
                >
                  {DISPLAY_STATUS_MAP.overdue.label}: {statusCounts.overdue}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("problem")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "problem"
                      ? STATUS_MAP.problem.button
                      : STATUS_MAP.problem.badge
                  }`}
                >
                  {STATUS_MAP.problem.label}: {statusCounts.problem}건
                </Button>
              </div>

              {/* 필터 결과 표시 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
                <div>
                  {dateRange?.from && dateRange?.to ? (
                    <span className="font-medium text-blue-600">
                      {format(dateRange.from, "yyyy.MM.dd", {
                        locale: ko,
                      })}{" "}
                      ~ {format(dateRange.to, "yyyy.MM.dd", { locale: ko })}
                    </span>
                  ) : (
                    <span className="font-medium text-blue-600">전체 기간</span>
                  )}
                  <span className="ml-2">총 {totalCount}개의 예약</span>
                </div>
              </div>
            </div>

            {/* 예약 목록 */}
            <RentalList
              rentals={paginatedRentals}
              loading={loading}
              searchTerm={searchInput.debouncedValue}
            />

            {/* 페이지네이션 */}
            {!loading && totalCount > ITEMS_PER_PAGE && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          const newPage = Math.max(1, currentPage - 1);
                          console.log(
                            "이전 페이지 클릭: 현재",
                            currentPage,
                            "-> ",
                            newPage
                          );
                          updatePage(newPage);
                        }}
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === "..." ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => {
                              console.log("페이지 번호 클릭:", page);
                              updatePage(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          const newPage = Math.min(totalPages, currentPage + 1);
                          console.log(
                            "다음 페이지 클릭: 현재",
                            currentPage,
                            "-> ",
                            newPage
                          );
                          updatePage(newPage);
                        }}
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 출고 통계 */}
        <TabsContent value="statistics" className="mt-0">
          <RentalStatistics rentals={rentals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
