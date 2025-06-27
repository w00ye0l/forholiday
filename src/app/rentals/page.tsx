"use client";

import { useState, useEffect } from "react";
import { RentalList } from "@/components/rental/RentalList";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, RefreshCwIcon } from "lucide-react";

import { RentalReservation } from "@/types/rental";

type RentalWithDevice = RentalReservation & {
  devices: {
    id: string;
    tag_name: string;
    category: string;
    status: string;
  };
};

export default function RentalsPage() {
  const [rentals, setRentals] = useState<RentalWithDevice[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalWithDevice[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      // 예약 목록 조회
      const { data: rentals, error: rentalsError } = await supabase
        .from("rental_reservations")
        .select("*")
        .order("created_at", { ascending: false });

      if (rentalsError) {
        throw rentalsError;
      }

      // 기기 목록 조회
      const { data: devices, error: devicesError } = await supabase
        .from("devices")
        .select("id, tag_name, category, status");

      if (devicesError) {
        throw devicesError;
      }

      // 예약과 기기 정보를 매칭
      const rentalsWithDevices =
        rentals?.map((rental) => {
          const device = rental.device_tag_name
            ? devices?.find((d) => d.tag_name === rental.device_tag_name)
            : null;
          return {
            ...rental,
            devices: device || {
              id: "",
              tag_name: rental.device_tag_name || "",
              category: rental.device_category,
              status: "unknown",
            },
          };
        }) || [];

      setRentals(rentalsWithDevices);
      setFilteredRentals(rentalsWithDevices);
    } catch (error) {
      console.error("예약 목록 조회 에러:", error);
      setError("예약 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링 로직
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRentals(rentals);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = rentals.filter((rental) => {
      return (
        rental.renter_name.toLowerCase().includes(term) ||
        rental.renter_phone.includes(term) ||
        rental.reservation_id.toLowerCase().includes(term) ||
        (rental.device_tag_name &&
          rental.device_tag_name.toLowerCase().includes(term))
      );
    });

    setFilteredRentals(filtered);
  }, [searchTerm, rentals]);

  useEffect(() => {
    fetchRentals();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">예약 목록</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-red-500 p-4 border border-red-300 rounded">
            {error}
          </div>
          <Button onClick={fetchRentals} className="mt-4">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">예약 목록</h1>
        <p className="text-sm text-gray-500 mb-4">
          목록을 선택하면 상세 정보 페이지로 이동합니다.
        </p>
      </div>

      {/* 검색 필터 */}
      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 검색 입력 */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="고객명, 전화번호, 예약번호, 기기명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

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

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {searchTerm.trim() ? (
              <>
                '<span className="font-medium text-blue-600">{searchTerm}</span>
                ' 검색 결과: {filteredRentals.length}건
              </>
            ) : (
              <>총 {filteredRentals.length}개의 예약</>
            )}
          </span>
          {searchTerm.trim() && (
            <span className="text-xs">
              전체 {rentals.length}건 중 {filteredRentals.length}건 표시
            </span>
          )}
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="bg-white p-2 rounded-lg shadow">
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : filteredRentals.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {searchTerm.trim()
              ? `'${searchTerm}' 검색 결과가 없습니다.`
              : "예약된 기기가 없습니다."}
          </div>
        ) : (
          <RentalList rentals={filteredRentals} searchTerm={searchTerm} />
        )}
      </div>
    </div>
  );
}
