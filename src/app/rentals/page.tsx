"use client";

import { useState, useEffect } from "react";
import { RentalList } from "@/components/rental/RentalList";
import { RentalStatistics } from "@/components/rental/RentalStatistics";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
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
  SearchIcon,
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
  PickupMethod,
  ReservationStatus,
  DisplayStatus,
} from "@/types/rental";
import {
  exportToExcel,
  transformRentalDataForExcel,
  transformRentalStatsForExcel,
  cn,
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

export default function RentalsPage() {
  const [rentals, setRentals] = useState<RentalWithDevice[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalWithDevice[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPickupMethod, setSelectedPickupMethod] =
    useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [exporting, setExporting] = useState(false);

  // 날짜 범위 필터 - 기본값 없음
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const supabase = createClient();

  // 출고 관리 정렬 로직
  const sortRentalsForOutgoing = (rentals: RentalWithDevice[]) => {
    return rentals.sort((a, b) => {
      // 1차 정렬: 시간 내림차순 (최근 예약이 먼저)
      const dateTimeA = new Date(`${a.pickup_date} ${a.pickup_time}`);
      const dateTimeB = new Date(`${b.pickup_date} ${b.pickup_time}`);

      const timeDiff = dateTimeB.getTime() - dateTimeA.getTime();

      if (timeDiff !== 0) {
        return timeDiff;
      }

      // 2차 정렬: 수령 방법별 우선순위 (터미널1 → 터미널2 → 택배 → 사무실 → 호텔)
      const priorityA = PICKUP_METHOD_PRIORITY[a.pickup_method];
      const priorityB = PICKUP_METHOD_PRIORITY[b.pickup_method];

      return priorityA - priorityB;
    });
  };

  const fetchRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      // 예약 목록 조회 - 취소되지 않은 예약만, 수령 날짜/시간 기준으로 정렬
      const { data: rentals, error: rentalsError } = await supabase
        .from("rental_reservations")
        .select("*")
        .is("cancelled_at", null) // 취소되지 않은 예약만 조회
        .order("pickup_date", { ascending: true })
        .order("pickup_time", { ascending: true });

      if (rentalsError) {
        throw rentalsError;
      }

      // 기기 목록 조회
      const { data: devices, error: devicesError } = await supabase
        .from("devices")
        .select("id, tag_name, category, status");

      if (devicesError) {
        throw devicesError;
      }

      // 예약과 기기 정보를 매칭
      const rentalsWithDevices =
        rentals?.map((rental) => {
          const device = rental.device_tag_name
            ? devices?.find((d) => d.tag_name === rental.device_tag_name)
            : null;
          return {
            ...rental,
            devices: device || {
              id: "",
              tag_name: rental.device_tag_name || "",
              category: rental.device_category,
              status: "unknown",
            },
          };
        }) || [];

      // 정렬된 데이터 설정
      const sortedRentals = sortRentalsForOutgoing(rentalsWithDevices);
      setRentals(sortedRentals);
      setFilteredRentals(sortedRentals);
    } catch (error) {
      console.error("예약 목록 조회 에러:", error);
      setError("예약 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 필터링 로직
  useEffect(() => {
    let filtered = [...rentals];

    // 텍스트 검색 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((rental) => {
        return (
          rental.renter_name.toLowerCase().includes(term) ||
          rental.renter_phone.includes(term) ||
          rental.reservation_id.toLowerCase().includes(term) ||
          (rental.device_tag_name &&
            rental.device_tag_name.toLowerCase().includes(term))
        );
      });
      
      // 검색어가 있을 때 날짜 필터를 자동으로 제거
      if (dateRange) {
        setDateRange(undefined);
      }
    }

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

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((rental) => {
        return rental.status === selectedStatus;
      });
    }

    // 수령 방법 필터링
    if (selectedPickupMethod !== "all") {
      filtered = filtered.filter((rental) => {
        return rental.pickup_method === selectedPickupMethod;
      });
    }

    // 정렬 적용
    const sorted = sortRentalsForOutgoing(filtered);
    setFilteredRentals(sorted);
  }, [
    searchTerm,
    dateRange,
    selectedCategory,
    selectedStatus,
    selectedPickupMethod,
    rentals,
  ]);

  useEffect(() => {
    fetchRentals();
  }, []);

  // 예약 취소 이벤트 리스너 추가
  useEffect(() => {
    const handleReservationCanceled = () => {
      // 예약이 취소되었을 때 데이터 새로고침
      fetchRentals();
    };

    window.addEventListener('reservationCanceled', handleReservationCanceled);
    
    return () => {
      window.removeEventListener('reservationCanceled', handleReservationCanceled);
    };
  }, []);

  const handleReset = () => {
    setSearchTerm("");
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
      if (searchTerm.trim()) {
        searchConditions.push(`검색어: ${searchTerm}`);
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
      const result = await exportToExcel(excelData, "예약목록", {
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

  // 고유한 카테고리 목록 추출
  const getUniqueCategories = () => {
    const categories = rentals
      .map((rental) => rental.devices.category)
      .filter((category) => category)
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories;
  };

  // 고유한 상태 목록 추출
  const getUniqueStatuses = () => {
    const statuses = rentals
      .map((rental) => rental.status)
      .filter((status) => status)
      .filter((status, index, arr) => arr.indexOf(status) === index)
      .sort();
    return statuses;
  };

  // 상태별 개수 계산 (필터링된 결과 기준)
  const getStatusCounts = () => {
    // 상태 필터를 제외한 다른 필터들만 적용된 결과
    let filtered = [...rentals];

    // 텍스트 검색 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((rental) => {
        return (
          rental.renter_name.toLowerCase().includes(term) ||
          rental.renter_phone.includes(term) ||
          rental.reservation_id.toLowerCase().includes(term) ||
          (rental.device_tag_name &&
            rental.device_tag_name.toLowerCase().includes(term))
        );
      });
    }

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

  // 필터 조건 표시 함수
  const getFilterDescription = () => {
    const conditions = [];

    if (searchTerm.trim()) {
      conditions.push(`검색: "${searchTerm}"`);
    }

    if (dateRange?.from && dateRange?.to) {
      conditions.push(
        `${format(dateRange.from, "yyyy-MM-dd", { locale: ko })} ~ ${format(
          dateRange.to,
          "yyyy-MM-dd",
          { locale: ko }
        )}`
      );
    }

    if (selectedCategory !== "all") {
      conditions.push(`카테고리-${selectedCategory}`);
    }

    if (selectedStatus !== "all") {
      conditions.push(
        `상태-${STATUS_MAP[selectedStatus as keyof typeof STATUS_MAP].label}`
      );
    }

    if (selectedPickupMethod !== "all") {
      conditions.push(
        `수령방법-${PICKUP_METHOD_LABELS[selectedPickupMethod as PickupMethod]}`
      );
    }

    return conditions.length > 0 ? conditions.join(" | ") : null;
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">예약 목록</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-red-500 p-4 border border-red-300 rounded">
            {error}
          </div>
          <Button onClick={fetchRentals} className="mt-4">
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
                {/* 이름/기기명 검색 */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    placeholder="고객명, 전화번호, 예약번호, 기기명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm pl-9"
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
                      initialFocus
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
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
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
                  <span className="ml-2">총 {getFilteredCount()}개의 예약</span>
                </div>
              </div>
            </div>

            {/* 예약 목록 */}
            <RentalList
              rentals={filteredRentals}
              loading={loading}
              searchTerm={searchTerm}
            />
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
