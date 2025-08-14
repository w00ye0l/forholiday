"use client";

import { createClient } from "@/lib/supabase/client";
import { ReturnList } from "@/components/rental/ReturnList";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useKoreanInput } from "@/hooks/useKoreanInput";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type {
  RentalReservation,
  ReturnMethod,
  DisplayStatus,
} from "@/types/rental";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RentalReturnPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [loading, setLoading] = useState(true);

  // 한글 검색 - 직접 구현 (빠른 반응을 위해 delay 감소)
  const searchInput = useKoreanInput({
    delay: 200, // 더 빠른 반응을 위해 150ms로 감소
    enableChoseongSearch: false,
    onValueChange: () => setDateRange(undefined),
  });
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });
  const [activeLocationTab, setActiveLocationTab] = useState<
    ReturnMethod | "all"
  >("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    DisplayStatus | "all"
  >("all");

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      let allRentals: RentalReservation[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      // 배치로 데이터 가져오기 (1000개씩)
      while (hasMore) {
        const { data: rentalsData, error } = await supabase
          .from("rental_reservations")
          .select("*")
          .in("status", ["picked_up", "not_picked_up", "returned", "problem"])
          .is("cancelled_at", null)
          .order("return_date", { ascending: false })
          .order("return_time", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error("반납 관리 데이터 로딩 에러:", error);
          break;
        }

        if (rentalsData && rentalsData.length > 0) {
          allRentals = [...allRentals, ...rentalsData];
          from += batchSize;
          hasMore = rentalsData.length === batchSize; // 1000개 미만이면 마지막 배치
        } else {
          hasMore = false;
        }

        // 안전장치: 최대 10만개까지만
        if (allRentals.length >= 100000) {
          break;
        }
      }

      console.log("반납 관리 데이터 로드됨:", allRentals.length, "건");
      setRentals(allRentals);
    } catch (error) {
      console.error("반납 관리 데이터 로딩 실패:", error);
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  // 예약의 실제 상태와 표시 상태를 구분
  const getDisplayStatus = (rental: RentalReservation): DisplayStatus => {
    const now = new Date();
    const returnDateTime = new Date(
      `${rental.return_date} ${rental.return_time}`
    );

    // 이미 반납 완료된 경우는 그대로 표시
    if (rental.status === "returned") {
      return "returned";
    }

    // 반납 시간이 지났는데 반납 완료가 아닌 경우 지연 반납으로 표시
    if (returnDateTime < now && rental.status === "picked_up") {
      return "overdue";
    }

    // 그 외의 경우는 실제 상태 그대로 표시
    return rental.status;
  };

  // 기본 필터링된 데이터 (성능 최적화)
  const baseFilteredRentals = useMemo(() => {
    return rentals.filter(
      (r) =>
        ["picked_up", "not_picked_up", "returned", "problem"].includes(
          r.status
        ) && !r.cancelled_at
    );
  }, [rentals]);

  // 검색 및 필터링 로직 - 성능 최적화
  const filteredRentals = useMemo(() => {
    let filtered = baseFilteredRentals;

    // 상태별 필터 (가장 선택적인 필터 먼저)
    if (activeStatusFilter !== "all") {
      filtered = filtered.filter(
        (rental) => getDisplayStatus(rental) === activeStatusFilter
      );
    }

    // 장소별 필터 (반납 방법 기준)
    if (activeLocationTab !== "all") {
      filtered = filtered.filter(
        (rental) => rental.return_method === activeLocationTab
      );
    }

    // 기간(범위) 필터 (반납일 기준) - 지연 반납은 제외
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter((rental) => {
        const displayStatus = getDisplayStatus(rental);
        if (displayStatus === "overdue") {
          return true;
        }
        return rental.return_date >= fromStr && rental.return_date <= toStr;
      });
    }

    // 검색 필터링 (가장 마지막에 적용)
    if (searchInput.debouncedValue.trim()) {
      filtered = searchInput.search(
        filtered,
        (rental) =>
          `${rental.renter_name} ${rental.device_category} ${rental.reservation_id} ${rental.device_tag_name || ""}`
      );
    }

    // 정렬: 지연반납 맨 위, 나머지는 시간순
    filtered.sort((a, b) => {
      const aDisplayStatus = getDisplayStatus(a);
      const bDisplayStatus = getDisplayStatus(b);
      const aReturnDate = new Date(`${a.return_date} ${a.return_time}`);
      const bReturnDate = new Date(`${b.return_date} ${b.return_time}`);

      // 지연반납만 맨 위로
      if (aDisplayStatus === "overdue" && bDisplayStatus !== "overdue")
        return -1;
      if (aDisplayStatus !== "overdue" && bDisplayStatus === "overdue")
        return 1;

      // 나머지는 반납 시간순 정렬
      return aReturnDate.getTime() - bReturnDate.getTime();
    });

    return filtered;
  }, [
    baseFilteredRentals,
    searchInput.debouncedValue,
    dateRange,
    activeLocationTab,
    activeStatusFilter,
    searchInput,
    getDisplayStatus,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    searchInput.clear();
    setDateRange({
      from: today,
      to: today,
    });
    setActiveLocationTab("all");
    setActiveStatusFilter("all");
  };

  // 상태 업데이트 콜백 함수
  const handleStatusUpdate = () => {
    loadData();
  };

  // 기본 필터링 (검색, 날짜만 적용하고 장소/상태 필터는 제외) - 최적화
  const baseFilteredForCounts = useMemo(() => {
    let baseFiltered = baseFilteredRentals;

    // 검색 필터링
    if (searchInput.debouncedValue.trim()) {
      baseFiltered = searchInput.search(
        baseFiltered,
        (rental) =>
          `${rental.renter_name} ${rental.device_category} ${rental.reservation_id} ${rental.device_tag_name || ""}`
      );
    }

    // 날짜 필터 적용 - 지연 반납은 제외
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      baseFiltered = baseFiltered.filter((rental) => {
        const displayStatus = getDisplayStatus(rental);
        // 지연 반납은 날짜 필터에서 제외
        if (displayStatus === "overdue") {
          return true;
        }
        return rental.return_date >= fromStr && rental.return_date <= toStr;
      });
    }

    return baseFiltered;
  }, [
    baseFilteredRentals,
    searchInput.debouncedValue,
    dateRange,
    searchInput,
    getDisplayStatus,
  ]);

  // 장소별 개수 계산 - 최적화된 버전
  const getLocationCounts = useMemo(() => {
    const counts = {
      all: baseFilteredForCounts.length,
      T1: 0,
      T2: 0,
      delivery: 0,
      office: 0,
      hotel: 0,
    };

    // 한번의 순회로 모든 장소별 개수 계산
    baseFilteredForCounts.forEach((rental) => {
      switch (rental.return_method) {
        case "T1":
          counts.T1++;
          break;
        case "T2":
          counts.T2++;
          break;
        case "delivery":
          counts.delivery++;
          break;
        case "office":
          counts.office++;
          break;
        case "hotel":
          counts.hotel++;
          break;
      }
    });

    return counts;
  }, [baseFilteredForCounts]);

  // 상태별 개수 계산 - 최적화된 버전
  const getStatusCounts = useMemo(() => {
    const counts = {
      all: baseFilteredForCounts.length,
      picked_up: 0,
      overdue: 0,
      returned: 0,
    };

    // 한번의 순회로 모든 상태별 개수 계삸
    baseFilteredForCounts.forEach((rental) => {
      const displayStatus = getDisplayStatus(rental);
      switch (displayStatus) {
        case "picked_up":
          counts.picked_up++;
          break;
        case "overdue":
          counts.overdue++;
          break;
        case "returned":
          counts.returned++;
          break;
      }
    });

    return counts;
  }, [baseFilteredForCounts, getDisplayStatus]);

  // 장소별 라벨 매핑
  const LOCATION_LABELS = {
    all: "전체",
    T1: "T1",
    T2: "T2",
    delivery: "택배",
    office: "사무실",
    hotel: "호텔",
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">반납 관리</h1>
      </div>

      {/* 검색 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* 한글 검색 입력 */}
          <div className="relative">
            <Input
              placeholder="이름, 기기명 또는 예약번호 검색"
              {...searchInput.inputProps}
              className="pl-3"
            />
          </div>

          {/* 날짜 필터 */}
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
                    })} ~ ${format(dateRange.to, "yyyy-MM-dd", { locale: ko })}`
                  : "반납 기간 선택"}
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

          {/* 초기화 버튼 */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            초기화
          </Button>
        </div>

        {/* 상태별 필터 버튼 그룹 */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveStatusFilter("all")}
            className={`h-6 px-2 py-1 text-xs ${
              activeStatusFilter === "all"
                ? "bg-gray-200 border-2 border-gray-400"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            전체: {getStatusCounts.all}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveStatusFilter("picked_up")}
            className={`h-6 px-2 py-1 text-xs ${
              activeStatusFilter === "picked_up"
                ? "bg-blue-200 border-2 border-blue-400 text-blue-800"
                : "bg-blue-100 hover:bg-blue-200 text-blue-800"
            }`}
          >
            수령완료: {getStatusCounts.picked_up}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveStatusFilter("overdue")}
            className={`h-6 px-2 py-1 text-xs ${
              activeStatusFilter === "overdue"
                ? "bg-yellow-200 border-2 border-yellow-400 text-yellow-800"
                : "bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
            }`}
          >
            지연 반납: {getStatusCounts.overdue}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveStatusFilter("returned")}
            className={`h-6 px-2 py-1 text-xs ${
              activeStatusFilter === "returned"
                ? "bg-green-200 border-2 border-green-400 text-green-800"
                : "bg-green-100 hover:bg-green-200 text-green-800"
            }`}
          >
            반납완료: {getStatusCounts.returned}건
          </Button>
        </div>

        {/* 필터링된 결과 및 상태별 개수 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
          <div>
            {dateRange?.from && dateRange?.to ? (
              <span className="font-medium text-blue-600">
                {format(dateRange.from, "yyyy.MM.dd", { locale: ko })} ~{" "}
                {format(dateRange.to, "yyyy.MM.dd", { locale: ko })}
              </span>
            ) : (
              <span className="font-medium text-blue-600">전체 기간</span>
            )}
            <span className="ml-2">총 {filteredRentals.length}개의 예약</span>
            {activeStatusFilter !== "all" && (
              <span className="ml-2 text-sm font-medium text-purple-600">
                (
                {activeStatusFilter === "picked_up"
                  ? "수령완료"
                  : activeStatusFilter === "overdue"
                    ? "지연 반납"
                    : "반납완료"}{" "}
                항목만 표시)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 장소별 탭 */}
      <div className="mb-6">
        <Tabs
          value={activeLocationTab}
          onValueChange={(value) =>
            setActiveLocationTab(value as ReturnMethod | "all")
          }
        >
          <TabsList className="grid w-full h-auto grid-cols-3 md:grid-cols-6">
            {Object.entries(LOCATION_LABELS).map(([key, label]) => {
              const count =
                getLocationCounts[key as keyof typeof LOCATION_LABELS];
              return (
                <TabsTrigger key={key} value={key} className="text-sm">
                  <span className="font-medium text-center leading-tight">
                    {label} ({count})
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <ReturnList
          rentals={filteredRentals}
          onStatusUpdate={handleStatusUpdate}
          getDisplayStatus={getDisplayStatus}
          searchTerm={searchInput.debouncedValue}
        />
      )}
    </div>
  );
}
