"use client";

import { useState, useEffect } from "react";
import { RentalList } from "@/components/rental/RentalList";
import { RentalStatistics } from "@/components/rental/RentalStatistics";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SearchIcon,
  RefreshCwIcon,
  ListIcon,
  BarChart3Icon,
  DownloadIcon,
} from "lucide-react";
import { RentalReservation } from "@/types/rental";
import {
  exportToExcel,
  transformRentalDataForExcel,
  transformRentalStatsForExcel,
} from "@/lib/utils";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState("list");
  const [exporting, setExporting] = useState(false);

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

  // 엑셀 출력 핸들러
  const handleExportToExcel = async () => {
    try {
      setExporting(true);

      // 현재 필터링된 데이터를 엑셀 형식으로 변환
      const excelData = transformRentalDataForExcel(filteredRentals);

      // 통계 데이터 생성
      const statsData = transformRentalStatsForExcel(
        filteredRentals,
        searchTerm.trim() ? `검색: ${searchTerm}` : "전체 데이터"
      );

      // 엑셀 파일 생성 및 다운로드
      const result = await exportToExcel(excelData, "예약목록", {
        sheetName: "예약 목록",
        includeStats: true,
        statsData: statsData,
      });

      if (result.success) {
        toast.success(`엑셀 파일이 다운로드되었습니다: ${result.filename}`);
      } else {
        toast.error(`엑셀 출력 실패: ${result.error}`);
      }
    } catch (error) {
      console.error("엑셀 출력 에러:", error);
      toast.error("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
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
        <h1 className="text-2xl font-bold mb-2">예약 관리</h1>
        <p className="text-sm text-gray-500 mb-4">
          예약 목록을 확인하고 출고 통계를 분석할 수 있습니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListIcon className="w-4 h-4" />
            예약 목록
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3Icon className="w-4 h-4" />
            출고 통계
          </TabsTrigger>
        </TabsList>

        {/* 예약 목록 탭 */}
        <TabsContent value="list" className="space-y-6">
          {/* 검색 필터 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
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

              {/* 버튼 그룹 */}
              <div className="flex gap-2">
                {/* 초기화 버튼 */}
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                  초기화
                </Button>

                {/* 엑셀 출력 버튼 */}
                <Button
                  variant="outline"
                  onClick={handleExportToExcel}
                  disabled={exporting || filteredRentals.length === 0}
                  className="flex items-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {exporting ? "출력 중..." : "엑셀 출력"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {searchTerm.trim() ? (
                  <>
                    '
                    <span className="font-medium text-blue-600">
                      {searchTerm}
                    </span>
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
          <RentalList
            rentals={filteredRentals}
            loading={loading}
            searchTerm={searchTerm}
          />
        </TabsContent>

        {/* 출고 통계 탭 */}
        <TabsContent value="statistics" className="space-y-6">
          <RentalStatistics rentals={filteredRentals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
