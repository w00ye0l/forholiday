"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { StorageReservation } from "@/types/storage";
import StorageList from "@/components/storage/StorageList";
import { StorageStatistics } from "@/components/storage/StorageStatistics";
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
  Search,
  X,
  Package,
  BarChart3,
  Calendar as CalendarIcon,
  RotateCcw,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  exportToExcel,
  transformStorageDataForExcel,
  transformStorageStatsForExcel,
} from "@/lib/utils";
import { toast } from "sonner";

export default function StoragePage() {
  const [storages, setStorages] = useState<StorageReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();

  const fetchStorages = async () => {
    setLoading(true);
    try {
      // 캐시를 피하기 위해 현재 시간을 쿼리에 추가
      const { data } = await supabase
        .from("storage_reservations")
        .select("*")
        .order("created_at", { ascending: false });
      setStorages(data || []);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 날짜 필터링 로직
  const filteredStorages = useMemo(() => {
    let filtered = storages;

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

    // 날짜 필터링 (맡기는 날짜 기준)
    if (selectedDate) {
      const selectedDateString = format(selectedDate, "yyyy-MM-dd");
      filtered = filtered.filter((storage) => {
        return storage.drop_off_date === selectedDateString;
      });
    }

    return filtered;
  }, [storages, searchTerm, selectedDate]);

  // 필터링된 결과의 총 개수 계산
  const totalQuantity = useMemo(() => {
    return filteredStorages.reduce((sum, storage) => sum + storage.quantity, 0);
  }, [filteredStorages]);

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleClearDate = () => {
    setSelectedDate(undefined);
    setDatePickerOpen(false);
  };

  const handleClearAll = () => {
    setSearchTerm("");
    setSelectedDate(undefined);
  };

  const hasFilters = searchTerm.trim() || selectedDate;

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
      if (selectedDate) {
        searchConditions.push(
          `날짜: ${format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}`
        );
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
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">짐 보관 관리</h1>
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

        {/* 보관 목록 탭 */}
        <TabsContent value="list" className="space-y-6">
          {/* 검색 및 필터 기능 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 검색 필드 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="고객명, 전화번호, 예약번호, 물품명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* 날짜 필터 */}
              <div>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <div className="relative">
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal pr-10",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "yyyy년 MM월 dd일", {
                            locale: ko,
                          })
                        ) : (
                          <span>날짜 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    {selectedDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearDate}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }}
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 초기화 버튼 및 결과 표시 */}
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    초기화
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={exporting || filteredStorages.length === 0}
                  className="flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  {exporting ? "출력중..." : "엑셀"}
                </Button>
              </div>

              {/* 결과 표시 */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{filteredStorages.length}건</span>
                <span>•</span>
                <span>{totalQuantity}개</span>
                {hasFilters && (
                  <span className="text-blue-600">(필터링됨)</span>
                )}
              </div>
            </div>

            {/* 활성 필터 표시 */}
            {hasFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                {searchTerm && (
                  <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    <Search className="w-3 h-3" />
                    <span>검색: "{searchTerm}"</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="h-4 w-4 p-0 hover:bg-blue-200"
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </div>
                )}
                {selectedDate && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    <CalendarIcon className="w-3 h-3" />
                    <span>
                      날짜:{" "}
                      {format(selectedDate, "yyyy년 MM월 dd일", {
                        locale: ko,
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDate}
                      className="h-4 w-4 p-0 hover:bg-green-200"
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 보관 예약 목록 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">보관 예약 목록</h2>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filteredStorages.length}건</span>
                <span className="mx-1">•</span>
                <span className="font-medium">{totalQuantity}개</span>
                {hasFilters && (
                  <span className="text-blue-600 ml-1">필터링됨</span>
                )}
              </div>
            </div>
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
