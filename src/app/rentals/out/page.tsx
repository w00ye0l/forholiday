"use client";

import { createClient } from "@/lib/supabase/client";
import { OutgoingList } from "@/components/rental/OutgoingList";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useKoreanInput } from "@/hooks/useKoreanInput";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RentalReservation, PickupMethod } from "@/types/rental";
import { STATUS_MAP, PICKUP_METHOD_LABELS } from "@/types/rental";
import type { Device, DeviceStatus } from "@/types/device";
import { cn } from "@/lib/utils";

export default function RentalOutPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedStatus, setSelectedStatus] = useState<
    "pending" | "picked_up" | "not_picked_up" | "all"
  >("all");
  const [selectedPickupMethod, setSelectedPickupMethod] = useState<
    PickupMethod | "all"
  >("all");

  // 한글 검색 - 직접 구현 (빠른 반응을 위해 delay 감소)
  const searchInput = useKoreanInput({
    delay: 150, // 더 빠른 반응을 위해 150ms로 감소
    enableChoseongSearch: false,
    onValueChange: () => setDateRange(undefined)
  });
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    // 출고 대상 예약 목록 조회 (반납 완료 및 취소된 예약 제외)
    const { data: rentalsData } = await supabase
      .from("rental_reservations")
      .select("*")
      .neq("status", "returned")
      .is("cancelled_at", null)
      .order("pickup_date", { ascending: true })
      .order("pickup_time", { ascending: true });

    // 사용 가능한 기기 목록 조회
    const availableStatus: DeviceStatus = "available";
    const { data: devicesData } = await supabase
      .from("devices")
      .select("*")
      .eq("status", availableStatus)
      .order("tag_name");

    setRentals(rentalsData || []);
    setDevices(devicesData || []);
    setLoading(false);
  };

  // 상태 업데이트 콜백 함수
  const handleStatusUpdate = () => {
    loadData();
  };

  // 기본 필터링된 데이터 (성능 최적화)
  const baseFilteredRentals = useMemo(() => {
    return rentals.filter(r => r.status !== "returned" && !r.cancelled_at);
  }, [rentals]);

  // 검색 및 필터링 로직 - 성능 최적화
  const filteredRentals = useMemo(() => {
    let filtered = baseFilteredRentals;

    // 상태 필터링 (가장 선택적인 필터 먼저)
    if (selectedStatus !== "all") {
      filtered = filtered.filter((rental) => rental.status === selectedStatus);
    }

    // 수령 방법 필터링
    if (selectedPickupMethod !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === selectedPickupMethod
      );
    }

    // 기간(범위) 필터링
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter(
        (rental) => rental.pickup_date >= fromStr && rental.pickup_date <= toStr
      );
    }

    // 검색 필터링 (가장 마지막에 적용)
    if (searchInput.debouncedValue.trim()) {
      filtered = searchInput.search(filtered, (rental) => 
        `${rental.renter_name} ${rental.renter_phone} ${rental.reservation_id} ${rental.device_tag_name || ''}`
      );
    }

    return filtered;
  }, [baseFilteredRentals, searchInput.debouncedValue, dateRange, selectedPickupMethod, selectedStatus, searchInput]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    searchInput.clear();
    setDateRange({
      from: today,
      to: today,
    });
    setSelectedPickupMethod("all");
    setSelectedStatus("all");
  };

  // 상태를 제외한 기본 필터링 (상태별 개수 계산용)
  const baseFilteredForCounts = useMemo(() => {
    let filtered = baseFilteredRentals;

    // 수령 방법 필터링
    if (selectedPickupMethod !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === selectedPickupMethod
      );
    }

    // 기간(범위) 필터링
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter(
        (rental) => rental.pickup_date >= fromStr && rental.pickup_date <= toStr
      );
    }

    // 검색 필터링
    if (searchInput.debouncedValue.trim()) {
      filtered = searchInput.search(filtered, (rental) => 
        `${rental.renter_name} ${rental.renter_phone} ${rental.reservation_id} ${rental.device_tag_name || ''}`
      );
    }

    return filtered;
  }, [baseFilteredRentals, searchInput.debouncedValue, dateRange, selectedPickupMethod, searchInput]);

  // 상태별 개수 계산 - 최적화된 버전
  const statusCounts = useMemo(() => {
    const counts = {
      all: baseFilteredForCounts.length,
      pending: 0,
      picked_up: 0,
      not_picked_up: 0,
    };

    // 한번의 순회로 모든 상태 개수 계산
    baseFilteredForCounts.forEach((rental) => {
      switch (rental.status) {
        case "pending":
          counts.pending++;
          break;
        case "picked_up":
          counts.picked_up++;
          break;
        case "not_picked_up":
          counts.not_picked_up++;
          break;
      }
    });

    return counts;
  }, [baseFilteredForCounts]);

  // 수령 방법을 제외한 기본 필터링 (수령 방법별 개수 계산용)
  const baseFilteredForMethodCounts = useMemo(() => {
    let filtered = baseFilteredRentals;

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((rental) => rental.status === selectedStatus);
    }

    // 기간(범위) 필터링
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter(
        (rental) => rental.pickup_date >= fromStr && rental.pickup_date <= toStr
      );
    }

    // 검색 필터링
    if (searchInput.debouncedValue.trim()) {
      filtered = searchInput.search(filtered, (rental) => 
        `${rental.renter_name} ${rental.renter_phone} ${rental.reservation_id} ${rental.device_tag_name || ''}`
      );
    }

    return filtered;
  }, [baseFilteredRentals, searchInput.debouncedValue, dateRange, selectedStatus, searchInput]);

  // 수령 방법별 개수 계산 - 최적화된 버전
  const pickupMethodCounts = useMemo(() => {
    const counts = {
      all: baseFilteredForMethodCounts.length,
      T1: 0,
      T2: 0,
      delivery: 0,
      office: 0,
      hotel: 0,
    };

    // 한번의 순회로 모든 방법별 개수 계산
    baseFilteredForMethodCounts.forEach((rental) => {
      switch (rental.pickup_method) {
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
  }, [baseFilteredForMethodCounts]);

  // 필터 조건 표시 함수
  const getFilterDescription = () => {
    const conditions = [];

    if (searchInput.debouncedValue.trim()) {
      conditions.push(`검색: "${searchInput.debouncedValue}"`);
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

    if (selectedPickupMethod !== "all") {
      conditions.push(
        `수령방법-${PICKUP_METHOD_LABELS[selectedPickupMethod as PickupMethod]}`
      );
    }

    if (selectedStatus !== "all") {
      conditions.push(
        `상태-${STATUS_MAP[selectedStatus as keyof typeof STATUS_MAP].label}`
      );
    }

    return conditions.length > 0 ? conditions.join(" | ") : null;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">출고 관리</h1>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* 한글 검색 입력 */}
          <div className="relative">
            <Input
              placeholder="고객명, 전화번호, 예약번호, 기기명 검색"
              {...searchInput.inputProps}
              className="pl-3"
            />
          </div>

          {/* 날짜 필터 */}
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
                    })} ~ ${format(dateRange.to, "yyyy-MM-dd", { locale: ko })}`
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
            {STATUS_MAP.not_picked_up.label}: {statusCounts.not_picked_up}건
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
            <span className="ml-2">총 {filteredRentals.length}개의 예약</span>
            {selectedStatus !== "all" && (
              <span className="ml-2 text-sm font-medium text-purple-600">
                (
                {selectedStatus === "pending"
                  ? "수령전"
                  : selectedStatus === "picked_up"
                  ? "수령완료"
                  : "미수령"}{" "}
                항목만 표시)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 수령 방법별 탭 */}
      <Tabs
        value={selectedPickupMethod}
        onValueChange={(value) =>
          setSelectedPickupMethod(value as PickupMethod | "all")
        }
        className="w-full mb-6"
      >
        <TabsList className="grid w-full h-auto grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="all" className="text-sm">
            전체 ({pickupMethodCounts.all})
          </TabsTrigger>
          <TabsTrigger value="T1" className="text-sm">
            터미널1 ({pickupMethodCounts.T1})
          </TabsTrigger>
          <TabsTrigger value="T2" className="text-sm">
            터미널2 ({pickupMethodCounts.T2})
          </TabsTrigger>
          <TabsTrigger value="delivery" className="text-sm">
            택배 ({pickupMethodCounts.delivery})
          </TabsTrigger>
          <TabsTrigger value="office" className="text-sm">
            사무실 ({pickupMethodCounts.office})
          </TabsTrigger>
          <TabsTrigger value="hotel" className="text-sm">
            호텔 ({pickupMethodCounts.hotel})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <OutgoingList
          rentals={filteredRentals}
          devices={devices}
          onStatusUpdate={handleStatusUpdate}
          searchTerm={searchInput.debouncedValue}
        />
      )}
    </div>
  );
}
