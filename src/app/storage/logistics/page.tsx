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
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { StorageReservation } from "@/types/storage";
import StorageLogisticsList from "@/components/storage/StorageLogisticsList";

export default function StorageLogisticsPage() {
  const [storages, setStorages] = useState<StorageReservation[]>([]);
  const [filteredStorages, setFilteredStorages] = useState<
    StorageReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("drop-off");

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: storagesData } = await supabase
      .from("storage_reservations")
      .select("*")
      .order("drop_off_date", { ascending: true })
      .order("drop_off_time", { ascending: true });

    setStorages(storagesData || []);
    setLoading(false);
  };

  // 검색 필터링 로직
  useEffect(() => {
    let filtered = storages;

    // 탭별 필터링
    if (activeTab === "drop-off") {
      // 들어오는 짐: 대기중 상태만
      filtered = filtered.filter((storage) => storage.status === "pending");

      // 날짜 필터 (drop_off_date 기준)
      if (dateFilter) {
        const filterDateString = format(dateFilter, "yyyy-MM-dd");
        filtered = filtered.filter((storage) =>
          storage.drop_off_date.includes(filterDateString)
        );
      }
    } else {
      // 나가는 짐: 보관중 상태만
      filtered = filtered.filter((storage) => storage.status === "stored");

      // 날짜 필터 (pickup_date 기준)
      if (dateFilter) {
        const filterDateString = format(dateFilter, "yyyy-MM-dd");
        filtered = filtered.filter((storage) =>
          storage.pickup_date.includes(filterDateString)
        );
      }
    }

    // 이름/예약번호 검색
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (storage) =>
          storage.customer_name.toLowerCase().includes(term) ||
          storage.reservation_id.toLowerCase().includes(term) ||
          storage.items_description.toLowerCase().includes(term)
      );
    }

    setFilteredStorages(filtered);
  }, [storages, searchTerm, dateFilter, activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
  };

  // 각 탭별 개수 계산
  const getTabCount = (tab: string) => {
    if (tab === "drop-off") {
      return storages.filter((storage) => storage.status === "pending").length;
    } else {
      return storages.filter((storage) => storage.status === "stored").length;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">짐 입출고 관리</h1>
      </div>

      {/* 검색 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {/* 이름/예약번호 검색 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="이름 또는 예약번호 검색"
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
                  : activeTab === "drop-off"
                  ? "맡기는 날짜 선택"
                  : "찾아가는 날짜 선택"}
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

        <div className="text-sm text-gray-600">
          총 {filteredStorages.length}개의{" "}
          {activeTab === "drop-off" ? "입고" : "출고"} 예정
        </div>
      </div>

      {/* 상태 범례 */}
      <div className="mb-4 flex justify-end gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded"></div>
          <span>대기중</span>
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

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="drop-off" className="text-sm">
              Drop-off ({getTabCount("drop-off")}건)
            </TabsTrigger>
            <TabsTrigger value="pick-up" className="text-sm">
              Pick-up ({getTabCount("pick-up")}건)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drop-off" className="mt-4">
            <StorageLogisticsList
              storages={filteredStorages}
              type="drop-off"
              onStatusUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="pick-up" className="mt-4">
            <StorageLogisticsList
              storages={filteredStorages}
              type="pick-up"
              onStatusUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
