"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  StorageReservation,
  STORAGE_STATUS_LABELS,
  RESERVATION_SITE_LABELS,
  StorageStatus,
  ReservationSite,
} from "@/types/storage";
import StorageList from "@/components/storage/StorageList";
import { StorageStatistics } from "@/components/storage/StorageStatistics";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
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
import {
  SearchIcon,
  RefreshCwIcon,
  Package,
  BarChart3,
  CalendarIcon,
  DownloadIcon,
} from "lucide-react";
import {
  exportToExcel,
  transformStorageDataForExcel,
  transformStorageStatsForExcel,
} from "@/lib/utils";
import { toast } from "sonner";

export default function StoragePage() {
  const [storages, setStorages] = useState<StorageReservation[]>([]);
  const [filteredStorages, setFilteredStorages] = useState<
    StorageReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedReservationSite, setSelectedReservationSite] =
    useState<string>("all");
  const [exporting, setExporting] = useState(false);

  // 날짜 범위 필터 - 오늘 날짜를 기본값으로 설정
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });

  const supabase = createClient();

  const fetchStorages = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("storage_reservations")
        .select("*")
        .order("drop_off_date", { ascending: true })
        .order("drop_off_time", { ascending: true });
      setStorages(data || []);
      setFilteredStorages(data || []);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 필터링 로직
  useEffect(() => {
    let filtered = [...storages];

    // 검색 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((storage) => {
        return (
          storage.customer_name?.toLowerCase().includes(searchLower) ||
          storage.phone_number?.toLowerCase().includes(searchLower) ||
          storage.reservation_id?.toLowerCase().includes(searchLower) ||
          storage.items_description?.toLowerCase().includes(searchLower)
        );
      });
    }

    // 날짜 범위 필터링 (맡기는 날짜 기준)
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter((storage) => {
        return (
          storage.drop_off_date >= fromStr && storage.drop_off_date <= toStr
        );
      });
    }

    // 상태 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((storage) => {
        return storage.status === selectedStatus;
      });
    }

    // 예약 사이트 필터링
    if (selectedReservationSite !== "all") {
      filtered = filtered.filter((storage) => {
        return storage.reservation_site === selectedReservationSite;
      });
    }

    setFilteredStorages(filtered);
  }, [
    storages,
    searchTerm,
    dateRange,
    selectedStatus,
    selectedReservationSite,
  ]);

  // 필터링된 결과의 총 개수 계산
  const totalQuantity = filteredStorages.reduce(
    (sum, storage) => sum + storage.quantity,
    0
  );

  const handleReset = () => {
    setSearchTerm("");
    setDateRange({
      from: today,
      to: today,
    });
    setSelectedStatus("all");
    setSelectedReservationSite("all");
  };

  // 엑셀 출력 핸들러
  const handleExportToExcel = async () => {
    try {
      setExporting(true);

      // 현재 필터링된 데이터를 엑셀 형식으로 변환
      const excelData = transformStorageDataForExcel(filteredStorages);

      // 검색 조건 생성
      const searchConditions = [];
      if (searchTerm.trim()) {
        searchConditions.push(`검색어: ${searchTerm}`);
      }
      if (dateRange?.from && dateRange?.to) {
        searchConditions.push(
          `기간-${format(dateRange.from, "yyyy-MM-dd", {
            locale: ko,
          })}~${format(dateRange.to, "yyyy-MM-dd", { locale: ko })}`
        );
      }
      if (selectedStatus !== "all") {
        searchConditions.push(
          `상태-${STORAGE_STATUS_LABELS[selectedStatus as StorageStatus]}`
        );
      }
      if (selectedReservationSite !== "all") {
        searchConditions.push(`예약사이트-${selectedReservationSite}`);
      }

      const searchDescription =
        searchConditions.length > 0
          ? searchConditions.join(" | ")
          : "전체 데이터";

      // 통계 데이터 생성
      const statsData = transformStorageStatsForExcel(
        filteredStorages,
        searchDescription
      );

      // 엑셀 파일 생성 및 다운로드
      const result = await exportToExcel(excelData, "보관목록", {
        sheetName: "보관 목록",
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

  // 상태별 개수 계산 (필터링된 결과 기준)
  const getStatusCounts = () => {
    // 상태 필터를 제외한 다른 필터들만 적용된 결과
    let filtered = [...storages];

    // 텍스트 검색 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((storage) => {
        return (
          storage.customer_name?.toLowerCase().includes(searchLower) ||
          storage.phone_number?.toLowerCase().includes(searchLower) ||
          storage.reservation_id?.toLowerCase().includes(searchLower) ||
          storage.items_description?.toLowerCase().includes(searchLower)
        );
      });
    }

    // 날짜 범위 필터링
    if (dateRange?.from && dateRange?.to) {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");
      filtered = filtered.filter((storage) => {
        return (
          storage.drop_off_date >= fromStr && storage.drop_off_date <= toStr
        );
      });
    }

    // 예약 사이트 필터링
    if (selectedReservationSite !== "all") {
      filtered = filtered.filter((storage) => {
        return storage.reservation_site === selectedReservationSite;
      });
    }

    // 필터링된 결과에서 상태별 건수 계산
    const counts = {
      all: filtered.length,
      pending: filtered.filter((s) => s.status === "pending").length,
      stored: filtered.filter((s) => s.status === "stored").length,
      retrieved: filtered.filter((s) => s.status === "retrieved").length,
    };

    return counts;
  };

  const statusCounts = getStatusCounts();

  // 고유한 예약 사이트 목록 추출
  const getUniqueReservationSites = () => {
    const sites = storages
      .map((storage) => storage.reservation_site)
      .filter((site) => site)
      .filter((site, index, arr) => arr.indexOf(site) === index)
      .sort();
    return sites;
  };

  useEffect(() => {
    fetchStorages();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">짐 보관 관리</h1>
        <p className="text-sm text-gray-500 mb-4">
          보관 목록을 확인하고 보관 통계를 분석할 수 있습니다.
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6 w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            보관 목록
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            보관 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="space-y-6">
            {/* 검색 및 필터 */}
            <div className="mb-6 bg-white p-2 sm:p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 이름/물품명 검색 */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    placeholder="고객명, 전화번호, 예약번호, 물품명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm pl-9"
                  />
                </div>

                {/* 날짜 범위 필터 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`justify-start text-left font-normal ${
                        !dateRange && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from && dateRange?.to
                        ? `${format(dateRange.from, "yyyy-MM-dd", {
                            locale: ko,
                          })} ~ ${format(dateRange.to, "yyyy-MM-dd", {
                            locale: ko,
                          })}`
                        : "보관 기간 선택"}
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

                {/* 버튼 그룹 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex flex-1 items-center gap-2"
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                    초기화
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportToExcel}
                    disabled={exporting || filteredStorages.length === 0}
                    className="flex flex-1 items-center gap-2"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {exporting ? "출력 중..." : "엑셀 출력"}
                  </Button>
                </div>
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
                      ? "bg-yellow-200 border-2 border-yellow-400 text-yellow-800"
                      : "bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                  }`}
                >
                  {STORAGE_STATUS_LABELS.pending}: {statusCounts.pending}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("stored")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "stored"
                      ? "bg-blue-200 border-2 border-blue-400 text-blue-800"
                      : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                  }`}
                >
                  {STORAGE_STATUS_LABELS.stored}: {statusCounts.stored}건
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus("retrieved")}
                  className={`h-6 px-2 py-1 text-xs ${
                    selectedStatus === "retrieved"
                      ? "bg-green-200 border-2 border-green-400 text-green-800"
                      : "bg-green-100 hover:bg-green-200 text-green-800"
                  }`}
                >
                  {STORAGE_STATUS_LABELS.retrieved}: {statusCounts.retrieved}건
                </Button>
              </div>

              {/* 필터 결과 표시 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
                <div>
                  {dateRange?.from && dateRange?.to ? (
                    <span className="font-medium text-blue-600">
                      {format(dateRange.from, "yyyy.MM.dd", {
                        locale: ko,
                      })}{" "}
                      ~ {format(dateRange.to, "yyyy.MM.dd", { locale: ko })}
                    </span>
                  ) : (
                    <span className="font-medium text-blue-600">전체 기간</span>
                  )}
                  <span className="ml-2">
                    총 {filteredStorages.length}개의 예약
                  </span>
                </div>
              </div>
            </div>

            {/* 보관 목록 */}
            <StorageList
              storages={filteredStorages}
              onStorageUpdated={fetchStorages}
              searchTerm={searchTerm}
            />
          </div>
        </TabsContent>

        {/* 보관 통계 탭 */}
        <TabsContent value="statistics" className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <StorageStatistics storages={storages} />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
