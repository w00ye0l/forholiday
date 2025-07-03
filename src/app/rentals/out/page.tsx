"use client";

import { createClient } from "@/lib/supabase/client";
import { OutgoingList } from "@/components/rental/OutgoingList";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type {
  RentalReservation,
  PickupMethod,
  ReservationStatus,
} from "@/types/rental";
import { STATUS_MAP, PICKUP_METHOD_LABELS } from "@/types/rental";
import type { Device, DeviceStatus } from "@/types/device";
import { cn } from "@/lib/utils";

export default function RentalOutPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalReservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedStatus, setSelectedStatus] = useState<
    ReservationStatus | "all"
  >("all");
  const [selectedPickupMethod, setSelectedPickupMethod] = useState<
    PickupMethod | "all"
  >("all");

  // 검색 상태 - 오늘 날짜를 기본값으로 설정
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    // 출고 대상 예약 목록 조회 (모든 상태 - 임시)
    const { data: rentalsData } = await supabase
      .from("rental_reservations")
      .select("*")
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

  // 검색 필터링 로직
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
    }

    // 날짜 필터링
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.pickup_date.includes(filterDateString)
      );
    }

    // 수령 방법 필터링
    if (selectedPickupMethod !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === selectedPickupMethod
      );
    }

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((rental) => rental.status === selectedStatus);
    }

    setFilteredRentals(filtered);
  }, [rentals, searchTerm, dateFilter, selectedPickupMethod, selectedStatus]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
    setSelectedPickupMethod("all");
    setSelectedStatus("all");
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

    // 날짜 필터링
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.pickup_date.includes(filterDateString)
      );
    }

    // 수령 방법 필터링
    if (selectedPickupMethod !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === selectedPickupMethod
      );
    }

    // 필터링된 결과에서 상태별 건수 계산
    const counts = {
      all: filtered.length,
      pending: filtered.filter((r) => r.status === "pending").length,
      picked_up: filtered.filter((r) => r.status === "picked_up").length,
      not_picked_up: filtered.filter((r) => r.status === "not_picked_up")
        .length,
      returned: filtered.filter((r) => r.status === "returned").length,
      overdue: filtered.filter((r) => r.status === "overdue").length,
      problem: filtered.filter((r) => r.status === "problem").length,
    };

    return counts;
  };

  const statusCounts = getStatusCounts();

  // 수령 방법별 개수 계산
  const getPickupMethodCounts = () => {
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

    // 날짜 필터링
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.pickup_date.includes(filterDateString)
      );
    }

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((rental) => rental.status === selectedStatus);
    }

    const counts = {
      all: filtered.length,
      T1: filtered.filter((r) => r.pickup_method === "T1").length,
      T2: filtered.filter((r) => r.pickup_method === "T2").length,
      delivery: filtered.filter((r) => r.pickup_method === "delivery").length,
      office: filtered.filter((r) => r.pickup_method === "office").length,
      hotel: filtered.filter((r) => r.pickup_method === "hotel").length,
    };

    return counts;
  };

  const pickupMethodCounts = getPickupMethodCounts();

  // 필터 조건 표시 함수
  const getFilterDescription = () => {
    const conditions = [];

    if (searchTerm.trim()) {
      conditions.push(`검색: "${searchTerm}"`);
    }

    if (dateFilter) {
      conditions.push(`${format(dateFilter, "yyyy-MM-dd", { locale: ko })}`);
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
        <p className="text-sm text-gray-500 mb-4">
          기기 출고 및 수령 상태를 관리할 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                  ? format(dateFilter, "yyyy-MM-dd", { locale: ko })
                  : "수령 날짜 선택"}
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
                ? STATUS_MAP.overdue.button
                : STATUS_MAP.overdue.badge
            }`}
          >
            {STATUS_MAP.overdue.label}: {statusCounts.overdue}건
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
            {dateFilter ? (
              <span className="font-medium text-blue-600">
                {format(dateFilter, "yyyy년 MM월 dd일", { locale: ko })} 기준
              </span>
            ) : (
              <span className="font-medium text-blue-600">전체 기간</span>
            )}
            <span className="ml-2">총 {filteredRentals.length}개의 예약</span>
            {/* {getFilterDescription() && (
              <span className="block text-xs text-blue-600 font-medium mt-1">
                필터 조건: {getFilterDescription()}
              </span>
            )} */}
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
        />
      )}
    </div>
  );
}
