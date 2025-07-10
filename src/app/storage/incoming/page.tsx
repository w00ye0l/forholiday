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
  ArrowDownIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { StorageReservation } from "@/types/storage";
import StorageLogisticsList from "@/components/storage/StorageLogisticsList";
import { cn } from "@/lib/utils";

export default function StorageIncomingPage() {
  const [allStorages, setAllStorages] = useState<StorageReservation[]>([]);
  const [filteredStorages, setFilteredStorages] = useState<
    StorageReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");
  const [locationTab, setLocationTab] = useState("all");

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
      .order("drop_off_date", { ascending: true })
      .order("drop_off_time", { ascending: true });

    setAllStorages(storagesData || []);
    setLoading(false);
  };

  // 장소별 필터링 함수
  const getLocationFromReservation = (storage: StorageReservation): string => {
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
      const aIsToday = a.drop_off_date === today;
      const bIsToday = b.drop_off_date === today;

      // 오늘 날짜를 우선 정렬
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // 같은 우선순위면 날짜순 정렬
      if (a.drop_off_date !== b.drop_off_date) {
        return a.drop_off_date.localeCompare(b.drop_off_date);
      }

      // 같은 날짜면 시간순 정렬
      return a.drop_off_time.localeCompare(b.drop_off_time);
    });
  };

  // 보관 전/보관 완료만 포함하는 데이터
  const getActiveStorages = () =>
    allStorages.filter((s) => s.status === "pending" || s.status === "stored");

  // 상태별 개수 계산 (날짜 필터 반영, pending+stored만)
  const getStatusTabCount = (status: string) => {
    let base = getActiveStorages();
    // 날짜 필터 적용
    if (!showAllDates && dateRange) {
      const fromStr = format(dateRange.from!, "yyyy-MM-dd");
      const toStr = format(dateRange.to!, "yyyy-MM-dd");
      base = base.filter(
        (s) => s.drop_off_date >= fromStr && s.drop_off_date <= toStr
      );
    }
    if (status === "all") return base.length;
    if (status === "pending")
      return base.filter((s) => s.status === "pending").length;
    if (status === "stored")
      return base.filter((s) => s.status === "stored").length;
    return 0;
  };
  // 위치별 개수 계산 (상태+날짜 필터 반영, pending+stored만)
  const getLocationTabCount = (location: string) => {
    let base = getActiveStorages();
    // 상태 필터
    if (statusTab !== "all") {
      base = base.filter((s) => {
        if (statusTab === "pending") return s.status === "pending";
        if (statusTab === "stored") return s.status === "stored";
        return true;
      });
    }
    // 날짜 필터
    if (!showAllDates && dateRange) {
      const fromStr = format(dateRange.from!, "yyyy-MM-dd");
      const toStr = format(dateRange.to!, "yyyy-MM-dd");
      base = base.filter(
        (s) => s.drop_off_date >= fromStr && s.drop_off_date <= toStr
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
        if (statusTab === "pending") return storage.status === "pending";
        if (statusTab === "stored") return storage.status === "stored";
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
    if (!showAllDates && dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter(
        (storage) =>
          storage.drop_off_date >= fromStr && storage.drop_off_date <= toStr
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
        <h1 className="text-2xl font-bold mb-2">입고 관리</h1>
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
                    : "입고 기간 선택"}
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
            onClick={() => setStatusTab("pending")}
            className={`h-6 px-2 py-1 text-xs ${
              statusTab === "pending"
                ? "bg-yellow-200 text-yellow-900 border-2 border-yellow-400"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            }`}
          >
            보관 전: {getStatusTabCount("pending")}건
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusTab("stored")}
            className={`h-6 px-2 py-1 text-xs ${
              statusTab === "stored"
                ? "bg-gray-200 text-gray-900 border-2 border-gray-400"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            보관 완료: {getStatusTabCount("stored")}건
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
                ({statusTab === "pending" ? "보관 전" : "보관 완료"} 항목만
                표시)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 위치 구분 탭 (밑줄 스타일) */}
      <Tabs
        value={locationTab}
        onValueChange={setLocationTab}
        className="mb-6 w-full"
      >
        <TabsList className="p-0 border-b border-gray-200 bg-transparent rounded-none w-full">
          <TabsTrigger
            value="all"
            className="flex-1 max-w-40 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full data-[state=active]:shadow-none"
          >
            전체{" "}
            <span className="ml-1 text-xs text-blue-700">
              ({getLocationTabCount("all")})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="T1"
            className="flex-1 max-w-40 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full data-[state=active]:shadow-none"
          >
            터미널1{" "}
            <span className="ml-1 text-xs text-blue-700">
              ({getLocationTabCount("T1")})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="T2"
            className="flex-1 max-w-40 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full data-[state=active]:shadow-none"
          >
            터미널2{" "}
            <span className="ml-1 text-xs text-blue-700">
              ({getLocationTabCount("T2")})
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <StorageLogisticsList
          storages={filteredStorages}
          type="drop-off"
          onStatusUpdate={loadData}
        />
      )}
    </div>
  );
}
