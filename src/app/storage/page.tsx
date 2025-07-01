"use client";

import { useEffect, useState, useMemo } from "react";
import { StorageReservation } from "@/types/storage";
import StorageList from "@/components/storage/StorageList";
import { StorageStatistics } from "@/components/storage/StorageStatistics";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Package, BarChart3 } from "lucide-react";

export default function StoragePage() {
  const [storages, setStorages] = useState<StorageReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

  // 검색 필터링 로직
  const filteredStorages = useMemo(() => {
    if (!searchTerm.trim()) return storages;

    const searchLower = searchTerm.toLowerCase().trim();
    return storages.filter((storage) => {
      return (
        storage.customer_name?.toLowerCase().includes(searchLower) ||
        storage.phone_number?.toLowerCase().includes(searchLower) ||
        storage.reservation_id?.toLowerCase().includes(searchLower) ||
        storage.items_description?.toLowerCase().includes(searchLower)
      );
    });
  }, [storages, searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  useEffect(() => {
    fetchStorages();

    // 페이지 포커스 시 데이터 새로고침
    const handleFocus = () => {
      fetchStorages();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
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
          {/* 검색 기능 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
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
              {searchTerm && (
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {filteredStorages.length}건 검색됨
                </span>
              )}
            </div>
          </div>

          {/* 보관 예약 목록 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                보관 예약 목록
                {searchTerm && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (검색: "{searchTerm}")
                  </span>
                )}
              </h2>
              <span className="text-sm text-gray-600">
                총 {filteredStorages.length}개의 예약
              </span>
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
