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
import { SearchIcon, RefreshCwIcon, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RentalReservation } from "@/types/rental";

export default function RentalReturnPage() {
  const [rentals, setRentals] = useState<RentalReservation[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalReservation[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // 검색 상태 - 오늘 날짜를 기본값으로 설정
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();

    // 반납 예정 및 완료된 예약 목록 조회
    const { data: rentalsData } = await supabase
      .from("rental_reservations")
      .select("*")
      .in("status", ["picked_up", "not_picked_up"])
      .order("return_date", { ascending: true })
      .order("return_time", { ascending: true });

    setRentals(rentalsData || []);
    setLoading(false);
  };

  // 검색 필터링 로직
  useEffect(() => {
    let filtered = rentals;

    // 날짜 필터 (반납일 기준)
    if (dateFilter) {
      const filterDateString = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((rental) =>
        rental.return_date.includes(filterDateString)
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

    setFilteredRentals(filtered);
  }, [rentals, searchTerm, dateFilter]);

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter(undefined);
  };

  // 상태 업데이트 콜백 함수
  const handleStatusUpdate = () => {
    loadData();
  };

  // 전체 상태별 개수 계산
  const getTotalStatusCounts = () => {
    return {
      picked_up: filteredRentals.filter(
        (rental) => rental.status === "picked_up"
      ).length,
      not_picked_up: filteredRentals.filter(
        (rental) => rental.status === "not_picked_up"
      ).length,
    };
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">반납 관리</h1>
        <p className="text-sm text-gray-500 mt-2">기기 반납 및 상태 관리</p>
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
