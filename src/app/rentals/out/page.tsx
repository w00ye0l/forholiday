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
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RentalReservation, PickupMethod } from "@/types/rental";
import type { Device } from "@/types/device";

export default function RentalOutPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalReservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [locationFilter, setLocationFilter] = useState("all");

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
    const { data: devicesData } = await supabase
      .from("devices")
      .select("*")
      .eq("status", "available")
      .order("tag_name");

    setRentals(rentalsData || []);
    setDevices(devicesData || []);
    setLoading(false);
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

    // 위치 필터
    if (locationFilter && locationFilter !== "all") {
      filtered = filtered.filter(
        (rental) => rental.pickup_method === locationFilter
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

    setFilteredRentals(filtered);
  }, [rentals, searchTerm, dateFilter, locationFilter]);

  useEffect(() => {
    loadData();
  }, []);

  // PickupMethod 타입에서 위치 목록 생성
  const pickupMethods: PickupMethod[] = [
    "T1",
    "T2",
    "delivery",
    "office",
    "direct",
  ];

  // 위치별 한글 표시명 매핑
  const locationLabels: Record<PickupMethod, string> = {
    T1: "터미널1",
    T2: "터미널2",
    delivery: "택배",
    office: "사무실",
    direct: "직접수령",
  };

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
    setLocationFilter("all");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">출고 관리</h1>
      </div>

      {/* 검색 필터 */}
      <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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

          {/* 위치 필터 */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="수령 위치" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 위치</SelectItem>
              {pickupMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {locationLabels[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          총 {filteredRentals.length}개의 예약 ({rentals.length}개 중)
        </div>
      </div>

      {/* 상태 범례 */}
      <div className="mb-4 flex justify-end gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded"></div>
          <span>수령전</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>수령완료</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>미수령</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <OutgoingList rentals={filteredRentals} devices={devices} />
      )}
    </div>
  );
}
