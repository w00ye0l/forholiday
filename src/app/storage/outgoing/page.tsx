"use client";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SearchIcon,
  RefreshCwIcon,
  CalendarIcon,
  ArrowUpIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { StorageReservation } from "@/types/storage";
import StorageLogisticsList from "@/components/storage/StorageLogisticsList";
import { cn } from "@/lib/utils";

export default function StorageOutgoingPage() {
  const [allStorages, setAllStorages] = useState<StorageReservation[]>([]);
  const [filteredStorages, setFilteredStorages] = useState<
    StorageReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [locationTab, setLocationTab] = useState("all");
  const [statusTab, setStatusTab] = useState("stored");

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });
  const [showAllDates, setShowAllDates] = useState(false); // 전체 날짜 보기 여부

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    // 전체 보관 데이터를 로드 (검색을 위해)
    const { data: storagesData } = await supabase
      .from("storage_reservations")
      .select("*")
      .order("pickup_date", { ascending: true })
      .order("pickup_time", { ascending: true });

    setAllStorages(storagesData || []);
    setLoading(false);
  };

  // 장소별 필터링 함수
  const getLocationFromReservation = (storage: StorageReservation): string => {
    // pickup_location 필드가 있으면 사용
    if (storage.pickup_location) {
      return storage.pickup_location;
    }

    // 없으면 notes에서 찾기 (하위 호환성)
    const notes = storage.notes?.toLowerCase() || "";

    if (
      notes.includes("t1") ||
      notes.includes("터미널1") ||
      notes.includes("terminal 1")
    ) {
      return "T1";
    }
    if (
      notes.includes("t2") ||
      notes.includes("터미널2") ||
      notes.includes("terminal 2")
    ) {
      return "T2";
    }
    return "T1";
  };

  // 오늘 기준 우선 정렬 함수
  const sortByTodayFirst = (storages: StorageReservation[]) => {
    const today = format(new Date(), "yyyy-MM-dd");

    return storages.sort((a, b) => {
      // 오늘 날짜인지 확인
      const aIsToday = a.pickup_date === today;
      const bIsToday = b.pickup_date === today;

      // 오늘 날짜를 우선 정렬
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // 같은 우선순위면 날짜순 정렬
      if (a.pickup_date !== b.pickup_date) {
        return a.pickup_date.localeCompare(b.pickup_date);
      }

      // 같은 날짜면 시간순 정렬
      return a.pickup_time.localeCompare(b.pickup_time);
    });
  };

  // 픽업 전/픽업 완료만 포함하는 데이터
  const getActiveStorages = () =>
    allStorages.filter(
      (s) => s.status === "stored" || s.status === "retrieved"
    );

  // 상태별 개수 계산 (날짜 필터 반영, stored+retrieved만)
  const getStatusTabCount = (status: string) => {
    let base = getActiveStorages();
    // 날짜 필터 적용
    if (!showAllDates && dateRange) {
      const fromStr = format(dateRange.from!, "yyyy-MM-dd");
      const toStr = format(dateRange.to!, "yyyy-MM-dd");
      base = base.filter(
        (s) => s.pickup_date >= fromStr && s.pickup_date <= toStr
      );
    }
    if (status === "all") return base.length;
    if (status === "stored")
      return base.filter((s) => s.status === "stored").length;
    if (status === "retrieved")
      return base.filter((s) => s.status === "retrieved").length;
    return 0;
  };
  // 위치별 개수 계산 (상태+날짜 필터 반영, stored+retrieved만)
  const getLocationTabCount = (location: string) => {
    let base = getActiveStorages();
    // 상태 필터
    if (statusTab !== "all") {
      base = base.filter((s) => {
        if (statusTab === "stored") return s.status === "stored";
        if (statusTab === "retrieved") return s.status === "retrieved";
        return true;
      });
    }
    // 날짜 필터
    if (!showAllDates && dateRange) {
      const fromStr = format(dateRange.from!, "yyyy-MM-dd");
      const toStr = format(dateRange.to!, "yyyy-MM-dd");
      base = base.filter(
        (s) => s.pickup_date >= fromStr && s.pickup_date <= toStr
      );
    }
    if (location === "all") return base.length;
    return base.filter((s) => getLocationFromReservation(s) === location)
      .length;
  };

  // 검색 필터링 로직
  useEffect(() => {
    let filtered = getActiveStorages();
    // 상태별 필터링
    if (statusTab !== "all") {
      filtered = filtered.filter((storage) => {
        if (statusTab === "stored") return storage.status === "stored";
        if (statusTab === "retrieved") return storage.status === "retrieved";
        return true;
      });
    }
    // 위치별 필터링
    if (locationTab !== "all") {
      filtered = filtered.filter((storage) => {
        const location = getLocationFromReservation(storage);
        return location === locationTab;
      });
    }
    // 기간(범위) 필터 (전체 날짜 보기가 아닌 경우)
    if (!showAllDates && dateRange) {
      const fromStr = format(dateRange.from!, "yyyy-MM-dd");
      const toStr = format(dateRange.to!, "yyyy-MM-dd");
      filtered = filtered.filter(
        (storage) =>
          storage.pickup_date >= fromStr && storage.pickup_date <= toStr
      );
    }
    // 검색 필터
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (storage) =>
          storage.customer_name.toLowerCase().includes(term) ||
          storage.reservation_id.toLowerCase().includes(term) ||
          storage.items_description.toLowerCase().includes(term) ||
          (storage.tag_number &&
            storage.tag_number.toLowerCase().includes(term)) ||
          (storage.notes && storage.notes.toLowerCase().includes(term))
      );
    }
    // 오늘 기준 우선 정렬 적용
    filtered = sortByTodayFirst(filtered);
    setFilteredStorages(filtered);
  }, [
    allStorages,
    searchTerm,
    dateRange,
    locationTab,
    statusTab,
    showAllDates,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateRange({
      from: today,
      to: today,
    });
    setShowAllDates(false);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">픽업 관리</h1>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* 이름/기기명 검색 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="고객명, 예약번호, 물품명, 태그번호 검색"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDateRange(undefined);
              }}
              className="text-sm pl-9"
            />
          </div>
          {/* 날짜 필터 */}
          {!showAllDates && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "yyyy-MM-dd", {
                        locale: ko,
                      })} ~ ${format(dateRange.to, "yyyy-MM-dd", {
                        locale: ko,
                      })}`
                    : "픽업 기간 선택"}
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
          )}
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
            onClick={() => setStatusTab("all")}
            className={`h-6 px-2 py-1 text-xs ${
              statusTab === "all"
                ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            전체: {getStatusTabCount("all")}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusTab("stored")}
            className={`h-6 px-2 py-1 text-xs ${
              statusTab === "stored"
                ? "bg-yellow-200 text-yellow-900 border-2 border-yellow-400"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            }`}
          >
            픽업 전: {getStatusTabCount("stored")}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusTab("retrieved")}
            className={`h-6 px-2 py-1 text-xs ${
              statusTab === "retrieved"
                ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            픽업 완료: {getStatusTabCount("retrieved")}건
          </Button>
        </div>
        {/* 필터 결과 표시 */}
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
            <span className="ml-2">총 {filteredStorages.length}건</span>
            {statusTab !== "all" && (
              <span className="ml-2 text-sm font-medium text-purple-600">
                ({statusTab === "stored" ? "픽업 전" : "픽업 완료"} 항목만 표시)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 위치 구분 탭 */}
      <Tabs
        value={locationTab}
        onValueChange={setLocationTab}
        className="mb-6 w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            전체{" "}
            <span className="ml-1 text-xs">({getLocationTabCount("all")})</span>
          </TabsTrigger>
          <TabsTrigger value="T1">
            터미널1{" "}
            <span className="ml-1 text-xs">({getLocationTabCount("T1")})</span>
          </TabsTrigger>
          <TabsTrigger value="T2">
            터미널2{" "}
            <span className="ml-1 text-xs">({getLocationTabCount("T2")})</span>
          </TabsTrigger>
          <TabsTrigger value="office">
            사무실{" "}
            <span className="ml-1 text-xs">
              ({getLocationTabCount("office")})
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-2 text-sm text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <StorageLogisticsList
          storages={filteredStorages}
          type="pick-up"
          onStatusUpdate={loadData}
        />
      )}
    </div>
  );
}
