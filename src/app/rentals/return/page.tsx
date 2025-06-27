"use client";

import { createClient } from "@/lib/supabase/client";
import { ReturnList } from "@/components/rental/ReturnList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  SearchIcon,
  RefreshCwIcon,
  CalendarIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RentalReservation, ReturnMethod } from "@/types/rental";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RentalReturnPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalReservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // 검색 상태 - 오늘 날짜를 기본값으로 설정
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [activeLocationTab, setActiveLocationTab] = useState<
    ReturnMethod | "all"
  >("all");
  const [showReturned, setShowReturned] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    // 반납 예정 및 완료된 예약 목록 조회 (반납완료 포함)
    const { data: rentalsData } = await supabase
      .from("rental_reservations")
      .select("*")
      .in("status", ["picked_up", "not_picked_up", "returned"])
      .order("return_date", { ascending: true })
      .order("return_time", { ascending: true });

    setRentals(rentalsData || []);
    setLoading(false);
  };

  // 검색 필터링 로직
  useEffect(() => {
    let filtered = rentals;

    // 반납 완료 항목 표시/숨김 처리
    if (!showReturned) {
      // 기본적으로 반납 완료 항목 숨김 (날짜 선택 시에만 표시)
      if (!dateFilter) {
        filtered = filtered.filter((rental) => rental.status !== "returned");
      }
    }

    // 날짜 필터 (반납일 기준)
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.return_date.includes(filterDateString)
      );
    }

    // 장소별 필터 (반납 방법 기준)
    if (activeLocationTab !== "all") {
      filtered = filtered.filter(
        (rental) => rental.return_method === activeLocationTab
      );
    }

    // 이름/기기명/예약번호 검색
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (rental) =>
          rental.renter_name.toLowerCase().includes(term) ||
          rental.device_category.toLowerCase().includes(term) ||
          rental.reservation_id.toLowerCase().includes(term) ||
          (rental.device_tag_name &&
            rental.device_tag_name.toLowerCase().includes(term))
      );
    }

    // 정렬: 반납 완료 항목은 하단에 배치
    filtered.sort((a, b) => {
      if (a.status === "returned" && b.status !== "returned") return 1;
      if (a.status !== "returned" && b.status === "returned") return -1;
      return 0;
    });

    setFilteredRentals(filtered);
  }, [rentals, searchTerm, dateFilter, activeLocationTab, showReturned]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
    setActiveLocationTab("all");
    setShowReturned(false);
  };

  // 상태 업데이트 콜백 함수
  const handleStatusUpdate = () => {
    loadData();
  };

  // 장소별 개수 계산 (검색과 날짜 필터만 적용, 장소 필터는 제외)
  const getLocationCounts = () => {
    let baseFiltered = rentals;

    // 날짜 필터 적용
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      baseFiltered = baseFiltered.filter((rental) =>
        rental.return_date.includes(filterDateString)
      );
    }

    // 검색 필터 적용
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      baseFiltered = baseFiltered.filter(
        (rental) =>
          rental.renter_name.toLowerCase().includes(term) ||
          rental.device_category.toLowerCase().includes(term) ||
          rental.reservation_id.toLowerCase().includes(term) ||
          (rental.device_tag_name &&
            rental.device_tag_name.toLowerCase().includes(term))
      );
    }

    return {
      all: baseFiltered.length,
      T1: baseFiltered.filter((rental) => rental.return_method === "T1").length,
      T2: baseFiltered.filter((rental) => rental.return_method === "T2").length,
      delivery: baseFiltered.filter(
        (rental) => rental.return_method === "delivery"
      ).length,
      office: baseFiltered.filter((rental) => rental.return_method === "office")
        .length,
      hotel: baseFiltered.filter((rental) => rental.return_method === "hotel")
        .length,
    };
  };

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
        <h1 className="text-2xl font-bold">
          반납 관리
          {activeLocationTab !== "all" && (
            <span className="text-lg text-blue-600 ml-2">
              - {LOCATION_LABELS[activeLocationTab]}
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          기기 반납 및 상태 관리
          {activeLocationTab !== "all" && (
            <span className="ml-2 text-blue-500">
              ({LOCATION_LABELS[activeLocationTab]} 전용)
            </span>
          )}
        </p>
      </div>

      {/* 검색 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {/* 이름/기기명/예약번호 검색 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="이름, 기기명 또는 예약번호 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm pl-9"
            />
          </div>

          {/* 날짜 필터 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`justify-start text-left font-normal ${
                  !dateFilter && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter
                  ? format(dateFilter, "yyyy년 MM월 dd일", { locale: ko })
                  : "반납 날짜 선택"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
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

        {/* 필터링된 결과 및 상태별 개수 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
          <div>
            {dateFilter ? (
              <span className="font-medium text-blue-600">
                {format(dateFilter, "yyyy년 MM월 dd일", { locale: ko })} 기준
              </span>
            ) : (
              <span className="font-medium text-blue-600">전체 기간</span>
            )}
            <span className="ml-2">총 {filteredRentals.length}개의 예약</span>
          </div>

          {/* 반납 완료 항목 표시/숨김 토글 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReturned(!showReturned)}
              className="flex items-center gap-2 text-xs"
            >
              {showReturned ? (
                <>
                  <EyeOffIcon className="w-3 h-3" />
                  반납완료 숨김
                </>
              ) : (
                <>
                  <EyeIcon className="w-3 h-3" />
                  반납완료 표시
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 상태별 개수 표시 */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            수령완료:{" "}
            {filteredRentals.filter((r) => r.status === "picked_up").length}건
          </span>
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
            미수령:{" "}
            {filteredRentals.filter((r) => r.status === "not_picked_up").length}
            건
          </span>
          {(showReturned || dateFilter) && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              반납완료:{" "}
              {filteredRentals.filter((r) => r.status === "returned").length}건
            </span>
          )}
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
                getLocationCounts()[key as keyof typeof LOCATION_LABELS];
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

        {/* 현재 선택된 탭 정보 */}
        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>
              <strong>{LOCATION_LABELS[activeLocationTab]}</strong> 반납 예정:{" "}
              <span className="font-medium text-blue-600">
                {filteredRentals.length}건
              </span>
            </span>
            {activeLocationTab !== "all" && (
              <span className="text-xs">
                📍{" "}
                {activeLocationTab === "T1"
                  ? "인천공항 터미널1"
                  : activeLocationTab === "T2"
                  ? "인천공항 터미널2"
                  : activeLocationTab === "delivery"
                  ? "택배 반납"
                  : activeLocationTab === "office"
                  ? "사무실 반납"
                  : "대면 반납"}
              </span>
            )}
          </div>

          {/* 반납 완료 항목 표시 안내 */}
          {!showReturned && !dateFilter && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              💡 반납 완료된 항목은 기본적으로 숨겨집니다. 날짜를 선택하거나
              "반납완료 표시" 버튼을 클릭하면 확인할 수 있습니다.
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <ReturnList
            rentals={filteredRentals}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
      )}
    </div>
  );
}
