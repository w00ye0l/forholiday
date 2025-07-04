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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RentalReservation, PickupMethod } from "@/types/rental";
import type { Device, DeviceStatus } from "@/types/device";

export default function RentalOutPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalReservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [activeStatusTab, setActiveStatusTab] = useState("pending");

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

  // PickupMethod 타입에서 위치 목록 생성
  const pickupMethods: PickupMethod[] = [
    "T1",
    "T2",
    "delivery",
    "office",
    "hotel",
  ];

  // 위치별 한글 표시명 매핑
  const locationLabels: Record<PickupMethod, string> = {
    T1: "T1",
    T2: "T2",
    delivery: "택배",
    office: "사무실",
    hotel: "호텔",
  };

  // 검색 필터링 로직
  useEffect(() => {
    let filtered = rentals;

    // 날짜 필터
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.pickup_date.includes(filterDateString)
      );
    }

    // 탭별 위치 필터
    if (activeTab !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === activeTab
      );
    }

    // 상태별 필터
    if (activeStatusTab !== "all") {
      filtered = filtered.filter((rental) => rental.status === activeStatusTab);
    }

    // 이름/기기명 검색
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (rental) =>
          rental.renter_name.toLowerCase().includes(term) ||
          rental.device_category.toLowerCase().includes(term) ||
          (rental.device_tag_name &&
            rental.device_tag_name.toLowerCase().includes(term))
      );
    }

    setFilteredRentals(filtered);
  }, [rentals, searchTerm, dateFilter, activeTab, activeStatusTab]);

  // 탭 개수 계산용 필터링 (activeTab 제외, 검색 필터만 적용)
  const getBaseFilteredRentals = () => {
    let filtered = rentals;

    // 날짜 필터
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.pickup_date.includes(filterDateString)
      );
    }

    // 이름/기기명 검색
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (rental) =>
          rental.renter_name.toLowerCase().includes(term) ||
          rental.device_category.toLowerCase().includes(term) ||
          (rental.device_tag_name &&
            rental.device_tag_name.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
  };

  // 탭 개수 계산 (검색 필터만 적용, activeTab 무관)
  const getLocationCount = (location: PickupMethod | "all") => {
    const baseFiltered = getBaseFilteredRentals();
    if (location === "all") return baseFiltered.length;
    return baseFiltered.filter((rental) => rental.pickup_method === location)
      .length;
  };

  // 상태별 개수 계산 (위치 필터 적용, 상태 필터 제외)
  const getStatusCount = (status: string) => {
    const baseFiltered = getBaseFilteredRentals();
    let filtered = baseFiltered;

    // 위치 필터 적용
    if (activeTab !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === activeTab
      );
    }

    // 상태 필터 적용
    if (status === "all") return filtered.length;
    return filtered.filter((rental) => rental.status === status).length;
  };

  // 전체 상태별 개수 (검색 필터만 적용)
  const getTotalStatusCounts = () => {
    const baseFiltered = getBaseFilteredRentals();
    return {
      pending: baseFiltered.filter((rental) => rental.status === "pending")
        .length,
      picked_up: baseFiltered.filter((rental) => rental.status === "picked_up")
        .length,
      not_picked_up: baseFiltered.filter(
        (rental) => rental.status === "not_picked_up"
      ).length,
    };
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">출고 관리</h1>
        <p className="text-sm text-gray-500 mt-2">
          기기 출고 및 수령 상태 관리
        </p>
      </div>

      {/* 검색 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {/* 이름/기기명 검색 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="이름 또는 기기명 검색"
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
                  : "수령 날짜 선택"}
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <div className="space-y-6">
          {/* 위치별 탭 */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full h-auto grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="all" className="text-sm">
                전체 ({getLocationCount("all")})
              </TabsTrigger>
              {pickupMethods.map((method) => (
                <TabsTrigger key={method} value={method} className="text-sm">
                  {locationLabels[method]} ({getLocationCount(method)})
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 상태별 필터 버튼 그룹 */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-medium text-gray-700">
                  상태별 필터
                </h3>
                <ToggleGroup
                  type="single"
                  value={activeStatusTab}
                  onValueChange={(value) => setActiveStatusTab(value || "all")}
                  className="justify-start sm:justify-end"
                >
                  <ToggleGroupItem
                    value="all"
                    aria-label="전체"
                    className="text-xs px-3 py-1 data-[state=on]:border-2 data-[state=on]:border-green-600 data-[state=on]:bg-green-50 data-[state=on]:text-green-700"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      전체 ({getStatusCount("all")})
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="pending"
                    aria-label="수령전"
                    className="text-xs px-3 py-1 data-[state=on]:border-2 data-[state=on]:border-gray-600 data-[state=on]:bg-gray-50 data-[state=on]:text-gray-700"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      수령전 ({getStatusCount("pending")})
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="picked_up"
                    aria-label="수령완료"
                    className="text-xs px-3 py-1 data-[state=on]:border-2 data-[state=on]:border-blue-600 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      수령완료 ({getStatusCount("picked_up")})
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="not_picked_up"
                    aria-label="미수령"
                    className="text-xs px-3 py-1 data-[state=on]:border-2 data-[state=on]:border-red-600 data-[state=on]:bg-red-50 data-[state=on]:text-red-700"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      미수령 ({getStatusCount("not_picked_up")})
                    </div>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <TabsContent value="all" className="mt-4">
              <OutgoingList
                rentals={filteredRentals}
                devices={devices}
                onStatusUpdate={handleStatusUpdate}
              />
            </TabsContent>

            {pickupMethods.map((method) => (
              <TabsContent key={method} value={method} className="mt-4">
                <OutgoingList
                  rentals={filteredRentals}
                  devices={devices}
                  onStatusUpdate={handleStatusUpdate}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
