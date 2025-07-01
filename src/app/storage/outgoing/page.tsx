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
import { Checkbox } from "@/components/ui/checkbox";

export default function StorageOutgoingPage() {
  const [allStorages, setAllStorages] = useState<StorageReservation[]>([]);
  const [filteredStorages, setFilteredStorages] = useState<
    StorageReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [locationTab, setLocationTab] = useState("all");
  const [statusTab, setStatusTab] = useState("all");

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date()); // 기본값: 오늘 날짜
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
    if (!showAllDates && dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      base = base.filter((s) => s.pickup_date.includes(filterDateString));
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
    if (!showAllDates && dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      base = base.filter((s) => s.pickup_date.includes(filterDateString));
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
    // 날짜 필터 (전체 날짜 보기가 아닌 경우)
    if (!showAllDates && dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((storage) =>
        storage.pickup_date.includes(filterDateString)
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
    dateFilter,
    locationTab,
    statusTab,
    showAllDates,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(new Date()); // 오늘 날짜로 리셋
    setShowAllDates(false);
  };

  // 전체 날짜 보기 토글
  const handleShowAllDatesChange = (checked: boolean) => {
    setShowAllDates(checked);
    if (checked) {
      setDateFilter(undefined); // 전체 보기 시 날짜 필터 제거
    } else {
      setDateFilter(new Date()); // 오늘 날짜로 설정
    }
  };

  return (
    <div className="container mx-auto px-2 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpIcon className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-green-800">픽업 관리</h1>
        </div>
      </div>

      {/* 상태 구분 탭 */}
      <Tabs value={statusTab} onValueChange={setStatusTab} className="mb-4">
        <TabsList className="w-full bg-green-100">
          <TabsTrigger value="all" className="flex-1">
            전체{" "}
            <span className="ml-1 text-xs text-green-700">
              ({getStatusTabCount("all")})
            </span>
          </TabsTrigger>
          <TabsTrigger value="stored" className="flex-1">
            픽업 전{" "}
            <span className="ml-1 text-xs text-green-700">
              ({getStatusTabCount("stored")})
            </span>
          </TabsTrigger>
          <TabsTrigger value="retrieved" className="flex-1">
            픽업 완료{" "}
            <span className="ml-1 text-xs text-green-700">
              ({getStatusTabCount("retrieved")})
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 검색/날짜/필터 바 */}
      <div className="flex flex-wrap gap-2 items-center mb-2 rounded-lg py-2">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="고객명, 예약번호, 물품명, 태그번호 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        {!showAllDates && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[160px]",
                  !dateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter
                  ? format(dateFilter, "yyyy-MM-dd", { locale: ko })
                  : "날짜 선택"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={(date) => setDateFilter(date)}
                locale={ko}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
        <div className="flex items-center gap-1">
          <Checkbox
            id="showAllDates"
            checked={showAllDates}
            onCheckedChange={handleShowAllDatesChange}
          />
          <label htmlFor="showAllDates" className="text-sm cursor-pointer">
            전체 날짜
          </label>
        </div>
        <Button
          onClick={handleReset}
          variant="outline"
          className="flex items-center gap-2 text-sm px-4 h-9"
        >
          <RefreshCwIcon className="w-4 h-4" /> 초기화
        </Button>
      </div>

      {/* 위치 구분 탭 (밑줄 스타일) */}
      <Tabs value={locationTab} onValueChange={setLocationTab} className="mb-6">
        <TabsList className="p-0 border-b border-green-200 bg-transparent rounded-none w-full md:w-fit">
          <TabsTrigger
            value="all"
            className="px-10 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none bg-transparent h-full data-[state=active]:shadow-none"
          >
            전체{" "}
            <span className="ml-1 text-xs text-green-700">
              ({getLocationTabCount("all")})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="T1"
            className="px-10 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none bg-transparent h-full data-[state=active]:shadow-none"
          >
            터미널1{" "}
            <span className="ml-1 text-xs text-green-700">
              ({getLocationTabCount("T1")})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="T2"
            className="px-10 data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none bg-transparent h-full data-[state=active]:shadow-none"
          >
            터미널2{" "}
            <span className="ml-1 text-xs text-green-700">
              ({getLocationTabCount("T2")})
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
