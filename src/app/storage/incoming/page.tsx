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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SearchIcon,
  RefreshCwIcon,
  CalendarIcon,
  PackageIcon,
  ArrowDownIcon,
  MapPinIcon,
  FilterIcon,
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
  const [locationTab, setLocationTab] = useState("all");

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [searchAllData, setSearchAllData] = useState(false); // 전체 데이터 검색 여부

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
    const reservationSite = storage.reservation_site?.toLowerCase() || "";

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

  // 검색 필터링 로직
  useEffect(() => {
    let filtered = allStorages;

    // 기본적으로는 pending 상태만, 전체 검색 시에는 모든 상태
    if (!searchAllData) {
      filtered = filtered.filter((storage) => storage.status === "pending");
    }

    // 장소별 필터링
    if (locationTab !== "all") {
      filtered = filtered.filter((storage) => {
        const location = getLocationFromReservation(storage);
        return location === locationTab;
      });
    }

    // 날짜 필터 (drop_off_date 기준)
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((storage) =>
        storage.drop_off_date.includes(filterDateString)
      );
    }

    // 검색 필터 (전체 데이터에서 검색 가능)
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

    setFilteredStorages(filtered);
  }, [allStorages, searchTerm, dateFilter, locationTab, searchAllData]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
    setSearchAllData(false);
  };

  // 장소별 개수 계산 (기본: pending 상태만)
  const getLocationTabCount = (location: string) => {
    const pendingStorages = allStorages.filter(
      (storage) => storage.status === "pending"
    );

    if (location === "all") {
      return pendingStorages.length;
    }
    return pendingStorages.filter((storage) => {
      const storageLocation = getLocationFromReservation(storage);
      return storageLocation === location;
    }).length;
  };

  // 검색 모드에 따른 설명 텍스트
  const getSearchModeDescription = () => {
    if (searchAllData) {
      return "모든 보관 데이터에서 검색 중 (보관 전/보관중/찾아감 포함)";
    }
    return "입고 대기 상태의 데이터만 표시 중";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDownIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-blue-800">입고 관리</h1>
        </div>
        <p className="text-sm text-gray-600">
          고객이 맡긴 짐을 보관소에 저장하는 프로세스를 관리합니다 (보관 전 →
          보관 완료)
        </p>
      </div>

      {/* 장소별 탭 */}
      <Tabs
        value={locationTab}
        onValueChange={setLocationTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <PackageIcon className="w-4 h-4" />
            전체 ({getLocationTabCount("all")}건)
          </TabsTrigger>
          <TabsTrigger value="T1" className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" />
            터미널1 ({getLocationTabCount("T1")}건)
          </TabsTrigger>
          <TabsTrigger value="T2" className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" />
            터미널2 ({getLocationTabCount("T2")}건)
          </TabsTrigger>
        </TabsList>

        {/* 전체 탭 */}
        <TabsContent value="all" className="space-y-4">
          {/* 검색 및 필터 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-800">
                전체 입고 관리
              </h2>
            </div>

            {/* 전체 데이터 검색 토글 */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <FilterIcon className="w-4 h-4 text-blue-600" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchAllData}
                  onChange={(e) => setSearchAllData(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-blue-700">
                  전체 보관 데이터에서 검색 (모든 상태 포함)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 검색 */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="고객명, 예약번호, 물품명, 태그번호, 메모 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              {/* 날짜 필터 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter
                      ? format(dateFilter, "yyyy년 MM월 dd일", { locale: ko })
                      : "맡기는 날짜 선택 (선택사항)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
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
                전체 초기화
              </Button>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                총 {filteredStorages.length}개의{" "}
                {searchAllData ? "보관" : "입고 예정"} 건
              </span>
              <span className="text-blue-600 font-medium">
                {getSearchModeDescription()}
              </span>
            </div>
          </div>

          {/* 상태 범례 */}
          <div className="flex justify-end gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>보관 전</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>보관중</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>찾아감</span>
            </div>
          </div>

          {/* 입고 목록 */}
          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <StorageLogisticsList
              storages={filteredStorages}
              type="drop-off"
              onStatusUpdate={loadData}
            />
          )}
        </TabsContent>

        {/* 터미널1 탭 */}
        <TabsContent value="T1" className="space-y-4">
          {/* 검색 및 필터 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-800">
                터미널1 입고 관리
              </h2>
            </div>

            {/* 전체 데이터 검색 토글 */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <FilterIcon className="w-4 h-4 text-blue-600" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchAllData}
                  onChange={(e) => setSearchAllData(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-blue-700">
                  전체 보관 데이터에서 검색 (모든 상태 포함)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 검색 */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="고객명, 예약번호, 물품명, 태그번호, 메모 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 날짜 필터 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter
                      ? format(dateFilter, "yyyy년 MM월 dd일", { locale: ko })
                      : "맡기는 날짜 선택 (선택사항)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
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
                전체 초기화
              </Button>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                총 {filteredStorages.length}개의 터미널1{" "}
                {searchAllData ? "보관" : "입고 예정"} 건
              </span>
              <span className="text-blue-600 font-medium">
                {getSearchModeDescription()}
              </span>
            </div>
          </div>

          {/* 입고 목록 */}
          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <StorageLogisticsList
              storages={filteredStorages}
              type="drop-off"
              onStatusUpdate={loadData}
            />
          )}
        </TabsContent>

        {/* 터미널2 탭 */}
        <TabsContent value="T2" className="space-y-4">
          {/* 검색 및 필터 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-800">
                터미널2 입고 관리
              </h2>
            </div>

            {/* 전체 데이터 검색 토글 */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <FilterIcon className="w-4 h-4 text-blue-600" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchAllData}
                  onChange={(e) => setSearchAllData(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-blue-700">
                  전체 보관 데이터에서 검색 (모든 상태 포함)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 검색 */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="고객명, 예약번호, 물품명, 태그번호, 메모 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 날짜 필터 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter
                      ? format(dateFilter, "yyyy년 MM월 dd일", { locale: ko })
                      : "맡기는 날짜 선택 (선택사항)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
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
                전체 초기화
              </Button>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                총 {filteredStorages.length}개의 터미널2{" "}
                {searchAllData ? "보관" : "입고 예정"} 건
              </span>
              <span className="text-blue-600 font-medium">
                {getSearchModeDescription()}
              </span>
            </div>
          </div>

          {/* 입고 목록 */}
          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <StorageLogisticsList
              storages={filteredStorages}
              type="drop-off"
              onStatusUpdate={loadData}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
