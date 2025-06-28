"use client";

import { useState, useEffect } from "react";
import { RentalList } from "@/components/rental/RentalList";
import { RentalStatistics } from "@/components/rental/RentalStatistics";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchIcon,
  RefreshCwIcon,
  ListIcon,
  BarChart3Icon,
  DownloadIcon,
  CalendarIcon,
  XIcon,
} from "lucide-react";
import { RentalReservation, STATUS_MAP } from "@/types/rental";
import {
  exportToExcel,
  transformRentalDataForExcel,
  transformRentalStatsForExcel,
  cn,
} from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type RentalWithDevice = RentalReservation & {
  devices: {
    id: string;
    tag_name: string;
    category: string;
    status: string;
  };
};

// statusMap은 이제 STATUS_MAP으로 대체됨

export default function RentalsPage() {
  const [rentals, setRentals] = useState<RentalWithDevice[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<RentalWithDevice[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [exporting, setExporting] = useState(false);

  // Popover 상태 관리
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

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

  // 검색 및 필터링 로직
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
    if (startDate || endDate) {
      filtered = filtered.filter((rental) => {
        const pickupDate = new Date(rental.pickup_date);

        // 시작일만 설정된 경우
        if (startDate && !endDate) {
          return pickupDate >= startDate;
        }
        // 종료일만 설정된 경우
        if (!startDate && endDate) {
          return pickupDate <= endDate;
        }
        // 둘 다 설정된 경우
        if (startDate && endDate) {
          return pickupDate >= startDate && pickupDate <= endDate;
        }
        return true;
      });
    }

    // 카테고리 필터링
    if (selectedCategory !== "all") {
      filtered = filtered.filter((rental) => {
        return rental.devices.category === selectedCategory;
      });
    }

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((rental) => {
        return rental.status === selectedStatus;
      });
    }

    setFilteredRentals(filtered);
  }, [
    searchTerm,
    startDate,
    endDate,
    selectedCategory,
    selectedStatus,
    rentals,
  ]);

  useEffect(() => {
    fetchRentals();
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCategory("all");
    setSelectedStatus("all");
  };

  // 개별 날짜 초기화 함수
  const clearStartDate = () => {
    setStartDate(undefined);
    setStartDateOpen(false);
  };

  const clearEndDate = () => {
    setEndDate(undefined);
    setEndDateOpen(false);
  };

  // 엑셀 출력 핸들러
  const handleExportToExcel = async () => {
    try {
      setExporting(true);

      // 현재 필터링된 데이터를 엑셀 형식으로 변환
      const excelData = transformRentalDataForExcel(filteredRentals);

      // 검색 조건 생성
      const searchConditions = [];
      if (searchTerm.trim()) {
        searchConditions.push(`검색어: ${searchTerm}`);
      }
      if (startDate) {
        searchConditions.push(
          `시작일-${format(startDate, "yyyy-MM-dd", { locale: ko })}`
        );
      }
      if (endDate) {
        searchConditions.push(
          `종료일-${format(endDate, "yyyy-MM-dd", { locale: ko })}`
        );
      }
      if (selectedCategory !== "all") {
        searchConditions.push(`카테고리-${selectedCategory}`);
      }
      if (selectedStatus !== "all") {
        searchConditions.push(`상태-${selectedStatus}`);
      }

      const searchDescription =
        searchConditions.length > 0
          ? searchConditions.join(" | ")
          : "전체 데이터";

      // 통계 데이터 생성
      const statsData = transformRentalStatsForExcel(
        filteredRentals,
        searchDescription
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

  // 고유한 카테고리 목록 추출
  const getUniqueCategories = () => {
    const categories = rentals
      .map((rental) => rental.devices.category)
      .filter((category) => category)
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories;
  };

  // 고유한 상태 목록 추출
  const getUniqueStatuses = () => {
    const statuses = rentals
      .map((rental) => rental.status)
      .filter((status) => status)
      .filter((status, index, arr) => arr.indexOf(status) === index)
      .sort();
    return statuses;
  };

  // 필터 조건 표시 함수
  const getFilterDescription = () => {
    const conditions = [];

    if (searchTerm.trim()) {
      conditions.push(`검색: "${searchTerm}"`);
    }

    if (startDate && endDate) {
      conditions.push(
        `${format(startDate, "yyyy-MM-dd", { locale: ko })} ~ ${format(
          endDate,
          "yyyy-MM-dd",
          { locale: ko }
        )}`
      );
    } else if (startDate) {
      conditions.push(
        `${format(startDate, "yyyy-MM-dd", { locale: ko })} 이후`
      );
    } else if (endDate) {
      conditions.push(`${format(endDate, "yyyy-MM-dd", { locale: ko })} 이전`);
    }

    if (selectedCategory !== "all") {
      conditions.push(`카테고리-${selectedCategory}`);
    }

    if (selectedStatus !== "all") {
      conditions.push(`상태-${selectedStatus}`);
    }

    return conditions.length > 0 ? conditions.join(" | ") : null;
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
          {/* 검색 및 필터 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
            {/* 검색 및 필터 한 줄 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
              {/* 텍스트 검색 */}
              <div className="relative lg:col-span-2">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="고객명, 전화번호, 예약번호, 기기명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 시작일 선택 */}
              <div>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <div className="relative">
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal pr-8",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, "yyyy-MM-dd", { locale: ko })
                        ) : (
                          <span>시작일 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    {startDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-red-100"
                        onClick={clearStartDate}
                      >
                        <XIcon className="h-3 w-3 text-gray-500 hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        setStartDateOpen(false);
                      }}
                      disabled={(date) => (endDate ? date > endDate : false)}
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 종료일 선택 */}
              <div>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <div className="relative">
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal pr-8",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (
                          format(endDate, "yyyy-MM-dd", { locale: ko })
                        ) : (
                          <span>종료일 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    {endDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-red-100"
                        onClick={clearEndDate}
                      >
                        <XIcon className="h-3 w-3 text-gray-500 hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setEndDateOpen(false);
                      }}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 버튼 그룹 */}
              <div className="flex gap-2 lg:col-span-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                  초기화
                </Button>

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

            {/* 카테고리 및 상태 필터 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 카테고리 필터 */}
              <div>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 상태 필터 */}
              <div>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    {getUniqueStatuses().map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_MAP[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 필터 결과 표시 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
              <div className="space-y-1">
                <span className="block">
                  총 {filteredRentals.length}개의 예약
                  {rentals.length !== filteredRentals.length && (
                    <span className="text-gray-400 ml-2">
                      (전체 {rentals.length}건 중)
                    </span>
                  )}
                </span>
                {getFilterDescription() && (
                  <span className="block text-xs text-blue-600 font-medium">
                    필터 조건: {getFilterDescription()}
                  </span>
                )}
              </div>
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
